package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.ImageRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ImageServiceImpl implements ImageService {

    private final ImageRepository imageRepository;
    private final BoardRepository boardRepository;
    private final MongoTemplate mongoTemplate;
    private final BoardService boardService;

    @Override
    public Image createImage(Image image) {
        String boardId = image.getBoardId();
        Board board = boardRepository.findUserRoleInBoard(boardId, image.getOwner())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thêm ảnh vào bảng này"));

        boolean isAllowed = board.getOwner().equals(image.getOwner()) ||
                board.getMembers().stream().anyMatch(member ->
                        member.getMemberId().equals(image.getOwner()) && member.getRole() == Board.ROLE.EDITOR);

        if (!isAllowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thêm ảnh vào bảng này");
        }

        return imageRepository.save(image);
    }

    @Override
    public Image updateImagePosition(Image image) {
        Query query = byIdAndBoard(image.getId(), image.getBoardId());
        Update update = new Update()
                .set("position", image.getPosition());
        return requireFound(mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Image.class));
    }

    @Override
    public Image updateImageSize(Image image) {
        Query query = byIdAndBoard(image.getId(), image.getBoardId());
        Update update = new Update()
                .set("size", image.getSize());

        return requireFound(mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Image.class));
    }

    // Every mutation is scoped by _id AND boardId so an id from another board matches nothing.
    private static Query byIdAndBoard(String id, String boardId) {
        return new Query(Criteria.where("_id").is(id).and("boardId").is(boardId));
    }

    private static Image requireFound(Image image) {
        if (image == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh trên bảng này");
        }
        return image;
    }

    @Override
    public void deleteImage(String id, String boardId, String owner) {
        String role = boardService.getRoleOfMember(boardId, owner);
        if (Objects.equals(role, "EDITOR") || Objects.equals(role, "OWNER")) {
            imageRepository.deleteByIdAndBoardId(id, boardId);
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa ảnh này");
        }
    }

    @Override
    public List<Image> createImages(List<Image> images) {
        if (images.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách ảnh không được để trống");
        }

        String boardId = images.get(0).getBoardId();
        String owner = images.get(0).getOwner();

        Board board = boardRepository.findUserRoleInBoard(boardId, owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thêm ảnh vào bảng này"));

        boolean isAllowed = board.getOwner().equals(owner) ||
                board.getMembers().stream().anyMatch(member ->
                        member.getMemberId().equals(owner) && member.getRole() == Board.ROLE.EDITOR);

        if (!isAllowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thêm ảnh vào bảng này");
        }

        return imageRepository.saveAll(images);
    }
}
