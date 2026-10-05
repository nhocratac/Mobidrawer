# Board History + Collaborative Undo/Redo — Design

- Ngày: 2026-09-24
- Branch: `nhocratac/Design-Feature-Draw-Shape` (base `main` @ `6a7b362`, chứa SVG scene elements chưa commit)
- Trạng thái: thiết kế đã được user duyệt từng phần trong chat (2026-09-24). **Rev 2** đã sửa theo 34 finding được xác nhận khi review adversarial (workflow `wf_3f9cc582-c36`). Spec chờ user review.
- Phụ thuộc: `2026-09-24-svg-scene-elements-design.md` (collection `boardElements`, STOMP `/el/*`).

## 1. Mục tiêu

Tính năng phục vụ phỏng vấn, phải build thật và demo được bằng 2 trình duyệt:

1. **Undo/redo cộng tác:** mỗi người chỉ hoàn tác thao tác của chính mình. Undo stack lưu ở server nên reload trang vẫn còn.
2. **Xử lý xung đột theo field:** key đã bị người khác sửa sau thao tác gốc thì không hoàn tác key đó, và báo cho người dùng.
3. **Lịch sử phiên bản:** timeline, xem board tại một thời điểm (chỉ xem), OWNER khôi phục được. Khôi phục sinh thao tác bù trừ nên bản thân nó cũng undo được.

## 2. Quyết định đã chốt với user

| # | Quyết định | Nguồn |
|---|---|---|
| H1 | Build thật, demo được | user chọn "Build thật, demo được" |
| H2 | Chỉ áp dụng cho elements (`boardElements`); nét pencil không có lịch sử/undo | user chọn "Chỉ elements" |
| H3 | Xung đột: xử lý theo từng field | user chọn "Theo từng field" |
| H4 | Lịch sử: timeline + xem trước + khôi phục | user chọn "Timeline + xem trước + khôi phục" |
| H5 | Phương án A: op log ở server, lưu before/after cho từng field | user: "A" |
| H6 | Không dùng multi-document transaction; khóa theo từng board trong JVM + WAL | user duyệt phần 2 |
| H7 | Integration test chạy với Mongo local, bật bằng biến môi trường; không thêm Testcontainers | user duyệt ("ổn luôn"); Claude chọn không thêm dependency mới |
| H8 | Không commit/push/PR khi user chưa yêu cầu | CLAUDE.md của user |
| H9 | Undo stack giới hạn 50 tx gần nhất mỗi user mỗi board | Claude đề xuất (giống cap trên `develop`), user không phản đối |

## 3. Hiện trạng (bằng chứng)

- Các nơi ghi vào `boardElements`:
  - `BoardElementService` create/patch/delete (`service/element/BoardElementService.java:36-95`).
  - `TemplateServiceImpl.java:114` (`boardElementRepository.insert`).
  - `ElementMigration` (process migrate riêng: `ElementMigration.java:54` insert, `:59` update, `:88` remove).
- Patch cho phép đúng 10 key top-level: `x, y, w, h, rotation, z` cùng `text, style, shape, connector`. Geometry được ép về `double`; `style/shape/connector` qua `MAPPER.convertValue` sang POJO. Patch `$inc version` và `currentDate updateAt` (`ElementPatches.java:19-58`). Key khác bị ném `"field not allowed"` (`:53`).
- `patch()` gọi `findAndModify(returnNew=true)` cho từng element, không có gì tuần tự hóa các lệnh ghi. Id không tồn tại thì bị bỏ qua (`if (after != null)`) (`BoardElementService.java:57-72`).
- `create()` lọc bỏ `_id` đã tồn tại (`:43-48`). Connector trong cùng batch được phép trỏ tới element tạo cùng batch (`batchTargets`, `:39-42`).
- `delete()` cascade connector có `from/to.elementId ∈ ids` và dedupe (`:78-95`).
- `requireConnectorEnds` đọc DB (`mongo.count`) (`:98-106`).
- `requireEditor` dùng `getRoleOfMember` (`:26-30`). `getRoleOfMember` trả `"OWNER"`, `"EDITOR"`, `"VIEWER"` hoặc **`"NONE"`** (không bao giờ null), và ném 404 khi board không tồn tại (`BoardServiceImpl.java:169-181`). **`BoardAccessService` không có trên branch này.**
- Broadcast element hiện tại: `{op, senderSessionId, userId, <elements|patches|ids>}`, mỗi message một kind (`BoardElementSocketController.java:42-49`). FE `ElementEvent` có đúng shape này (`client/components/Scene/types.ts:48-55`).
- FE bỏ qua patch có `version ≤` bản local (`sceneStore.ts:143-147`). Echo của chính mình được xử lý theo `senderSessionId`.
- Lỗi STOMP gửi về `@SendToUser("/queue/errors")` `{reason}` (`BoardElementSocketController.java:121-126`). FE subscribe `/user/queue/errors` và gọi `reloadBoard` (`sceneSocket.ts:68-95`).
- `enableSimpleBroker` (`WebSocketConfig.java:26`) và `ElementLockRegistry` trong bộ nhớ, tức là hệ thống chạy một instance.
- Code không có `@Transactional` hay `MongoTransactionManager`. Prod Mongo có phải replica set không thì **chưa biết (assumption)**.
- `pom.xml` chỉ có `spring-boot-starter-test`. Plan SVG pin JDK 17 cho BE (`docs/superpowers/plans/2026-09-24-svg-scene-elements.md:15`), vì JDK 25 mặc định làm Lombok crash khi compile.
- `client/vitest.config.ts` đã tồn tại. Scene đã có tests trong `client/components/Scene/__tests__/`.

## 4. Phạm vi

### Trong phạm vi
Op log, tx, counter, snapshot; `ElementWriter` (lock + WAL + roll-forward); undo/redo; REST history; restore; broadcast `batch` có seq; FE panel lịch sử, banner, chế độ xem, phím tắt, toast; phát hiện hụt seq.

### Ngoài phạm vi
- Lịch sử/undo cho nét pencil.
- Retention hay dọn log.
- Log `preview`, `lock`, `unlock`.
- Chạy nhiều instance.
- Undo thao tác của người khác.
- So sánh diff trực quan giữa 2 phiên bản.
- Tên phiên bản đặt thủ công.
- Chạy migration hoặc thao tác lên DB thật.

## 5. Data model

**Key patchable:** `K = {x, y, w, h, rotation, z, text, style, shape, connector}`.

**Giá trị chuẩn hóa (normalized):** giá trị có dạng giống như Mongo lưu sau `ElementPatches.toUpdate`. Geometry là `double`. `style/shape/connector` được chuyển sang POJO rồi serialize lại thành Map, giữ cả null. Mọi `before`/`after`, snapshot, replay và diff đều dùng dạng này.

### 5.1 `boardElements`: thêm field
```
fieldSeq: { <k ∈ K>: long }   // "dấu" của lần ghi hiển thị hiện tại cho key k; thiếu = 0
```
`fieldSeq` không nằm trong K, nên client không patch được.

### 5.2 `boardOps`
```
{ _id, boardId: ObjectId, seq: long, txId, userId, ts,
  kind: "create" | "patch" | "delete",
  elementId,
  before:   Map | null,   // patch: giá trị cũ các key bị đổi; delete: toàn bộ element (gồm fieldSeq, version)
  after:    Map | null,   // patch: giá trị mới; create: toàn bộ element (gồm fieldSeq)
  fsBefore: {k: long},    // fieldSeq[k] trước op
  fsAfter:  {k: long},    // fieldSeq[k] op ghi vào (§6.4)
  v: long }               // version của element sau op (delete: version trước khi xóa)
```
Index: `{boardId:1, seq:1}` unique, `{boardId:1, elementId:1, seq:-1}`.

### 5.3 `boardTxs`
```
{ _id: txId, boardId, userId, ts, seqFrom, seqTo,
  source: "user" | "undo" | "redo" | "restore" | "template",
  target?: txId, mergeKey?: string,
  state: "pending" | "active" | "undone" | "dead",
  pending?: { seqFrom, seqTo, ops: [BoardOp...] },   // WAL, chỉ có khi state=pending
  prev?: { seqTo, summary, ts },                      // chỉ khi merge vào tx đã có (để revert)
  summary: { created, patched, deleted } }
```
Index: `{boardId:1, userId:1, seqTo:-1}`, `{boardId:1, seqTo:-1}`, `{boardId:1, state:1}`.

- `undone`: tx đã bị undo, còn redo được.
- `dead`: không undo hay redo được nữa.
- Tx `source ∈ {undo, template}` không bao giờ vào undo stack. Tx `undo` luôn giữ `active` và chỉ dùng cho timeline và redo.

### 5.4 `boardCounters`, `boardSnapshots`
```
boardCounters:  { _id: boardId, seq: long, committedSeq: long }  // committedSeq = seqTo lớn nhất đã active
boardSnapshots: { boardId, seq, elements: [...] }                 // unique (boardId, seq)
```

## 6. Luồng ghi: `ElementWriter`

### 6.1 API
- `withLock(boardId, fn)`:
  - `BoardLocks.tryLock(boardId, 2s)` với `ReentrantLock` theo board. Không lấy được thì ném `ResponseStatusException(SERVICE_UNAVAILABLE, "board busy")`.
  - Chạy **roll-forward** (§6.5), sau đó mới chạy `fn`.
  - Luôn unlock trong `finally`.
- `commit(boardId, userId, sessionId, source, intents, opts{mergeKey?, target?})`: gọi `withLock` nếu chưa giữ lock; nếu đã giữ (re-entrant) thì chạy thẳng. `UndoService` và `HistoryService` gọi `commit` bên trong `withLock` của chính chúng, nên các lần đọc để tính inverse hoặc diff và lần ghi đều nằm trong cùng một lock.
- `intents`: `{kind, elementId, element?(create), set?(patch)}`.

### 6.2 Trước lock (validation thuần, không đọc DB)
`requireEditor` (hoặc kiểm OWNER với restore), `ElementValidator.validate`, `ElementPatches.toUpdate`. Lỗi thì dừng, không ghi gì.

### 6.3 Trong lock
1. **Snapshot 0 + counter (idempotent):** nếu chưa có `boardCounters`:
   - Upsert `boardSnapshots {boardId, seq:0}` bằng `$setOnInsert` từ toàn bộ `boardElements` của board, đã chuẩn hóa.
   - Upsert `boardCounters {_id}` bằng `$setOnInsert {seq:0, committedSeq:0}`.
   - Chạy lại sau khi lỗi dở dang vẫn an toàn.
2. **Chuẩn hóa intents theo trạng thái hiện tại:**
   - Bỏ patch và delete có `_id` không tồn tại trên board.
   - Bỏ create có `_id` đã tồn tại (giữ hành vi `create()` hiện có).
   - Gộp nhiều intent cùng `elementId` trong batch: create + patch thành create với giá trị cuối; patch + delete thành delete; create + delete triệt tiêu nhau.
3. **Cascade:** chỉ tính sau khi đã áp các patch connector của batch (theo trạng thái sau patch). Connector có đầu trỏ tới id đang bị delete thì thêm delete, nếu chưa có trong batch. Dedupe.
4. **Kiểm đầu connector (TOCTOU-safe):** với mọi create hoặc patch có `connector`, hai đầu phải là non-connector nằm trong tập sau batch: `(hiện có − bị delete) ∪ (non-connector được create trong batch)`. Sai thì ném `IllegalArgumentException`, không ghi gì. `requireConnectorEnds` chuyển từ `BoardElementService` vào đây.
5. Không còn intent nào: không tạo tx, không tăng counter, không broadcast, trả về kết quả rỗng.
6. **Thứ tự op cố định:** create non-connector → patch → create connector → delete. Đây vừa là thứ tự cấp seq, vừa là thứ tự áp dụng và thứ tự trong broadcast.
7. **Tính op:** đọc các element liên quan và tính `before/after` (đã chuẩn hóa), `fsBefore`, `fsAfter` (§6.4), `v`:
   - Create mới: `v = 1`. Create lại một `_id` đã từng tồn tại (undo-delete hoặc restore): `v = (v của op mới nhất trên elementId) + 1`, để version không bao giờ giảm.
   - Patch: `v = version hiện tại + 1`.
8. **Cấp seq:** `findAndModify $inc boardCounters.seq += n` được dải `[s+1..s+n]`.
9. **mergeKey:**
   - Nếu tx mới nhất của user trên board có cùng `mergeKey`, `state=active`, và `ts` cách hiện tại dưới 3s thì merge vào tx đó: lưu `prev`, mở rộng `seqTo`, cộng dồn `summary`, **đặt `ts = now`** (cửa sổ trượt).
   - Ngược lại tạo tx mới.
10. **WAL, một document nên atomic:** ghi `boardTxs` với `state:"pending"` và `pending:{seqFrom:s+1, seqTo:s+n, ops}`.
11. **Apply (idempotent):**
    - Upsert từng op vào `boardOps` theo `(boardId, seq)`.
    - Create: upsert theo `_id` với `after`, `fieldSeq = fsAfter`, `version = v`.
    - Patch: `$set after`, `$set fieldSeq.k = fsAfter[k]`, `$set version = v`, `currentDate updateAt`. Dùng `$set version` thay cho `$inc` để roll-forward idempotent.
    - Delete: remove theo `{_id, boardId}`.
12. **Post-commit** (§6.6).
13. **Broadcast, vẫn trong lock** (§6.7). Simple broker gửi đồng bộ nên thứ tự message khớp thứ tự seq.
14. Nếu `seqTo` vượt qua một bội số của 200 thì submit job snapshot bất đồng bộ (§8.2).

Lỗi Mongo ở bước 11 hoặc 12: tx giữ `pending`, lỗi được gửi về `/user/queue/errors`, và lần `withLock` kế tiếp sẽ roll-forward. Lỗi ở bước 10: không có gì được ghi ngoài counter, nên để lại **lỗ seq**. Replay và FE chịu được lỗ seq.

### 6.4 Quy tắc "dấu" `fieldSeq` (nền tảng cho xử lý xung đột)
`fieldSeq[k]` cho biết lần ghi nào đang hiển thị ở key k. Với tx gốc T, ký hiệu:
- `T.fsB[k]`: `fsBefore[k]` của op **sớm nhất** trên (elementId, k) trong T.
- `T.fsA[k]`: `fsAfter[k]` của op **muộn nhất** trên (elementId, k) trong T.

| source | `fsAfter[k]` ghi vào | Điều kiện áp dụng (chỉ undo/redo) |
|---|---|---|
| user, restore, template | `seq` của op | — |
| undo của T | `T.fsB[k]` (trả "dấu" về trước T) | `fieldSeq[k] == T.fsA[k]` |
| redo của T | `T.fsA[k]` (trả "dấu" về sau T) | `fieldSeq[k] == T.fsB[k]` |

- Create hoặc delete được tạo lại (undo-delete, redo-create) dùng `fieldSeq` lưu trong `before` của op delete tương ứng.
- Tx R do redo sinh ra có `fsBefore = T.fsB` và `fsAfter = T.fsA`. Vì vậy undo R theo đúng bảng trên vẫn nhất quán.
- **Hệ quả:** một user undo hay redo nhiều bước liên tiếp trên cùng key vẫn chạy. Chỉ cần một người khác ghi vào key là "dấu" đổi sang seq của họ, nên undo/redo bị chặn đúng lúc.

### 6.5 Roll-forward (đầu mỗi `withLock`)
Với tx có `state=pending` của board (tối đa một):
1. Upsert từng op trong `tx.pending.ops` vào `boardOps`.
2. Áp dụng lại bước 11.
3. Chạy post-commit (§6.6).
4. `$unset pending`.

**Không broadcast.** Client nào bị lệch sẽ tự reload nhờ cơ chế phát hiện hụt seq.

### 6.6 Post-commit (idempotent, suy ra từ chính document tx)
1. `tx.state = active`, `$unset pending`, đặt `boardCounters.committedSeq = max(committedSeq, tx.seqTo)`.
2. Nếu `source ∈ {user, restore}`: mọi tx khác của user trên board có `state=undone` chuyển sang `dead`, vì có thao tác mới thì mất redo.
3. Nếu `source = undo`: `target.state = undone`, chỉ khi target đang `active`.
4. Nếu `source = redo`: `target.state = dead`, chỉ khi target đang `undone`.

### 6.7 Broadcast contract
Mọi commit của writer gửi **một** message tới `/topic/board/{id}/el`:
```
{ op: "batch", txId, source, seqFrom, seqTo,        // dải seq của commit này (không phải của tx đã merge)
  senderSessionId, userId,
  ops: [ {op:"create", elements:[...]} | {op:"patch", patches:[{id, set, version}]} | {op:"delete", ids:[...]} ] }
```
- `ops` giữ thứ tự của §6.3 bước 6.
- `set` trong broadcast dùng giá trị đã chuẩn hóa. `version` là `v` của op.
- `preview`, `lock` và `unlock` giữ nguyên format cũ, không có seq.
- Echo cho chính mình: FE chỉ bỏ qua khi `senderSessionId == mine` **và** `source ∈ {user, template}`, vì các thay đổi đó đã được áp dụng lạc quan ở local. Undo, redo và restore luôn được áp dụng, kể cả với người bấm.

### 6.8 Nối vào code hiện có
- `BoardElementService.create/patch/delete`: giữ phần kiểm quyền và validation thuần, còn phần ghi gọi `ElementWriter.commit(source="user")`.
- `patch` nhận thêm `mergeKey`.
- `TemplateServiceImpl:114` gọi `commit(source="template")`.
- **Known limitation:** `ElementMigration` ghi thẳng, không qua writer. Phải migrate xong trước khi bật lịch sử, vì snapshot 0 chụp trạng thái tại lần commit đầu tiên của mỗi board.

## 7. Undo / Redo

STOMP `/app/board/{id}/el/undo` và `/el/redo` (payload rỗng), kiểm quyền bằng `requireEditor`. Kết quả gửi về `@SendToUser("/queue/history")`:
```
{ op: "undo"|"redo"|"restore", applied: int, skipped: [{ elementId?, key?, reason, byUserId? }] }
```
`reason ∈ modified | gone | exists | end-missing | empty`.

### 7.1 Chọn T cho undo
Trong `withLock`, lấy 50 tx mới nhất của user trên board có `source ∈ {user, redo, restore}`, ở mọi state, sắp `seqTo` giảm dần. **T** là tx đầu tiên trong số đó có `state=active`. Không có thì trả `applied:0, skipped:[{reason:"empty"}]`.

### 7.2 `HistoryMath.inverse(T, direction, current, opsLog)`
`direction ∈ {undo, redo}`, và T luôn là **tx gốc**. Redo không đảo ngược U, mà áp dụng lại T theo chiều xuôi.

**Gộp các op của T theo elementId:**
- Create + patch thành create, dùng giá trị cuối.
- Patch + delete thành delete, với `before` lấy từ op sớm nhất.
- Create + delete triệt tiêu nhau.

Patch gộp tiếp theo key: `before[k]` lấy từ op sớm nhất, `after[k]` lấy từ op muộn nhất, cùng `T.fsB[k]` và `T.fsA[k]` (§6.4).

| Op của T (sau gộp) | Undo sinh ra | Redo sinh ra | Áp dụng khi | Không thỏa thì |
|---|---|---|---|---|
| patch key k | `set k = before[k]` | `set k = after[k]` | element tồn tại **và** điều kiện "dấu" §6.4; riêng k = `connector`: hai đầu của giá trị sắp ghi tồn tại sau batch và không phải connector | `modified` / `gone` / `end-missing` |
| create | delete (cascade §6.3) | create lại từ `before` của op delete trong U mới nhất nhắm tới T | undo: không có op của **user khác** với `seq > seq của T` trên element hoặc connector nối vào nó. Redo: `_id` chưa tồn tại và 2 đầu hợp lệ | `modified` / `exists` / `end-missing` |
| delete | create lại từ `before` (giữ `_id`, `fieldSeq`, version theo §6.3 bước 7) | delete (cascade) | undo: `_id` chưa tồn tại; connector chỉ tạo lại khi 2 đầu tồn tại sau batch. Redo: không có op của user khác trên element với `seq >` seq của U | `exists` / `end-missing` / `modified` |

`byUserId` là user của op mới nhất trên (elementId, k) có `seq >` seq muộn nhất liên quan (của T khi undo, của U khi redo) và `userId ≠` người bấm.

Batch inverse vẫn đi qua §6.3 (chuẩn hóa, cascade, kiểm đầu connector) như một lớp phòng thủ. Nếu vẫn ném lỗi validation thì coi như không có inverse.

### 7.3 Undo
- Có inverse: `commit(source="undo", target=T.id)`. Post-commit chuyển T sang `undone`.
- Không có inverse: `T.state = dead`, trả `applied:0` kèm `skipped`. Stack không bị kẹt vì lần undo sau sẽ tới tx trước đó.

### 7.4 Redo (LIFO theo thứ tự undo)
- Lấy các tx `source=undo` của user, sắp `seqTo` giảm dần. **U** là tx đầu tiên có `target.state == undone`, và **T = U.target**. Không có thì trả `empty`.
- `inverse(T, redo)` theo §7.2.
- Có inverse: `commit(source="redo", target=T.id)`. Post-commit chuyển T sang `dead`, và R là tx `active` nên undo được.
- Không có inverse: `T.state = dead`, trả `applied:0` kèm `skipped`.

### 7.5 Ví dụ bắt buộc có test
1. **Chuẩn (§7.4 cũ):**
   - Alice patch S `x 0→100` (seq 10). Bob patch `style` (seq 11), rồi `x 100→200` (seq 12).
   - Alice undo: `fieldSeq.x = 12 ≠ T.fsA 10`, nên skip `{key:x, reason:modified, byUserId:Bob}` và T chuyển sang `dead`.
2. **Một user, nhiều bước, và có người chen vào:**
   - Alice T1 `x 0→100` (seq 10, fsB 0, fsA 10). Alice T2 `x 100→200` (seq 11, fsB 10, fsA 11).
   - Undo T2: `fs 11 == T2.fsA 11`, được. x = 100, fs = 10.
   - Undo T1: `fs 10 == T1.fsA 10`, được. x = 0, fs = 0.
   - Redo (LIFO, nên là T1): `fs 0 == T1.fsB 0`, được. x = 100, fs = 10.
   - Redo T2: `fs 10 == T2.fsB 10`, được. x = 200, fs = 11.
   - Undo R2: `fs 11 == R2.fsA 11`, được. x = 100, fs = 10.
   - **Biến thể:** sau "Undo T1", Bob ghi x (seq 20, fs = 20). Alice redo: `fs 20 ≠ T1.fsB 0`, nên skip `{key:x, reason:modified, byUserId:Bob}` và T1 chuyển sang `dead`.
3. **Create rồi move, undo, undo, redo, redo:** kết quả cuối là E tồn tại ở vị trí đã move. Đây là test cho redo LIFO.
4. **Patch x, delete, undo delete, undo patch:** cả hai bước đều được áp dụng, vì undo-delete khôi phục `fieldSeq`.
5. **Connector đổi đầu:** Alice đổi C từ E→F sang E→G. Bob xóa F. Alice undo: skip `{key:connector, reason:end-missing}`.
6. **Undo, rồi thao tác mới, rồi redo:** trả `empty`. Case tương tự với restore thay cho thao tác mới cũng trả `empty`.

### 7.6 Gộp gõ chữ
- `PatchBody(List<ElementPatch> patches, String mergeKey)`: `mergeKey` ở top-level và optional.
- FE gửi `mergeKey = "text:<elementId>:<editSessionId>"`, trong đó `editSessionId` sinh mỗi lần mở `TextEditOverlay`. Server merge theo §6.3 bước 9.
- BE phải được deploy trước hoặc cùng FE, vì field lạ bị Jackson bỏ qua lặng lẽ.

## 8. Lịch sử và khôi phục

### 8.1 REST
Mọi thành viên có role `OWNER`, `EDITOR` hoặc `VIEWER` đều gọi được. `getRoleOfMember == "NONE"` thì trả **403**. Board không tồn tại thì 404, lấy sẵn từ `getRoleOfMember`.
```
GET /board/{id}/history?beforeSeq=<n>&limit=30   (limit ≤ 100; bỏ tx pending; sắp seqTo giảm)
  → [{ txId, userId, userName, ts, source, state, summary, seqTo }]
GET /board/{id}/history/state?seq=<n>             (n > committedSeq → 400)
  → { seq, elements: [...] }
```
`userName` join theo danh sách `userId`. Tên field hiển thị trên model User sẽ được xác định lúc implement (**assumption**).

### 8.2 Dựng trạng thái tại seq N
- Lấy snapshot có `seq ≤ N` gần nhất, rồi replay các op của tx không `pending` có `seq ∈ (snap.seq, N]`, theo thứ tự tăng dần. Chịu được lỗ seq.
  - create: put `after`.
  - patch: merge `after`; bỏ qua nếu id không có.
  - delete: remove; bỏ qua nếu id không có.
- Job snapshot bất đồng bộ dựng snapshot bằng snapshot trước cộng replay, chỉ tới `committedSeq`. Lỗi chỉ được log.
- **Invariant:** `replay(committedSeq)` trùng `boardElements` trên các trường `_id, type, image` và K (đã chuẩn hóa).

### 8.3 Khôi phục
STOMP `/app/board/{id}/el/restore {seq}`. Chỉ OWNER; ngược lại 403. Trong `withLock`, tức là sau roll-forward:
1. `seq > committedSeq` thì trả 400. Ngược lại: `target = state(seq)`, `current = boardElements`.
2. `HistoryMath.diff(target, current)`, chỉ so type, image và K:
   - Có trong current mà không có trong target: delete.
   - Có trong target mà không có trong current: create, giữ `_id`.
   - Có ở cả hai: patch các key K khác nhau. Nếu khác `type` hoặc `image` thì delete rồi create.
3. Cascade và kiểm connector đi theo §6.3, vì diff đã đầy đủ nên cascade không thêm gì sai.
4. Diff rỗng: `{op:"restore", applied:0, skipped:[{reason:"empty"}]}`. Ngược lại `commit(source="restore")` và trả `{op:"restore", applied:n}`.
5. Tx restore undo được theo §7.

## 9. Frontend

### 9.1 Socket và đồng bộ seq (`sceneSocket.ts`, `sceneStore.ts`, `types.ts`)
- `ElementEvent` thêm `op:"batch"` với các field `txId, source, seqFrom, seqTo, ops`. `applyRemote` áp dụng lần lượt `ops` theo thứ tự.
- Khi `removeLocal` hoặc áp delete: xóa các entry `fieldVersions`, `baseVersions` và `pendingCommits` của id đó, để lớp phòng thủ version hoạt động đúng.
- **`lastSeq`:**
  - Lần load đầu (`useBoard.ts`) và `reloadBoard` đặt `lastSeq = historySeq` lấy từ `GET /board/{id}`.
  - Chỉ event `batch` mới được kiểm seq. `preview`, `lock` và `unlock` không động tới `lastSeq`.
  - `seqTo ≤ lastSeq`: bỏ qua (trùng lặp hoặc cũ).
  - `seqFrom == lastSeq + 1`: áp dụng rồi đặt `lastSeq = seqTo`.
  - `seqFrom > lastSeq + 1`: buffer event, chờ tối đa 500ms để các seq bị thiếu tới. Hết thời gian mà vẫn thiếu thì gọi `reloadBoard`. Lỗ seq thật do commit hỏng chỉ gây một lần reload.
  - Trong lúc `reloadBoard` đang chạy: buffer mọi event `batch`. Sau khi `reset()`: bỏ các event có `seqTo ≤ historySeq`, áp dụng phần còn lại theo thứ tự seq.
- API: `undo(boardId)`, `redo(boardId)`, `restore(boardId, seq)`, `patch(boardId, patches, {mergeKey})`. Subscribe `/user/queue/history` để hiện toast.

### 9.2 Backend hỗ trợ
`GET /board/{id}` (`BoardServiceImpl.getBoard`/DTO) trả thêm `historySeq = boardCounters.committedSeq` (không có counter thì 0), **đọc trước** `findByBoardIdOrderByZAsc`. Nhờ vậy elements luôn mới bằng hoặc hơn `historySeq`. Áp dụng lại event trùng là an toàn vì create là upsert và patch là `$set`.

### 9.3 Phím tắt (`keyboard.ts`)
- `isUndoKey`: `Cmd/Ctrl+Z` không kèm Shift.
- `isRedoKey`: `Cmd/Ctrl+Shift+Z` hoặc `Ctrl+Y`.
- Bỏ qua khi `isTypingTarget`, khi user không phải EDITOR/OWNER, hoặc khi đang ở `historyMode`.

### 9.4 Chế độ xem lịch sử
- **Store:**
  - `historyMode: null | {seq, txId, label}` và `historyElements`.
  - Các selector `displayedElements` và `displayedOrder` (sắp theo z) trả history khi đang ở `historyMode`, ngược lại trả live.
  - Store live vẫn nhận `applyRemote` bình thường.
- **Component đọc qua selector:** `BoardScene` (thứ tự và AnchorDots), `SceneElement`, `elements/ConnectorView`, `SelectionOverlay`, hit-test trong `usePointerController` và `onContextMenu`.
- **Khóa ghi:** `useCanEdit()` trả `false` khi đang ở `historyMode`. Delete key, StylePanel, context menu và nhánh edit của pointer controller vốn đã gate theo `canEdit`. Gate thêm: tool tạo trong `LeftToolBar`/`ImageTool`, và luồng ghost-save (AI hoặc template) trong `page.tsx`.
- **Vào chế độ:** xóa `selection` và `editingId`, nhả lock text đang giữ. **Thoát:** xóa `historyElements` và `selection`.
- **UI:**
  - `HistoryPanel.tsx`: nút ở toolbar, panel bên phải, phân trang lùi, gộp ở UI các tx liên tiếp cùng user trong 2 phút.
  - `HistoryBanner.tsx`: "Đang xem phiên bản HH:mm · <user>", `[Khôi phục]` (chỉ OWNER), `[Thoát]`, ghi chú "Nét vẽ không có lịch sử". Pencil canvas bị ẩn.
- **Toast:** kiểm tra lúc implement xem client đã có thư viện toast chưa. Nếu chưa, làm một component nhỏ tại chỗ, không thêm dependency.

## 10. Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Lock timeout 2s | `/user/queue/errors {reason:"board busy"}`, FE reload |
| Lỗi Mongo sau WAL | tx `pending`, gửi lỗi; `withLock` kế tiếp roll-forward |
| Lỗi khi ghi WAL | không ghi gì, để lại lỗ seq, gửi lỗi |
| Đầu connector không hợp lệ | `IllegalArgumentException` gửi về `/user/queue/errors`, không ghi gì |
| Không có gì để undo/redo, hoặc restore có diff rỗng | `/user/queue/history {applied:0, skipped:[{reason:"empty"}]}` |
| Người không phải OWNER restore | 403 |
| VIEWER gửi undo/redo | 403 |
| Người không phải thành viên GET history/state | 403 |
| `history/state` với seq > committedSeq | 400 |

## 11. Cấu trúc code

**BE mới**, `service/history/`: `HistoryMath` (pure), `BoardLocks`, `ElementWriter`, `UndoService`, `HistoryService`, `SnapshotJob`. Model: `BoardOp`, `BoardTx`, `BoardCounter`, `BoardSnapshot` cùng các repository. `controller/HistoryController`.

**BE sửa:** `BoardElementService`, `ElementPatches` (`PatchBody` thêm `mergeKey`, thêm helper chuẩn hóa), `BoardElementSocketController` (undo/redo/restore, broadcast batch), `TemplateServiceImpl`, `BoardElement` (`fieldSeq`), `BoardServiceImpl` và `BoardFullDetailResponse` (`historySeq`).

**FE sửa:** `types.ts`, `sceneSocket.ts`, `sceneStore.ts`, `keyboard.ts`, `useCanEdit.ts`, `BoardScene.tsx`, `SceneElement.tsx`, `elements/ConnectorView.tsx`, `SelectionOverlay.tsx`, `usePointerController.ts`, `TextEditOverlay.tsx`, `ElementContextMenu.tsx`, `LeftToolBar.jsx`, `ImageTool.tsx`, `app/user/board/[id]/page.tsx`, `useBoard.ts`.

**FE mới:** `HistoryPanel.tsx`, `HistoryBanner.tsx`, `client/api/historyApi.ts`.

## 12. Test

1. **Unit test `HistoryMath` (JUnit)**:
   - Mọi dòng trong §7.2.
   - Mọi ví dụ trong §7.5.
   - Gộp theo element và theo key.
   - `replay` (gồm cả lỗ seq và id không có).
   - `diff`: 3 nhánh, connector đổi sang element được tạo sau N, connector trỏ tới element đã bị xóa sau N.
   - Chuẩn hóa int so với double và style có null.
2. **Unit test `ElementWriter`, `UndoService`, `HistoryService` bằng Mockito** (theo pattern `BoardElementServiceTest`):
   - Thứ tự các bước.
   - Chuẩn hóa intent (patch vào id không có; create trùng).
   - Merge trượt: patch cách nhau 2s trong 10s thành 1 tx.
   - Chuyển trạng thái tx ở post-commit.
   - Quyền: non-member bị 403 ở cả 2 GET; non-owner restore bị 403.
   - Tìm T theo cap 50 (sau 50 lần undo liên tiếp thì trả empty).
3. **Integration test (Mongo local):**
   - Dựng Mongo: `docker run -d -p 27017:27017 mongo:7`, đặt `MONGO_IT_URI=mongodb://localhost:27017`.
   - Test tự tạo `new MongoTemplate(MongoClients.create(uri), "it_" + UUID)`, tự wire service, gắn `@EnabledIfEnvironmentVariable(named="MONGO_IT_URI", matches=".+")`, drop DB trong `@AfterEach`. Không dùng `@SpringBootTest`.
   - Kịch bản:
     - 2 thread × 100 patch vào cùng element: invariant §8.2 phải đúng và không có lỗ seq.
     - Lỗi sau WAL (một delete có cascade connector): commit kế tiếp roll-forward, mọi op trong dải đều tồn tại, không connector nào lơ lửng, invariant đúng.
     - Undo bị lỗi sau WAL: sau roll-forward, T ở `undone` và redo được.
     - Snapshot 0 lỗi dở dang rồi chạy lại.
     - Vòng undo → redo → undo.
     - Restore rồi undo restore, kiểm invariant sau mỗi bước.
4. **FE vitest:**
   - `isUndoKey`/`isRedoKey`.
   - `historyMode` và các selector.
   - Seq: preview, lock và unlock không kích hoạt reload; bỏ qua `seqTo ≤ lastSeq`; hụt seq thì reload; event tới trong lúc reload không bị mất.
   - Delete rồi create lại cùng id với version thấp hơn: patch sau đó vẫn được áp dụng.
5. **Demo 2 trình duyệt:**
   1. Ví dụ 1 ở §7.5, thấy toast.
   2. Xóa shape có connector rồi undo.
   3. OWNER xem phiên bản cũ, khôi phục, Bob thấy board đổi, OWNER undo.
   4. Reload trang rồi undo vẫn chạy.

**Gate cho mỗi giai đoạn:**
- BE: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`, sau đó `bash ./mvnw -q compile` và `bash ./mvnw -q test -Dtest='<các test mới + test element hiện có>'`. Không chạy full suite vì `contextLoads` cần môi trường đầy đủ.
- FE: `npx tsc --noEmit` và `npx vitest run`.

## 13. Giai đoạn triển khai

1. **P1**: model, repo, chuẩn hóa, `HistoryMath` và unit test.
2. **P2**: `BoardLocks`, `ElementWriter` (§6 đầy đủ), nối create/patch/delete và template, broadcast batch, `historySeq`.
3. **P3**: `UndoService`, STOMP undo/redo, mergeKey.
4. **P4**: `HistoryService` (list, state, restore, snapshot job), REST và STOMP restore.
5. **P5**: FE (types, socket seq, store/selector, phím tắt, toast, panel, banner, gate).
6. **P6**: integration test và demo 2 trình duyệt.

## 14. Rủi ro

- Lock trong JVM chỉ đúng khi có một instance, giống ràng buộc sẵn có (§3).
- Broadcast chạy trong lock làm tăng thời gian giữ lock một chút, chấp nhận được với simple broker.
- Board lớn làm diff và snapshot tốn bộ nhớ, chấp nhận ở quy mô demo.
- Log tăng không giới hạn.
- Code SVG nền tảng chưa được commit. Nếu nó thay đổi, spec phải cập nhật.
