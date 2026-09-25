package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/template")
@RequiredArgsConstructor
public class TemplateController {


    private final TemplateService templateService;

    // ✅ Get all templates
    @GetMapping
    public Page<Template> getAllTemplates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search
    ) {
        return templateService.getTemplates(page, size, search);
    }

    // ✅ Get templates by owner
    @GetMapping("/owner/{ownerId}")
    public List<Template> getTemplatesByOwner(@PathVariable String ownerId) {
        return templateService.findByOwner(ownerId);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Template>> getAllTemplates () {
        return ResponseEntity.ok(
                templateService.findAll()
        );
    }

    // ✅ Get template by ID
    @GetMapping("/{id}")
    public ResponseEntity<Template> getTemplateById(
            @PathVariable String id,
            @RequestAttribute(value = "user", required = false) UserDto userDto
    ) {
        return ResponseEntity.ok(templateService.getVisibleTemplate(id, userDto));
    }

    // ✅ Create a new template
    @PostMapping
    public ResponseEntity<Template> createTemplate(
            @RequestBody Template template,
            @RequestAttribute("user") UserDto userDto
    ) {
        template.setOwner(userDto.getId());

        return ResponseEntity.ok(templateService.createTemplate(template));
    }

    // ✅ Update a template
    @PutMapping("/{id}")
    public ResponseEntity<Template> updateTemplate(
            @PathVariable String id,
            @RequestBody Template updatedTemplate,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(templateService.updateTemplate(id, updatedTemplate, userDto));
    }

    // ✅ Delete a template
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable String id,
            @RequestAttribute("user") UserDto userDto
    ) {
        templateService.deleteTemplate(id, userDto);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/using/template/{id}")
    public ResponseEntity<Board> usingTemplate(
            @PathVariable String id,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(templateService.usingTemplate(templateService.getVisibleTemplate(id, userDto), userDto.getId()));
    }
}
