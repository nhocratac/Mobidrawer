package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.domain.model.StickyNote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Copy stickyNote + Images sang boardElements. Không xoá dữ liệu cũ.
 * initial: chèn các doc chưa có (idempotent), kiểm tra số lượng theo board.
 * delta:   chỉ xử lý doc cũ có updateAt sau `since`; chèn nếu chưa có,
 *          cập nhật nếu element vẫn version 0 (chưa sửa qua API mới),
 *          và xoá bản copy version 0 mà doc cũ đã bị xoá.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ElementMigration {
    private final MongoTemplate mongo;

    public Map<String, Integer> run(boolean delta, LocalDateTime since) {
        Query legacyQuery = new Query().with(Sort.by("_id"));
        if (delta) legacyQuery.addCriteria(Criteria.where("updateAt").gt(since));
        List<StickyNote> stickies = mongo.find(legacyQuery, StickyNote.class);
        List<Image> images = mongo.find(Query.of(legacyQuery), Image.class);

        // z: sticky trước, image sau (khớp thứ tự render cũ), trong mỗi loại theo _id
        Map<String, Integer> nextZ = new HashMap<>();
        List<BoardElement> mapped = new ArrayList<>();
        for (StickyNote s : stickies)
            mapped.add(LegacyElementMapper.fromSticky(s, nextZ.merge(String.valueOf(s.getBoardId()), 1, Integer::sum)));
        for (Image i : images)
            mapped.add(LegacyElementMapper.fromImage(i, nextZ.merge(String.valueOf(i.getBoardId()), 1, Integer::sum)));

        Map<String, BoardElement> existing = new HashMap<>();
        List<String> ids = mapped.stream().map(BoardElement::getId).toList();
        mongo.find(Query.query(Criteria.where("_id").in(ids.stream().map(BoardElementService::toOid).toList())), BoardElement.class)
                .forEach(e -> existing.put(e.getId(), e));

        int inserted = 0, updated = 0;
        for (BoardElement e : mapped) {
            BoardElement current = existing.get(e.getId());
            if (current == null) {
                mongo.insert(e);
                inserted++;
            } else if (delta && current.getVersion() == 0) {
                Update u = new Update().set("x", e.getX()).set("y", e.getY()).set("w", e.getW()).set("h", e.getH())
                        .set("text", e.getText()).set("style", e.getStyle()).set("image", e.getImage());
                mongo.updateFirst(Query.query(Criteria.where("_id").is(BoardElementService.toOid(e.getId()))), u, BoardElement.class);
                updated++;
            }
        }
        int deleted = delta ? deleteStaleCopies() : 0;
        if (!delta) verifyCounts(stickies, images);
        log.info("element migration mode={} inserted={} updated={} deleted={} legacySticky={} legacyImage={}",
                delta ? "delta" : "initial", inserted, updated, deleted, stickies.size(), images.size());
        return Map.of("inserted", inserted, "updated", updated, "deleted", deleted);
    }

    // Bản copy chưa từng bị sửa qua API mới (version 0) mà doc gốc đã bị xoá ở collection cũ
    static List<String> staleMigratedIds(List<BoardElement> migrated, Set<String> legacyIds) {
        return migrated.stream()
                .filter(e -> e.getVersion() == 0 && !legacyIds.contains(e.getId()))
                .map(BoardElement::getId)
                .toList();
    }

    private int deleteStaleCopies() {
        Query idsOnly = new Query();
        idsOnly.fields().include("_id");
        Set<String> legacyIds = new HashSet<>();
        mongo.find(idsOnly, StickyNote.class).forEach(s -> legacyIds.add(s.getId()));
        mongo.find(Query.of(idsOnly), Image.class).forEach(i -> legacyIds.add(i.getId()));
        Query migratedQuery = Query.query(Criteria.where("migratedFrom").ne(null).and("version").is(0));
        migratedQuery.fields().include("_id", "version", "migratedFrom");
        List<String> stale = staleMigratedIds(mongo.find(migratedQuery, BoardElement.class), legacyIds);
        if (!stale.isEmpty())
            mongo.remove(Query.query(Criteria.where("_id").in(stale.stream().map(BoardElementService::toOid).toList())), BoardElement.class);
        return stale.size();
    }

    private void verifyCounts(List<StickyNote> stickies, List<Image> images) {
        Map<String, long[]> perBoard = new TreeMap<>();
        stickies.forEach(s -> perBoard.computeIfAbsent(String.valueOf(s.getBoardId()), k -> new long[2])[0]++);
        images.forEach(i -> perBoard.computeIfAbsent(String.valueOf(i.getBoardId()), k -> new long[2])[1]++);
        perBoard.forEach((boardId, legacy) -> {
            Criteria board = Criteria.where("boardId").is(BoardElementService.toOid(boardId));
            long sticky = mongo.count(Query.query(Criteria.where("migratedFrom").is("stickyNote").andOperator(board)), BoardElement.class);
            long image = mongo.count(Query.query(Criteria.where("migratedFrom").is("Images").andOperator(board)), BoardElement.class);
            log.info("board={} sticky={}/{} image={}/{}", boardId, legacy[0], sticky, legacy[1], image);
            if (sticky < legacy[0] || image < legacy[1])
                throw new IllegalStateException("migration count mismatch on board " + boardId);
        });
    }
}
