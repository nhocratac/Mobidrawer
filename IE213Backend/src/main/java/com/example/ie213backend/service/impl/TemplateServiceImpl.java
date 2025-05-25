package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.repository.TemplateRepository;
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

@Service
@RequiredArgsConstructor
public class TemplateServiceImpl implements TemplateService {

    final  private TemplateRepository templateRepository;

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

}
