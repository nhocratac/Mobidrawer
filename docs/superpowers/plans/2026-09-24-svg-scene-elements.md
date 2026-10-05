# SVG Scene + Unified Elements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay board `react-rnd` bằng một SVG scene thống nhất (sticky, image, shape, connector) lưu trong collection `boardElements`, đồng bộ realtime qua STOMP; pencil giữ `<canvas>`.

**Architecture:** BE thêm `BoardElement` + `BoardElementService` + STOMP `/app/board/{id}/el/*` → `/topic/board/{id}/el`, load board trả `elements`, job migrate copy từ `stickyNote`/`Images`. FE thêm `components/Scene/*` (render SVG + pointer state machine) và `sceneStore` (zustand); logic hình học là hàm thuần trong `geometry.ts` có unit test.

**Tech Stack:** Spring Boot 3.4.3 / Java 17 / MongoDB / STOMP simple broker; Next.js 14 / React 18 / zustand 5 / immer / @stomp/stompjs; Vitest (mới, devDependency) cho hàm thuần FE; JUnit 5 + Mockito (đã có trong `spring-boot-starter-test`).

**Spec:** `docs/superpowers/specs/2026-09-24-svg-scene-elements-design.md`

## Global Constraints

- Java build dùng JDK 17: `export JAVA_HOME=/Users/lap14671/Library/Java/JavaVirtualMachines/ms-17.0.18/Contents/Home` (JDK 25 mặc định làm Lombok crash — đã kiểm: `TypeTag :: UNKNOWN`).
- Không commit / push / PR khi user chưa yêu cầu (thay bước "Commit" của skill bằng "Checkpoint": chạy lệnh verify).
- Không chạy migration lên DB thật; chỉ Mongo local docker `mongo:7`.
- Không xoá collection / handler legacy (`stickyNote`, `Images`, `@MessageMapping` sticky/image).
- Pencil (`canvasPaths`, topic `/topic/draw/board/*`, `/topic/board/*-paths/*`) giữ nguyên dữ liệu và socket.
- Baseline `npx tsc --noEmit` có 118 lỗi, tất cả `TS2307` do thiếu `next-env.d.ts` (gitignored). Tiêu chí: không thêm lỗi mới ngoài `TS2307`.
- Kích thước tối thiểu element: 50×50 world; zoom clamp `[0.1, 5]`; text ≤ 10 000 ký tự; STOMP message ≤ 128KB (`WebSocketConfig.java:40`).
- Tailwind class màu sticky giữ nguyên chuỗi khi lưu; render SVG dùng bảng map class → hex, class lạ → `#fde68a`.

## Review Focus

1. Người dùng VIEWER kéo/xoá element → không có thay đổi nào được lưu, UI không cho thao tác (test: service từ chối VIEWER — Task 2; UI ẩn tool — Task 13).
2. Xoá một element có connector gắn vào → connector biến mất ở mọi client và trong DB (test: `delete` cascade — Task 2; store `applyRemote delete` xoá connector theo reverse index — Task 8).
3. Element đã xoay: resize bằng handle và điểm neo connector phải khớp với cạnh đã xoay (test: `geometry.resizeRotated`, `anchorPoint` với rotation — Task 7).
4. Remote patch cũ hơn đến sau patch mới (reorder mạng) → không được ghi đè (test: store bỏ patch có `version` ≤ local — Task 8).
5. Gõ chữ trong sticky/shape rồi nhấn Backspace/Delete → chỉ xoá ký tự, không xoá element (test: `shouldHandleDeleteKey` bỏ qua target là textarea/input/contentEditable — Task 11).

---

## Shared contracts

### Element (FE `client/components/Scene/types.ts`, BE `BoardElement`)

```ts
export type ElementType = "sticky" | "image" | "shape" | "connector";
export type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "arrow";
export type Anchor = "auto" | "top" | "right" | "bottom" | "left";
export interface ConnectorEnd { elementId: string; anchor: Anchor }
export interface ElementStyle { fill?: string; stroke?: string; strokeWidth?: number; fontSize?: number }
export interface BoardElement {
  id: string;
  boardId: string;
  type: ElementType;
  x: number; y: number; w: number; h: number;
  rotation: number;           // degrees, around centre
  z: number;
  owner?: string;
  version: number;
  updateAt?: string;
  text?: string;
  style?: ElementStyle;
  image?: { url: string; cloudinaryId?: string; alt?: string };
  shape?: { kind: ShapeKind };  // line/arrow: segment (x,y)->(x+w,y+h), w/h may be negative
  connector?: { from: ConnectorEnd; to: ConnectorEnd };
}
export type ElementPatchSet = Partial<Pick<BoardElement,
  "x"|"y"|"w"|"h"|"rotation"|"z"|"text"|"style"|"shape"|"connector">>;
export interface ElementPatch { id: string; set: ElementPatchSet; version?: number }
export interface ElementEvent {
  op: "create" | "patch" | "preview" | "delete" | "lock" | "unlock";
  senderSessionId: string;
  userId: string;
  elements?: BoardElement[];
  patches?: ElementPatch[];
  ids?: string[];
}
```

### STOMP
- Publish: `/app/board/{boardId}/el/create` `{elements}`, `/el/patch` `{patches}`, `/el/preview` `{patches}`, `/el/delete` `{ids}`, `/el/lock` `{id}`, `/el/unlock` `{id}`.
- Subscribe: `/topic/board/{boardId}/el` → `ElementEvent`; errors `/user/queue/errors` → `{op, ids, reason}`.

### ObjectId sinh ở client
```ts
export function newObjectId(): string // 24 hex: 8 hex seconds + 16 random hex
```

---

## Phase P1 — Backend

### Task 1: `BoardElement` model, repository, validator

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardElement.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/repository/BoardElementRepository.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/element/ElementValidator.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/element/ElementValidatorTest.java`

**Interfaces:**
- Produces: `BoardElement` (Lombok `@Data`, `@Document("boardElements")`, `@CompoundIndexes` `{boardId:1,z:1}`, `{boardId:1,'connector.from.elementId':1}`, `{boardId:1,'connector.to.elementId':1}`; nested static classes `Style`, `ImageData`, `ShapeData`, `ConnectorData`, `End`); `BoardElementRepository extends MongoRepository<BoardElement,String>` with `List<BoardElement> findByBoardIdOrderByZAsc(String boardId)`; `ElementValidator.validate(BoardElement e)` throws `IllegalArgumentException`.

- [ ] **Step 1: Write failing tests**

```java
package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ElementValidatorTest {
    private BoardElement base(String type) {
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000001");
        e.setType(type);
        e.setW(100); e.setH(80);
        return e;
    }
    @Test void acceptsSticky() { assertDoesNotThrow(() -> ElementValidator.validate(base("sticky"))); }
    @Test void rejectsUnknownType() { assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(base("stroke"))); }
    @Test void imageNeedsUrl() {
        BoardElement e = base("image");
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setImage(new BoardElement.ImageData("https://res.cloudinary.com/x.png", "cid", "alt"));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }
    @Test void shapeNeedsKnownKind() {
        BoardElement e = base("shape");
        e.setShape(new BoardElement.ShapeData("star"));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setShape(new BoardElement.ShapeData("ellipse"));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }
    @Test void connectorNeedsTwoDistinctEnds() {
        BoardElement e = base("connector");
        e.setConnector(new BoardElement.ConnectorData(
            new BoardElement.End("a", "auto"), new BoardElement.End("a", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setConnector(new BoardElement.ConnectorData(
            new BoardElement.End("a", "auto"), new BoardElement.End("b", "left")));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }
    @Test void rejectsBadAnchorAndLongText() {
        BoardElement e = base("connector");
        e.setConnector(new BoardElement.ConnectorData(
            new BoardElement.End("a", "middle"), new BoardElement.End("b", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        BoardElement s = base("sticky");
        s.setText("x".repeat(10_001));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(s));
    }
    @Test void rejectsNonHexId() {
        BoardElement e = base("sticky");
        e.setId("not-an-id");
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
    }
}
```

- [ ] **Step 2: Run** `cd IE213Backend && mvn -q test -Dtest=ElementValidatorTest` → FAIL (classes missing).
- [ ] **Step 3: Implement** `BoardElement` (fields per Shared contracts; `boardId`, `owner` with `@Field(targetType = FieldType.OBJECT_ID)`; `updateAt` `@LastModifiedDate` + same Jackson annotations as `StickyNote.java:42-46`; `x,y,w,h,rotation,z` `double`; `version` `long`; `migratedFrom` String) and `ElementValidator`:

```java
public final class ElementValidator {
    public static final Set<String> TYPES = Set.of("sticky", "image", "shape", "connector");
    public static final Set<String> KINDS = Set.of("rect", "ellipse", "triangle", "line", "arrow");
    public static final Set<String> ANCHORS = Set.of("auto", "top", "right", "bottom", "left");
    public static final int MAX_TEXT = 10_000;
    private static final java.util.regex.Pattern OID = java.util.regex.Pattern.compile("^[0-9a-f]{24}$");
    private ElementValidator() {}
    public static void validate(BoardElement e) {
        if (e.getId() != null && !OID.matcher(e.getId()).matches()) throw new IllegalArgumentException("invalid id");
        if (!TYPES.contains(e.getType())) throw new IllegalArgumentException("invalid type");
        if (e.getText() != null && e.getText().length() > MAX_TEXT) throw new IllegalArgumentException("text too long");
        switch (e.getType()) {
            case "image" -> { if (e.getImage() == null || e.getImage().getUrl() == null || e.getImage().getUrl().isBlank()) throw new IllegalArgumentException("image.url required"); }
            case "shape" -> { if (e.getShape() == null || !KINDS.contains(e.getShape().getKind())) throw new IllegalArgumentException("invalid shape.kind"); }
            case "connector" -> validateConnector(e.getConnector());
            default -> {}
        }
    }
    public static void validateConnector(BoardElement.ConnectorData c) {
        if (c == null || c.getFrom() == null || c.getTo() == null) throw new IllegalArgumentException("connector ends required");
        for (BoardElement.End end : List.of(c.getFrom(), c.getTo())) {
            if (end.getElementId() == null || end.getElementId().isBlank()) throw new IllegalArgumentException("end.elementId required");
            if (!ANCHORS.contains(end.getAnchor())) throw new IllegalArgumentException("invalid anchor");
        }
        if (c.getFrom().getElementId().equals(c.getTo().getElementId())) throw new IllegalArgumentException("self connector");
    }
}
```

- [ ] **Step 4: Run** same test → PASS.
- [ ] **Step 5: Checkpoint** `mvn -q -DskipTests compile` → exit 0.

### Task 2: `BoardElementService` (create / patch / delete, role, cascade)

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/element/BoardElementService.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/element/ElementPatches.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/element/ElementPatchesTest.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/element/BoardElementServiceTest.java`

**Interfaces:**
- Consumes: `BoardElement`, `BoardElementRepository`, `ElementValidator`, `BoardService.getRoleOfMember(boardId,userId)` (returns `"OWNER"|"EDITOR"|"VIEWER"|...`, see `CanvasPathServiceImpl.java:55-58`).
- Produces:
  - `List<BoardElement> listByBoard(String boardId)`
  - `List<BoardElement> create(String boardId, String userId, List<BoardElement> elements)` — sets boardId/owner/version=1/rotation default 0; skips ids already existing (idempotent); returns inserted.
  - `List<Map<String,Object>> patch(String boardId, String userId, List<ElementPatch> patches)` — returns `[{id,set,version}]` for patches that matched.
  - `List<String> delete(String boardId, String userId, List<String> ids)` — returns ids deleted incl. cascaded connectors.
  - `void requireEditor(String boardId, String userId)` throws `ResponseStatusException(FORBIDDEN)`.
  - record `ElementPatch(String id, Map<String,Object> set)` in `ElementPatches`.
  - `ElementPatches.toUpdate(Map<String,Object> set)` → `org.springframework.data.mongodb.core.query.Update` whitelisting `x,y,w,h,rotation,z,text,style,shape,connector`, adds `inc("version",1)` and `currentDate("updateAt")`; throws `IllegalArgumentException` on unknown key, on non-numeric geometry, on text > 10 000, on invalid connector (via `ElementValidator.validateConnector` after `objectMapper.convertValue`).

- [ ] **Step 1: Failing tests**

```java
class ElementPatchesTest {
    @Test void whitelistsGeometryAndBumpsVersion() {
        Update u = ElementPatches.toUpdate(Map.of("x", 10, "y", 20.5));
        Document set = (Document) u.getUpdateObject().get("$set");
        assertEquals(10.0, ((Number) set.get("x")).doubleValue());
        assertEquals(20.5, ((Number) set.get("y")).doubleValue());
        assertEquals(1, ((Document) u.getUpdateObject().get("$inc")).get("version"));
    }
    @Test void rejectsUnknownKey() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("boardId", "x")));
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("owner", "x")));
    }
    @Test void rejectsNonNumericGeometry() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("w", "100px")));
    }
    @Test void rejectsEmptySet() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of()));
    }
    @Test void validatesConnector() {
        Map<String, Object> bad = Map.of("connector", Map.of(
            "from", Map.of("elementId", "a", "anchor", "auto"),
            "to", Map.of("elementId", "a", "anchor", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(bad));
    }
}
```

```java
@ExtendWith(MockitoExtension.class)
class BoardElementServiceTest {
    @Mock BoardElementRepository repo;
    @Mock MongoTemplate mongo;
    @Mock BoardService boardService;
    @InjectMocks BoardElementService service;

    @Test void viewerCannotCreatePatchDelete() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("VIEWER");
        assertThrows(ResponseStatusException.class, () -> service.create("b", "u", List.of(new BoardElement())));
        assertThrows(ResponseStatusException.class, () -> service.patch("b", "u", List.of()));
        assertThrows(ResponseStatusException.class, () -> service.delete("b", "u", List.of("x")));
        verifyNoInteractions(repo, mongo);
    }
    @Test void createStampsBoardOwnerVersion() {
        when(boardService.getRoleOfMember("650000000000000000000009", "u")).thenReturn("EDITOR");
        when(repo.findAllById(any())).thenReturn(List.of());
        when(repo.insert(anyList())).thenAnswer(inv -> inv.getArgument(0));
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000001"); e.setType("sticky"); e.setW(200); e.setH(200);
        List<BoardElement> out = service.create("650000000000000000000009", "u", List.of(e));
        assertEquals("650000000000000000000009", out.get(0).getBoardId());
        assertEquals("u", out.get(0).getOwner());
        assertEquals(1L, out.get(0).getVersion());
    }
    @Test void createSkipsExistingIds() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("OWNER");
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000001"); e.setType("sticky");
        when(repo.findAllById(any())).thenReturn(List.of(e));
        assertTrue(service.create("b", "u", List.of(e)).isEmpty());
        verify(repo, never()).insert(anyList());
    }
    @Test void deleteCascadesConnectors() {
        when(boardService.getRoleOfMember("b", "u")).thenReturn("EDITOR");
        BoardElement conn = new BoardElement(); conn.setId("c1");
        when(mongo.find(any(Query.class), eq(BoardElement.class))).thenReturn(List.of(conn));
        List<String> ids = service.delete("b", "u", List.of("e1"));
        assertEquals(Set.of("e1", "c1"), new HashSet<>(ids));
        verify(mongo).remove(any(Query.class), eq(BoardElement.class));
    }
}
```

- [ ] **Step 2: Run** `mvn -q test -Dtest='ElementPatchesTest,BoardElementServiceTest'` → FAIL.
- [ ] **Step 3: Implement.** Key parts:

```java
@Service
@RequiredArgsConstructor
public class BoardElementService {
    private final BoardElementRepository repo;
    private final MongoTemplate mongo;
    private final BoardService boardService;

    public void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }
    public List<BoardElement> listByBoard(String boardId) { return repo.findByBoardIdOrderByZAsc(boardId); }

    public List<BoardElement> create(String boardId, String userId, List<BoardElement> elements) {
        requireEditor(boardId, userId);
        elements.forEach(ElementValidator::validate);
        Set<String> existing = new HashSet<>();
        repo.findAllById(elements.stream().map(BoardElement::getId).filter(Objects::nonNull).toList())
            .forEach(e -> existing.add(e.getId()));
        List<BoardElement> fresh = elements.stream().filter(e -> e.getId() == null || !existing.contains(e.getId())).toList();
        fresh.forEach(e -> { e.setBoardId(boardId); e.setOwner(userId); e.setVersion(1L); e.setMigratedFrom(null); });
        return fresh.isEmpty() ? List.of() : repo.insert(fresh);
    }

    public List<Map<String, Object>> patch(String boardId, String userId, List<ElementPatches.ElementPatch> patches) {
        requireEditor(boardId, userId);
        List<Map<String, Object>> applied = new ArrayList<>();
        for (ElementPatches.ElementPatch p : patches) {
            Update update = ElementPatches.toUpdate(p.set());
            Query q = Query.query(Criteria.where("_id").is(new ObjectId(p.id())).and("boardId").is(new ObjectId(boardId)));
            BoardElement after = mongo.findAndModify(q, update, FindAndModifyOptions.options().returnNew(true), BoardElement.class);
            if (after != null) applied.add(Map.of("id", p.id(), "set", p.set(), "version", after.getVersion()));
        }
        return applied;
    }

    public List<String> delete(String boardId, String userId, List<String> ids) {
        requireEditor(boardId, userId);
        List<ObjectId> oids = ids.stream().map(ObjectId::new).toList();  // ids validated as hex by caller
        ObjectId bid = new ObjectId(boardId);
        List<BoardElement> connectors = mongo.find(Query.query(Criteria.where("boardId").is(bid).and("type").is("connector")
            .orOperator(Criteria.where("connector.from.elementId").in(ids), Criteria.where("connector.to.elementId").in(ids))), BoardElement.class);
        List<String> all = new ArrayList<>(ids);
        connectors.forEach(c -> { if (!all.contains(c.getId())) all.add(c.getId()); });
        mongo.remove(Query.query(Criteria.where("_id").in(all.stream().map(ObjectId::new).toList()).and("boardId").is(bid)), BoardElement.class);
        return all;
    }
}
```
Note: in `deleteCascadesConnectors` test the ids `"e1"`/`"c1"` are not hex — implement id → `ObjectId` conversion via helper `toOid(String)` that returns `new ObjectId(s)` when `ObjectId.isValid(s)` else the raw string, so the mocked test passes and real ids work.

- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Checkpoint** `mvn -q test -Dtest='Element*Test,BoardElementServiceTest'`.

### Task 3: STOMP controller for elements

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`

**Interfaces:**
- Consumes: `BoardElementService`, session attribute `"user"` → `UserDto` (pattern `BoardSocketController.java:167`), `SimpMessagingTemplate`.
- Produces: handlers `@MessageMapping("/board/{boardId}/el/create" | "/patch" | "/preview" | "/delete" | "/lock" | "/unlock")`, all broadcasting `ElementEvent`-shaped `Map` via `messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", ...)`; `@MessageExceptionHandler` → `@SendToUser("/queue/errors")` `{op, reason}`.

- [ ] **Step 1: Implement**

```java
@Controller
@RequiredArgsConstructor
public class BoardElementSocketController {
    private final BoardElementService elementService;
    private final SimpMessagingTemplate messagingTemplate;

    private UserDto user(SimpMessageHeaderAccessor h) {
        return (UserDto) Objects.requireNonNull(h.getSessionAttributes()).get("user");
    }
    private void broadcast(String boardId, String op, SimpMessageHeaderAccessor h, String key, Object value) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("op", op);
        msg.put("senderSessionId", h.getSessionId());
        msg.put("userId", user(h).getId());
        if (key != null) msg.put(key, value);
        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", msg);
    }
    @MessageMapping("/board/{boardId}/el/create")
    public void create(@DestinationVariable String boardId, @Payload Map<String, List<BoardElement>> body, SimpMessageHeaderAccessor h) {
        List<BoardElement> created = elementService.create(boardId, user(h).getId(), body.getOrDefault("elements", List.of()));
        if (!created.isEmpty()) broadcast(boardId, "create", h, "elements", created);
    }
    @MessageMapping("/board/{boardId}/el/patch")
    public void patch(@DestinationVariable String boardId, @Payload ElementPatches.PatchBody body, SimpMessageHeaderAccessor h) {
        var applied = elementService.patch(boardId, user(h).getId(), body.patches());
        if (!applied.isEmpty()) broadcast(boardId, "patch", h, "patches", applied);
    }
    @MessageMapping("/board/{boardId}/el/preview")
    public void preview(@DestinationVariable String boardId, @Payload ElementPatches.PatchBody body, SimpMessageHeaderAccessor h) {
        elementService.requireEditor(boardId, user(h).getId());
        broadcast(boardId, "preview", h, "patches", body.patches());
    }
    @MessageMapping("/board/{boardId}/el/delete")
    public void delete(@DestinationVariable String boardId, @Payload Map<String, List<String>> body, SimpMessageHeaderAccessor h) {
        List<String> ids = elementService.delete(boardId, user(h).getId(), body.getOrDefault("ids", List.of()));
        broadcast(boardId, "delete", h, "ids", ids);
    }
    @MessageMapping("/board/{boardId}/el/lock")
    public void lock(@DestinationVariable String boardId, @Payload Map<String, String> body, SimpMessageHeaderAccessor h) {
        broadcast(boardId, "lock", h, "ids", List.of(body.get("id")));
    }
    @MessageMapping("/board/{boardId}/el/unlock")
    public void unlock(@DestinationVariable String boardId, @Payload Map<String, String> body, SimpMessageHeaderAccessor h) {
        broadcast(boardId, "unlock", h, "ids", List.of(body.get("id")));
    }
    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public Map<String, Object> onError(Exception ex) {
        String reason = ex instanceof ResponseStatusException rse ? rse.getReason() : ex.getMessage();
        return Map.of("reason", reason == null ? "error" : reason);
    }
}
```
Add to `ElementPatches`: `public record PatchBody(List<ElementPatch> patches) {}`.
Note: `@MessageExceptionHandler` in this controller only catches exceptions from this controller's handlers (Spring STOMP scoping) — legacy handlers unaffected.

- [ ] **Step 2: Checkpoint** `mvn -q -DskipTests compile` → exit 0.

### Task 4: Board load returns `elements`

**Files:**
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/domain/dto/BoardDto/BoardFullDetailResponse.java:14-17`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/impl/BoardServiceImpl.java:46-63`

- [ ] **Step 1:** add `private List<BoardElement> elements;` to `BoardFullDetailResponse`.
- [ ] **Step 2:** in `getBoard`, after access check: `foundBoard.setElements(boardElementRepository.findByBoardIdOrderByZAsc(id));` — inject `BoardElementRepository` (not the service, to avoid a `BoardService` ↔ `BoardElementService` circular dependency).
- [ ] **Step 3: Checkpoint** compile.

### Task 5: Legacy mapper + migration runner

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/element/LegacyElementMapper.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/config/ElementMigrationRunner.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/element/LegacyElementMapperTest.java`

**Interfaces:**
- Produces: `static BoardElement fromSticky(StickyNote s, double z)`, `static BoardElement fromImage(Image i, double z)`; runner `@Component @Profile("migrate-elements") class ElementMigrationRunner implements CommandLineRunner` — for each legacy doc: `mongo.upsert(query(_id), Update with setOnInsert for all fields, "boardElements")`; second pass semantics: if element exists with `version == 0` and legacy `updateAt` newer → `$set` geometry/text again. Migrated docs get `version = 0` (so "chưa sửa qua API mới" ⇔ `version == 0`). Logs `board=<id> sticky=<legacy>/<migrated> image=<legacy>/<migrated>` and throws `IllegalStateException` on mismatch.

- [ ] **Step 1: Failing test**

```java
class LegacyElementMapperTest {
    @Test void mapsSticky() {
        StickyNote s = new StickyNote("650000000000000000000001", "hello", new StickyNote.Size(200, 150),
            new StickyNote.Position(10, 20), "bg-yellow-200", "650000000000000000000002", "650000000000000000000003", null);
        BoardElement e = LegacyElementMapper.fromSticky(s, 3);
        assertEquals("650000000000000000000001", e.getId());
        assertEquals("sticky", e.getType());
        assertEquals(10, e.getX()); assertEquals(20, e.getY());
        assertEquals(200, e.getW()); assertEquals(150, e.getH());
        assertEquals("hello", e.getText());
        assertEquals("bg-yellow-200", e.getStyle().getFill());
        assertEquals(0, e.getRotation()); assertEquals(3, e.getZ());
        assertEquals(0L, e.getVersion());
        assertEquals("stickyNote", e.getMigratedFrom());
    }
    @Test void mapsImageAndToleratesNullSize() {
        Image i = new Image();
        i.setId("650000000000000000000004"); i.setUrl("https://res.cloudinary.com/a.png"); i.setAlt("a"); i.setCloudinaryId("cid");
        i.setPosition(new Image.Position(5, 6)); i.setBoardId("650000000000000000000003");
        BoardElement e = LegacyElementMapper.fromImage(i, 7);
        assertEquals("image", e.getType());
        assertEquals("https://res.cloudinary.com/a.png", e.getImage().getUrl());
        assertEquals(200, e.getW()); assertEquals(200, e.getH());
        assertEquals("Images", e.getMigratedFrom());
    }
}
```
(Verify constructor argument order of `StickyNote` against `StickyNote.java:24-46` — fields: id, text, size, position, color, owner, boardId, updateAt — before running.)

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Manual migration check on local Mongo**

```bash
docker run -d --rm --name mobi-mongo -p 27018:27017 mongo:7
# seed: 1 board, 2 stickyNote, 1 Images via mongosh inside the container
docker exec mobi-mongo mongosh mobi --eval '
 db.stickyNote.insertMany([{_id:ObjectId("650000000000000000000001"),text:"a",size:{width:200,height:200},position:{x:1,y:2},color:"bg-red-500",boardId:ObjectId("650000000000000000000009")},
                          {_id:ObjectId("650000000000000000000002"),text:"b",size:{width:250,height:200},position:{x:300,y:2},color:"bg-blue-500",boardId:ObjectId("650000000000000000000009")}]);
 db.Images.insertOne({_id:ObjectId("650000000000000000000003"),url:"https://res.cloudinary.com/a.png",size:{width:100,height:100},position:{x:0,y:400},boardId:ObjectId("650000000000000000000009")});'
SPRING_DATA_MONGODB_URI=mongodb://localhost:27018/mobi mvn -q spring-boot:run -Dspring-boot.run.profiles=migrate-elements -Dspring-boot.run.arguments=--spring.main.web-application-type=none
docker exec mobi-mongo mongosh mobi --quiet --eval 'db.boardElements.countDocuments()'   # expect 3
# run again → still 3 (idempotent)
```
The runner calls `SpringApplication.exit` after finishing. If app startup needs other env (Redis, mail, JWT), pass the minimal properties the app requires; record what was needed in the report. If startup is impossible locally, fall back to a JUnit test of the runner with a mocked `MongoTemplate` and say so.

### Task 6: Templates use `elements`

**Files:**
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/Template.java:41-43` — add `private List<BoardElement> elements;` (embedded; ids/boardId/owner ignored on use).
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/element/TemplateElementConverter.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/impl/TemplateServiceImpl.java:96-110,56-70`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/element/TemplateElementConverterTest.java`

**Interfaces:**
- Produces: `static List<BoardElement> fromTemplate(Template t, Supplier<String> newId)` — uses `t.getElements()` if non-empty, else legacy `stickyNotes` + `images` (nulls → empty); assigns new ids, remaps `connector.from/to.elementId`, drops connectors whose ends aren't in the template.

- [ ] **Step 1: Failing test**

```java
class TemplateElementConverterTest {
    @Test void remapsConnectorIds() {
        Template t = new Template();
        BoardElement a = el("aaaaaaaaaaaaaaaaaaaaaaaa", "shape"); BoardElement b = el("bbbbbbbbbbbbbbbbbbbbbbbb", "sticky");
        BoardElement c = el("cccccccccccccccccccccccc", "connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End(a.getId(), "auto"), new BoardElement.End(b.getId(), "left")));
        t.setElements(List.of(a, b, c));
        Iterator<String> ids = List.of("111111111111111111111111", "222222222222222222222222", "333333333333333333333333").iterator();
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, ids::next);
        assertEquals("111111111111111111111111", out.get(2).getConnector().getFrom().getElementId());
        assertEquals("222222222222222222222222", out.get(2).getConnector().getTo().getElementId());
    }
    @Test void dropsDanglingConnector() {
        Template t = new Template();
        BoardElement c = el("cccccccccccccccccccccccc", "connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End("x", "auto"), new BoardElement.End("y", "auto")));
        t.setElements(List.of(c));
        assertTrue(TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111").isEmpty());
    }
    @Test void legacyListsNullSafe() {
        Template t = new Template();
        t.setStickyNotes(List.of(new Template.StickyNote("hi", new Template.StickyNote.Position(1, 2), new Template.StickyNote.Size(200, 200), "bg-red-500")));
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111");
        assertEquals(1, out.size());
        assertEquals("sticky", out.get(0).getType());
    }
    private BoardElement el(String id, String type) { BoardElement e = new BoardElement(); e.setId(id); e.setType(type); e.setW(100); e.setH(100); return e; }
}
```
- [ ] **Step 2–4:** implement; in `usingTemplate`: canvas paths unchanged but null-safe (`template.getCanvasPaths() == null ? List.of() : ...`), replace sticky/image creation with `boardElementRepository.insert(converted)` after setting `boardId`, `owner`, `version=1`. Skip `canvasPathService.createCanvasPaths` when list empty. `updateTemplate` also copies `elements` and `images`.
- [ ] **Step 5: Checkpoint** `mvn -q test` (all tests) → PASS.

---

## Phase P2 — Scene engine + parity (FE)

### Task 7: Vitest + element types + geometry

**Files:**
- Modify: `client/package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `client/vitest.config.ts`
- Create: `client/components/Scene/types.ts` (Shared contracts types + `newObjectId`)
- Create: `client/components/Scene/geometry.ts`
- Create: `client/components/Scene/colors.ts`
- Test: `client/components/Scene/__tests__/geometry.test.ts`, `client/components/Scene/__tests__/colors.test.ts`

**Interfaces (geometry.ts):**
```ts
export interface Pt { x: number; y: number }
export interface Viewport { s: number; tx: number; ty: number }
export const MIN_SCALE = 0.1, MAX_SCALE = 5, MIN_SIZE = 50;
export function screenToWorld(p: Pt, v: Viewport): Pt;                // (p - t)/s ; p already relative to board-area
export function worldToScreen(p: Pt, v: Viewport): Pt;
export function zoomAt(v: Viewport, p: Pt, factor: number): Viewport; // keeps world point under p fixed, clamps s
export function center(e: Box): Pt;
export interface Box { x: number; y: number; w: number; h: number; rotation: number }
export function rotatePt(p: Pt, c: Pt, deg: number): Pt;
export function toLocal(p: Pt, e: Box): Pt;                           // world → element-local unrotated
export function aabb(e: Box): { minX: number; minY: number; maxX: number; maxY: number };
export function normBox(e: Box): Box;                                  // negative w/h → positive (for line/arrow bbox)
export function hitBox(p: Pt, e: Box, tol?: number): boolean;         // point inside rotated box
export function hitSegment(p: Pt, a: Pt, b: Pt, tol: number): boolean;
export function rectsIntersect(a: {minX:number;minY:number;maxX:number;maxY:number}, b: typeof a): boolean;
export type Handle = "n"|"s"|"e"|"w"|"ne"|"nw"|"se"|"sw";
export function resizeBox(start: Box, handle: Handle, pointerWorld: Pt, keepRatio: boolean): Box; // rotation-aware, opposite corner fixed, min MIN_SIZE
export function rotationFromPointer(e: Box, pointerWorld: Pt, snap: boolean): number;            // degrees, 0 = handle straight up; snap 15°
export type Anchor = "auto"|"top"|"right"|"bottom"|"left";
export function anchorPoint(e: Box, anchor: Exclude<Anchor,"auto">): Pt;                          // rotated side midpoint
export function boundaryPoint(e: Box, toward: Pt, shape: "rect"|"ellipse"): Pt;                 // ray centre→toward ∩ boundary
export function connectorEndpoints(from: Box & {kind?: string}, fromAnchor: Anchor, to: Box & {kind?: string}, toAnchor: Anchor): [Pt, Pt];
export function nearestAnchor(e: Box, p: Pt, maxDist: number): Exclude<Anchor,"auto"> | null;
```

- [ ] **Step 1: Install** `cd client && npm i -D vitest@^2` ; add `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({ test: { environment: "node", include: ["**/__tests__/**/*.test.ts"] }, resolve: { alias: { "@": path.resolve(__dirname, ".") } } });
```
- [ ] **Step 2: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import * as g from "../geometry";
const box = (x: number, y: number, w: number, h: number, rotation = 0) => ({ x, y, w, h, rotation });
const close = (a: g.Pt, b: g.Pt) => { expect(a.x).toBeCloseTo(b.x, 5); expect(a.y).toBeCloseTo(b.y, 5); };

describe("viewport", () => {
  it("round-trips screen/world", () => {
    const v = { s: 2, tx: 10, ty: -20 };
    close(g.screenToWorld(g.worldToScreen({ x: 3, y: 4 }, v), v), { x: 3, y: 4 });
  });
  it("zoomAt keeps the world point under the cursor", () => {
    const v = { s: 1, tx: 0, ty: 0 }, p = { x: 200, y: 100 };
    const before = g.screenToWorld(p, v);
    const v2 = g.zoomAt(v, p, 1.1);
    close(g.screenToWorld(p, v2), before);
    expect(v2.s).toBeCloseTo(1.1);
  });
  it("zoomAt clamps", () => {
    expect(g.zoomAt({ s: 4.9, tx: 0, ty: 0 }, { x: 0, y: 0 }, 2).s).toBe(5);
    expect(g.zoomAt({ s: 0.11, tx: 0, ty: 0 }, { x: 0, y: 0 }, 0.5).s).toBe(0.1);
  });
});
describe("hit testing", () => {
  it("rotated box", () => {
    const b = box(0, 0, 100, 20, 90);            // centre (50,10), rotated → vertical 20x100
    expect(g.hitBox({ x: 50, y: 50 }, b)).toBe(true);
    expect(g.hitBox({ x: 5, y: 10 }, b)).toBe(false);
  });
  it("segment with tolerance", () => {
    expect(g.hitSegment({ x: 50, y: 3 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(true);
    expect(g.hitSegment({ x: 50, y: 9 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(false);
  });
  it("aabb of rotated box", () => {
    const a = g.aabb(box(0, 0, 100, 20, 90));
    expect(a.minX).toBeCloseTo(40); expect(a.maxX).toBeCloseTo(60);
    expect(a.minY).toBeCloseTo(-40); expect(a.maxY).toBeCloseTo(60);
  });
});
describe("resize", () => {
  it("se handle, unrotated, keeps nw corner", () => {
    const r = g.resizeBox(box(10, 10, 100, 100), "se", { x: 210, y: 160 }, false);
    expect(r).toMatchObject({ x: 10, y: 10, w: 200, h: 150 });
  });
  it("enforces min size", () => {
    const r = g.resizeBox(box(10, 10, 100, 100), "se", { x: 0, y: 0 }, false);
    expect(r.w).toBe(g.MIN_SIZE); expect(r.h).toBe(g.MIN_SIZE);
  });
  it("rotated 90°: dragging the local-east handle grows w and keeps the west edge fixed in world", () => {
    const start = box(0, 0, 100, 20, 90);
    const westBefore = g.anchorPoint(start, "left");
    const eastWorld = g.anchorPoint(start, "right");
    const r = g.resizeBox(start, "e", { x: eastWorld.x, y: eastWorld.y + 50 }, false);
    expect(r.w).toBeCloseTo(150);
    close(g.anchorPoint(r, "left"), westBefore);
  });
  it("keepRatio", () => {
    const r = g.resizeBox(box(0, 0, 100, 50), "se", { x: 300, y: 60 }, true);
    expect(r.w / r.h).toBeCloseTo(2);
  });
});
describe("rotation", () => {
  it("pointer to the right of centre = 90°", () => {
    expect(g.rotationFromPointer(box(0, 0, 100, 100), { x: 200, y: 50 }, false)).toBeCloseTo(90);
  });
  it("snaps to 15°", () => {
    expect(g.rotationFromPointer(box(0, 0, 100, 100), { x: 200, y: 45 }, true)).toBe(90);
  });
});
describe("connector geometry", () => {
  it("anchor points follow rotation", () => {
    close(g.anchorPoint(box(0, 0, 100, 50), "right"), { x: 100, y: 25 });
    close(g.anchorPoint(box(0, 0, 100, 50, 90), "right"), { x: 50, y: 75 });
  });
  it("auto uses rect boundary toward the other centre", () => {
    const [a, b] = g.connectorEndpoints(box(0, 0, 100, 100), "auto", box(300, 0, 100, 100), "auto");
    close(a, { x: 100, y: 50 }); close(b, { x: 300, y: 50 });
  });
  it("ellipse boundary", () => {
    close(g.boundaryPoint(box(0, 0, 200, 100), { x: 500, y: 50 }, "ellipse"), { x: 200, y: 50 });
  });
  it("nearestAnchor", () => {
    expect(g.nearestAnchor(box(0, 0, 100, 100), { x: 98, y: 52 }, 10)).toBe("right");
    expect(g.nearestAnchor(box(0, 0, 100, 100), { x: 50, y: 50 }, 10)).toBeNull();
  });
});
```

```ts
import { describe, it, expect } from "vitest";
import { fillToHex } from "../colors";
import { newObjectId } from "../types";
describe("colors", () => {
  it("maps tailwind class", () => { expect(fillToHex("bg-yellow-200")).toBe("#fef08a"); });
  it("passes hex through", () => { expect(fillToHex("#123456")).toBe("#123456"); });
  it("falls back", () => { expect(fillToHex("bg-unknown-900")).toBe("#fde68a"); expect(fillToHex(undefined)).toBe("#fde68a"); });
});
describe("newObjectId", () => {
  it("is 24 hex and unique", () => {
    const a = newObjectId(), b = newObjectId();
    expect(a).toMatch(/^[0-9a-f]{24}$/); expect(a).not.toBe(b);
  });
});
```
- [ ] **Step 3: Run** `npx vitest run` → FAIL. **Step 4: Implement** (colors.ts: full Tailwind v3 palette for the families used in `LeftToolBar.jsx:27-52` at shades 100–900 plus `bg-black`, `bg-white`; `resizeBox`: convert pointer to local frame of `start`, move the dragged edges, clamp, then shift so the opposite anchor stays fixed in world). **Step 5: Run** → PASS.

### Task 8: `sceneStore`

**Files:**
- Create: `client/lib/Zustand/sceneStore.ts`
- Test: `client/components/Scene/__tests__/sceneStore.test.ts`

**Interfaces:**
```ts
interface SceneState {
  boardId: string | null;
  elements: Record<string, BoardElement>;
  order: string[];                       // ids sorted by z asc
  selection: string[];
  viewport: Viewport;
  editingId: string | null;
  locks: Record<string, string>;         // elementId -> userId
  ghosts: BoardElement[];                // AI/import previews, not persisted
  reset(boardId: string, elements: BoardElement[]): void;
  upsertLocal(els: BoardElement[]): void;             // optimistic create
  patchLocal(patches: ElementPatch[]): void;          // optimistic patch (no version change)
  removeLocal(ids: string[]): void;                   // also removes connectors referencing ids
  applyRemote(ev: ElementEvent, mySessionId: string | null): void;
  setSelection(ids: string[]): void;
  setViewport(v: Viewport): void;
  setEditing(id: string | null): void;
  setGhosts(g: BoardElement[]): void;
  topZ(): number; bottomZ(): number;
  connectorsOf(id: string): string[];
}
export const useSceneStore: UseBoundStore<StoreApi<SceneState>>;
```
Rules for `applyRemote`: `create` → upsert all (also for own echo, harmless); `patch` → for own session: only record `version`; for others: apply `set` iff `patch.version > local.version`, then set version; `preview` → ignore own; apply `set` to others unless id is in local `selection` and being dragged (flag `draggingIds` Set kept in module scope via `setDragging(ids)`); `delete` → `removeLocal(ids)`; `lock`/`unlock` → `locks`.

- [ ] **Step 1: Failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BoardElement } from "../types";
const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement =>
  ({ id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1, shape: { kind: "rect" }, ...extra });
const S = () => useSceneStore.getState();
beforeEach(() => S().reset("b", [el("a", { z: 2 }), el("b", { z: 1 }),
  el("c", { type: "connector", shape: undefined, connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "b", anchor: "auto" } }, z: 3 })]));

describe("sceneStore", () => {
  it("orders by z", () => { expect(S().order).toEqual(["b", "a", "c"]); });
  it("ignores stale remote patch", () => {
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }, "me");
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 10 }, version: 4 }] }, "me");
    expect(S().elements.a.x).toBe(50);
    expect(S().elements.a.version).toBe(5);
  });
  it("own patch echo only records version", () => {
    S().patchLocal([{ id: "a", set: { x: 70 } }]);
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { x: 1 }, version: 2 }] }, "me");
    expect(S().elements.a.x).toBe(70);
    expect(S().elements.a.version).toBe(2);
  });
  it("delete cascades connectors via reverse index", () => {
    S().applyRemote({ op: "delete", senderSessionId: "other", userId: "u", ids: ["a"] }, "me");
    expect(S().elements.a).toBeUndefined();
    expect(S().elements.c).toBeUndefined();
    expect(S().order).toEqual(["b"]);
  });
  it("connectorsOf", () => { expect(S().connectorsOf("b")).toEqual(["c"]); });
  it("removeLocal clears selection of removed ids", () => {
    S().setSelection(["a", "b"]); S().removeLocal(["a"]);
    expect(S().selection).toEqual(["b"]);
  });
  it("lock/unlock", () => {
    S().applyRemote({ op: "lock", senderSessionId: "other", userId: "u2", ids: ["a"] }, "me");
    expect(S().locks.a).toBe("u2");
    S().applyRemote({ op: "unlock", senderSessionId: "other", userId: "u2", ids: ["a"] }, "me");
    expect(S().locks.a).toBeUndefined();
  });
  it("topZ", () => { expect(S().topZ()).toBe(3); });
});
```
- [ ] **Step 2–5:** run FAIL → implement with `immer` `produce` → run PASS.

### Task 9: Scene socket + subscription rewiring

**Files:**
- Create: `client/components/Scene/sceneSocket.ts`
- Modify: `client/app/user/board/[id]/BoardSubscription.tsx` (remove sticky/image subscriptions lines 59-146 & their unsubscribes; add element subscription + errors + reconnect refetch)
- Modify: `client/lib/Zustand/socketStore.ts` (expose `connectCount` incremented in `onConnect`)

**Interfaces:**
```ts
export const sceneSocket = {
  create(boardId: string, elements: BoardElement[]): void,    // upsertLocal + publish
  patch(boardId: string, patches: ElementPatch[]): void,      // patchLocal + publish
  preview(boardId: string, patches: ElementPatch[]): void,    // patchLocal + throttled publish (50ms, merges by id)
  remove(boardId: string, ids: string[]): void,               // removeLocal + publish
  lock(boardId: string, id: string): void,
  unlock(boardId: string, id: string): void,
};
export function subscribeScene(client: Client, boardId: string, sessionId: string, onError: () => void): () => void;
export async function reloadBoard(boardId: string): Promise<void>; // BoardAPI.getBoardById → useBoardStoreof.setBoard + sceneStore.reset + canvasPaths
```
All publish helpers no-op (console.warn) when `useStompStore.getState().client?.connected` is false.

- [ ] **Step 1:** implement `sceneSocket.ts`; in `BoardSubscription`, add `subscribeScene(...)`, with `onError = () => reloadBoard(boardId)`; effect depending on `connectCount` calls `reloadBoard` when `connectCount > 1` (reconnect).
- [ ] **Step 2: Checkpoint** `npx tsc --noEmit | grep -v TS2307 | grep "error TS"` → empty.

### Task 10: `BoardScene` shell (viewport, grid, pencil, cursors)

**Files:**
- Create: `client/components/Scene/BoardScene.tsx`
- Create: `client/components/Scene/usePencilTool.ts` (pen draw + path marquee/move logic moved from `ZoomableGrid.tsx:240-449`, unchanged publish destinations)
- Create: `client/components/Scene/GridCanvas.tsx` (uses `drawGridOnCanvas` from `zoomableGridUtils.ts`)
- Modify: `client/components/MultiCursor/MultiCursor.tsx` (read viewport from `useSceneStore` when props omitted)
- Modify: `client/app/user/board/[id]/page.tsx` (render `<BoardScene boardId>` instead of `ZoomableGrid` + RND children)
- Modify: `client/app/user/board/[id]/useBoard.ts` (on load: `useSceneStore.getState().reset(id, res.elements ?? [])`; keep `setBoard`; remove sticky/image/shape handlers)
- Modify: `client/lib/Zustand/type.type.ts` (`Board.elements?: BoardElement[]`)

**Layout of BoardScene (bottom → top, all `position:absolute; inset:0` inside `#board-area` 100vw×100vh, background class from `board.option.backgroundColor`):**
1. `GridCanvas` (viewport, `board.option.grid`)
2. pencil layer: `canvasPaths.map(p => <PencilCanvas key={p.id ?? i} scale={s} translate={{x:tx,y:ty}} .../>)`
3. `<svg ref={svgRef} width="100%" height="100%" style={{touchAction:"none"}}>` with `<defs>` (arrow marker `id="arrowhead"`), `<g transform={\`translate(${tx},${ty}) scale(${s})\`}>` → ghosts (opacity .5, dashed outline), elements in `order`, `SelectionOverlay`, marquee rect.
4. `TextEditOverlay` (Task 12), element context menu (Task 13), `BoardGridContext` (existing), `MultiCursor`.

Pointer events are attached to the svg; `usePointerController` (Task 11) delegates to `usePencilTool` when `tool === "pen"`. Wheel: `zoomAt(viewport, local, deltaY < 0 ? 1.1 : 1/1.1)`; `ctrlKey` wheel (trackpad pinch) same. Cursor broadcast every 100ms kept (from `ZoomableGrid.tsx:311-333`) using unbiased `screenToWorld`.

- [ ] **Step 1:** implement; **Step 2: Checkpoint** tsc (no new errors) + `npm run build` succeeds (build will generate `next-env.d.ts`; do not commit it — it's gitignored).

### Task 11: Element views, selection, pointer state machine

**Files:**
- Create: `client/components/Scene/SceneElement.tsx`, `client/components/Scene/elements/StickyView.tsx`, `client/components/Scene/elements/ImageView.tsx`
- Create: `client/components/Scene/SelectionOverlay.tsx`
- Create: `client/components/Scene/usePointerController.ts`
- Create: `client/components/Scene/keyboard.ts`
- Test: `client/components/Scene/__tests__/keyboard.test.ts`

**Interfaces:**
```ts
// keyboard.ts
export function shouldHandleDeleteKey(e: { key: string; target: unknown }): boolean;
// true only for Delete/Backspace when target is not input/textarea/[contenteditable=true]
// usePointerController.ts
type Mode = "idle"|"panning"|"dragging"|"resizing"|"rotating"|"marquee"|"creating"|"connecting"|"pen";
export function usePointerController(opts: { boardId: string; svgRef: RefObject<SVGSVGElement>; canEdit: boolean }): {
  onPointerDown(e: React.PointerEvent): void; onPointerMove(e: React.PointerEvent): void;
  onPointerUp(e: React.PointerEvent): void; onDoubleClick(e: React.MouseEvent): void;
  onWheel(e: React.WheelEvent): void; marquee: {x:number;y:number;w:number;h:number} | null;
  draft: BoardElement | null;   // shape/connector being created
  hoverId: string | null;
};
```
Hit target: `(e.target as Element).closest("[data-id]")?.getAttribute("data-id")`, handles carry `data-handle="se"|...|"rotate"` and connector end handles `data-conn-end="from"|"to"`, anchor dots `data-anchor="top"|...` + `data-anchor-owner=id`.
- Drag: on down record `startBoxes` of selection; move → `sceneSocket.preview(patches)` where each patch `set {x,y}` = start + world delta; also move selected pencil paths via `usePencilTool.moveSelectedBy(dx,dy)`; up → `sceneSocket.patch` with final `{x,y}` (only if moved > 0.5 world units), pencil → existing `update-paths` publish.
- Resize: `resizeBox(start, handle, world, e.shiftKey)`; rotate: `rotationFromPointer(start, world, e.shiftKey)`.
- Marquee: select elements whose `aabb` intersects rect + pencil paths with any point inside (`isPathInSelection` moved from `ZoomableGrid.tsx:169-178`).
- Locked by another user (`locks[id] && locks[id] !== myUserId`): no drag/resize/rotate/edit.
- `canEdit=false`: only `panning` (hand/space/middle) and selection-without-drag.
- Keyboard (document listener): `shouldHandleDeleteKey` → `sceneSocket.remove(selection)` + existing pencil delete publish; `Escape` → cancel mode, clear selection; `Space` held → temporary hand.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { shouldHandleDeleteKey } from "../keyboard";
const t = (tag: string, ce = false) => ({ tagName: tag.toUpperCase(), isContentEditable: ce, closest: () => null });
describe("shouldHandleDeleteKey", () => {
  it("handles on body", () => { expect(shouldHandleDeleteKey({ key: "Delete", target: t("body") })).toBe(true); });
  it("handles Backspace on svg", () => { expect(shouldHandleDeleteKey({ key: "Backspace", target: t("svg") })).toBe(true); });
  it("ignores textarea/input/contentEditable", () => {
    expect(shouldHandleDeleteKey({ key: "Backspace", target: t("textarea") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("input") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("div", true) })).toBe(false);
  });
  it("ignores other keys", () => { expect(shouldHandleDeleteKey({ key: "a", target: t("body") })).toBe(false); });
});
```
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** implement views: `StickyView` = `<rect fill={fillToHex(style.fill)} stroke="#000" strokeWidth={2}/>` + `<foreignObject width={w} height={h}><div className="w-full h-full p-2 text-[16px] whitespace-pre-wrap break-words overflow-hidden">{text}</div></foreignObject>` + lock badge ("Locking") when `locks[id]`; `ImageView` = `<image href={url} width={w} height={h} preserveAspectRatio="xMidYMid meet"/>` + thin border rect. Wrapper `<g data-id transform={\`translate(${x},${y}) rotate(${rotation} ${w/2} ${h/2})\`}>`. Checkpoint tsc.

### Task 12: Text editing overlay

**Files:**
- Create: `client/components/Scene/TextEditOverlay.tsx`

**Behaviour:** mounted when `editingId` set; absolutely positioned `<textarea>` with CSS `transform: translate(sx,sy) rotate(rotation deg)` where `(sx,sy) = worldToScreen({x,y})`, size `w*s × h*s`, font-size `16*s px`; background = element fill (sticky) or transparent (shape); `autoFocus`; on focus → `sceneSocket.lock`; on blur / Escape → final `sceneSocket.patch({text})` + `unlock` + `setEditing(null)`; typing → local `patchLocal` + debounced (500ms) `sceneSocket.patch`; `onKeyDown` / `onPointerDown` `stopPropagation` (mirrors `RNDStickyNote.tsx:190-197`); never publish on mount. While editing, the element's own foreignObject text is hidden.

- [ ] **Step 1:** implement; **Step 2:** checkpoint tsc.

### Task 13: Element context menu, z-order, VIEWER gating

**Files:**
- Create: `client/components/Scene/ElementContextMenu.tsx`
- Create: `client/components/Scene/useCanEdit.ts`
- Modify: `client/components/SideBar/LeftToolBar.jsx` (hide creation tools when `!canEdit`)

**Interfaces:**
```ts
export function useCanEdit(): boolean; // board.owner === user.id || board.members.find(m => m.memberId === user.id)?.role === "EDITOR"
```
Menu (right-click on element, screen-positioned div): header by type; for sticky: owner + updated time, Lock/Unlock (`sceneSocket.lock/unlock`), Edit (setEditing), Export PDF (`exportStickyNoteToPDF` with `text,color: style.fill,width:w,height:h,noteId:id`); all types: Bring to front (`patch z = topZ()+1`), Send to back (`z = bottomZ()-1`), Delete. Right-click on empty canvas keeps `BoardGridContext`. When `!canEdit`, menu shows only info + Export PDF.

- [ ] **Step 1:** implement; **Step 2:** checkpoint tsc.

### Task 14: Toolbar & tools

**Files:**
- Modify: `client/lib/Zustand/type.type.ts` (`ToolType` union `"select"|"hand"|"pen"|"sticky"|"rect"|"ellipse"|"triangle"|"line"|"arrow"|"connector"`; `ToolDevState.tool`, `setTool`, `stickyColor`, `setStickyColor`, `shapeStyle {fill, stroke, strokeWidth}`, `setShapeStyle`)
- Modify: `client/lib/Zustand/store.ts` (persist `version: 2`, `migrate` maps old `mode` → `tool`: drag→hand, idle→select, pen→pen, others→select; keep `mode` field for legacy readers = derived)
- Modify: `client/components/SideBar/LeftToolBar.jsx` (select/hand toggle; sticky color click → `setStickyColor(class)` + `setTool("sticky")`; shape popup buttons → rect/triangle/ellipse/line/arrow tools; connector button; pen buttons → `setTool("pen")`; remove `onClickShape`/`getShapeByIndex`)
- Modify: `client/components/SideBar/ImageTool.tsx` (use `sceneSocket.create` with `type:"image"`, placed at viewport centre, size 200×200; list images from `useSceneStore` elements of type image)

- [ ] **Step 1:** implement; `sticky` tool: click on canvas → create sticky 200×200 at pointer with `style.fill = stickyColor`, `text: "Type here..."`, then `setTool("select")`.
- [ ] **Step 2:** checkpoint tsc.

### Task 15: Ghosts (AI/import), built-in templates, export, template page

**Files:**
- Modify: `client/lib/Zustand/tempChangeStore.ts` (fix `clearTempChanges` to also clear `imageNotes`)
- Create: `client/components/Scene/legacyConvert.ts` (+ test `__tests__/legacyConvert.test.ts`)
- Modify: `client/app/user/board/[id]/page.tsx` (ConfirmSaveBar shown when any temp sticky/image/path exists; Save → `sceneSocket.create(ghostElements)` + existing `draw` publish for paths; ghosts rendered from `useTempChangeStore` via `legacyConvert`)
- Modify: `client/app/user/board/[id]/useBoard.ts` (`createTemplateNotes` → `sceneSocket.create(templateNotes.map(stickyDtoToElement))`, executed after STOMP connected)
- Modify: `client/components/ui/AIChatPopup.tsx:92-100` (positions relative to viewport centre: `centre = screenToWorld({x: innerWidth/2, y: innerHeight/2})`, notes laid out in a 3-column grid 220px apart)
- Modify: `client/lib/export.ts` (`html2canvas(element, { useCORS: true })` in both board exports; `.mobi` export `version: "2.0"`, `{canvasPaths, elements}` from stores; import accepts `1.0` → `legacyConvert`, `2.0` → elements with fresh ids + connector remap)
- Modify: `client/app/user/board/template/page.tsx` (send `elements` from `useSceneStore` with their ids — `TemplateElementConverter` remaps them; send `canvasPaths` as today; drop the `board.stickyNotes` required check)
- Modify: `client/api/templatesApi.tsx` (type of payload adds `elements`)

**Interfaces:**
```ts
export function stickyDtoToElement(d: CreateStickNoteDto, boardId: string, z: number): BoardElement;
export function imageDtoToElement(d: CreateImageNoteDto, boardId: string, z: number): BoardElement;
export function remapIds(els: BoardElement[]): BoardElement[]; // fresh ids + connector remap, drops dangling connectors
```
- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { stickyDtoToElement, imageDtoToElement, remapIds } from "../legacyConvert";
describe("legacyConvert", () => {
  it("sticky dto", () => {
    const e = stickyDtoToElement({ color: "bg-red-500", text: "a", size: { width: 200, height: 150 }, position: { x: 1, y: 2 } }, "b", 4);
    expect(e).toMatchObject({ type: "sticky", x: 1, y: 2, w: 200, h: 150, text: "a", style: { fill: "bg-red-500" }, z: 4, rotation: 0 });
    expect(e.id).toMatch(/^[0-9a-f]{24}$/);
  });
  it("image dto with px strings", () => {
    const e = imageDtoToElement({ url: "u", alt: "a", cloudinaryId: "c", size: { width: "300px", height: 100 }, position: { x: 0, y: 0 } }, "b", 1);
    expect(e.w).toBe(300); expect(e.h).toBe(100); expect(e.image?.url).toBe("u");
  });
  it("remapIds keeps connectors consistent and drops dangling", () => {
    const base = { boardId: "b", x: 0, y: 0, w: 10, h: 10, rotation: 0, z: 0, version: 1 };
    const out = remapIds([
      { ...base, id: "a", type: "shape", shape: { kind: "rect" } },
      { ...base, id: "b", type: "shape", shape: { kind: "rect" } },
      { ...base, id: "c", type: "connector", connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "b", anchor: "auto" } } },
      { ...base, id: "d", type: "connector", connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "zz", anchor: "auto" } } },
    ]);
    expect(out).toHaveLength(3);
    expect(out[2].connector!.from.elementId).toBe(out[0].id);
    expect(out[2].connector!.to.elementId).toBe(out[1].id);
    expect(out[0].id).not.toBe("a");
  });
});
```
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** checkpoint tsc + vitest.

---

## Phase P3 — Shapes

### Task 16: Shape tools, rendering, text in shape, style panel

**Files:**
- Create: `client/components/Scene/elements/ShapeView.tsx`
- Create: `client/components/Scene/StylePanel.tsx`
- Create: `client/components/Scene/shapeFactory.ts` (+ test `__tests__/shapeFactory.test.ts`)
- Modify: `client/components/Scene/usePointerController.ts` (creating state), `SceneElement.tsx`, `SelectionOverlay.tsx` (line/arrow: 2 endpoint handles instead of 8 + rotate)

**Interfaces:**
```ts
export function shapeFromDrag(kind: ShapeKind, a: Pt, b: Pt, shift: boolean, style: ElementStyle, boardId: string, z: number): BoardElement;
// rect/ellipse/triangle: normalized box from a,b (shift → square), click (|b-a| < 4) → 160x100 centred at a
// line/arrow: x,y = a; w,h = b - a (shift → snap angle to 45°), click → 160x0
export function lineEndpoints(e: BoardElement): [Pt, Pt]; // rotation ignored for line/arrow (rotation always 0)
```
Render: rect `<rect width={w} height={h} rx={4}>`; ellipse `<ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2}>`; triangle `<polygon points={\`${w/2},0 ${w},${h} 0,${h}\`}>`; line/arrow `<line x1=0 y1=0 x2={w} y2={h} markerEnd={kind==="arrow" ? "url(#arrowhead)" : undefined}>` plus invisible hit line `stroke="transparent" strokeWidth={12/s}`. Default style `{fill: "#ffffff", stroke: "#111827", strokeWidth: 2}`; `vectorEffect="non-scaling-stroke"` NOT used (stroke scales with zoom like other content). Text (rect/ellipse/triangle only): foreignObject centred flex, double-click → `setEditing`. StylePanel: floating panel above selection when exactly one shape selected: fill swatches (8 + "none"), stroke swatches (8), stroke width 1/2/4/8, bring front / send back; each click → `sceneSocket.patch`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { shapeFromDrag, lineEndpoints } from "../shapeFactory";
const st = { fill: "#fff", stroke: "#000", strokeWidth: 2 };
describe("shapeFromDrag", () => {
  it("normalizes reversed drag", () => {
    expect(shapeFromDrag("rect", { x: 100, y: 100 }, { x: 20, y: 40 }, false, st, "b", 1)).toMatchObject({ x: 20, y: 40, w: 80, h: 60, type: "shape", shape: { kind: "rect" } });
  });
  it("shift makes square", () => {
    const e = shapeFromDrag("ellipse", { x: 0, y: 0 }, { x: 100, y: 40 }, true, st, "b", 1);
    expect(e.w).toBe(e.h);
  });
  it("click creates default size", () => {
    expect(shapeFromDrag("triangle", { x: 10, y: 10 }, { x: 11, y: 11 }, false, st, "b", 1)).toMatchObject({ w: 160, h: 100, x: -70, y: -40 });
  });
  it("line keeps direction and snaps with shift", () => {
    const e = shapeFromDrag("line", { x: 10, y: 10 }, { x: 110, y: 20 }, true, st, "b", 1);
    const [a, b] = lineEndpoints(e);
    expect(a).toEqual({ x: 10, y: 10 }); expect(b.y).toBeCloseTo(10); expect(b.x).toBeCloseTo(10 + Math.hypot(100, 10));
  });
});
```
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** checkpoint tsc + vitest.

---

## Phase P4 — Connectors

### Task 17: Connectors

**Files:**
- Create: `client/components/Scene/elements/ConnectorView.tsx`
- Create: `client/components/Scene/AnchorDots.tsx`
- Modify: `client/components/Scene/usePointerController.ts` (connecting state, end retarget), `SceneElement.tsx`, `SelectionOverlay.tsx` (connector selected → 2 end handles)

**Behaviour:**
- `AnchorDots` render for `hoverId` (and selected single non-connector element) when `canEdit` and tool is `select` or `connector`: 4 circles r=`6/s` at `anchorPoint(box, side)`.
- pointerdown on anchor dot (or on element with `connector` tool → anchor `auto`) → `connecting` with draft end following pointer; hovering an element highlights it; pointerup on element B (≠ A, not a connector) → `nearestAnchor(B, p, 12/s) ?? "auto"` → `sceneSocket.create([{type:"connector", x:0,y:0,w:0,h:0, rotation:0, z: topZ()+1, style:{stroke:"#111827", strokeWidth:2}, connector:{from:{elementId:A,anchor}, to:{elementId:B,anchor}}}])`; else cancel.
- `ConnectorView`: endpoints via `connectorEndpoints(elements[from], fromAnchor, elements[to], toAnchor)` (ellipse boundary when target is `shape.kind==="ellipse"`); skip render if either end missing; `<line markerEnd="url(#arrowhead)">` + hit line; selected → end handles `data-conn-end`; dragging an end handle and dropping on another element → `sceneSocket.patch([{id, set:{connector:{...}}}])`, dropping on empty → revert.
- Memo: `ConnectorView` subscribes only to its two endpoint elements (`useSceneStore(s => [s.elements[from], s.elements[to]], shallow)`).
- Delete of an element: `removeLocal` already cascades; server broadcast includes cascaded ids.

- [ ] **Step 1:** implement; **Step 2:** checkpoint tsc + vitest.

### Task 18: Cleanup + full verification

**Files:**
- Delete: `client/components/BoxResizable/Linker.jsx`, `client/components/ui/CustomShape.jsx`, `client/components/BoxResizable/RNDBase.jsx`, `RNDText.jsx`, `RNDStickyNote.tsx`, `RNDStickyNoteTemp.tsx`, `RNDImageNote.tsx`, `RNDImageNoteTemp.tsx`, `DraggableResizableBox.jsx` — only after grep shows no importer; `client/components/BoardGrid/ZoomableGrid.tsx` (keep `zoomableGridUtils.ts`, `BoardGridContext.tsx`)
- Keep: `stickyNoteStore.ts`, `ImageNoteStore.ts` only if still imported (template page / ImageTool migrated → delete if unused).

- [ ] **Step 1:** `grep -rn "<deleted module names>" client --include=*.ts* --include=*.js*` → no hits, then delete.
- [ ] **Step 2:** `cd client && npx vitest run && npx tsc --noEmit | grep "error TS" | grep -v TS2307` (expect empty) `&& npm run build`.
- [ ] **Step 3:** `cd IE213Backend && mvn -q test`.
- [ ] **Step 4:** Two-browser manual checklist (if backend + Mongo can be started locally; otherwise report as not run):
  1. create sticky / image / each shape kind; reload → persisted
  2. drag, resize, rotate each; second browser sees preview live and final state
  3. edit text in sticky and rectangle; Backspace inside text doesn't delete element
  4. connector A→B; drag A → connector follows in both browsers; delete B → connector gone both sides + DB
  5. VIEWER account: cannot create/drag/delete
  6. AI notes → Save; `.mobi` export → import round-trip; PNG export shows images
  7. pencil draw / select / move / delete still works
