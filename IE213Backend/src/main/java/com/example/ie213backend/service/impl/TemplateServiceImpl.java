package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.*;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.repository.TemplateRepository;
import com.example.ie213backend.service.*;
import com.example.ie213backend.service.element.TemplateElementConverter;
import org.bson.types.ObjectId;
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
    private final BoardElementRepository boardElementRepository;

    @Override
    public List<Template> findAll() {
        return templateRepository.findAll();
    }

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
        oldTemplate.setImages(template.getImages());
        oldTemplate.setElements(template.getElements());
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

        List<CanvasPath> canvasPaths = convertCanvasPaths(
                template.getCanvasPaths() == null ? List.of() : template.getCanvasPaths(), ownerId, createdBoard.getId());
        if (!canvasPaths.isEmpty()) canvasPathService.createCanvasPaths(canvasPaths);

        List<BoardElement> elements = TemplateElementConverter.fromTemplate(template, () -> new ObjectId().toHexString());
        elements.forEach(e -> {
            e.setBoardId(createdBoard.getId());
            e.setOwner(ownerId);
            e.setVersion(1L);
        });
        if (!elements.isEmpty()) boardElementRepository.insert(elements);

        return createdBoard;
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


}
