package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Undo/redo theo từng user; stack đọc lại từ boardTxs mỗi lần nên reload trang vẫn còn
@Service
@RequiredArgsConstructor
public class UndoService {
    static final int DEPTH = 50;
    private static final List<String> UNDOABLE = List.of("user", "redo", "restore");

    private final ElementWriter writer;
    private final MongoTemplate mongo;
    private final BoardService boardService;

    public HistoryResult undo(String boardId, String userId, String sessionId) {
        requireEditor(boardId, userId);
        return writer.withLock(boardId, () -> {
            BoardTx t = undoTarget(boardId, userId);
            if (t == null) return HistoryResult.empty("undo");
            HistoryMath.InverseResult inv = HistoryMath.inverse(HistoryMath.Direction.UNDO,
                    writer.opsOfTx(boardId, t.getId()), null, writer.loadBoard(boardId), userId,
                    (elementId, afterSeq) -> writer.laterOps(boardId, elementId, afterSeq));
            return apply("undo", boardId, userId, sessionId, t, "active", inv);
        });
    }

    public HistoryResult redo(String boardId, String userId, String sessionId) {
        requireEditor(boardId, userId);
        return writer.withLock(boardId, () -> {
            Map<String, BoardTx> undone = mongo.find(Query.query(Criteria.where("boardId").is(toOid(boardId))
                    .and("userId").is(userId).and("state").is("undone")), BoardTx.class)
                    .stream().collect(Collectors.toMap(BoardTx::getId, Function.identity(), (x, y) -> x));
            if (undone.isEmpty()) return HistoryResult.empty("redo");
            // LIFO theo thứ tự undo: U mới nhất có target đang undone
            BoardTx u = mongo.find(Query.query(Criteria.where("boardId").is(toOid(boardId))
                            .and("userId").is(userId).and("source").is("undo"))
                            .with(Sort.by(Sort.Direction.DESC, "seqTo")), BoardTx.class)
                    .stream().filter(x -> x.getTarget() != null && undone.containsKey(x.getTarget()))
                    .findFirst().orElse(null);
            if (u == null) return HistoryResult.empty("redo");
            BoardTx t = undone.get(u.getTarget());
            List<BoardOp> undoOps = writer.opsOfTx(boardId, u.getId());
            HistoryMath.InverseResult inv = HistoryMath.inverse(HistoryMath.Direction.REDO,
                    writer.opsOfTx(boardId, t.getId()), undoOps, writer.loadBoard(boardId), userId,
                    (elementId, afterSeq) -> writer.laterOps(boardId, elementId, afterSeq));
            return apply("redo", boardId, userId, sessionId, t, "undone", inv);
        });
    }

    private void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }

    // 50 tx mới nhất (mọi state) của user; T là tx active đầu tiên
    private BoardTx undoTarget(String boardId, String userId) {
        Query q = Query.query(Criteria.where("boardId").is(toOid(boardId))
                        .and("userId").is(userId).and("source").in(UNDOABLE))
                .with(Sort.by(Sort.Direction.DESC, "seqTo")).limit(DEPTH);
        return mongo.find(q, BoardTx.class).stream()
                .filter(tx -> "active".equals(tx.getState())).findFirst().orElse(null);
    }

    private HistoryResult apply(String op, String boardId, String userId, String sessionId,
                                BoardTx t, String fromState, HistoryMath.InverseResult inv) {
        List<HistoryResult.Skip> skipped = new ArrayList<>(inv.skipped());
        if (!inv.intents().isEmpty()) {
            try {
                ElementWriter.CommitResult res = writer.commit(new ElementWriter.CommitRequest(
                        boardId, userId, sessionId, op, inv.intents(), null, t.getId()));
                if (!res.isEmpty()) return new HistoryResult(op, res.ops().size(), skipped);
            } catch (IllegalArgumentException ex) {
                // planner chặn đầu connector: coi như không có inverse (§7.2)
                skipped.add(new HistoryResult.Skip(null, null, "end-missing", null));
            }
        }
        // không có inverse: T dead để lần sau tới tx trước đó, stack không bị kẹt
        mongo.updateFirst(Query.query(Criteria.where("_id").is(t.getId()).and("state").is(fromState)),
                Update.update("state", "dead"), BoardTx.class);
        if (skipped.isEmpty()) skipped.add(new HistoryResult.Skip(null, null, "empty", null));
        return new HistoryResult(op, 0, skipped);
    }

    private static Object toOid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
