package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardElementServiceTest {
    @Mock
    BoardElementRepository repo;
    @Mock
    MongoTemplate mongo;
    @Mock
    BoardService boardService;
    @InjectMocks
    BoardElementService service;

    private BoardElement sticky(String id) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType("sticky");
        e.setW(200);
        e.setH(200);
        return e;
    }

    @Test
    void viewerCannotCreatePatchDelete() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("VIEWER");
        assertThrows(ResponseStatusException.class, () -> service.create("b", "u", List.of(new BoardElement())));
        assertThrows(ResponseStatusException.class, () -> service.patch("b", "u", List.of()));
        assertThrows(ResponseStatusException.class, () -> service.delete("b", "u", List.of("x")));
        verifyNoInteractions(repo, mongo);
    }

    @Test
    void createStampsBoardOwnerVersion() {
        when(boardService.getRoleOfMember("650000000000000000000009", "u")).thenReturn("EDITOR");
        when(repo.findAllById(any())).thenReturn(List.of());
        when(repo.insert(anyList())).thenAnswer(inv -> inv.getArgument(0));
        List<BoardElement> out = service.create("650000000000000000000009", "u", List.of(sticky("650000000000000000000001")));
        assertEquals("650000000000000000000009", out.get(0).getBoardId());
        assertEquals("u", out.get(0).getOwner());
        assertEquals(1L, out.get(0).getVersion());
    }

    @Test
    void createSkipsExistingIds() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("OWNER");
        BoardElement e = sticky("650000000000000000000001");
        when(repo.findAllById(any())).thenReturn(List.of(e));
        assertTrue(service.create("b", "u", List.of(e)).isEmpty());
        verify(repo, never()).insert(anyList());
    }

    @Test
    void createRejectsInvalidElement() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("OWNER");
        BoardElement bad = sticky("650000000000000000000001");
        bad.setType("stroke");
        assertThrows(IllegalArgumentException.class, () -> service.create("b", "u", List.of(bad)));
        verify(repo, never()).insert(anyList());
    }

    @Test
    void deleteCascadesConnectors() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        BoardElement conn = new BoardElement();
        conn.setId("c1");
        when(mongo.find(any(Query.class), eq(BoardElement.class))).thenReturn(List.of(conn));
        List<String> ids = service.delete("b", "u", List.of("e1"));
        assertEquals(Set.of("e1", "c1"), new HashSet<>(ids));
        verify(mongo).remove(any(Query.class), eq(BoardElement.class));
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement c = new BoardElement();
        c.setId(id);
        c.setType("connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        return c;
    }

    @Test
    void patchValidatesEveryItemBeforeWriting() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        List<ElementPatches.ElementPatch> patches = List.of(
                new ElementPatches.ElementPatch("650000000000000000000001", java.util.Map.of("x", 1)),
                new ElementPatches.ElementPatch("650000000000000000000002", java.util.Map.of("owner", "evil")));
        assertThrows(IllegalArgumentException.class, () -> service.patch("b", "u", patches));
        verifyNoInteractions(mongo);
    }

    @Test
    void createRejectsConnectorWhoseEndIsNotOnThisBoard() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        when(mongo.count(any(Query.class), eq(BoardElement.class))).thenReturn(1L);
        BoardElement c = connector("650000000000000000000003", "650000000000000000000001", "650000000000000000000002");
        assertThrows(IllegalArgumentException.class, () -> service.create("b", "u", List.of(c)));
        verify(repo, never()).insert(anyList());
    }

    @Test
    void createAcceptsConnectorWhoseEndsExist() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        when(mongo.count(any(Query.class), eq(BoardElement.class))).thenReturn(2L);
        when(repo.findAllById(any())).thenReturn(List.of());
        when(repo.insert(anyList())).thenAnswer(inv -> inv.getArgument(0));
        BoardElement c = connector("650000000000000000000003", "650000000000000000000001", "650000000000000000000002");
        assertEquals(1, service.create("b", "u", List.of(c)).size());
    }

    @Test
    void createAcceptsConnectorWhoseEndsAreInTheSameBatch() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        when(repo.findAllById(any())).thenReturn(List.of());
        when(repo.insert(anyList())).thenAnswer(inv -> inv.getArgument(0));
        List<BoardElement> batch = List.of(sticky("650000000000000000000001"), sticky("650000000000000000000002"),
                connector("650000000000000000000003", "650000000000000000000001", "650000000000000000000002"));
        assertEquals(3, service.create("b", "u", batch).size());
        verify(mongo, never()).count(any(Query.class), eq(BoardElement.class));
    }

    @Test
    void patchRejectsConnectorRetargetToMissingElement() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        when(mongo.count(any(Query.class), eq(BoardElement.class))).thenReturn(1L);
        java.util.Map<String, Object> set = java.util.Map.of("connector", java.util.Map.of(
                "from", java.util.Map.of("elementId", "650000000000000000000001", "anchor", "auto"),
                "to", java.util.Map.of("elementId", "650000000000000000000009", "anchor", "auto")));
        assertThrows(IllegalArgumentException.class,
                () -> service.patch("b", "u", List.of(new ElementPatches.ElementPatch("650000000000000000000003", set))));
        verify(mongo, never()).findAndModify(any(Query.class), any(), any(), eq(BoardElement.class));
    }
}
