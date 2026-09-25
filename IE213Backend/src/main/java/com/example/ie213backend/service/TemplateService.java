package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.Template;
import org.springframework.data.domain.Page;

import java.util.List;


public interface TemplateService {

    List<Template> findAll();
    Page<Template> getTemplates(int page, int size, String search);
    List<Template> findByOwner(String ownerId);
    Template getTemplate(String templateId);
    Template getVisibleTemplate(String templateId, UserDto viewer);
    Template createTemplate(Template template);
    void deleteTemplate(String templateId, UserDto actor);
    Template updateTemplate(String templateId, Template template, UserDto actor);
    Board usingTemplate(Template template, String ownerId);
}
