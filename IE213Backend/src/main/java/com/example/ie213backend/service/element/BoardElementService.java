package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.history.ElementNormalizer;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

// Kiểm quyền + validate thuần ở đây (trước lock); mọi lệnh ghi đi qua ElementWriter
@Service
@RequiredArgsConstructor
public class BoardElementService {
    private final BoardElementRepository repo;
    private final BoardService boardService;
    private final ElementWriter writer;

    public void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }

    public List<BoardElement> listByBoard(String boardId) {
        return repo.findByBoardIdOrderByZAsc(boardId);
    }

    // Lọc _id trùng và kiểm đầu connector do planner làm trong lock
    public List<BoardElement> create(String boardId, String userId, String sessionId, List<BoardElement> elements) {
        requireEditor(boardId, userId);
        elements.forEach(ElementValidator::validate);
        List<Intent> intents = new ArrayList<>();
        for (BoardElement e : elements) {
            // cấp id ngay để intent và op log có elementId
            if (e.getId() == null) e.setId(new ObjectId().toHexString());
            e.setBoardId(boardId);
            e.setOwner(userId);
            e.setVersion(1L);
            e.setMigratedFrom(null);
            e.setFieldSeq(null);  // fieldSeq do server quản lý, không nhận từ client
            intents.add(Intent.create(ElementNormalizer.full(e)));
        }
        if (intents.isEmpty()) return List.of();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, null, null));
        List<BoardElement> created = new ArrayList<>();
        for (BoardOp op : result.ops()) {
            if (!"create".equals(op.getKind())) continue;
            BoardElement e = ElementNormalizer.toElement(op.getAfter());
            e.setVersion(op.getV());
            if (op.getFsAfter() != null) e.setFieldSeq(new HashMap<>(op.getFsAfter()));
            created.add(e);
        }
        return created;
    }

    public List<Map<String, Object>> patch(String boardId, String userId, String sessionId,
                                           List<ElementPatches.ElementPatch> patches, String mergeKey) {
        requireEditor(boardId, userId);
        // validate cả batch trước khi ghi (normalizeSet gọi ElementPatches.toUpdate)
        List<Intent> intents = patches.stream()
                .map(p -> Intent.patch(p.id(), ElementNormalizer.normalizeSet(p.set())))
                .toList();
        if (intents.isEmpty()) return List.of();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, mergeKey, null));
        // patch vào id vừa bị xoá bị planner bỏ lặng lẽ: kết quả rỗng, không lỗi
        List<Map<String, Object>> applied = new ArrayList<>();
        for (BoardOp op : result.ops())
            if ("patch".equals(op.getKind()))
                applied.add(Map.of("id", op.getElementId(), "set", op.getAfter(), "version", op.getV()));
        return applied;
    }

    // Planner tự cascade connector nối vào các id bị xoá; trả về toàn bộ id đã xoá
    public List<String> delete(String boardId, String userId, String sessionId, List<String> ids) {
        requireEditor(boardId, userId);
        if (ids.isEmpty()) return List.of();
        List<Intent> intents = ids.stream().distinct().map(Intent::delete).toList();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, null, null));
        return result.ops().stream()
                .filter(op -> "delete".equals(op.getKind()))
                .map(BoardOp::getElementId)
                .toList();
    }

    static Object toOid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
