package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardElementServiceTest {
    @Mock
    BoardElementRepository repo;
    @Mock
    BoardService boardService;
    @Mock
    ElementWriter writer;
    @InjectMocks
    BoardElementService service;

    private static final String B = "650000000000000000000009";
    private static final String E1 = "650000000000000000000001";
    private static final String E2 = "650000000000000000000002";
    private static final String C3 = "650000000000000000000003";

    private BoardElement sticky(String id) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType("sticky");
        e.setW(200);
        e.setH(200);
        return e;
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement c = new BoardElement();
        c.setId(id);
        c.setType("connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        return c;
    }

    private static BoardOp op(String kind, String elementId, Map<String, Object> after, long v) {
        BoardOp o = new BoardOp();
        o.setKind(kind);
        o.setElementId(elementId);
        o.setAfter(after);
        o.setFsAfter(Map.of());
        o.setV(v);
        return o;
    }

    private ElementWriter.CommitRequest committed() {
        ArgumentCaptor<ElementWriter.CommitRequest> captor = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(writer).commit(captor.capture());
        return captor.getValue();
    }

    // writer giả: mỗi intent create thành một op create với v = 1
    private void writerCreatesEveryIntent() {
        when(writer.commit(any())).thenAnswer(inv -> {
            ElementWriter.CommitRequest r = inv.getArgument(0);
            List<BoardOp> ops = r.intents().stream().map(i -> op("create", i.elementId(), i.element(), 1L)).toList();
            return new ElementWriter.CommitResult("tx1", 1, ops.size(), ops);
        });
    }

    @Test
    void viewerCannotCreatePatchDelete() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("VIEWER");
        assertThrows(ResponseStatusException.class, () -> service.create("b", "u", "s1", List.of(new BoardElement())));
        assertThrows(ResponseStatusException.class, () -> service.patch("b", "u", "s1", List.of(), null));
        assertThrows(ResponseStatusException.class, () -> service.delete("b", "u", "s1", List.of("x")));
        verifyNoInteractions(repo, writer);
    }

    @Test
    void createStampsBoardOwnerAndCommitsAsUser() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        writerCreatesEveryIntent();
        BoardElement forged = sticky(E1);
        forged.setFieldSeq(Map.of("x", 999L));  // client gửi fieldSeq giả
        List<BoardElement> out = service.create(B, "u", "s1", List.of(forged));

        ElementWriter.CommitRequest req = committed();
        assertEquals(B, req.boardId());
        assertEquals("u", req.userId());
        assertEquals("s1", req.sessionId());
        assertEquals("user", req.source());
        assertNull(req.mergeKey());
        assertNull(req.target());
        assertEquals(1, req.intents().size());
        Intent intent = req.intents().get(0);
        assertEquals("create", intent.kind());
        assertEquals(E1, intent.elementId());
        assertEquals(B, intent.element().get("boardId"));
        assertEquals("u", intent.element().get("owner"));
        assertEquals(Map.of(), intent.element().get("fieldSeq"));  // fieldSeq của client bị bỏ

        assertEquals(1, out.size());
        assertEquals(E1, out.get(0).getId());
        assertEquals(B, out.get(0).getBoardId());
        assertEquals("u", out.get(0).getOwner());
        assertEquals(1L, out.get(0).getVersion());
    }

    @Test
    void createAssignsObjectIdWhenIdMissing() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        writerCreatesEveryIntent();
        List<BoardElement> out = service.create(B, "u", "s1", List.of(sticky(null)));
        String id = committed().intents().get(0).elementId();
        assertTrue(ElementValidator.isObjectId(id), "id phải là ObjectId hex: " + id);
        assertEquals(id, out.get(0).getId());
    }

    @Test
    void createReturnsEmptyWhenWriterDropsEverything() {
        // planner bỏ create có _id đã tồn tại: writer trả EMPTY
        when(boardService.getRoleOfMember(B, "u")).thenReturn("OWNER");
        when(writer.commit(any())).thenReturn(ElementWriter.CommitResult.EMPTY);
        assertTrue(service.create(B, "u", "s1", List.of(sticky(E1))).isEmpty());
        verifyNoInteractions(repo);
    }

    @Test
    void createRejectsInvalidElement() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("OWNER");
        BoardElement bad = sticky(E1);
        bad.setType("stroke");
        assertThrows(IllegalArgumentException.class, () -> service.create("b", "u", "s1", List.of(bad)));
        verifyNoInteractions(writer);
    }

    @Test
    void createSendsConnectorAndItsEndsInOneCommitWithoutReadingDb() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        writerCreatesEveryIntent();
        List<BoardElement> batch = List.of(sticky(E1), sticky(E2), connector(C3, E1, E2));
        assertEquals(3, service.create(B, "u", "s1", batch).size());
        assertEquals(List.of(E1, E2, C3), committed().intents().stream().map(Intent::elementId).toList());
        verifyNoInteractions(repo);
    }

    @Test
    void createPropagatesConnectorEndErrorFromWriter() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        when(writer.commit(any())).thenThrow(new IllegalArgumentException("connector end not found on this board"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.create(B, "u", "s1", List.of(connector(C3, E1, E2))));
        assertEquals("connector end not found on this board", ex.getMessage());
    }

    @Test
    void patchValidatesEveryItemBeforeWriting() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        List<ElementPatches.ElementPatch> patches = List.of(
                new ElementPatches.ElementPatch(E1, Map.of("x", 1)),
                new ElementPatches.ElementPatch(E2, Map.of("owner", "evil")));
        assertThrows(IllegalArgumentException.class, () -> service.patch("b", "u", "s1", patches, null));
        verifyNoInteractions(writer);
    }

    @Test
    void patchForwardsSessionAndMergeKeyAndReturnsAppliedVersions() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("tx1", 7, 7,
                List.of(op("patch", E1, Map.of("x", 1.0), 5L))));
        List<Map<String, Object>> out = service.patch(B, "u", "s1",
                List.of(new ElementPatches.ElementPatch(E1, Map.of("x", 1))), "text:" + E1 + ":ed1");

        ElementWriter.CommitRequest req = committed();
        assertEquals("text:" + E1 + ":ed1", req.mergeKey());
        assertEquals("s1", req.sessionId());
        assertEquals("user", req.source());
        assertEquals("patch", req.intents().get(0).kind());
        assertEquals(E1, req.intents().get(0).elementId());
        assertEquals(Map.of("x", 1.0), req.intents().get(0).set());
        assertEquals(List.of(Map.of("id", E1, "set", Map.of("x", 1.0), "version", 5L)), out);
    }

    @Test
    void latePatchForDeletedElementReturnsEmptyWithoutError() {
        // Review Focus 3: element vừa bị người khác xoá, planner bỏ patch nên writer trả EMPTY
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        when(writer.commit(any())).thenReturn(ElementWriter.CommitResult.EMPTY);
        List<Map<String, Object>> out = assertDoesNotThrow(() -> service.patch(B, "u", "s1",
                List.of(new ElementPatches.ElementPatch(E1, Map.of("text", "late"))), "text:" + E1 + ":ed1"));
        assertTrue(out.isEmpty());
    }

    @Test
    void patchPropagatesConnectorEndErrorFromWriter() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        when(writer.commit(any())).thenThrow(new IllegalArgumentException("connector end not found on this board"));
        Map<String, Object> set = Map.of("connector", Map.of(
                "from", Map.of("elementId", E1, "anchor", "auto"),
                "to", Map.of("elementId", "650000000000000000000008", "anchor", "auto")));
        assertThrows(IllegalArgumentException.class,
                () -> service.patch(B, "u", "s1", List.of(new ElementPatches.ElementPatch(C3, set)), null));
    }

    @Test
    void emptyPatchOrDeleteDoesNotTouchWriter() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        assertTrue(service.patch(B, "u", "s1", List.of(), null).isEmpty());
        assertTrue(service.delete(B, "u", "s1", List.of()).isEmpty());
        verifyNoInteractions(writer);
    }

    @Test
    void deleteReturnsCascadedIdsFromWriter() {
        when(boardService.getRoleOfMember(B, "u")).thenReturn("EDITOR");
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("tx1", 3, 4,
                List.of(op("delete", E1, null, 2L), op("delete", C3, null, 1L))));
        List<String> ids = service.delete(B, "u", "s1", List.of(E1));
        assertEquals(Set.of(E1, C3), new HashSet<>(ids));

        // cascade do planner tính trong lock: service chỉ gửi đúng id người dùng xoá
        ElementWriter.CommitRequest req = committed();
        assertEquals(1, req.intents().size());
        assertEquals("delete", req.intents().get(0).kind());
        assertEquals(E1, req.intents().get(0).elementId());
        assertEquals("s1", req.sessionId());
        assertEquals("user", req.source());
    }
}
