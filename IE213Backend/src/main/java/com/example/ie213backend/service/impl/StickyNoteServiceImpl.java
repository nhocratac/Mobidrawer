package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.StickyNoteRepository;
import com.example.ie213backend.service.BoardService;
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

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class StickyNoteServiceImpl implements StickyNoteService {
    private final StickyNoteRepository stickyNoteRepository;
    private final BoardRepository boardRepository;
    private final MongoTemplate mongoTemplate;
    private final BoardService boardService;

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


    public StickyNote updateStickyNotePosition(String id,String boardId,String owner, int x, int y) {
        Query query = byIdAndBoard(id, boardId);
        Update update = new Update()
                .set("position.x", x)
                .set("position.y", y);
        return requireFound(mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),  // Trả về object đã cập nhật
                StickyNote.class
        ));
    }

    public StickyNote updateStickyNoteSize(StickyNote stickyNote) {
        Query query = byIdAndBoard(stickyNote.getId(), stickyNote.getBoardId());
        Update update = new Update()
                .set("size", stickyNote.getSize());
        return requireFound(mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                StickyNote.class
        ));
    }

    public StickyNote chaneTextStickyNote(StickyNote stickyNote) {
        Query query = byIdAndBoard(stickyNote.getId(), stickyNote.getBoardId());
        Update update = new Update()
                .set("text", stickyNote.getText());
        return requireFound(mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                StickyNote.class
        ));
    }

    // Every mutation is scoped by _id AND boardId so an id from another board matches nothing.
    private static Query byIdAndBoard(String id, String boardId) {
        return new Query(Criteria.where("_id").is(id).and("boardId").is(boardId));
    }

    private static StickyNote requireFound(StickyNote stickyNote) {
        if (stickyNote == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sticky note trên bảng này");
        }
        return stickyNote;
    }

    public void deleteStickyNote(String id, String boardId, String userId) {
        String role  = boardService.getRoleOfMember(boardId, userId);
        if(Objects.equals(role, "EDITOR") | Objects.equals(role,"OWNER"))
            stickyNoteRepository.deleteByIdAndBoardId(id, boardId);
        else
            throw new RuntimeException("Bạn không có quyền hoặc không tài tại tài sản này.");
    }

    @Override
    public List<StickyNote> createStickyNotes(List<StickyNote> stickyNotes) {
        if (stickyNotes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách sticky note không được để trống");
        }

        String boardId = stickyNotes.get(0).getBoardId();
        String owner = stickyNotes.get(0).getOwner();

        // Kiểm tra quyền truy cập bảng
        Board board = boardRepository.findUserRoleInBoard(boardId, owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này"));

        boolean isAllowed = board.getOwner().equals(owner) || board.getMembers().stream()
                .anyMatch(member -> member.getMemberId().equals(owner) && member.getRole() == Board.ROLE.EDITOR);

        if (!isAllowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này");
        }

        return stickyNoteRepository.saveAll(stickyNotes);
    }
}
