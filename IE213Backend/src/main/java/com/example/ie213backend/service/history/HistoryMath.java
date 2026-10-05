package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Predicate;

// Toán thuần cho lịch sử (replay, diff, inverse): không đọc/ghi DB
public final class HistoryMath {

    private HistoryMath() {
    }

    // Dựng lại board từ base + ops (seq tăng dần, caller đã sort); chịu được lỗ seq, không sửa base
    public static Map<String, Map<String, Object>> replay(Map<String, Map<String, Object>> base, List<BoardOp> ops) {
        Map<String, Map<String, Object>> state = new LinkedHashMap<>();
        if (base != null) base.forEach((id, el) -> state.put(id, copyMap(el)));
        if (ops == null) return state;
        for (BoardOp op : ops) {
            if (op == null) continue;
            String id = op.getElementId();
            String kind = op.getKind();
            if ("create".equals(kind)) {
                Map<String, Object> el = copyMap(op.getAfter());
                el.putIfAbsent("id", id);
                if (op.getFsAfter() != null) el.put("fieldSeq", new LinkedHashMap<>(op.getFsAfter()));
                el.put("version", op.getV());
                state.put(id, el);
            } else if ("patch".equals(kind)) {
                Map<String, Object> el = state.get(id);
                // element đã bị xóa trước đó: bỏ qua
                if (el == null) continue;
                if (op.getAfter() != null) op.getAfter().forEach((k, v) -> el.put(k, copyValue(v)));
                if (op.getFsAfter() != null && !op.getFsAfter().isEmpty()) {
                    Map<String, Object> fs = new LinkedHashMap<>();
                    if (el.get("fieldSeq") instanceof Map<?, ?> cur) cur.forEach((k, v) -> fs.put(String.valueOf(k), v));
                    fs.putAll(op.getFsAfter());
                    el.put("fieldSeq", fs);
                }
                el.put("version", op.getV());
            } else if ("delete".equals(kind)) {
                state.remove(id);
            } else {
                throw new IllegalArgumentException("unknown op kind: " + kind);
            }
        }
        return state;
    }

    // Diff để restore (§8.3): chỉ so type, image và K; thứ tự intent do planner sắp lại
    public static List<Intent> diff(Map<String, Map<String, Object>> target, Map<String, Map<String, Object>> current) {
        Map<String, Map<String, Object>> t = target == null ? Map.of() : target;
        Map<String, Map<String, Object>> c = current == null ? Map.of() : current;
        List<Intent> out = new ArrayList<>();
        for (String id : c.keySet()) {
            if (!t.containsKey(id)) out.add(Intent.delete(id));
        }
        for (Map.Entry<String, Map<String, Object>> entry : t.entrySet()) {
            String id = entry.getKey();
            Map<String, Object> want = entry.getValue();
            Map<String, Object> have = c.get(id);
            if (have == null) {
                out.add(Intent.create(copyMap(want)));
                continue;
            }
            // type/image không nằm trong K nên không patch được: xóa rồi tạo lại
            if (!ElementNormalizer.same(want.get("type"), have.get("type"))
                    || !ElementNormalizer.same(want.get("image"), have.get("image"))) {
                out.add(Intent.delete(id));
                out.add(Intent.create(copyMap(want)));
                continue;
            }
            Map<String, Object> set = new LinkedHashMap<>();
            for (String k : ElementKeys.K) {
                if (!ElementNormalizer.same(want.get(k), have.get(k))) set.put(k, copyValue(want.get(k)));
            }
            if (!set.isEmpty()) out.add(Intent.patch(id, set));
        }
        return out;
    }

    // ===== Undo/redo inverse (§7.2, §6.4) =====

    public enum Direction { UNDO, REDO }

    public record InverseResult(List<Intent> intents, List<HistoryResult.Skip> skipped) {
    }

    private static final String CANCEL = "cancel";

    // Op của T sau khi gộp theo element (và theo key nếu là patch)
    private static final class Entry {
        final String id;
        String kind;                                   // create | patch | delete | cancel
        Map<String, Object> full;                      // create: element cuối; delete: element trước T
        final Map<String, Object> before = new LinkedHashMap<>();
        final Map<String, Object> after = new LinkedHashMap<>();
        final Map<String, Long> fsB = new LinkedHashMap<>();
        final Map<String, Long> fsA = new LinkedHashMap<>();

        Entry(String id) {
            this.id = id;
        }
    }

    // txOps: ops của tx gốc T; undoOps: ops của U mới nhất nhắm tới T (chỉ REDO)
    public static InverseResult inverse(Direction dir, List<BoardOp> txOps, List<BoardOp> undoOps,
                                        Map<String, Map<String, Object>> current, String actorUserId,
                                        BiFunction<String, Long, List<BoardOp>> laterOps) {
        boolean undo = dir == Direction.UNDO;
        List<BoardOp> tOps = sortedBySeq(txOps);
        List<BoardOp> uOps = sortedBySeq(undoOps);
        long maxT = tOps.isEmpty() ? 0L : tOps.get(tOps.size() - 1).getSeq();
        // mốc "sau thao tác": seq cuối của T khi undo, của U khi redo
        long guard = undo || uOps.isEmpty() ? maxT : uOps.get(uOps.size() - 1).getSeq();

        List<HistoryResult.Skip> skipped = new ArrayList<>();
        Set<String> deletes = new LinkedHashSet<>();
        Map<String, Map<String, Object>> nodeCreates = new LinkedHashMap<>();
        Map<String, Map<String, Object>> connCreates = new LinkedHashMap<>();
        List<Entry> patches = new ArrayList<>();

        for (Entry e : groupByElement(tOps).values()) {
            if (e.kind == null || CANCEL.equals(e.kind)) continue;
            if ("patch".equals(e.kind)) {
                patches.add(e);
                continue;
            }
            // undo create / redo delete -> xóa; undo delete / redo create -> tạo lại
            boolean remove = undo == "create".equals(e.kind);
            if (remove) {
                if (!current.containsKey(e.id)) {
                    skipped.add(skip(e.id, null, "gone", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                    continue;
                }
                List<BoardOp> watch = new ArrayList<>(laterOps.apply(e.id, guard));
                if (undo) {
                    // undo create: người khác sửa connector đang nối vào cũng chặn
                    for (Map.Entry<String, Map<String, Object>> c : current.entrySet()) {
                        if (ElementKeys.isConnector(c.getValue())
                                && endsOf(c.getValue().get("connector")).contains(e.id)) {
                            watch.addAll(laterOps.apply(c.getKey(), guard));
                        }
                    }
                }
                String by = newestOther(watch, actorUserId, null);
                if (by != null) {
                    skipped.add(skip(e.id, null, "modified", by));
                    continue;
                }
                deletes.add(e.id);
            } else {
                if (current.containsKey(e.id)) {
                    skipped.add(skip(e.id, null, "exists", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                    continue;
                }
                Map<String, Object> el = undo ? e.full : deletedBefore(uOps, e.id);
                if (el == null) {
                    skipped.add(skip(e.id, null, "gone", null));
                    continue;
                }
                if (ElementKeys.isConnector(el)) connCreates.put(e.id, el);
                else nodeCreates.put(e.id, el);
            }
        }

        // đầu connector hợp lệ: non-connector còn tồn tại sau batch này
        Predicate<String> nodeAlive = id -> {
            if (id == null) return false;
            if (nodeCreates.containsKey(id)) return true;
            Map<String, Object> cur = current.get(id);
            return cur != null && !deletes.contains(id) && !ElementKeys.isConnector(cur);
        };

        List<Intent> patchIntents = new ArrayList<>();
        for (Entry e : patches) {
            Map<String, Object> cur = current.get(e.id);
            if (cur == null) {
                skipped.add(skip(e.id, null, "gone", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                continue;
            }
            Map<String, Object> set = new LinkedHashMap<>();
            Map<String, Long> fsOverride = new LinkedHashMap<>();
            for (String k : e.after.keySet()) {
                // điều kiện "dấu": undo cần fs == T.fsA, redo cần fs == T.fsB
                long expected = undo ? e.fsA.get(k) : e.fsB.get(k);
                if (seqOf(cur.get("fieldSeq"), k) != expected) {
                    skipped.add(skip(e.id, k, "modified", newestOther(laterOps.apply(e.id, guard), actorUserId, k)));
                    continue;
                }
                Object value = undo ? e.before.get(k) : e.after.get(k);
                if ("connector".equals(k) && !endsOf(value).stream().allMatch(nodeAlive)) {
                    skipped.add(skip(e.id, k, "end-missing", null));
                    continue;
                }
                set.put(k, copyValue(value));
                fsOverride.put(k, undo ? e.fsB.get(k) : e.fsA.get(k));
            }
            if (!set.isEmpty()) patchIntents.add(Intent.patch(e.id, set, fsOverride));
        }

        List<Intent> connIntents = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> c : connCreates.entrySet()) {
            if (!endsOf(c.getValue().get("connector")).stream().allMatch(nodeAlive)) {
                skipped.add(skip(c.getKey(), null, "end-missing", null));
                continue;
            }
            connIntents.add(Intent.create(copyMap(c.getValue())));
        }

        // thứ tự: create non-connector -> patch -> create connector -> delete
        List<Intent> intents = new ArrayList<>();
        nodeCreates.values().forEach(el -> intents.add(Intent.create(copyMap(el))));
        intents.addAll(patchIntents);
        intents.addAll(connIntents);
        deletes.forEach(id -> intents.add(Intent.delete(id)));
        return new InverseResult(intents, skipped);
    }

    // Gộp: create+patch -> create; patch+delete -> delete (element trước T); create+delete -> triệt tiêu
    private static Map<String, Entry> groupByElement(List<BoardOp> ops) {
        Map<String, Entry> out = new LinkedHashMap<>();
        for (BoardOp op : ops) {
            Entry e = out.computeIfAbsent(op.getElementId(), Entry::new);
            switch (op.getKind()) {
                case "create" -> {
                    if (e.kind == null || CANCEL.equals(e.kind)) {
                        e.kind = "create";
                        e.full = copyMap(op.getAfter());
                    }
                }
                case "patch" -> {
                    if ("create".equals(e.kind)) {
                        overlayCreate(e, op);
                    } else if (e.kind == null || "patch".equals(e.kind)) {
                        e.kind = "patch";
                        mergeKeys(e, op);
                    }
                }
                case "delete" -> {
                    if ("create".equals(e.kind)) {
                        e.kind = CANCEL;
                        e.full = null;
                    } else if (e.kind == null || "patch".equals(e.kind)) {
                        Map<String, Object> full = copyMap(op.getBefore());
                        // patch + delete: before của delete, đè bằng before/fsBefore sớm nhất của patch
                        e.before.forEach((k, v) -> full.put(k, copyValue(v)));
                        Map<String, Long> fs = toLongMap(full.get("fieldSeq"));
                        fs.putAll(e.fsB);
                        full.put("fieldSeq", fs);
                        e.kind = "delete";
                        e.full = full;
                    }
                }
                default -> throw new IllegalArgumentException("unknown op kind: " + op.getKind());
            }
        }
        return out;
    }

    // Theo key: before/fsB lấy op sớm nhất, after/fsA lấy op muộn nhất
    private static void mergeKeys(Entry e, BoardOp op) {
        if (op.getAfter() == null) return;
        for (Map.Entry<String, Object> kv : op.getAfter().entrySet()) {
            String k = kv.getKey();
            if (!e.before.containsKey(k)) {
                e.before.put(k, copyValue(op.getBefore() == null ? null : op.getBefore().get(k)));
                e.fsB.put(k, seqOf(op.getFsBefore(), k));
            }
            e.after.put(k, copyValue(kv.getValue()));
            e.fsA.put(k, seqOf(op.getFsAfter(), k));
        }
    }

    private static void overlayCreate(Entry e, BoardOp op) {
        Map<String, Long> fs = toLongMap(e.full.get("fieldSeq"));
        if (op.getAfter() != null) {
            op.getAfter().forEach((k, v) -> {
                e.full.put(k, copyValue(v));
                fs.put(k, seqOf(op.getFsAfter(), k));
            });
        }
        e.full.put("fieldSeq", fs);
        e.full.put("version", op.getV());
    }

    // before của op delete trong U cho element (nguồn để redo create)
    private static Map<String, Object> deletedBefore(List<BoardOp> undoOps, String id) {
        Map<String, Object> found = null;
        for (BoardOp o : undoOps) {
            if ("delete".equals(o.getKind()) && id.equals(o.getElementId())) found = o.getBefore();
        }
        return found == null ? null : copyMap(found);
    }

    // user của op mới nhất không phải người bấm; key != null thì chỉ xét op có after chứa key
    private static String newestOther(List<BoardOp> ops, String actorUserId, String key) {
        if (ops == null) return null;
        BoardOp best = null;
        for (BoardOp o : ops) {
            if (Objects.equals(o.getUserId(), actorUserId)) continue;
            if (key != null && (o.getAfter() == null || !o.getAfter().containsKey(key))) continue;
            if (best == null || o.getSeq() > best.getSeq()) best = o;
        }
        return best == null ? null : best.getUserId();
    }

    private static HistoryResult.Skip skip(String elementId, String key, String reason, String byUserId) {
        return new HistoryResult.Skip(elementId, key, reason, byUserId);
    }

    @SuppressWarnings("unchecked")
    private static List<String> endsOf(Object connectorValue) {
        return connectorValue instanceof Map<?, ?> m
                ? ElementKeys.connectorEnds((Map<String, Object>) m)
                : List.of();
    }

    // fieldSeq thiếu key (element legacy) = 0
    private static long seqOf(Object fsMap, String k) {
        if (fsMap instanceof Map<?, ?> m && m.get(k) instanceof Number n) return n.longValue();
        return 0L;
    }

    private static Map<String, Long> toLongMap(Object v) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (v instanceof Map<?, ?> m) {
            m.forEach((k, n) -> {
                if (n instanceof Number num) out.put(String.valueOf(k), num.longValue());
            });
        }
        return out;
    }

    private static List<BoardOp> sortedBySeq(List<BoardOp> ops) {
        if (ops == null) return List.of();
        List<BoardOp> out = new ArrayList<>(ops);
        out.sort(Comparator.comparingLong(BoardOp::getSeq));
        return out;
    }

    static Map<String, Object> copyMap(Map<String, Object> m) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (m != null) m.forEach((k, v) -> out.put(k, copyValue(v)));
        return out;
    }

    // Copy sâu Map/List; giá trị lá (String, Number, Boolean, null) dùng lại được
    static Object copyValue(Object v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, val) -> out.put(String.valueOf(k), copyValue(val)));
            return out;
        }
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>(l.size());
            l.forEach(x -> out.add(copyValue(x)));
            return out;
        }
        return v;
    }
}
