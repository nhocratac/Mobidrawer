# SVG Scene + Unified Elements (Shape, Connector) — Design

- Ngày: 2026-09-24
- Branch: `nhocratac/Design-Feature-Draw-Shape`
- Trạng thái: user đã duyệt trước (2026-09-24) — "tôi duyệt sẵn, xong là làm luôn"

## 1. Mục tiêu

Viết lại board thành **một SVG scene** trong đó sticky note, image, shape và connector cùng một hệ toạ độ, cùng cơ chế chọn / kéo / resize / xoay. Thêm:

- Vẽ shape bằng kéo chuột (như Miro/Excalidraw): hình chữ nhật, tròn (ellipse), tam giác, mũi tên tự do, đường thẳng tự do.
- Chữ bên trong shape (double-click để sửa).
- Xoay shape (và sticky note, image).
- **Connector** nối 2 đối tượng bất kỳ (shape, sticky note, image), tự bám theo khi đối tượng di chuyển/resize/xoay. Mũi tên/đường thẳng tự do là **shape riêng**, không phải connector.
- Lưu MongoDB + đồng bộ realtime qua STOMP.

## 2. Quyết định đã chốt với user

| # | Quyết định | Nguồn |
|---|---|---|
| D1 | Hướng C: một SVG scene duy nhất, bỏ `react-rnd` khỏi board | user: "C" |
| D2 | BE: hướng B — một collection thống nhất có `type` | user: "B" |
| D3 | Pencil giữ `<canvas>` | user: "pencil giữ canvas" |
| D4 | Connector nối mọi đối tượng | user chọn "Mọi đối tượng" |
| D5 | Mũi tên/đường thẳng tách riêng khỏi connector | user chọn "Tách riêng" |
| D6 | Có chữ trong shape, có xoay | user chọn cả 3 tính năng |
| D7 | Không chạy migration lên DB thật, không commit/push/PR khi user chưa yêu cầu | thoả thuận trong chat |

## 3. Hiện trạng (bằng chứng)

- Load board: một aggregation `$lookup` 3 collection `canvasPaths`, `stickyNote`, `Images` theo `boardId` — `IE213Backend/.../repository/BoardCustomRepository.java:20-45`; kết quả `BoardFullDetailResponse` có `canvasPaths`, `stickyNotes`, `images` — `BoardFullDetailResponse.java:14-17`.
- `StickyNote`, `Image`: `size`/`position` kiểu `int`, không có `z`/`rotation` — `StickyNote.java:31-62`, `Image.java:22-64`.
- Socket: 21 `@MessageMapping`, trong đó 17 handler theo từng type (4 path, 8 sticky, 5 image) — `BoardSocketController.java:52-407`. FE subscribe từng topic riêng — `BoardSubscription.tsx:19-146`.
- Sticky/image move/resize/text không kiểm role và không lọc `boardId` — `StickyNoteServiceImpl.java:47-82`, `ImageServiceImpl.java:48-65` (judge đã verify).
- Shape hiện tại chỉ là state client: `useBoard.ts:21,333-338`, render `page.tsx:111-114`; Delete/Backspace xoá toàn bộ shape — `useBoard.ts:87-91`. Không có gì ở BE.
- `components/BoxResizable/Linker.jsx` không được import ở đâu (grep).
- Không có test tự động: BE chỉ có `Ie213BackendApplicationTests.java`; client không có test runner. Không có thư viện migration (pom.xml không có mongock).
- Pan/zoom: `ZoomableGrid.tsx` giữ `scale`/`translate` local, zoom neo gốc màn hình (`:230-237`), children đặt trong div `translate(tx,ty) scale(s)` (`:457-460,555-557`). Chuyển toạ độ pen có bias `-penThickness/2` (`:101-104`).
- Sticky color là class Tailwind (`boardTemplates.ts:24`, `AIChatPopup.tsx:76`).
- Template nhúng `canvasPaths`/`stickyNotes`/`images` — `Template.java:41-43`; `usingTemplate` có nguy cơ NPE khi `images` null — `TemplateServiceImpl.java:141` (verify tĩnh, chưa chạy).
- Export board PNG/PDF dùng html2canvas trên `#board-area` không `useCORS` — `client/lib/export.ts:17,87`; `.mobi` export đọc snapshot `useBoardStoreof` — `export.ts:100-138`.

## 4. Phạm vi

### Trong phạm vi
- BE: collection `boardElements`, service, STOMP API mới, load board trả `elements`, job migrate (copy) từ `stickyNote` + `Images`, template hỗ trợ `elements`.
- FE: `BoardScene` SVG, `useSceneStore`, pointer state machine (select, marquee, drag, resize, rotate, pan, tạo shape, connecting, sửa text), zoom neo con trỏ, render sticky/image/shape/connector, style panel tối thiểu (fill, stroke), bring-to-front / send-to-back, chặn chỉnh sửa khi role VIEWER, reset store khi đổi board, refetch khi reconnect STOMP.
- Pencil: giữ nguyên dữ liệu (`canvasPaths`) và socket; vẫn vẽ trên `<canvas>` phía dưới SVG. Chỉ đổi chỗ đọc viewport (dùng chung viewport của scene) và nguồn pointer event.

### Ngoài phạm vi (ghi rõ, không làm)
- Undo/redo; touch/pinch/pen tablet (chỉ chuột + trackpad wheel); eraser; group resize/rotate nhiều đối tượng (multi-select chỉ kéo cùng nhau); Ctrl+A, copy/paste/duplicate; nhãn chữ trên connector; connector gắn vào nét pencil; lock bền vững (vẫn echo như hiện tại); auto thumbnail.
- Xoá handler/collection legacy (`stickyNote`, `Images`, các `@MessageMapping` sticky/image): giữ nguyên, **không dùng nữa từ FE mới**; dọn dẹp là việc sau khi user xác nhận chạy ổn (giai đoạn "contract").
- Chạy migration lên DB thật.

## 5. Backend

### 5.1 Model `BoardElement` — collection `boardElements`

```
{
  _id: ObjectId            // migrated: giữ nguyên _id legacy; mới: client sinh 24-hex
  boardId: ObjectId
  type: "sticky" | "image" | "shape" | "connector"
  x, y, w, h: double       // world units; connector: bỏ qua
  rotation: double         // độ, quanh tâm; connector: 0
  z: double                // thứ tự vẽ, lớn hơn = trên
  owner: ObjectId
  version: long            // server $inc mỗi lần ghi
  updateAt                 // @LastModifiedDate
  text?: string            // sticky, shape
  style?: { fill?, stroke?, strokeWidth?, fontSize? }   // sticky: fill = class Tailwind hoặc hex
  image?: { url, cloudinaryId, alt }
  shape?: { kind: "rect"|"ellipse"|"triangle"|"line"|"arrow" }
           // line/arrow: đoạn thẳng từ (x,y) tới (x+w, y+h); w,h có thể âm
  connector?: { from: End, to: End }
           // End = { elementId: string, anchor: "auto" | "top"|"right"|"bottom"|"left" }
  migratedFrom?: "stickyNote" | "Images"
}
```

Index: `{boardId:1, z:1}`, `{boardId:1, "connector.from.elementId":1}`, `{boardId:1, "connector.to.elementId":1}` (auto-index-creation đã bật — `application.properties:2`).

Một class Java `BoardElement` với các sub-object nullable (không class hierarchy).

### 5.2 Service `BoardElementService`
- `listByBoard(boardId)` sắp theo `z`.
- `create(boardId, user, elements)`: kiểm role OWNER/EDITOR (pattern `getRoleOfMember` hiện có), validate `type` ↔ sub-object, set `boardId`, `owner`, `version=1`; insert, bỏ qua trùng `_id` (idempotent).
- `patch(boardId, user, patches)`: role check; mỗi patch `$set` chỉ các field cho phép (`x,y,w,h,rotation,z,text,style,shape,connector`), `$inc version`, lọc `{_id, boardId}`; BulkOperations.
- `delete(boardId, user, ids)`: role check; xoá `{_id in ids, boardId}` + cascade connector có `from/to.elementId in ids`; trả về danh sách id đã xoá (bao gồm connector).
- Validate: text ≤ 10 000 ký tự; connector phải có 2 end với `elementId` khác nhau.

### 5.3 STOMP API (prefix `/app`, broker `/topic` — `WebSocketConfig.java:26-27`)

| Client → Server | Payload |
|---|---|
| `/app/board/{boardId}/el/create` | `{elements: Element[]}` |
| `/app/board/{boardId}/el/patch` | `{patches: [{id, set:{...}}]}` — commit (pointerup, text debounce) |
| `/app/board/{boardId}/el/preview` | `{patches: [...]}` — relay, không lưu, client throttle ~50ms |
| `/app/board/{boardId}/el/delete` | `{ids: string[]}` |
| `/app/board/{boardId}/el/lock`, `/el/unlock` | `{id}` — echo như lock sticky hiện tại |

Server → Client: `/topic/board/{boardId}/el`:
`{op, senderSessionId, userId, elements?, patches?: [{id,set,version}], ids?}`.

- Lỗi (role, validate): gửi `/user/queue/errors` `{op, ids, reason}`; client refetch board và reset scene. *(assumption: user destination đã được cấu hình qua `@SendToUser("/queue/session")` ở `BoardSocketController.java:53` — sẽ verify khi implement.)*
- Xung đột: last-writer-wins theo field, thứ tự do server. Client bỏ echo của chính mình theo `senderSessionId`; áp patch remote chỉ khi `version` lớn hơn bản local.

### 5.4 REST
- `GET /board/{id}` (endpoint hiện có) trả thêm `elements: BoardElement[]`. Các field legacy `stickyNotes`, `images` vẫn trả để không vỡ FE cũ, nhưng FE mới chỉ dùng `elements` + `canvasPaths`.

### 5.5 Migration (copy, idempotent)
- `ElementMigrationRunner` chạy khi bật profile `migrate-elements` (một lần, process riêng).
- Với mỗi doc `stickyNote` / `Images`: upsert `$setOnInsert` vào `boardElements` với **cùng `_id`**, `migratedFrom`, map field (`position→x,y`, `size→w,h`, `color→style.fill` giữ nguyên chuỗi, `text`, image `url/cloudinaryId/alt`), `rotation=0`, `z`: sticky trước, image sau (khớp thứ tự render hiện tại `page.tsx:97-125`), trong cùng type theo `_id`.
- Chạy lại lần 2 sau deploy: copy lại doc legacy có `updateAt` mới hơn và `version` element vẫn = 0 (chưa bị sửa qua API mới).
- Log số lượng theo board/type; lệch thì fail.
- **Không xoá** collection legacy → rollback = deploy lại bản cũ (mất dữ liệu ghi sau khi chuyển; chấp nhận).
- Test trên Mongo local (docker `mongo:7`), không chạy lên DB thật.

### 5.6 Template
- Thêm `Template.elements: List<BoardElement-like embedded>` (không id/boardId/owner).
- `usingTemplate`: tạo `boardElements` từ `elements` nếu có, ngược lại từ `stickyNotes`/`images` legacy; list null coi là rỗng (sửa NPE `TemplateServiceImpl.java:141`). Connector trong template: remap id cũ → id mới.
- Trang tạo template gửi `elements` từ scene store.

## 6. Frontend

### 6.1 Cấu trúc
```
client/components/Scene/
  BoardScene.tsx          // <div id="board-area"> chứa: grid canvas, pencil canvases, <svg>, overlay text editor, MultiCursor
  SceneElement.tsx        // switch theo type
  elements/StickyView.tsx, ImageView.tsx, ShapeView.tsx, ConnectorView.tsx
  SelectionOverlay.tsx    // bbox, 8 handle resize, handle xoay, anchor dot connector
  TextEditOverlay.tsx     // <textarea> HTML đặt trên SVG, chỉ mount khi đang sửa
  StylePanel.tsx          // fill / stroke cho shape đang chọn, z-order
  usePointerController.ts // state machine
  geometry.ts             // screen↔world, bbox xoay, hit-test, connector route
  sceneSocket.ts          // subscribe /topic/board/{id}/el, publish helpers
client/lib/Zustand/sceneStore.ts
```

### 6.2 Store `useSceneStore` (zustand + immer)
`elements: Record<id, Element>`, `order` (id theo z), `selection: string[]`, `viewport {s, tx, ty}`, `editingId`, `remoteLocks: Record<id,userId>`, `versions`. Thay `stickyNoteStore`, `ImageNoteStore` và `shapeList` cho board. `canvasPathsStore` giữ nguyên (pencil).

Tool: mở rộng `useToolDevStore` — thêm `tool: "select"|"hand"|"pen"|"sticky"|"rect"|"ellipse"|"triangle"|"line"|"arrow"|"connector"`; bump `version` của persist + `migrate()` để reset giá trị cũ (`store.ts:81-94`). Chế độ `drag` cũ = `hand`, `idle` = `select`, `pen` giữ.

### 6.3 Render & toạ độ
- `<svg>` full màn hình, `<g transform="translate(tx,ty) scale(s)">`. Grid và pencil canvas dùng cùng viewport (công thức hiện có `screen = world*s + t`).
- Mỗi element: `<g data-id transform="translate(x,y) rotate(r, w/2, h/2)">`.
  - sticky: `<rect>` + `<foreignObject>` hiển thị text (div, class màu Tailwind hoặc hex).
  - image: `<image href preserveAspectRatio="xMidYMid meet">`.
  - shape: `rect` / `ellipse` / `polygon` / `line` (+ `marker` mũi tên cho arrow) + `foreignObject` chữ căn giữa (không có chữ cho line/arrow).
  - connector: `<path>` đường thẳng giữa 2 điểm, có mũi tên ở đầu `to`.
- Screen → world: `(clientX - rect.left - tx)/s` (bỏ bias pencil cho element; pen giữ công thức cũ để nét vẽ mới khớp nét cũ).
- Zoom neo con trỏ: `t' = p - (p - t)·s'/s`, clamp `s ∈ [0.1, 5]`.
- Hit-test line/arrow/connector: path ẩn `stroke-width` 12px màn hình.

### 6.4 Pointer state machine
- `select`:
  - pointerdown trên handle → `resizing` / `rotating`; trên element → chọn (shift = toggle) → `dragging`; trên nền → `marquee` (chọn element theo AABB và pencil path theo điểm như hiện tại).
  - double-click sticky/shape (không phải line/arrow) → `editingText`.
  - Kéo từ anchor dot (hiện khi hover element) → `connecting`.
- `hand`, phím Space giữ, nút giữa chuột → `panning`.
- `pen` → vẽ pencil (logic cũ, chuyển sang controller).
- `rect|ellipse|triangle|line|arrow` → `creating`: kéo tạo box / đoạn thẳng, Shift giữ tỉ lệ; thả → tạo element, chọn nó, quay về `select`. Click không kéo → kích thước mặc định 160×100.
- `sticky` → click tạo sticky 200×200 (thay nút sticky hiện tại).
- `connector` → kéo từ element A tới element B; thả ngoài element → huỷ.
- Trong khi kéo: chỉ đổi store local + gửi `preview` throttle; pointerup → 1 `patch` commit.
- Phím: Delete/Backspace (bỏ qua khi đang gõ trong input/textarea/contentEditable) xoá selection (element + pencil path); Escape huỷ thao tác / bỏ chọn.
- Sticky/image tối thiểu 50×50 (world); lock: element bị người khác lock thì không kéo/resize/xoay/sửa text được.
- VIEWER: chỉ pan/zoom/chọn; toolbar ẩn tool tạo; không gửi message ghi.

### 6.5 Connector
- Điểm neo: `anchor` là 1 trong 4 trung điểm cạnh (trong hệ local chưa xoay, sau đó xoay theo element) hoặc `auto` = giao của tia từ tâm A → tâm B với biên element (hình chữ nhật xoay; ellipse dùng giao ellipse).
- Route suy ra từ vị trí element mỗi lần render → tự bám theo khi kéo local lẫn preview remote.
- Reverse index `elementId → connectorIds` trong store.
- Xoá element → server cascade và broadcast id connector bị xoá; client cũng xoá local ngay.
- Kéo đầu connector đang chọn sang element khác → đổi target (`patch connector`).

### 6.6 Chữ
- `TextEditOverlay`: `<textarea>` HTML đặt đúng vị trí element (cùng transform + rotation), giữ các guard `stopPropagation` keydown hiện có (`RNDStickyNote.tsx:190-197`). Commit text debounce 500ms và khi blur. Không publish text lúc mount (sửa bug `RNDStickyNote.tsx:41-43`).

### 6.7 Luồng khác phải giữ (parity)
- AI tạo sticky (temp/ghost + ConfirmSaveBar) → Save gửi `el/create`; ghost đặt quanh tâm viewport hiện tại.
- Template mẫu từ `boardTemplates.ts` → `el/create`.
- Import `.mobi` 1.0 (map legacy → element) và export `.mobi` 2.0 `{version:"2.0", elements, canvasPaths}` đọc từ scene store.
- Export PNG/PDF: html2canvas trên `#board-area` thêm `useCORS: true`. *(assumption: html2canvas render được SVG + foreignObject; nếu không → fallback serialize SVG. Sẽ kiểm tra ở Phase 1.)*
- Context menu element: Lock/Unlock (sticky), Export PDF (sticky), Delete, Bring to front, Send to back.
- Multi-cursor giữ nguyên, đọc viewport từ store.
- Đổi board → reset scene store; STOMP reconnect → refetch board.

## 7. Giai đoạn triển khai

Mỗi giai đoạn: BE `mvn compile` + test đơn vị mới pass, FE `tsc --noEmit` + `next build` pass, checklist thủ công 2 trình duyệt.

1. **P1 — BE elements**: `BoardElement`, repository, service (role + boardId), STOMP `/el/*`, `GET board` trả `elements`, migration runner + test trên Mongo local, template `elements` + null-safety. Unit test service (JUnit + Mockito, hoặc embedded Mongo nếu có sẵn).
2. **P2 — Scene engine + parity**: `BoardScene`, store, viewport/zoom neo con trỏ, pencil canvas dùng viewport chung, state machine select/marquee/drag/resize/rotate/pan, sticky + image render + text editor, lock, delete, context menu, AI/template/import/export, VIEWER gating. Gỡ `ZoomableGrid` render children, `RND*` khỏi board, `shapeList`, `Linker.jsx`, `CustomShape` cũ.
3. **P3 — Shapes**: 5 tool, drag-to-create, chữ trong shape, style panel, z-order.
4. **P4 — Connectors**: anchor dots, connecting, route, reverse index, retarget, cascade delete.

## 8. Rủi ro
- Không có test tự động → thêm unit test BE cho service/geometry FE (thuần hàm) và checklist thủ công.
- foreignObject trên Safari khi có transform (assumption, chưa kiểm).
- Thay toàn bộ board FE trong một lần → giữ collection legacy để rollback.
- Tab cũ còn mở trong lúc deploy sẽ ghi vào collection legacy → migration pass 2 bù lại.
- Màu Tailwind: map class → hex cho SVG `<rect>`; class lạ dùng màu mặc định vàng.
