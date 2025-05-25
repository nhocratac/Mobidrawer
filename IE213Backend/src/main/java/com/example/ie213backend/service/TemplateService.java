package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.Template;
import org.springframework.data.domain.Page;

import java.util.List;


public interface TemplateService {

    Page<Template> getTemplates(int page, int size, String search);
    List<Template> findByOwner(String ownerId);
    Template getTemplate(String templateId);
    Template createTemplate(Template template);
    void deleteTemplate(String templateId);
    Template updateTemplate(Template template);

}
