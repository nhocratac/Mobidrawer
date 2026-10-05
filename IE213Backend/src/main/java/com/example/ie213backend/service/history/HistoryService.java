package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

// Lịch sử board: timeline, xem trạng thái tại một seq, khôi phục (spec §8)
@Service
@RequiredArgsConstructor
public class HistoryService {
    static final int MAX_LIMIT = 100;

    private final ElementWriter writer;
    private final SnapshotJob snapshotJob;
    private final BoardService boardService;
    private final UserRepository userRepository;
    private final MongoTemplate mongo;

    public record TxView(String txId, String userId, String userName, Instant ts, String source, String state,
                         BoardTx.Summary summary, long seqTo) {
    }

    public record StateView(long seq, List<Map<String, Object>> elements) {
    }

    public List<TxView> list(String boardId, String userId, Long beforeSeq, int limit) {
        requireMember(boardId, userId);
        Criteria c = Criteria.where("boardId").is(oid(boardId)).and("state").ne("pending");
        if (beforeSeq != null) c = c.and("seqTo").lt(beforeSeq);
        Query q = Query.query(c).with(Sort.by(Sort.Direction.DESC, "seqTo"))
                .limit(Math.max(1, Math.min(MAX_LIMIT, limit)));
        List<BoardTx> txs = mongo.find(q, BoardTx.class);
        Map<String, String> names = userNames(txs);
        return txs.stream().map(t -> new TxView(t.getId(), t.getUserId(), names.getOrDefault(t.getUserId(), ""),
                t.getTs(), t.getSource(), t.getState(), t.getSummary(), t.getSeqTo())).toList();
    }

    public StateView stateAt(String boardId, String userId, long seq) {
        requireMember(boardId, userId);
        requireCommitted(boardId, seq);
        List<Map<String, Object>> elements = new ArrayList<>(stateMap(boardId, seq).values());
        elements.sort(Comparator.comparingDouble(HistoryService::z));
        return new StateView(seq, elements);
    }

    public Map<String, Map<String, Object>> stateMap(String boardId, long seq) {
        return snapshotJob.replayTo(boardId, seq);
    }

    public HistoryResult restore(String boardId, String userId, String sessionId, long seq) {
        if (!"OWNER".equals(boardService.getRoleOfMember(boardId, userId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ chủ bảng mới được khôi phục phiên bản");
        // đọc trạng thái + diff + ghi trong cùng một lock (sau roll-forward)
        return writer.withLock(boardId, () -> {
            requireCommitted(boardId, seq);
            // create của restore phải đóng dấu seq mới (§6.4), nên bỏ fieldSeq cũ của phiên bản đích
            List<Intent> intents = HistoryMath.diff(stateMap(boardId, seq), writer.loadBoard(boardId)).stream()
                    .map(i -> "create".equals(i.kind()) ? Intent.create(withoutFieldSeq(i.element())) : i)
                    .toList();
            if (intents.isEmpty()) return HistoryResult.empty("restore");
            ElementWriter.CommitResult res = writer.commit(new ElementWriter.CommitRequest(
                    boardId, userId, sessionId, "restore", intents, null, null));
            return res.isEmpty() ? HistoryResult.empty("restore")
                    : new HistoryResult("restore", res.ops().size(), List.of());
        });
    }

    private static Map<String, Object> withoutFieldSeq(Map<String, Object> element) {
        Map<String, Object> copy = new java.util.LinkedHashMap<>(element);
        copy.put("fieldSeq", new java.util.LinkedHashMap<String, Long>());
        return copy;
    }

    private void requireMember(String boardId, String userId) {
        if ("NONE".equals(boardService.getRoleOfMember(boardId, userId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem lịch sử bảng này");
    }

    private void requireCommitted(String boardId, long seq) {
        if (seq < 0 || seq > writer.committedSeq(boardId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seq vượt quá lịch sử đã commit");
    }

    private Map<String, String> userNames(List<BoardTx> txs) {
        Set<String> ids = new HashSet<>();
        txs.forEach(t -> {
            if (t.getUserId() != null) ids.add(t.getUserId());
        });
        Map<String, String> names = new HashMap<>();
        if (ids.isEmpty()) return names;
        userRepository.findAllById(ids).forEach(u -> names.put(u.getId(), fullName(u)));
        return names;
    }

    static String fullName(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName();
        String last = u.getLastName() == null ? "" : u.getLastName();
        return (first + " " + last).trim();
    }

    private static double z(Map<String, Object> el) {
        return el.get("z") instanceof Number n ? n.doubleValue() : 0;
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
