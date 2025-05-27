package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.repository.TemplateRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.StickyNoteService;
import com.example.ie213backend.service.TemplateService;
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

    @Override
    public Board usingTemplate(Template template, String ownerId) {
        Board newBoard = new Board();
        newBoard.setThumbnail(template.getPreviewImageUrl());
        newBoard.setOption(
                new Board.Option(
                        true,
                        "bg-slate-700"
                )
        );
        newBoard.setDescription(template.getDescription());
        newBoard.setName(template.getTitle());
        newBoard.setType("public");

        Board createdBoard = boardService.createBoard(newBoard, ownerId);
        List<CanvasPath> canvasPaths = template.getCanvasPaths().stream()
                .map(item -> {
                    CanvasPath newPath = new CanvasPath();
                    newPath.setThickness(item.getThickness());
                    newPath.setColor(item.getColor());
                    newPath.setOpacity(item.getOpacity());
                    List<CanvasPath.Coordinate> newCoordinates = item.getPaths().stream()
                            .map(coordinate -> new CanvasPath.Coordinate(coordinate.getX(), coordinate.getY()))
                            .collect(Collectors.toList());
                    newPath.setPaths(newCoordinates);
                    newPath.setOwner(ownerId);
                    newPath.setBoardId(createdBoard.getId());// nếu bạn muốn set lại owner là user hiện tại
                    return newPath;
                })
                .toList();

        List<StickyNote> newStickyNote= template.getStickyNotes().stream().map(
                item -> {
                    StickyNote newNote = new StickyNote();
                    newNote.setOwner(ownerId);
                    newNote.setColor(item.getColor());
                    newNote.setSize(
                            new StickyNote.Size(
                                    item.getSize().getWidth(),
                                    item.getSize().getHeight()
                            )
                    );
                    newNote.setPosition(
                            new StickyNote.Position(
                                    item.getPosition().getX(),
                                    item.getPosition().getY()
                            )
                    );
                    newNote.setText(item.getText());
                    newNote.setBoardId(createdBoard.getId());
                    return newNote;
                }
        ).toList();
        List<CanvasPath> canvasPathList = canvasPathService.createCanvasPaths(canvasPaths);
        List<StickyNote> stickyNoteList = stickyNoteService.createStickyNotes(newStickyNote);
        return createdBoard;
    }

}
