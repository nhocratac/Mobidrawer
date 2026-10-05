package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
public class BoardElementService {
    private final BoardElementRepository repo;
    private final MongoTemplate mongo;
    private final BoardService boardService;

    public void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }

    public List<BoardElement> listByBoard(String boardId) {
        return repo.findByBoardIdOrderByZAsc(boardId);
    }

    public List<BoardElement> create(String boardId, String userId, List<BoardElement> elements) {
        requireEditor(boardId, userId);
        elements.forEach(ElementValidator::validate);
        Set<String> batchTargets = new HashSet<>();
        elements.stream().filter(e -> !"connector".equals(e.getType())).forEach(e -> batchTargets.add(e.getId()));
        elements.stream().filter(e -> "connector".equals(e.getType()))
                .forEach(e -> requireConnectorEnds(boardId, e.getConnector(), batchTargets));
        Set<String> existing = new HashSet<>();
        repo.findAllById(elements.stream().map(BoardElement::getId).filter(Objects::nonNull).toList())
                .forEach(e -> existing.add(e.getId()));
        List<BoardElement> fresh = elements.stream()
                .filter(e -> e.getId() == null || !existing.contains(e.getId()))
                .toList();
        fresh.forEach(e -> {
            e.setBoardId(boardId);
            e.setOwner(userId);
            e.setVersion(1L);
            e.setMigratedFrom(null);
        });
        return fresh.isEmpty() ? List.of() : repo.insert(fresh);
    }

    public List<Map<String, Object>> patch(String boardId, String userId, List<ElementPatches.ElementPatch> patches) {
        requireEditor(boardId, userId);
        // validate cả batch trước khi ghi, để không có patch nào được lưu mà không được broadcast
        List<Update> updates = patches.stream().map(p -> ElementPatches.toUpdate(p.set())).toList();
        patches.forEach(p -> {
            Object connector = p.set().get("connector");
            if (connector != null)
                requireConnectorEnds(boardId, ElementPatches.toConnector(connector), Set.of());
        });
        List<Map<String, Object>> applied = new ArrayList<>();
        for (int i = 0; i < patches.size(); i++) {
            ElementPatches.ElementPatch p = patches.get(i);
            Query q = Query.query(Criteria.where("_id").is(toOid(p.id())).and("boardId").is(toOid(boardId)));
            BoardElement after = mongo.findAndModify(q, updates.get(i), FindAndModifyOptions.options().returnNew(true), BoardElement.class);
            if (after != null) applied.add(Map.of("id", p.id(), "set", p.set(), "version", after.getVersion()));
        }
        return applied;
    }

    // Xoá element và mọi connector đang nối vào chúng; trả về toàn bộ id đã xoá
    public List<String> delete(String boardId, String userId, List<String> ids) {
        requireEditor(boardId, userId);
        if (ids.isEmpty()) return List.of();
        Object bid = toOid(boardId);
        List<BoardElement> connectors = mongo.find(Query.query(new Criteria().andOperator(
                Criteria.where("boardId").is(bid),
                Criteria.where("type").is("connector"),
                new Criteria().orOperator(
                        Criteria.where("connector.from.elementId").in(ids),
                        Criteria.where("connector.to.elementId").in(ids)))), BoardElement.class);
        List<String> all = new ArrayList<>(ids);
        connectors.forEach(c -> {
            if (!all.contains(c.getId())) all.add(c.getId());
        });
        mongo.remove(Query.query(Criteria.where("_id").in(all.stream().map(BoardElementService::toOid).toList())
                .and("boardId").is(bid)), BoardElement.class);
        return all;
    }

    // Hai đầu connector phải là element (không phải connector) thuộc cùng board, hoặc nằm trong batch đang tạo
    private void requireConnectorEnds(String boardId, BoardElement.ConnectorData connector, Set<String> batchTargets) {
        List<String> missing = new ArrayList<>();
        for (BoardElement.End end : List.of(connector.getFrom(), connector.getTo()))
            if (!batchTargets.contains(end.getElementId())) missing.add(end.getElementId());
        if (missing.isEmpty()) return;
        long found = mongo.count(Query.query(Criteria.where("_id").in(missing.stream().map(BoardElementService::toOid).toList())
                .and("boardId").is(toOid(boardId)).and("type").ne("connector")), BoardElement.class);
        if (found != missing.size()) throw new IllegalArgumentException("connector end not found on this board");
    }

    static Object toOid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
