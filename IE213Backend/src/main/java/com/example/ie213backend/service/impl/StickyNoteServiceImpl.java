package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.StickyNoteRepository;
import com.example.ie213backend.service.StickyNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
@Service
@RequiredArgsConstructor
public class StickyNoteServiceImpl implements StickyNoteService {
    private final StickyNoteRepository stickyNoteRepository;
    private final BoardRepository boardRepository;
    private final MongoTemplate mongoTemplate;

    public StickyNote createStickyNote(StickyNote stickyNote) {
        String boardId = stickyNote.getBoardId();
        Board board = boardRepository.findUserRoleInBoard(boardId, stickyNote.getOwner())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này"));
        if(board.getOwner().equals(stickyNote.getOwner())) {

            return stickyNoteRepository.save(stickyNote);
        }
        if( board.getMembers().stream().anyMatch(
                member -> (member.getMemberId().equals(stickyNote.getOwner()) && member.getRole() == Board.ROLE.EDITOR)
        )) {
            return stickyNoteRepository.save(stickyNote);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này");
    }


    public  StickyNote updateStickyNotePosition(String id,String boardId,String owner, int x, int y) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update()
                .set("position.x", x)
                .set("position.y", y);
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),  // Trả về object đã cập nhật
                StickyNote.class
        );
    }

    public StickyNote updateStickyNoteSize(StickyNote stickyNote) {
        Query query = new Query(Criteria.where("_id").is(stickyNote.getId()));
        Update update = new Update()
                .set("size", stickyNote.getSize());
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                StickyNote.class
        );
    }

    public StickyNote chaneTextStickyNote(StickyNote stickyNote) {
        Query query = new Query(Criteria.where("_id").is(stickyNote.getId()));
        Update update = new Update()
                .set("text", stickyNote.getText());
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                StickyNote.class
        );
    }
}
