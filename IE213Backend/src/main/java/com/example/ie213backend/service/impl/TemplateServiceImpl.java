package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.*;
import com.example.ie213backend.repository.TemplateRepository;
import com.example.ie213backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateServiceImpl implements TemplateService {

    final  private TemplateRepository templateRepository;

    final  private BoardService boardService;

    final  private CanvasPathService canvasPathService;
    private final StickyNoteService stickyNoteService;
    private final ImageService imageService;

    @Override
    public Page<Template> getTemplates(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (search != null && !search.isEmpty()) {
            return templateRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(search, pageable);
        } else {
            return templateRepository.findByIsPublicTrue(pageable);
        }
    }

    @Override
    public List<Template> findByOwner(String ownerId) {
        return templateRepository.findByOwnerAndIsPublicTrue(ownerId);
    }

    @Override
    public Template createTemplate(Template template) {
        return templateRepository.save(template);
    }

    @Override
    public Template updateTemplate(Template template) {
        Template oldTemplate = templateRepository.findById(template.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template không tồn tại"));

        // Cập nhật các trường bạn muốn (chỉ ví dụ, bạn có thể điều chỉnh logic cập nhật)
        oldTemplate.setTitle(template.getTitle());
        oldTemplate.setDescription(template.getDescription());
        oldTemplate.setCanvasPaths(template.getCanvasPaths());
        oldTemplate.setStickyNotes(template.getStickyNotes());
        oldTemplate.setPreviewImageUrl(template.getPreviewImageUrl());
        oldTemplate.setPublic(template.isPublic());

        return templateRepository.save(oldTemplate);
    }

    @Override
    public Template getTemplate(String templateId) {

        return templateRepository.findById(templateId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Template không tồn tại"));
    }

    @Override
    public void deleteTemplate(String templateId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template không tồn tại"));
        templateRepository.delete(template);
    }

    private Board buildBoardFromTemplate(Template template) {
        Board board = new Board();
        board.setThumbnail(template.getPreviewImageUrl());
        board.setOption(new Board.Option(true, "bg-slate-700"));
        board.setDescription(template.getDescription());
        board.setName(template.getTitle());
        board.setType("public");
        return board;
    }


    @Override
    public Board usingTemplate(Template template, String ownerId) {
        Board newBoard = buildBoardFromTemplate(template);
        Board createdBoard = boardService.createBoard(newBoard, ownerId);

        List<CanvasPath> canvasPaths = convertCanvasPaths(template.getCanvasPaths(), ownerId, createdBoard.getId());
        List<StickyNote> stickyNotes = convertStickyNotes(template.getStickyNotes(), ownerId, createdBoard.getId());
        List<Image> images = convertImages(template.getImages(), ownerId, createdBoard.getId());

        canvasPathService.createCanvasPaths(canvasPaths);
        stickyNoteService.createStickyNotes(stickyNotes);
        imageService.createImages(images);

        return createdBoard;
    }


    private List<StickyNote> convertStickyNotes(List<Template.StickyNote> stickyNotes, String ownerId, String boardId) {
        return stickyNotes.stream().map(item -> {
            StickyNote newNote = new StickyNote();
            newNote.setOwner(ownerId);
            newNote.setColor(item.getColor());
            newNote.setSize(new StickyNote.Size(item.getSize().getWidth(), item.getSize().getHeight()));
            newNote.setPosition(new StickyNote.Position(item.getPosition().getX(), item.getPosition().getY()));
            newNote.setText(item.getText());
            newNote.setBoardId(boardId);
            return newNote;
        }).toList();
    }

    private List<CanvasPath> convertCanvasPaths(List<Template.CanvasPath> canvasPaths, String ownerId, String boardId) {
        return canvasPaths.stream().map(item -> {
            CanvasPath newPath = new CanvasPath();
            newPath.setThickness(item.getThickness());
            newPath.setColor(item.getColor());
            newPath.setOpacity(item.getOpacity());
            newPath.setPaths(item.getPaths().stream()
                    .map(c -> new CanvasPath.Coordinate(c.getX(), c.getY()))
                    .collect(Collectors.toList()));
            newPath.setOwner(ownerId);
            newPath.setBoardId(boardId);
            return newPath;
        }).toList();
    }

    private List<Image> convertImages(List<Template.Image> images, String ownerId, String boardId) {
        return images.stream().map(
                item -> {
                    Image newImage = new Image();
                    newImage.setOwner(ownerId);
                    newImage.setBoardId(boardId);
                    newImage.setAlt(item.getAlt());
                    newImage.setUrl(item.getUrl());
                    newImage.setCloudinaryId(item.getCloudinaryId());
                    newImage.setSize(new Image.Size(item.getSize().getWidth(), item.getSize().getHeight()));
                    newImage.setPosition(new Image.Position(item.getPosition().getX(), item.getPosition().getY()));
                    return newImage;
                }).toList();
    }

}
