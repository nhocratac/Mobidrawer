package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.domain.dto.BoardDto.MemberDetailDTO;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.repository.BoardCustomRepository;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements BoardService {
    private final BoardRepository boardRepository;

    private final UserRepository userRepository;

    private final BoardCustomRepository boardCustomRepository;

    private final MongoTemplate mongoTemplate;
    private final NotificationService notificationService;

    @Override
    public BoardFullDetailResponse getBoard(String id, String userId) {
        //
        BoardFullDetailResponse foundBoard = boardCustomRepository.getBoardWithCanvasPaths(id);
        if (foundBoard == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found");
        }

        // Kiểm tra quyền truy cập
        boolean isOwner = Objects.equals(userId, foundBoard.getOwner());
        boolean isMember = foundBoard.getMembers().stream()
                .anyMatch(member -> Objects.equals(member.getMemberId(), userId));

        if (!isOwner && !isMember) {
            throw new RuntimeException("You are not allowed to access this board");
        }

        return foundBoard;
    }

    @Override
    public Board createBoard(Board board, String ownerId) {
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với id: " + ownerId));

        if (boardRepository.countByOwner(ownerId) >= 1 && (user.getPlan() == null || user.getPlan() == Plans.FREE)) {
            System.out.println(boardRepository.countByOwner(ownerId));
            throw new IllegalArgumentException("User đã đạt mức tối đã của plan Free!");
        }

        if (board.getMembers() == null) {
            board.setMembers(new ArrayList<>());
        }

        if (board.getOption() == null) {
            board.setOption(new Board.Option(
                    true,
                    "bg-slate-700"
            ));
        }
        board.setOwner(ownerId);
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
                .orElseThrow(() -> new IllegalArgumentException("Board not found with boardId: " + boardId));
//        User owner = userRepository.findById(ownerID)
//                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với id: " + ownerID));

        if (!Objects.equals(board.getOwner(), ownerID)) {
            throw new RuntimeException("You are not the owner of this board: " + boardId);
        }

        // Kiểm tra xem nếu user đang là plan free và số lượng member vượt quá cho phép là 3 hay chưa
//        if (board.getMembers().size() >= 3 && (owner.getPlan() == null || owner.getPlan() == Plans.FREE)) {
//            throw new IllegalArgumentException("Bạn đã vượt mức member tối đa cho phép ở board này!");
//        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        // Kiểm tra xem user đã là member hay chưa
        boolean isMember = board.getMembers().stream()
                .anyMatch(member -> member.getMemberId().equals(user.getId()));

        if (isMember || ownerID.equals(user.getId())) {
            throw new RuntimeException("User has already joined this board: " + boardId);
        }
        // Thêm user vào board
        board.getMembers().add(new Board.Member(user.getId(), role));
        notificationService.joinBoardSuccessful(ownerID, board, user);
        return boardRepository.save(board);
    }

    @Override
    public Board changeRoleOfMember(String boardId, String userId, Board.ROLE role, String ownerID) {
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

    @Override
    public List<MemberDetailDTO> getMembersDetail(String boardId) {
        MemberDetailDTO owner = boardCustomRepository.getOwnerWithMinimalInfo(boardId);
        List<MemberDetailDTO> members = boardCustomRepository.getBoardMembersWithMinimalInfo(boardId);

        List<MemberDetailDTO> allMembers = new ArrayList<>();
        allMembers.add(owner);
        allMembers.addAll(members);

        return allMembers;
    }

    @Override
    public String getRoleOfMember(String boardId, String userId) {
        Board board = boardRepository.findByid(boardId);
        if (board.getOwner().equals(userId)) {
            return "OWNER";
        }
        for (Board.Member member : board.getMembers()) {
            if (member.getMemberId().equals(userId)) {
                return member.getRole().toString();
            }
        }
        return "NONE";
    }

    @Override
    public Board updateThumbnail(String boardId, String userId, String newThumbnail) {
        String role = getRoleOfMember(boardId, userId);
        if (Objects.equals(role, "OWNER")) {
            Board board = boardRepository.findById(boardId)
                    .orElseThrow(() -> new IllegalArgumentException("Board not found with boardId: " + boardId));
            board.setThumbnail(newThumbnail);
            return boardRepository.save(board);
        } else
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn không được phép cập nhật thumnail cho board");
    }
}
