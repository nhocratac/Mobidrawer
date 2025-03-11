package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;


@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements BoardService {
    private final BoardRepository boardRepository;

    private final UserRepository userRepository;

    private final MongoTemplate mongoTemplate;

    @Override
    public Board getBoard(String id ) {
        return boardRepository.findByid(id);
    }

    @Override
    public Board createBoard(Board board) {
        if (board.getMembers() == null) {
            board.setMembers(new ArrayList<>());
        }

        if (board.getCanvasPaths() == null) {
            board.setCanvasPaths(new ArrayList<>());
        }
        return boardRepository.save(board);
    }

    @Override
    public CanvasPath addCanvasPath(String id, CanvasPath canvasPath) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update().push("canvasPath", canvasPath);
        mongoTemplate.updateFirst(query, update, Board.class);
        return canvasPath;
    }

    @Override
    public Board addMemberToBoard(String boardId, String email, Board.ROLE role, String ownerID) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found with boardId: " + boardId));

        if (!Objects.equals(board.getOwner(), ownerID)) {
            throw new RuntimeException("You are not the owner of this board: " + boardId);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        // Kiểm tra xem user đã là member hay chưa
        boolean isMember = board.getMembers().stream()
                .anyMatch(member -> member.getMemberId().equals(user.getId()));

        if (isMember || ownerID.equals(user.getId())) {
            throw new RuntimeException("User has already joined this board: " + boardId);
        }
        // Thêm user vào board
        board.getMembers().add(new Board.Member(user.getId(), role));

        return boardRepository.save(board);
    }

    @Override
    public Board  changeRoleOfMember(String boardId, String userId, Board.ROLE role,String ownerID) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found with boardId: " + boardId));

        if (!Objects.equals(board.getOwner(), ownerID)) {
            throw new RuntimeException("You are not the owner of this board: " + boardId);
        }

        board.getMembers().forEach(member -> {
            if (member.getMemberId().equals(userId)) {
                member.setRole(role);
            }
        });

        return boardRepository.save(board);
    }

    @Override
    public List<BoardDTO> findAllBoardofUser(String userId) {
        List<Board> a = boardRepository.findByOwnerOrMembersMemberId(userId);
        return a.stream().map(BoardMapper.INSTANCE::toDTO).toList();
    }
}
