package com.example.ie213backend.service.impl;

import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.domain.ReactionType;
import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactInfoDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentReactionDto;
import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.domain.model.CommentReaction;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.mapper.CommentMapper;
import com.example.ie213backend.mapper.CommentReactionMapper;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.repository.CommentReactionRepository;
import com.example.ie213backend.repository.CommentRepository;
import com.example.ie213backend.service.BlogService;
import com.example.ie213backend.service.CommentReactionService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

/**
 * Pure-JVM unit tests: comment create/update/delete and comment reactions take
 * the actor from the JWT-derived userId argument, never from the request body,
 * and legacy clients that still send the old actor fields are ignored (not 400).
 */
class RestIdorCommentActorTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final UserDto ACTOR = UserDto.builder().id("actor-1").build();

    private CommentRepository commentRepository;
    private BlogService blogService;
    private NotificationService notificationService;
    private CommentServiceImpl service;

    @BeforeEach
    void setUp() {
        commentRepository = Mockito.mock(CommentRepository.class);
        UserService userService = Mockito.mock(UserService.class);
        blogService = Mockito.mock(BlogService.class);
        CommentMapper commentMapper = Mockito.mock(CommentMapper.class);
        UserMapper userMapper = Mockito.mock(UserMapper.class);
        CommentReactionService reactionService = Mockito.mock(CommentReactionService.class);
        notificationService = Mockito.mock(NotificationService.class);
        ConfigService configService = Mockito.mock(ConfigService.class);

        User actor = new User();
        actor.setId("actor-1");
        actor.setFirstName("A");
        actor.setLastName("B");
        Mockito.when(userService.getUserById("actor-1")).thenReturn(actor);
        Mockito.when(blogService.getBlogById(eq("blog-1"), any())).thenReturn(BlogDto.builder().id("blog-1").title("T").build());
        Mockito.when(commentMapper.toEntity(any(CreateCommentDto.class))).thenAnswer(inv -> {
            CreateCommentDto dto = inv.getArgument(0);
            return Comment.builder().content(dto.getContent()).blogId(dto.getBlogId())
                    .repliedId(dto.getRepliedId()).parentComment(dto.isParentComment()).build();
        });
        Mockito.when(commentMapper.toDto(any(Comment.class))).thenReturn(new CommentDto());
        Mockito.when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId("new-comment");
            }
            return c;
        });
        Mockito.when(commentRepository.findByRepliedId(anyString(), any(Pageable.class))).thenReturn(Page.empty());
        Mockito.when(configService.getInt(any())).thenReturn(3);
        Mockito.when(reactionService.getCommentReactInfo(anyString(), any())).thenReturn(new CommentReactInfoDto());

        service = new CommentServiceImpl(commentRepository, userService, blogService, commentMapper,
                userMapper, reactionService, notificationService, configService);
    }

    @Test
    void createComment_authorIsJwtActor() {
        Mockito.when(commentRepository.findById("new-comment"))
                .thenAnswer(inv -> Optional.of(Comment.builder().id("new-comment").userId("actor-1").build()));

        CreateCommentDto dto = CreateCommentDto.builder().content("hi").blogId("blog-1").parentComment(true).build();
        service.createComment(dto, ACTOR);

        ArgumentCaptor<Comment> saved = ArgumentCaptor.forClass(Comment.class);
        Mockito.verify(commentRepository).save(saved.capture());
        assertEquals("actor-1", saved.getValue().getUserId());
    }

    @Test
    void createReply_notifiesRepliedOwner_notSelf() {
        Comment parent = Comment.builder().id("parent-1").userId("victim-1").build();
        Mockito.when(commentRepository.findById("parent-1")).thenReturn(Optional.of(parent));
        Mockito.when(commentRepository.findById("new-comment"))
                .thenAnswer(inv -> Optional.of(Comment.builder().id("new-comment").userId("actor-1").build()));

        CreateCommentDto dto = CreateCommentDto.builder().content("re").blogId("blog-1").repliedId("parent-1").build();
        service.createComment(dto, ACTOR);

        Mockito.verify(notificationService).sendNotification(anyString(), anyString(), eq(List.of("victim-1")));
    }

    @Test
    void updateComment_ownerActor_succeeds() {
        Comment own = Comment.builder().id("c-1").userId("actor-1").content("old").build();
        Mockito.when(commentRepository.findById("c-1")).thenReturn(Optional.of(own));

        service.updateComment(UpdateCommentDto.builder().commentId("c-1").content("new").build(), "actor-1");

        assertEquals("new", own.getContent());
        Mockito.verify(commentRepository).save(own);
    }

    @Test
    void updateComment_otherActor_rejectedAndNotSaved() {
        Comment others = Comment.builder().id("c-1").userId("victim-1").content("old").build();
        Mockito.when(commentRepository.findById("c-1")).thenReturn(Optional.of(others));

        assertThrows(IllegalArgumentException.class, () ->
                service.updateComment(UpdateCommentDto.builder().commentId("c-1").content("pwned").build(), "actor-1"));
        assertEquals("old", others.getContent());
        Mockito.verify(commentRepository, Mockito.never()).save(any());
    }

    @Test
    void deleteComment_otherActor_404AndNothingDeleted() {
        Mockito.when(commentRepository.findByIdAndUserId("c-1", "actor-1")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deleteComment("c-1", "actor-1"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        Mockito.verify(commentRepository, Mockito.never()).deleteById(anyString());
    }

    @Test
    void interactComment_reactionOwnedByJwtActor() {
        CommentReactionRepository repo = Mockito.mock(CommentReactionRepository.class);
        CommentReactionMapper mapper = Mockito.mock(CommentReactionMapper.class);
        Mockito.when(repo.findByUserIdAndCommentId("actor-1", "c-1")).thenReturn(Optional.empty());
        Mockito.when(repo.save(any(CommentReaction.class))).thenAnswer(inv -> inv.getArgument(0));
        CommentReactionServiceImpl reactionService = new CommentReactionServiceImpl(repo, mapper);

        CreateCommentReactionDto dto = CreateCommentReactionDto.builder().commentId("c-1").type(ReactionType.LIKE).build();
        reactionService.interactComment(dto, "actor-1");

        ArgumentCaptor<CommentReaction> saved = ArgumentCaptor.forClass(CommentReaction.class);
        Mockito.verify(repo).save(saved.capture());
        assertEquals("actor-1", saved.getValue().getUserId());
        Mockito.verify(repo).findByUserIdAndCommentId("actor-1", "c-1");
    }

    @Test
    void legacyActorFieldsInBody_areIgnored_notBoundAndNot400() throws Exception {
        // The app's ObjectMapper is a plain `new ObjectMapper()` (FAIL_ON_UNKNOWN_PROPERTIES on),
        // so the request DTOs must explicitly tolerate the removed actor fields.
        ObjectMapper om = new ObjectMapper();

        CreateCommentDto create = om.readValue(
                "{\"content\":\"x\",\"blogId\":\"b\",\"userId\":\"victim-1\"}", CreateCommentDto.class);
        UpdateCommentDto update = om.readValue(
                "{\"commentId\":\"c\",\"content\":\"x\",\"currentUserId\":\"victim-1\"}", UpdateCommentDto.class);
        CreateCommentReactionDto react = om.readValue(
                "{\"commentId\":\"c\",\"userId\":\"victim-1\",\"type\":\"LIKE\"}", CreateCommentReactionDto.class);

        assertEquals("b", create.getBlogId());
        assertEquals("c", update.getCommentId());
        assertEquals(ReactionType.LIKE, react.getType());
    }

    @Test
    void createComment_onUnpublishedBlog_404AndNotSaved() {
        Mockito.when(blogService.getBlogById("draft-1", ACTOR))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found with id: draft-1"));

        CreateCommentDto dto = CreateCommentDto.builder().content("hi").blogId("draft-1").parentComment(true).build();
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.createComment(dto, ACTOR));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        Mockito.verify(commentRepository, Mockito.never()).save(any(Comment.class));
    }

    @Test
    void listComments_onUnpublishedBlog_usesViewerVisibility404() {
        Mockito.when(blogService.getBlogById("draft-1", null))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found with id: draft-1"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getCommentsByBlogId("draft-1", null, null, Pageable.unpaged()));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        Mockito.verify(commentRepository, Mockito.never()).findByBlogIdAndParentComment(anyString(), Mockito.anyBoolean(), any());
    }
}
