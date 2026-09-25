package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.InteractionAction;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Blog;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.mapper.BlogMapper;
import com.example.ie213backend.repository.BlogRepository;
import com.example.ie213backend.repository.TemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;

/**
 * Pure-JVM unit tests for blog visibility / interaction actor and template
 * ownership / visibility rules.
 */
class RestIdorBlogTemplateTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final UserDto OWNER = UserDto.builder().id("owner-1").role(UserRoles.USER).build();
    private static final UserDto STRANGER = UserDto.builder().id("stranger-1").role(UserRoles.USER).build();
    private static final UserDto ADMIN = UserDto.builder().id("admin-1").role(UserRoles.ADMIN).build();

    // ---------------------------------------------------------------- blogs

    private BlogRepository blogRepository;
    private BlogMapper blogMapper;
    private BlogServiceImpl blogService;

    @BeforeEach
    void setUpBlog() {
        blogRepository = Mockito.mock(BlogRepository.class);
        blogMapper = Mockito.mock(BlogMapper.class);
        Mockito.when(blogMapper.toDto(any(Blog.class))).thenAnswer(inv ->
                BlogDto.builder().id(((Blog) inv.getArgument(0)).getId()).build());
        blogService = new BlogServiceImpl(blogRepository, null, blogMapper);
    }

    private void stubBlog(boolean published) {
        Blog blog = Blog.builder().id("blog-1").owner("owner-1").isPublished(published).build();
        Mockito.when(blogRepository.findById("blog-1")).thenReturn(Optional.of(blog));
    }

    @Test
    void unpublishedBlog_anonymousOrStranger_404() {
        stubBlog(false);

        for (UserDto viewer : new UserDto[]{null, STRANGER}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> blogService.getBlogById("blog-1", viewer));
            assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
            assertEquals("Blog not found with id: blog-1", ex.getReason());
        }
    }

    @Test
    void unpublishedBlog_ownerOrAdmin_visible() {
        stubBlog(false);

        assertEquals("blog-1", blogService.getBlogById("blog-1", OWNER).getId());
        assertEquals("blog-1", blogService.getBlogById("blog-1", ADMIN).getId());
    }

    @Test
    void publishedBlog_anonymous_visible() {
        stubBlog(true);

        assertEquals("blog-1", blogService.getBlogById("blog-1", null).getId());
    }

    @Test
    void sitemap_onlyPublishedBlogs() {
        Mockito.when(blogRepository.findByIsPublished(true)).thenReturn(List.of(
                Blog.builder().id("pub-1").isPublished(true).build()));

        List<BlogDto> res = blogService.getAllBlogsID();

        assertEquals(1, res.size());
        Mockito.verify(blogRepository).findByIsPublished(true);
        Mockito.verify(blogRepository, Mockito.never()).findAll();
    }

    @Test
    void blogInteraction_ownerIsJwtActor() {
        stubBlog(true);
        Mockito.when(blogMapper.toEntity(any(BlogDto.class))).thenReturn(
                Blog.builder().id("blog-1").owner("owner-1").isPublished(true).build());
        Mockito.when(blogRepository.save(any(Blog.class))).thenAnswer(inv -> inv.getArgument(0));

        InteractionBlogDto dto = InteractionBlogDto.builder().blogId("blog-1").action(InteractionAction.LIKE).build();
        blogService.createOrRemoveInteraction(dto, UserDto.builder().id("actor-1").role(UserRoles.USER).build());

        ArgumentCaptor<Blog> saved = ArgumentCaptor.forClass(Blog.class);
        Mockito.verify(blogRepository).save(saved.capture());
        assertEquals(1, saved.getValue().getInteractions().size());
        assertEquals("actor-1", saved.getValue().getInteractions().get(0).getOwner());
    }

    @Test
    void blogInteraction_onUnpublishedBlog_stranger404AndNotSaved() {
        stubBlog(false);

        InteractionBlogDto dto = InteractionBlogDto.builder().blogId("blog-1").action(InteractionAction.LIKE).build();
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> blogService.createOrRemoveInteraction(dto, STRANGER));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        Mockito.verify(blogRepository, Mockito.never()).save(any(Blog.class));
    }

    @Test
    void blogInteraction_legacyOwnerFieldIgnored() throws Exception {
        InteractionBlogDto dto = new ObjectMapper().readValue(
                "{\"owner\":\"victim-1\",\"action\":\"LIKE\"}", InteractionBlogDto.class);

        assertEquals(InteractionAction.LIKE, dto.getAction());
    }

    // ------------------------------------------------------------ templates

    private TemplateRepository templateRepository;
    private TemplateServiceImpl templateService;

    private Template template(boolean isPublic) {
        Template t = new Template();
        t.setId("tpl-1");
        t.setOwner("owner-1");
        t.setTitle("orig");
        t.setPublic(isPublic);
        return t;
    }

    @BeforeEach
    void setUpTemplate() {
        templateRepository = Mockito.mock(TemplateRepository.class);
        Mockito.when(templateRepository.save(any(Template.class))).thenAnswer(inv -> inv.getArgument(0));
        templateService = new TemplateServiceImpl(templateRepository, null, null, null, null);
    }

    @Test
    void updateTemplate_loadsByPathId_andRejectsNonOwner() {
        Template stored = template(true);
        Mockito.when(templateRepository.findById("tpl-1")).thenReturn(Optional.of(stored));
        Template body = template(true);
        body.setId("someone-elses-tpl"); // body id must be ignored
        body.setTitle("pwned");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> templateService.updateTemplate("tpl-1", body, STRANGER));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("orig", stored.getTitle());
        Mockito.verify(templateRepository, Mockito.never()).save(any());
        Mockito.verify(templateRepository, Mockito.never()).findById("someone-elses-tpl");
    }

    @Test
    void updateTemplate_ownerOrAdmin_allowed() {
        Mockito.when(templateRepository.findById("tpl-1")).thenAnswer(inv -> Optional.of(template(true)));
        Template body = template(false);
        body.setTitle("new");

        assertEquals("new", templateService.updateTemplate("tpl-1", body, OWNER).getTitle());
        assertEquals("new", templateService.updateTemplate("tpl-1", body, ADMIN).getTitle());
    }

    @Test
    void deleteTemplate_nonOwner_403_ownerDeletes() {
        Template stored = template(true);
        Mockito.when(templateRepository.findById("tpl-1")).thenReturn(Optional.of(stored));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> templateService.deleteTemplate("tpl-1", STRANGER));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        Mockito.verify(templateRepository, Mockito.never()).delete(any());

        templateService.deleteTemplate("tpl-1", OWNER);
        Mockito.verify(templateRepository).delete(stored);
    }

    @Test
    void privateTemplate_hiddenFromAnonymousAndStranger_visibleToOwnerAndAdmin() {
        Template stored = template(false);
        Mockito.when(templateRepository.findById("tpl-1")).thenReturn(Optional.of(stored));

        for (UserDto viewer : new UserDto[]{null, STRANGER}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> templateService.getVisibleTemplate("tpl-1", viewer));
            assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        }
        assertSame(stored, templateService.getVisibleTemplate("tpl-1", OWNER));
        assertSame(stored, templateService.getVisibleTemplate("tpl-1", ADMIN));
    }

    @Test
    void publicTemplate_visibleToAnonymous() {
        Template stored = template(true);
        Mockito.when(templateRepository.findById("tpl-1")).thenReturn(Optional.of(stored));

        assertSame(stored, templateService.getVisibleTemplate("tpl-1", null));
    }

    @Test
    void findAll_onlyPublicTemplates() {
        Mockito.when(templateRepository.findByIsPublicTrue()).thenReturn(List.of(template(true)));

        assertEquals(1, templateService.findAll().size());
        Mockito.verify(templateRepository, Mockito.never()).findAll();
    }

    @Test
    void createTemplate_clearsClientSuppliedId() {
        Template body = template(true);
        body.setId("existing-victim-tpl");

        Template saved = templateService.createTemplate(body);

        assertNull(saved.getId());
    }
}
