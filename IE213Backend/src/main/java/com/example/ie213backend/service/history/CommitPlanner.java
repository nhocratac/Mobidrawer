package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;

import java.util.*;
import java.util.function.Function;

// Chuẩn hoá batch intent theo trạng thái board lúc giữ lock và sinh op (spec §6.3 bước 2-7), không đọc DB
public final class CommitPlanner {
    // fsAfter mang giá trị này nghĩa là "seq của chính op", writer thay khi cấp seq
    public static final long SEQ = -1L;

    private CommitPlanner() {
    }

    // Intent sau khi gộp theo elementId. kind: create | replace | patch | delete
    private static final class Folded {
        String kind;
        Map<String, Object> element;
        Map<String, Object> set;
        Map<String, Long> fs = new HashMap<>();
        Set<String> patchedKeys = new LinkedHashSet<>();
        boolean recreate;
    }

    public static List<BoardOp> plan(List<Intent> intents, Map<String, Map<String, Object>> board,
                                     Function<String, Long> lastVersion) {
        Map<String, Folded> folded = new LinkedHashMap<>();
        for (Intent in : intents) fold(folded, in, board);
        cascade(folded, board);
        checkConnectorEnds(folded, board);
        return build(folded, board, lastVersion);
    }

    private static void fold(Map<String, Folded> folded, Intent in, Map<String, Map<String, Object>> board) {
        String id = in.elementId();
        if (id == null) throw new IllegalArgumentException("element id required");
        Folded cur = folded.get(id);
        boolean onBoard = board.containsKey(id);
        switch (in.kind()) {
            case "create" -> {
                if (cur == null && !onBoard) folded.put(id, createOf(in, "create"));
                    // xoá rồi tạo lại cùng id trong batch (restore đổi type/image): thay thế
                else if (cur != null && "delete".equals(cur.kind) && onBoard) folded.put(id, createOf(in, "replace"));
                // còn lại: id đã tồn tại hoặc create trùng trong batch -> bỏ
            }
            case "patch" -> {
                if (cur == null) {
                    // element đã bị xoá (có thể bởi người khác): bỏ im lặng
                    if (!onBoard) return;
                    Folded f = new Folded();
                    f.kind = "patch";
                    f.set = new LinkedHashMap<>();
                    mergeSet(f, in);
                    folded.put(id, f);
                } else if (!"delete".equals(cur.kind)) {
                    mergeSet(cur, in);
                }
            }
            case "delete" -> {
                if (cur == null) {
                    if (onBoard) folded.put(id, deleteOf());
                } else if ("create".equals(cur.kind)) {
                    // create + delete trong cùng batch triệt tiêu
                    folded.remove(id);
                } else if (!"delete".equals(cur.kind)) {
                    folded.put(id, deleteOf());
                }
            }
            default -> throw new IllegalArgumentException("unknown intent kind: " + in.kind());
        }
    }

    private static Folded createOf(Intent in, String kind) {
        Folded f = new Folded();
        f.kind = kind;
        f.element = new LinkedHashMap<>(in.element());
        // create mang sẵn fieldSeq = tạo lại từ undo/redo (restore bỏ fieldSeq), giữ nguyên "dấu"
        f.recreate = in.fsOverride() == null && in.element().get("fieldSeq") instanceof Map<?, ?> m && !m.isEmpty();
        return f;
    }

    private static Folded deleteOf() {
        Folded f = new Folded();
        f.kind = "delete";
        return f;
    }

    private static void mergeSet(Folded f, Intent in) {
        boolean isPatch = "patch".equals(f.kind);
        Map<String, Object> target = isPatch ? f.set : f.element;
        in.set().forEach((k, v) -> {
            target.put(k, v);
            if (!isPatch) f.patchedKeys.add(k);
            Long ov = in.fsOverride() == null ? null : in.fsOverride().get(k);
            if (ov != null) f.fs.put(k, ov);
            else f.fs.remove(k);
        });
    }

    // Cascade tính trên trạng thái sau khi áp patch connector của batch
    private static void cascade(Map<String, Folded> folded, Map<String, Map<String, Object>> board) {
        Set<String> gone = new HashSet<>();
        folded.forEach((id, f) -> {
            if ("delete".equals(f.kind)) gone.add(id);
        });
        if (gone.isEmpty()) return;
        List<String> extra = new ArrayList<>();
        board.forEach((id, el) -> {
            if (!ElementKeys.isConnector(el)) return;
            Folded f = folded.get(id);
            if (f != null && !"patch".equals(f.kind)) return;
            Object connector = f != null && f.set.containsKey("connector") ? f.set.get("connector") : el.get("connector");
            if (ElementKeys.connectorEnds(asMap(connector)).stream().anyMatch(gone::contains)) extra.add(id);
        });
        extra.forEach(id -> folded.put(id, deleteOf()));
    }

    // Hai đầu phải là non-connector còn tồn tại sau batch: (hiện có - bị xoá) ∪ (non-connector được tạo trong batch)
    private static void checkConnectorEnds(Map<String, Folded> folded, Map<String, Map<String, Object>> board) {
        Set<String> targets = new HashSet<>();
        board.forEach((id, el) -> {
            Folded f = folded.get(id);
            if ((f == null || "patch".equals(f.kind)) && !ElementKeys.isConnector(el)) targets.add(id);
        });
        folded.forEach((id, f) -> {
            if (f.element != null && !ElementKeys.isConnector(f.element)) targets.add(id);
        });
        folded.forEach((id, f) -> {
            Object connector = null;
            if (f.element != null && ElementKeys.isConnector(f.element)) connector = f.element.get("connector");
            else if (f.set != null) connector = f.set.get("connector");
            for (String end : ElementKeys.connectorEnds(asMap(connector)))
                if (!targets.contains(end)) throw new IllegalArgumentException("connector end not found on this board");
        });
    }

    // Thứ tự cố định: create non-connector -> patch -> create connector -> delete
    private static List<BoardOp> build(Map<String, Folded> folded, Map<String, Map<String, Object>> board,
                                       Function<String, Long> lastVersion) {
        List<BoardOp> replaced = new ArrayList<>();
        List<BoardOp> creates = new ArrayList<>();
        List<BoardOp> patches = new ArrayList<>();
        List<BoardOp> connectors = new ArrayList<>();
        List<BoardOp> deletes = new ArrayList<>();
        folded.forEach((id, f) -> {
            Map<String, Object> cur = board.get(id);
            switch (f.kind) {
                case "create", "replace" -> {
                    // thay thế: phải xoá bản cũ trước khi tạo lại cùng id
                    if ("replace".equals(f.kind)) replaced.add(deleteOp(id, cur));
                    BoardOp op = createOp(id, f, cur, lastVersion);
                    (ElementKeys.isConnector(f.element) ? connectors : creates).add(op);
                }
                case "patch" -> patches.add(patchOp(id, f, cur));
                default -> deletes.add(deleteOp(id, cur));
            }
        });
        List<BoardOp> out = new ArrayList<>(replaced);
        out.addAll(creates);
        out.addAll(patches);
        out.addAll(connectors);
        out.addAll(deletes);
        return out;
    }

    private static BoardOp createOp(String id, Folded f, Map<String, Object> cur, Function<String, Long> lastVersion) {
        Map<String, Long> fsAfter = new LinkedHashMap<>();
        if (f.recreate) fsAfter.putAll(asLongMap(f.element.get("fieldSeq")));
        else for (String k : ElementKeys.K) if (f.element.get(k) != null) fsAfter.put(k, SEQ);
        for (String k : f.patchedKeys) fsAfter.put(k, f.fs.getOrDefault(k, SEQ));
        Long last = lastVersion.apply(id);
        long base = last == null ? 0L : last;
        if (cur != null) base = Math.max(base, version(cur));
        // tạo lại id cũ: version tiếp nối, không bao giờ giảm
        long v = base + 1;
        Map<String, Object> after = new LinkedHashMap<>(f.element);
        after.put("fieldSeq", new LinkedHashMap<>(fsAfter));
        after.put("version", v);
        return op("create", id, null, after, new LinkedHashMap<>(), fsAfter, v);
    }

    private static BoardOp patchOp(String id, Folded f, Map<String, Object> cur) {
        Map<String, Object> before = new LinkedHashMap<>();
        Map<String, Object> after = new LinkedHashMap<>();
        Map<String, Long> fsBefore = new LinkedHashMap<>();
        Map<String, Long> fsAfter = new LinkedHashMap<>();
        Map<String, Long> curFs = asLongMap(cur.get("fieldSeq"));
        f.set.forEach((k, val) -> {
            before.put(k, cur.get(k));
            after.put(k, val);
            fsBefore.put(k, curFs.getOrDefault(k, 0L));
            // key không đổi giá trị (vd FE gửi lại x,y khi chỉ đổi w,h) giữ nguyên dấu cũ, tránh xung đột "modified" giả
            Long ov = f.fs.get(k);
            boolean unchanged = ov == null && ElementNormalizer.same(cur.get(k), val);
            fsAfter.put(k, ov != null ? ov : unchanged ? curFs.getOrDefault(k, 0L) : SEQ);
        });
        return op("patch", id, before, after, fsBefore, fsAfter, version(cur) + 1);
    }

    private static BoardOp deleteOp(String id, Map<String, Object> cur) {
        return op("delete", id, new LinkedHashMap<>(cur), null, asLongMap(cur.get("fieldSeq")), new LinkedHashMap<>(),
                version(cur));
    }

    private static BoardOp op(String kind, String id, Map<String, Object> before, Map<String, Object> after,
                              Map<String, Long> fsBefore, Map<String, Long> fsAfter, long v) {
        BoardOp op = new BoardOp();
        op.setKind(kind);
        op.setElementId(id);
        op.setBefore(before);
        op.setAfter(after);
        op.setFsBefore(fsBefore);
        op.setFsAfter(fsAfter);
        op.setV(v);
        return op;
    }

    private static long version(Map<String, Object> el) {
        return el.get("version") instanceof Number n ? n.longValue() : 0L;
    }

    private static Map<String, Long> asLongMap(Object o) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (o instanceof Map<?, ?> m)
            m.forEach((k, v) -> {
                if (v instanceof Number n) out.put(String.valueOf(k), n.longValue());
            });
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map<?, ?> ? (Map<String, Object>) o : null;
    }
}
