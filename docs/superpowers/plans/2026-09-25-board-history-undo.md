# Board History + Collaborative Undo/Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-side op log for board elements that provides per-user collaborative undo/redo with field-level conflict detection, version history (timeline, point-in-time view) and owner restore.

**Architecture:** Every element write goes through `ElementWriter`. It takes a per-board in-JVM lock, rolls forward any pending WAL, plans the ops with a pure `CommitPlanner`, allocates seqs, writes a single-document WAL (`boardTxs.pending`), applies the ops to `boardOps` and `boardElements`, runs the post-commit state transitions and broadcasts one `batch` event while still holding the lock. `HistoryMath` (pure) computes replay, diff and undo/redo inverses. The frontend applies `batch` events in seq order through a pure `seqSync` module and renders a read-only history mode.

**Tech Stack:** Spring Boot 3.4 + MongoTemplate + STOMP simple broker (Java 17 target), JUnit 5 + Mockito; Next.js 14.2 + React 18 + zustand + vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-board-history-undo-design.md` (rev 2). Read it before starting any task. Section references below (§x.y) point into it.

## Global Constraints

- **No git commits, pushes or PRs** unless the user explicitly asks. Every "Checkpoint" step means: run the gate and report, nothing more.
- No new dependencies (backend or client). Use `@radix-ui/react-toast` only if it is already wired in `client/components/ui`; otherwise use a small local component.
- BE gate: `cd IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile` and `bash ./mvnw -q test -Dtest='<listed tests>'`. Never run the full suite (`contextLoads` needs a full environment). The default JDK 25 crashes Lombok.
- Integration tests: `docker run -d --name mobi-it-mongo -p 27017:27017 mongo:7` and `export MONGO_IT_URI=mongodb://localhost:27017`. The tests build `new MongoTemplate(MongoClients.create(uri), "it_" + UUID.randomUUID().toString().replace("-",""))` by hand, use `@EnabledIfEnvironmentVariable(named="MONGO_IT_URI", matches=".+")`, drop the DB in `@AfterEach`, and never use `@SpringBootTest`.
- FE gate: `cd client && npx tsc --noEmit && npx vitest run`.
- Patchable keys, exactly: `K = x, y, w, h, rotation, z, text, style, shape, connector`.
- Undo depth cap: the 50 most recent txs of the user on the board with `source ∈ {user, redo, restore}`, in any state (§7.1).
- mergeKey window: 3 s, sliding (`tx.ts = now` on every merge).
- Lock: `ReentrantLock` per board, `tryLock(2, SECONDS)`, failure → `ResponseStatusException(SERVICE_UNAVAILABLE, "board busy")`.
- Snapshot every 200 seq (the job fires when `seqTo / 200` increases).
- Code comments follow the existing style: short Vietnamese one-liners, only where the why is non-obvious.
- Do not touch the pencil path code (`canvasPaths`, `usePencilTool.ts`) or the legacy sticky/image handlers.
- Do not run anything against a real/shared database.

- **Known limitation (accepted):** if an undo targets a restore tx that replaced an element (a `type`/`image` change made by diff as delete(id) + create(id)), `HistoryMath.inverse` does not reverse that element. Such a change cannot come from a normal edit, because `image` and `type` are not in K.

## Review Focus

1. **Two users dragging the same or different elements at the same time.** The commits interleave, and there must be no reload storm (reload fires only on a real gap after 500 ms) and no divergence. Pinned in Task 10 (`seqSync` interleaving test) and Task 6 (IT: 2 threads × 100 patches, invariant holds, seqs are contiguous).
2. **Undo after a page reload or a STOMP reconnect.** The stack is server-side, so undo must still work, and `lastSeq` must come back from `historySeq`. Pinned in Task 8 (UndoService test: a fresh service instance with the same repo state finds T) and Task 11 (`reloadBoard` sets the baseline).
3. **A late text patch arrives for an element someone else just deleted.** It must be dropped silently, with no tx, no broadcast, no error toast and no crash. Pinned in Task 5 (planner drops the patch for a missing id) and Task 7 (service returns empty and no broadcast happens).
4. **Board with legacy or migrated elements (no `fieldSeq`, no counter yet).** The first commit creates snapshot 0, the fs defaults to 0, and undo and restore work. Pinned in Task 6 (IT: board seeded without a counter) and Task 9 (restore to seq 0 on a migrated board).
5. **Image elements.** `image` is not in K. Undo-delete and restore must recreate the `image` payload intact, and a diff that changes `type` or `image` must produce delete + create. Pinned in Task 3 (diff image change) and Task 4 (inverse of an image delete keeps `image`).

## File Map

Backend root: `IE213Backend/src/main/java/com/example/ie213backend` (abbrev. `BE/`). Tests: `IE213Backend/src/test/java/com/example/ie213backend` (abbrev. `BT/`).

| File | Responsibility | Task |
|---|---|---|
| `BE/domain/model/BoardOp.java`, `BoardTx.java`, `BoardCounter.java`, `BoardSnapshot.java` | Mongo documents (§5) | 1 |
| `BE/repository/BoardOpRepository.java`, `BoardTxRepository.java`, `BoardCounterRepository.java`, `BoardSnapshotRepository.java` | Spring Data repos | 1 |
| `BE/domain/model/BoardElement.java` (modify) | add `Map<String, Long> fieldSeq` | 1 |
| `BE/service/history/ElementKeys.java` | the K list and connector helpers | 2 |
| `BE/service/history/ElementNormalizer.java` | normalized Map form (§5) | 2 |
| `BE/service/history/Intent.java` | write intent record | 2 |
| `BE/service/history/HistoryMath.java` | pure replay / diff / inverse | 3, 4 |
| `BE/service/history/HistoryResult.java` | result + skip records | 4 |
| `BE/service/history/CommitPlanner.java` | pure §6.3 steps 2-7 | 5 |
| `BE/service/history/BoardLocks.java` | per-board re-entrant lock | 6 |
| `BE/service/history/ElementWriter.java` | lock, roll-forward, seq, WAL, apply, post-commit, broadcast | 6 |
| `BE/service/history/BatchPublisher.java`, `StompBatchPublisher.java`, `BatchEvent.java` | broadcast seam (§6.7) | 6 |
| `BE/service/history/SnapshotJob.java` | async snapshots (§8.2) | 9 |
| `BE/service/history/UndoService.java` | undo/redo (§7) | 8 |
| `BE/service/history/HistoryService.java` | list / stateAt / restore (§8) | 9 |
| `BE/controller/HistoryController.java` | REST (§8.1) | 9 |
| `BE/service/element/BoardElementService.java` (modify) | delegate writes to the writer | 7 |
| `BE/service/element/ElementPatches.java` (modify) | `PatchBody.mergeKey` | 7 |
| `BE/controller/BoardElementSocketController.java` (modify) | writes via service (no own broadcast), undo/redo/restore endpoints | 7, 8, 9 |
| `BE/service/impl/TemplateServiceImpl.java` (modify) | template writes via the writer | 7 |
| `BE/service/impl/BoardServiceImpl.java`, `BE/domain/dto/BoardDto/BoardFullDetailResponse.java` (modify) | `historySeq` | 7 |
| `client/components/Scene/types.ts` (modify) | batch event types | 10 |
| `client/components/Scene/seqSync.ts` (new) | pure seq gap/buffer/reload logic | 10 |
| `client/lib/Zustand/sceneStore.ts` (modify) | `applyBatch`, version cleanup, history mode + selectors | 10, 12 |
| `client/components/Scene/sceneSocket.ts` (modify) | batch subscription via seqSync, undo/redo/restore, mergeKey, history queue | 11 |
| `client/components/Scene/keyboard.ts` (modify) | undo/redo keys | 11 |
| `client/components/Scene/HistoryToast.tsx` (new) | toast for history results | 11 |
| `client/components/Scene/TextEditOverlay.tsx` (modify) | mergeKey per edit session | 11 |
| `client/app/user/board/[id]/useBoard.ts` (modify) | initial `lastSeq` baseline | 11 |
| `client/api/historyApi.ts` (new) | REST client | 12 |
| `client/components/Scene/HistoryPanel.tsx`, `HistoryBanner.tsx` (new) | history UI | 12 |
| `client/components/Scene/useCanEdit.ts`, `BoardScene.tsx`, `SceneElement.tsx`, `elements/ConnectorView.tsx`, `SelectionOverlay.tsx`, `usePointerController.ts`, `ElementContextMenu.tsx`, `client/components/SideBar/LeftToolBar.jsx`, `client/components/SideBar/ImageTool.tsx`, `client/app/user/board/[id]/page.tsx` (modify) | history-mode rendering + write gating | 12 |

## Interface Contract (authoritative — every task must use exactly these names)

### Java — package `com.example.ie213backend.service.history` unless noted

```java
// domain.model — all `public class`, @Data @NoArgsConstructor, Mongo documents; fields private behind Lombok accessors
@Document("boardOps") @CompoundIndexes({@CompoundIndex(name="board_seq", def="{'boardId':1,'seq':1}", unique=true),
                                       @CompoundIndex(name="board_el_seq", def="{'boardId':1,'elementId':1,'seq':-1}")})
public class BoardOp { @Id String id; @Field(targetType=OBJECT_ID) String boardId; long seq; String txId; String userId; Instant ts;
                String kind; /* create|patch|delete */ String elementId;
                Map<String,Object> before; Map<String,Object> after;
                Map<String,Long> fsBefore; Map<String,Long> fsAfter; long v; }

@Document("boardTxs") @CompoundIndexes({@CompoundIndex(name="tx_user", def="{'boardId':1,'userId':1,'seqTo':-1}"),
                                       @CompoundIndex(name="tx_board", def="{'boardId':1,'seqTo':-1}"),
                                       @CompoundIndex(name="tx_state", def="{'boardId':1,'state':1}")})
public class BoardTx { @Id String id; @Field(targetType=OBJECT_ID) String boardId; String userId; Instant ts; long seqFrom; long seqTo;
                String source; /* user|undo|redo|restore|template */ String target; String mergeKey;
                String state; /* pending|active|undone|dead */ Pending pending; Prev prev; Summary summary;
                @Data @NoArgsConstructor @AllArgsConstructor public static class Pending { long seqFrom; long seqTo; List<BoardOp> ops; }
                @Data @NoArgsConstructor @AllArgsConstructor public static class Prev { long seqTo; Summary summary; Instant ts; }
                @Data @NoArgsConstructor @AllArgsConstructor public static class Summary { int created; int patched; int deleted; } }

@Document("boardCounters") public class BoardCounter { @Id String id; /* = boardId hex */ long seq; long committedSeq; }

@Document("boardSnapshots") @CompoundIndex(name="snap_board_seq", def="{'boardId':1,'seq':1}", unique=true)
public class BoardSnapshot { @Id String id; @Field(targetType=OBJECT_ID) String boardId; long seq; List<Map<String,Object>> elements; }

// BoardElement: add   private Map<String, Long> fieldSeq;

public final class ElementKeys {
  public static final List<String> K = List.of("x","y","w","h","rotation","z","text","style","shape","connector");
  public static boolean isConnector(Map<String,Object> el);                 // "connector".equals(el.get("type"))
  public static List<String> connectorEnds(Map<String,Object> connectorValue); // [from.elementId, to.elementId]; a missing end is skipped; empty list if null
}

public final class ElementNormalizer {
  // Full normalized element map. Keys: "id","type","boardId","owner","image"(Map|null),"migratedFrom", every K key,
  // "fieldSeq"(Map<String,Long>, missing -> empty map), "version"(Long). Geometry is Double; style/shape/connector are
  // Map (POJO -> Map via Jackson, nulls kept); text is String|null.
  public static Map<String,Object> full(BoardElement e);
  // Normalizes a patch `set` (keys ⊆ K). Delegates validation to ElementPatches.toUpdate(set) (throws IllegalArgumentException).
  public static Map<String,Object> normalizeSet(Map<String,Object> set);
  public static BoardElement toElement(Map<String,Object> full);      // inverse of full()
  public static boolean same(Object a, Object b);                     // deep equality on normalized values (Double vs Integer safe); a missing Map key == null
}

public record Intent(String kind /* "create"|"patch"|"delete", same strings as BoardOp.kind */, String elementId, Map<String,Object> element /*create: full normalized*/,
              Map<String,Object> set /*patch: normalized*/, Map<String,Long> fsOverride /*undo/redo only; null otherwise*/) {
  public static Intent create(Map<String,Object> fullElement);
  public static Intent patch(String id, Map<String,Object> set);
  public static Intent patch(String id, Map<String,Object> set, Map<String,Long> fsOverride);
  public static Intent delete(String id);
}

record HistoryResult(String op, int applied, List<Skip> skipped) {
  record Skip(String elementId, String key, String reason, String byUserId) {}  // reason: modified|gone|exists|end-missing|empty
  static HistoryResult empty(String op);                                       // applied 0, skipped [Skip(null,null,"empty",null)]
}

final class HistoryMath {
  enum Direction { UNDO, REDO }
  // Board state replay: base is id -> full normalized map (copied, not mutated). Ops sorted by seq ascending by the caller.
  static Map<String,Map<String,Object>> replay(Map<String,Map<String,Object>> base, List<BoardOp> ops);
  // Restore diff (§8.3): delete / create / patch-of-differing-K.
  // type/image change → delete(id) then create(id), adjacent, in that order (CommitPlanner folds it as a replace).
  static List<Intent> diff(Map<String,Map<String,Object>> target, Map<String,Map<String,Object>> current);
  // Undo/redo inverse (§7.2, §6.4). txOps = ops of the original tx T (seq ascending).
  // undoOps = ops of the newest undo tx U whose target is T (REDO only; null for UNDO).
  // laterOps(elementId, afterSeq) = ops on that element with seq > afterSeq (any user), seq ascending.
  record InverseResult(List<Intent> intents, List<HistoryResult.Skip> skipped) {}
  static InverseResult inverse(Direction dir, List<BoardOp> txOps, List<BoardOp> undoOps,
                               Map<String,Map<String,Object>> current, String actorUserId,
                               java.util.function.BiFunction<String, Long, List<BoardOp>> laterOps);
}

final class CommitPlanner {
  // Pure §6.3 steps 2-7. `board` = every element of the board (id -> full normalized) at lock time.
  // lastVersion(elementId) = v of the newest op on that element, or 0.
  // Returns ops WITHOUT boardId/id/seq/txId/userId/ts (the writer stamps them).
  // Order: [replace-deletes], create non-connector, patch, create connector, delete.
  // A delete(id)+create(id) of an existing id in one batch = replace: its delete op goes first, no drop, no cascade for that id
  // (the create keeps its normal slot).
  // Entries that must become "this op's seq" hold the sentinel CommitPlanner.SEQ (= -1L) in both fsAfter and after.fieldSeq.
  // A null elementId on patch/delete throws IllegalArgumentException("element id required").
  // Throws IllegalArgumentException("connector end not found on this board") on invalid connector ends.
  static final long SEQ = -1L;
  static List<BoardOp> plan(List<Intent> intents, Map<String,Map<String,Object>> board,
                            java.util.function.Function<String, Long> lastVersion);
}

@Component class BoardLocks {
  <T> T withLock(String boardId, java.util.function.Supplier<T> fn);   // tryLock 2s, 503 "board busy"; re-entrant
  boolean isHeldByCurrentThread(String boardId);
}

record BatchEvent(String txId, String source, long seqFrom, long seqTo, String senderSessionId, String userId,
                  List<Map<String,Object>> ops) {}   // ops: {op:"create",elements:[full]} | {op:"patch",patches:[{id,set,version}]} | {op:"delete",ids:[..]}
interface BatchPublisher { void publish(String boardId, BatchEvent event); }
@Component class StompBatchPublisher implements BatchPublisher { /* convertAndSend("/topic/board/"+boardId+"/el", map with op:"batch" + fields) */ }

@Service public class ElementWriter {
  ElementWriter(MongoTemplate mongo, BoardLocks locks, BatchPublisher publisher);   // exactly this constructor
  Clock clock = Clock.systemUTC();                                        // package-private, test-only
  @Autowired(required = false) void setSnapshotJob(SnapshotJob job);     // setter injection (Task 9)
  // groups consecutive same-kind ops, seq order → BatchEvent.ops may repeat a kind
  static List<Map<String,Object>> eventOps(List<BoardOp> ops);           // package-private
  public record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents,
                       String mergeKey, String target) {}
  // ops = stamped ops with real seqs, §6.3 step 6 order + replace rule, cascaded deletes included
  public record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops) {
    public static final CommitResult EMPTY = new CommitResult(null, 0, 0, List.of());
    boolean isEmpty() { return txId == null; }
  }
  <T> T withLock(String boardId, java.util.function.Supplier<T> fn);   // BoardLocks + rollForward(boardId) first
  // re-entrant: uses withLock. Create intents whose _id already exists on another board are dropped (as BoardElementService today).
  public CommitResult commit(CommitRequest req);
  Map<String,Map<String,Object>> loadBoard(String boardId);              // id -> full normalized, all elements of board
  public long committedSeq(String boardId);                              // 0 if no counter
  List<BoardOp> opsOfTx(String boardId, String txId);                    // seq ascending
  List<BoardOp> laterOps(String boardId, String elementId, long afterSeq);
  Runnable afterWalHook = () -> {};   // package-private, IT failure injection only; runs right after the WAL write (§6.3 step 10), before apply (step 11)
}

@Service class SnapshotJob {
  SnapshotJob(MongoTemplate mongo);
  void maybeSnapshot(String boardId, long prevSeqTo, long seqTo);        // async when seqTo/200 > prevSeqTo/200
  BoardSnapshot build(String boardId, long seq);                         // sync; used by tests and by maybeSnapshot
  Map<String,Map<String,Object>> replayTo(String boardId, long seq);     // package-private
  @PreDestroy void shutdown();                                           // package-private
}

@Service class UndoService {
  UndoService(ElementWriter writer, MongoTemplate mongo, BoardService boardService);
  // planner IllegalArgumentException → skipped [Skip(null,null,"end-missing",null)]; nothing applied and no other skip → [Skip(null,null,"empty",null)]
  HistoryResult undo(String boardId, String userId, String sessionId);
  HistoryResult redo(String boardId, String userId, String sessionId);
}

@Service class HistoryService {
  HistoryService(ElementWriter writer, SnapshotJob snapshotJob, BoardService boardService, UserRepository users, MongoTemplate mongo);
  record TxView(String txId, String userId, String userName, Instant ts, String source, String state,
                BoardTx.Summary summary, long seqTo) {}
  record StateView(long seq, List<Map<String,Object>> elements) {}
  List<TxView> list(String boardId, String userId, Long beforeSeq, int limit);   // 403 NONE, limit clamp 1..100; beforeSeq exclusive (seqTo < beforeSeq)
  StateView stateAt(String boardId, String userId, long seq);                    // 403 NONE, 400 seq>committedSeq
  Map<String,Map<String,Object>> stateMap(String boardId, long seq);             // no authz; used by restore
  HistoryResult restore(String boardId, String userId, String sessionId, long seq); // OWNER only (403); clears fieldSeq on create intents (§6.4)
}
```

`BoardElementService` after Task 7 (signatures): `List<BoardElement> create(String boardId, String userId, String sessionId, List<BoardElement> elements)`, `List<Map<String,Object>> patch(String boardId, String userId, String sessionId, List<ElementPatches.ElementPatch> patches, String mergeKey)`, `List<String> delete(String boardId, String userId, String sessionId, List<String> ids)`. Each one broadcasts through the writer (the controller no longer broadcasts create/patch/delete).

`BoardElementSocketController` final constructor (Tasks 8-9): `BoardElementSocketController(BoardElementService, SimpMessagingTemplate, ElementLockRegistry, UndoService, HistoryService)`. Task 7 strips client-sent `fieldSeq` on create (`e.setFieldSeq(null)`) and passes `sessionId = null` for template commits.

`ElementPatches.PatchBody` after Task 7: `record PatchBody(List<ElementPatch> patches, String mergeKey)`.

STOMP (Tasks 8-9): `/app/board/{id}/el/undo`, `/el/redo` (empty body), `/el/restore` (`{seq: number}`). Each one is annotated `@SendToUser("/queue/history")` and returns `HistoryResult`.

REST (Task 9): `GET ${api.prefix}/board/{id}/history?beforeSeq=&limit=` → `List<TxView>`; `GET ${api.prefix}/board/{id}/history/state?seq=` → `StateView`. The user comes from the same mechanism `BoardController.getBoardById` uses. `userName = firstName + " " + lastName` (trimmed) from `UserRepository`.

`BoardFullDetailResponse` gains `private long historySeq;`. `BoardServiceImpl.getBoard` sets it from `ElementWriter.committedSeq(id)` BEFORE it loads the elements.

### TypeScript

```ts
// client/components/Scene/types.ts
export type BatchOp =
  | { op: "create"; elements: BoardElement[] }
  | { op: "patch"; patches: ElementPatch[] }        // ElementPatch.version is always present in batch
  | { op: "delete"; ids: string[] };
export type HistorySource = "user" | "undo" | "redo" | "restore" | "template";
export interface BatchEvent {
  op: "batch"; txId: string; source: HistorySource; seqFrom: number; seqTo: number;
  senderSessionId: string | null; userId: string; ops: BatchOp[];
}
export interface HistorySkip { elementId?: string | null; key?: string | null; reason: "modified" | "gone" | "exists" | "end-missing" | "empty"; byUserId?: string | null; }
export interface HistoryResult { op: "undo" | "redo" | "restore"; applied: number; skipped: HistorySkip[]; }
// ElementEvent keeps preview/lock/unlock (create/patch/delete stay in the union for backward compatibility)

// client/components/Scene/seqSync.ts
export interface SeqSyncDeps {
  apply: (ev: BatchEvent) => void;
  reload: () => Promise<number>;       // resolves with historySeq after resetting the store
  gapWaitMs?: number;                  // default 500
  setTimer?: (fn: () => void, ms: number) => unknown;   // default setTimeout
  clearTimer?: (h: unknown) => void;                    // default clearTimeout
}
export interface SeqSync {
  onBatch(ev: BatchEvent): void;
  setBaseline(seq: number): void;
  lastSeq(): number;
  isReloading(): boolean;
  dispose(): void;
}
export function createSeqSync(deps: SeqSyncDeps): SeqSync;

// client/lib/Zustand/sceneStore.ts (additions)
applyBatch: (ev: BatchEvent, mySessionId: string | null) => void;   // echo skip only when mySessionId !== null && ev.senderSessionId === mySessionId && source ∈ {user, template}
historyMode: null | { seq: number; txId: string; label: string };
historyElements: Record<string, BoardElement>;
enterHistory: (mode: { seq: number; txId: string; label: string }, elements: BoardElement[]) => void; // clears selection/editingId
exitHistory: () => void;
export interface SceneState { /* existing store shape, now exported */ }
export const selectDisplayedElements: (s: SceneState) => Record<string, BoardElement>;
export const selectDisplayedOrder: (s: SceneState) => string[];   // cached (stable reference while inputs unchanged)
// reset() of the same board keeps historyMode; useBoard calls exitHistory() before it resets on a load

// client/components/Scene/keyboard.ts (additions)
export function isUndoKey(e: KeyLike): boolean;
export function isRedoKey(e: KeyLike): boolean;

// client/components/Scene/sceneSocket.ts (changes)
sceneSocket.patch(boardId: string, patches: ElementPatch[], opts?: { mergeKey?: string }): void;
sceneSocket.undo(boardId: string): void;
sceneSocket.redo(boardId: string): void;
sceneSocket.restore(boardId: string, seq: number): void;
export function subscribeScene(client: Client, boardId: string, sessionId: string, onError: () => void,
                               onHistory?: (r: HistoryResult) => void): () => void;
export function setSceneBaseline(seq: number): void;   // used by useBoard initial load and reloadBoard
export function invalidateSceneBaseline(): void;       // non-contract helper (Task 11)
// SeqSync: the gap timer restarts on progress while a gap remains

// client/app/user/board/[id]/useBoard.ts
reloadBoard(boardId: string): Promise<number | null>;  // internal throwing loadBoard is what SeqSync.reload uses
// client/app/user/board/[id]/BoardSubscription.tsx (modify): passes onHistory to subscribeScene

// client/api/historyApi.ts
export interface TxView { txId: string; userId: string; userName: string; ts: string; source: HistorySource; state: string;
                          summary: { created: number; patched: number; deleted: number }; seqTo: number; }
export const HistoryAPI: {
  list(boardId: string, beforeSeq?: number, limit?: number): Promise<TxView[]>;
  state(boardId: string, seq: number): Promise<{ seq: number; elements: BoardElement[] }>;
};
```

## Tasks

### Task 1: History Mongo models, repositories, BoardElement.fieldSeq

Spec: §5.1-§5.4. This task only adds persistence types. Nothing reads or writes them yet. The writer (Task 6) uses `MongoTemplate` for every write. The repositories expose only the few derived reads that later tasks can use (WAL lookup, ops of one tx, undo stack, redo candidates, nearest snapshot).

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardOp.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardTx.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardCounter.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardSnapshot.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/repository/BoardOpRepository.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/repository/BoardTxRepository.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/repository/BoardCounterRepository.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/repository/BoardSnapshotRepository.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardElement.java`: add an import after line 20 (`import java.time.LocalDateTime;`) and a field after lines 66-67 (`// stickyNote | Images ...` / `private String migratedFrom;`)
- Test: `IE213Backend/src/test/java/com/example/ie213backend/domain/model/HistoryModelsTest.java` (new; the package `domain/model` has no tests yet)

**Interfaces:**
- Consumes: nothing (first task).
- Produces (exactly as the Interface Contract says):
  - `@Document("boardOps") BoardOp { String id; String boardId /*OBJECT_ID*/; long seq; String txId; String userId; Instant ts; String kind; String elementId; Map<String,Object> before; Map<String,Object> after; Map<String,Long> fsBefore; Map<String,Long> fsAfter; long v; }` with indexes `board_seq` `{'boardId':1,'seq':1}` unique and `board_el_seq` `{'boardId':1,'elementId':1,'seq':-1}`.
  - `@Document("boardTxs") BoardTx { String id; String boardId /*OBJECT_ID*/; String userId; Instant ts; long seqFrom; long seqTo; String source; String target; String mergeKey; String state; Pending pending; Prev prev; Summary summary; }` with nested `Pending(long seqFrom, long seqTo, List<BoardOp> ops)`, `Prev(long seqTo, Summary summary, Instant ts)`, `Summary(int created, int patched, int deleted)` (all three `@Data @NoArgsConstructor @AllArgsConstructor`) and indexes `tx_user` `{'boardId':1,'userId':1,'seqTo':-1}`, `tx_board` `{'boardId':1,'seqTo':-1}`, `tx_state` `{'boardId':1,'state':1}`.
  - `@Document("boardCounters") BoardCounter { String id /*= boardId hex*/; long seq; long committedSeq; }`
  - `@Document("boardSnapshots") BoardSnapshot { String id; String boardId /*OBJECT_ID*/; long seq; List<Map<String,Object>> elements; }` with index `snap_board_seq` `{'boardId':1,'seq':1}` unique.
  - `BoardElement`: `private Map<String, Long> fieldSeq;` (Lombok `getFieldSeq()` / `setFieldSeq(Map<String,Long>)`).
  - Repositories (derived queries only; nothing else in later tasks may assume more methods):
    - `BoardOpRepository extends MongoRepository<BoardOp, String>`: `List<BoardOp> findByBoardIdAndTxIdOrderBySeqAsc(String boardId, String txId)`
    - `BoardTxRepository extends MongoRepository<BoardTx, String>`: `Optional<BoardTx> findFirstByBoardIdAndState(String boardId, String state)`, `List<BoardTx> findTop50ByBoardIdAndUserIdAndSourceInOrderBySeqToDesc(String boardId, String userId, Collection<String> sources)`, `List<BoardTx> findByBoardIdAndUserIdAndSourceOrderBySeqToDesc(String boardId, String userId, String source)`
    - `BoardCounterRepository extends MongoRepository<BoardCounter, String>` (no extra methods)
    - `BoardSnapshotRepository extends MongoRepository<BoardSnapshot, String>`: `Optional<BoardSnapshot> findFirstByBoardIdAndSeqLessThanEqualOrderBySeqDesc(String boardId, long seq)`

Notes for the implementer:
- Style follows `BoardElement.java`: Lombok `@Data @NoArgsConstructor`, `@Document(collection = ...)`, `@CompoundIndexes({...})`, `@Field(targetType = FieldType.OBJECT_ID)` on `boardId`, and a short Vietnamese one-line comment above the class.
- The nested classes and all fields are `public` classes with `private` fields plus Lombok accessors. The contract omits modifiers only to stay short. Later tasks live in `service.history`, a different package, so the nested classes must be `public static`.
- `BoardElementRepository.findByBoardIdOrderByZAsc(String boardId)` (`repository/BoardElementRepository.java:9`) already shows that derived queries on a `String boardId` annotated with `OBJECT_ID` work in this codebase. The new repositories rely on the same mapping.
- `fieldSeq` stays `null` on legacy documents. Spec §5.1 says "missing = 0", and `ElementNormalizer.full` (Task 2) turns `null` into an empty map. Do NOT add a default initializer, because a `new HashMap<>()` default would get written on insert through other paths (the template or migration path) and change their persisted shape.

- [ ] **Step 1: Write the failing test**

Create `IE213Backend/src/test/java/com/example/ie213backend/domain/model/HistoryModelsTest.java`:

```java
package com.example.ie213backend.domain.model;

import com.example.ie213backend.repository.BoardCounterRepository;
import com.example.ie213backend.repository.BoardOpRepository;
import com.example.ie213backend.repository.BoardSnapshotRepository;
import com.example.ie213backend.repository.BoardTxRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class HistoryModelsTest {

    private static Map<String, CompoundIndex> indexes(Class<?> c) {
        CompoundIndexes many = c.getAnnotation(CompoundIndexes.class);
        CompoundIndex[] arr = many != null ? many.value() : c.getAnnotationsByType(CompoundIndex.class);
        return Arrays.stream(arr).collect(Collectors.toMap(CompoundIndex::name, i -> i));
    }

    private static void assertObjectIdField(Class<?> c, String name) throws Exception {
        Field f = c.getDeclaredField(name).getAnnotation(Field.class);
        assertNotNull(f, c.getSimpleName() + "." + name + " thiếu @Field");
        assertEquals(FieldType.OBJECT_ID, f.targetType());
    }

    @Test
    void boardTxNestedTypesConstruct() {
        BoardTx.Summary s = new BoardTx.Summary(1, 2, 3);
        assertEquals(1, s.getCreated());
        assertEquals(2, s.getPatched());
        assertEquals(3, s.getDeleted());

        BoardOp op = new BoardOp();
        op.setSeq(5);
        op.setKind("patch");
        op.setElementId("e1");
        op.setBefore(Map.of("x", 0.0));
        op.setAfter(Map.of("x", 100.0));
        op.setFsBefore(Map.of("x", 0L));
        op.setFsAfter(Map.of("x", 5L));
        op.setV(2);
        BoardTx.Pending p = new BoardTx.Pending(5, 5, List.of(op));
        assertEquals(5, p.getSeqFrom());
        assertEquals(5, p.getSeqTo());
        assertEquals("e1", p.getOps().get(0).getElementId());
        assertEquals(5L, p.getOps().get(0).getFsAfter().get("x"));

        Instant now = Instant.now();
        BoardTx.Prev prev = new BoardTx.Prev(4, s, now);
        assertEquals(4, prev.getSeqTo());
        assertSame(s, prev.getSummary());
        assertEquals(now, prev.getTs());

        BoardTx tx = new BoardTx();
        tx.setState("pending");
        tx.setSource("user");
        tx.setPending(p);
        tx.setPrev(prev);
        tx.setSummary(s);
        tx.setTarget(null);
        tx.setMergeKey("text:e1:abc");
        assertEquals("pending", tx.getState());
        assertSame(p, tx.getPending());
        assertEquals("text:e1:abc", tx.getMergeKey());
    }

    @Test
    void boardElementHasFieldSeq() {
        BoardElement e = new BoardElement();
        assertNull(e.getFieldSeq(), "legacy element: fieldSeq thiếu = null");
        e.setFieldSeq(Map.of("x", 12L));
        assertEquals(12L, e.getFieldSeq().get("x"));
    }

    @Test
    void documentsAndIndexesMatchContract() throws Exception {
        assertEquals("boardOps", BoardOp.class.getAnnotation(Document.class).collection());
        assertEquals("boardTxs", BoardTx.class.getAnnotation(Document.class).collection());
        assertEquals("boardCounters", BoardCounter.class.getAnnotation(Document.class).collection());
        assertEquals("boardSnapshots", BoardSnapshot.class.getAnnotation(Document.class).collection());

        Map<String, CompoundIndex> op = indexes(BoardOp.class);
        assertEquals("{'boardId':1,'seq':1}", op.get("board_seq").def());
        assertTrue(op.get("board_seq").unique());
        assertEquals("{'boardId':1,'elementId':1,'seq':-1}", op.get("board_el_seq").def());

        Map<String, CompoundIndex> tx = indexes(BoardTx.class);
        assertEquals("{'boardId':1,'userId':1,'seqTo':-1}", tx.get("tx_user").def());
        assertEquals("{'boardId':1,'seqTo':-1}", tx.get("tx_board").def());
        assertEquals("{'boardId':1,'state':1}", tx.get("tx_state").def());

        Map<String, CompoundIndex> snap = indexes(BoardSnapshot.class);
        assertEquals("{'boardId':1,'seq':1}", snap.get("snap_board_seq").def());
        assertTrue(snap.get("snap_board_seq").unique());

        assertObjectIdField(BoardOp.class, "boardId");
        assertObjectIdField(BoardTx.class, "boardId");
        assertObjectIdField(BoardSnapshot.class, "boardId");

        BoardCounter c = new BoardCounter();
        c.setId("650000000000000000000001");
        c.setSeq(3);
        c.setCommittedSeq(2);
        assertEquals(3, c.getSeq());
        assertEquals(2, c.getCommittedSeq());
    }

    @Test
    void repositoriesExposeDerivedQueries() throws Exception {
        assertTrue(MongoRepository.class.isAssignableFrom(BoardOpRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardTxRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardCounterRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardSnapshotRepository.class));

        assertNotNull(BoardOpRepository.class.getMethod("findByBoardIdAndTxIdOrderBySeqAsc", String.class, String.class));
        assertNotNull(BoardTxRepository.class.getMethod("findFirstByBoardIdAndState", String.class, String.class));
        assertNotNull(BoardTxRepository.class.getMethod("findTop50ByBoardIdAndUserIdAndSourceInOrderBySeqToDesc",
                String.class, String.class, Collection.class));
        assertNotNull(BoardTxRepository.class.getMethod("findByBoardIdAndUserIdAndSourceOrderBySeqToDesc",
                String.class, String.class, String.class));
        assertNotNull(BoardSnapshotRepository.class.getMethod("findFirstByBoardIdAndSeqLessThanEqualOrderBySeqDesc",
                String.class, long.class));
    }
}
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryModelsTest'
```

Expected: FAIL at `testCompile` with `COMPILATION ERROR`, for example `cannot find symbol ... class BoardOp` / `package com.example.ie213backend.repository does not contain BoardOpRepository` / `cannot find symbol ... method getFieldSeq()`. The classes do not exist yet.

- [ ] **Step 3: Add `fieldSeq` to `BoardElement`**

In `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardElement.java`, replace line 20:

```java
import java.time.LocalDateTime;
```

with:

```java
import java.time.LocalDateTime;
import java.util.Map;
```

Then replace lines 66-67:

```java
    // stickyNote | Images khi được migrate từ collection cũ
    private String migratedFrom;
```

with:

```java
    // stickyNote | Images khi được migrate từ collection cũ
    private String migratedFrom;

    // "dấu" seq của lần ghi đang hiển thị cho từng key K; thiếu = 0 (không patch được từ client)
    private Map<String, Long> fieldSeq;
```

- [ ] **Step 4: Create `BoardOp`**

`IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardOp.java`:

```java
package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.Map;

// Một op trong log lịch sử element: create | patch | delete, before/after đã chuẩn hóa
@Data
@NoArgsConstructor
@Document(collection = "boardOps")
@CompoundIndexes({
        @CompoundIndex(name = "board_seq", def = "{'boardId':1,'seq':1}", unique = true),
        @CompoundIndex(name = "board_el_seq", def = "{'boardId':1,'elementId':1,'seq':-1}")
})
public class BoardOp {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private long seq;
    private String txId;
    private String userId;
    private Instant ts;

    // create | patch | delete
    private String kind;
    private String elementId;

    private Map<String, Object> before;
    private Map<String, Object> after;
    private Map<String, Long> fsBefore;
    private Map<String, Long> fsAfter;

    // version sau op (delete: version trước khi xóa)
    private long v;
}
```

- [ ] **Step 5: Create `BoardTx`**

`IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardTx.java`:

```java
package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.List;

// Một giao dịch ghi element; pending là WAL một document (atomic)
@Data
@NoArgsConstructor
@Document(collection = "boardTxs")
@CompoundIndexes({
        @CompoundIndex(name = "tx_user", def = "{'boardId':1,'userId':1,'seqTo':-1}"),
        @CompoundIndex(name = "tx_board", def = "{'boardId':1,'seqTo':-1}"),
        @CompoundIndex(name = "tx_state", def = "{'boardId':1,'state':1}")
})
public class BoardTx {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private String userId;
    private Instant ts;
    private long seqFrom;
    private long seqTo;

    // user | undo | redo | restore | template
    private String source;
    private String target;
    private String mergeKey;

    // pending | active | undone | dead
    private String state;

    private Pending pending;
    private Prev prev;
    private Summary summary;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pending {
        private long seqFrom;
        private long seqTo;
        private List<BoardOp> ops;
    }

    // Trạng thái trước lần merge gần nhất, để revert
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Prev {
        private long seqTo;
        private Summary summary;
        private Instant ts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private int created;
        private int patched;
        private int deleted;
    }
}
```

- [ ] **Step 6: Create `BoardCounter` and `BoardSnapshot`**

`IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardCounter.java`:

```java
package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// Bộ đếm seq theo board; committedSeq = seqTo lớn nhất đã active
@Data
@NoArgsConstructor
@Document(collection = "boardCounters")
public class BoardCounter {

    // = boardId (hex)
    @Id
    private String id;

    private long seq;
    private long committedSeq;
}
```

`IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardSnapshot.java`:

```java
package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.util.List;
import java.util.Map;

// Ảnh chụp toàn bộ elements (đã chuẩn hóa) của board tại seq
@Data
@NoArgsConstructor
@Document(collection = "boardSnapshots")
@CompoundIndex(name = "snap_board_seq", def = "{'boardId':1,'seq':1}", unique = true)
public class BoardSnapshot {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private long seq;
    private List<Map<String, Object>> elements;
}
```

- [ ] **Step 7: Create the four repositories**

`IE213Backend/src/main/java/com/example/ie213backend/repository/BoardOpRepository.java`:

```java
package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardOp;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BoardOpRepository extends MongoRepository<BoardOp, String> {
    List<BoardOp> findByBoardIdAndTxIdOrderBySeqAsc(String boardId, String txId);
}
```

`IE213Backend/src/main/java/com/example/ie213backend/repository/BoardTxRepository.java`:

```java
package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardTx;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BoardTxRepository extends MongoRepository<BoardTx, String> {
    // WAL: tối đa một tx pending mỗi board
    Optional<BoardTx> findFirstByBoardIdAndState(String boardId, String state);

    // Undo stack: 50 tx mới nhất của user (source ∈ user|redo|restore), mọi state
    List<BoardTx> findTop50ByBoardIdAndUserIdAndSourceInOrderBySeqToDesc(String boardId, String userId,
                                                                         Collection<String> sources);

    // Redo: các tx undo của user, mới nhất trước
    List<BoardTx> findByBoardIdAndUserIdAndSourceOrderBySeqToDesc(String boardId, String userId, String source);
}
```

`IE213Backend/src/main/java/com/example/ie213backend/repository/BoardCounterRepository.java`:

```java
package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardCounter;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BoardCounterRepository extends MongoRepository<BoardCounter, String> {
}
```

`IE213Backend/src/main/java/com/example/ie213backend/repository/BoardSnapshotRepository.java`:

```java
package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BoardSnapshotRepository extends MongoRepository<BoardSnapshot, String> {
    // Snapshot gần nhất có seq ≤ N
    Optional<BoardSnapshot> findFirstByBoardIdAndSeqLessThanEqualOrderBySeqDesc(String boardId, long seq);
}
```

- [ ] **Step 8: Run the test and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryModelsTest'
```

Expected: PASS. With `-q`, Maven prints nothing except the possible JVM line `OpenJDK 64-Bit Server VM warning: Sharing is only supported for boot loader classes ...`, and the exit code is 0. `target/surefire-reports/com.example.ie213backend.domain.model.HistoryModelsTest.txt` shows `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`.

- [ ] **Step 9: Checkpoint (gate)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='HistoryModelsTest,BoardElementServiceTest,ElementPatchesTest,ElementValidatorTest,ElementMigrationTest,LegacyElementMapperTest,TemplateElementConverterTest,BoardElementSocketControllerTest'; echo "exit=$?"; grep -h "Tests run" target/surefire-reports/*.txt
```

Expected: `exit=0`, and every surefire line reads `Failures: 0, Errors: 0`. The existing element tests passed on the untouched working tree on 2026-09-25 before this task, so any failure now comes from this task. The likely cause would be a test that compares whole `BoardElement` objects, which now carry `fieldSeq = null`. Do not run the full suite, because `contextLoads` needs a full environment.

Report the results. Do NOT commit.

---

### Task 2: ElementKeys, ElementNormalizer, Intent

Pure helpers, with no Spring and no DB. They define the normalized Map form (spec §5) that every `before`/`after`, snapshot, replay and diff uses. `normalizeSet` does not validate anything itself. It calls `ElementPatches.toUpdate(set)` (`IE213Backend/src/main/java/com/example/ie213backend/service/element/ElementPatches.java:25-59`) and reads back the exact values that method puts into `$set`. Geometry is already `double` there (`:32`), and style/shape/connector are already POJOs (`:42-51`). The helper then turns each POJO into a `Map` with Jackson and keeps the nulls. `full()` reads the nested POJOs `Style`, `ImageData`, `ShapeData`, `ConnectorData` and `End` from `IE213Backend/src/main/java/com/example/ie213backend/domain/model/BoardElement.java:69-109`.

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementKeys.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/Intent.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementNormalizer.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementKeysTest.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementNormalizerTest.java`
- Read only (no change): `service/element/ElementPatches.java:25-59` (`toUpdate`), `domain/model/BoardElement.java:32-109`.

**Interfaces:**
- Consumes:
  - `ElementPatches.toUpdate(Map<String,Object> set)`, the existing `public static Update` method (`ElementPatches.java:25`). It throws `IllegalArgumentException` for an empty or null set, for a key outside K (`"field not allowed: "`, `:53`) and for invalid values.
  - `BoardElement.getFieldSeq()` / `setFieldSeq(Map<String, Long>)` from Task 1 (`private Map<String, Long> fieldSeq;` with Lombok `@Data`).
- Produces (exactly as in the Interface Contract; all are `public` so that `service.element` can use them in Task 7):
  - `final class ElementKeys { static final List<String> K; static boolean isConnector(Map<String,Object> el); static List<String> connectorEnds(Map<String,Object> connectorValue); }`
  - `final class ElementNormalizer { static Map<String,Object> full(BoardElement e); static Map<String,Object> normalizeSet(Map<String,Object> set); static BoardElement toElement(Map<String,Object> full); static boolean same(Object a, Object b); }`
  - `record Intent(String kind, String elementId, Map<String,Object> element, Map<String,Object> set, Map<String,Long> fsOverride) { static Intent create(Map<String,Object>); static Intent patch(String, Map<String,Object>); static Intent patch(String, Map<String,Object>, Map<String,Long>); static Intent delete(String); }`
- Semantics that later tasks rely on:
  - `same()` compares any two `Number`s by `doubleValue()`, so `Integer 100` equals `Double 100.0` and `Long 3` equals `Integer 3`.
  - `same()` compares Maps key by key over the union of their keys, and a missing key counts as `null`. The reason is that Mongo does not store null POJO fields, so a map read back from the DB can lack keys that a normalized map holds as null.
  - `same()` compares Lists element by element.
  - `connectorEnds` returns `[from.elementId, to.elementId]` and skips an end that is missing. It returns `List.of()` for `null`.
  - `Intent.create` takes `elementId` from `fullElement.get("id")`.

- [ ] **Step 1: Write the failing test for ElementKeys and Intent**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementKeysTest.java`:

```java
package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElementKeysTest {
    @Test
    void kIsExactlyTheTenPatchableKeys() {
        assertEquals(List.of("x", "y", "w", "h", "rotation", "z", "text", "style", "shape", "connector"), ElementKeys.K);
    }

    @Test
    void isConnectorChecksType() {
        assertTrue(ElementKeys.isConnector(Map.of("type", "connector")));
        assertFalse(ElementKeys.isConnector(Map.of("type", "sticky")));
        assertFalse(ElementKeys.isConnector(Map.of()));
        assertFalse(ElementKeys.isConnector(null));
    }

    @Test
    void connectorEndsReturnsFromThenTo() {
        Map<String, Object> c = Map.of(
                "from", Map.of("elementId", "a", "anchor", "auto"),
                "to", Map.of("elementId", "b", "anchor", "right"));
        assertEquals(List.of("a", "b"), ElementKeys.connectorEnds(c));
    }

    @Test
    void connectorEndsToleratesNullAndMissingEnds() {
        assertEquals(List.of(), ElementKeys.connectorEnds(null));
        Map<String, Object> half = new HashMap<>();
        half.put("from", Map.of("elementId", "a", "anchor", "auto"));
        half.put("to", null);
        assertEquals(List.of("a"), ElementKeys.connectorEnds(half));
    }

    @Test
    void intentFactoriesFillTheRightFields() {
        Map<String, Object> full = Map.of("id", "e1", "type", "sticky");
        Intent c = Intent.create(full);
        assertEquals("create", c.kind());
        assertEquals("e1", c.elementId());
        assertSame(full, c.element());
        assertNull(c.set());
        assertNull(c.fsOverride());

        Map<String, Object> set = Map.of("x", 1.0);
        Intent p = Intent.patch("e1", set);
        assertEquals("patch", p.kind());
        assertEquals("e1", p.elementId());
        assertNull(p.element());
        assertSame(set, p.set());
        assertNull(p.fsOverride());

        Map<String, Long> fs = Map.of("x", 10L);
        Intent pf = Intent.patch("e1", set, fs);
        assertEquals("patch", pf.kind());
        assertSame(fs, pf.fsOverride());

        Intent d = Intent.delete("e1");
        assertEquals("delete", d.kind());
        assertEquals("e1", d.elementId());
        assertNull(d.element());
        assertNull(d.set());
        assertNull(d.fsOverride());
    }
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='ElementKeysTest'
```
Expected: the build fails with `[ERROR] COMPILATION ERROR` and `cannot find symbol ... class ElementKeys` / `class Intent`, because neither class exists yet.

- [ ] **Step 3: Implement ElementKeys**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementKeys.java`:

```java
package com.example.ie213backend.service.history;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Các key patch được (K) và helper đọc connector ở dạng Map chuẩn hóa
public final class ElementKeys {
    public static final List<String> K = List.of("x", "y", "w", "h", "rotation", "z", "text", "style", "shape", "connector");

    private ElementKeys() {
    }

    public static boolean isConnector(Map<String, Object> el) {
        return el != null && "connector".equals(el.get("type"));
    }

    public static List<String> connectorEnds(Map<String, Object> connectorValue) {
        if (connectorValue == null) return List.of();
        List<String> ids = new ArrayList<>(2);
        for (String end : List.of("from", "to")) {
            if (connectorValue.get(end) instanceof Map<?, ?> m && m.get("elementId") instanceof String id) ids.add(id);
        }
        return List.copyOf(ids);
    }
}
```

- [ ] **Step 4: Implement Intent**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/Intent.java`:

```java
package com.example.ie213backend.service.history;

import java.util.Map;

// Ý định ghi: create mang element đầy đủ (chuẩn hóa), patch mang set chuẩn hóa; fsOverride chỉ dùng cho undo/redo
public record Intent(String kind, String elementId, Map<String, Object> element,
                     Map<String, Object> set, Map<String, Long> fsOverride) {

    public static Intent create(Map<String, Object> fullElement) {
        return new Intent("create", (String) fullElement.get("id"), fullElement, null, null);
    }

    public static Intent patch(String id, Map<String, Object> set) {
        return new Intent("patch", id, null, set, null);
    }

    public static Intent patch(String id, Map<String, Object> set, Map<String, Long> fsOverride) {
        return new Intent("patch", id, null, set, fsOverride);
    }

    public static Intent delete(String id) {
        return new Intent("delete", id, null, null, null);
    }
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='ElementKeysTest'
```
Expected: exit code 0 with no `[ERROR]` lines. `-q` hides the surefire summary; if you run without `-q` it shows `Tests run: 5, Failures: 0, Errors: 0`.

- [ ] **Step 6: Write the failing test for ElementNormalizer**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementNormalizerTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("unchecked")
class ElementNormalizerTest {
    private static final String BOARD = "650000000000000000000009";
    private static final String OWNER = "650000000000000000000008";

    private BoardElement image(String id) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(BOARD);
        e.setOwner(OWNER);
        e.setType("image");
        e.setX(10);
        e.setY(20);
        e.setW(300);
        e.setH(200);
        e.setZ(3);
        e.setImage(new BoardElement.ImageData("https://img/a.png", "cid-1", "alt"));
        e.setStyle(new BoardElement.Style("#fff", null, 2.0, null));
        e.setVersion(4);
        e.setFieldSeq(new HashMap<>(Map.of("x", 12L, "style", 7L)));
        return e;
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(BOARD);
        e.setType("connector");
        e.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End(from, "auto"), new BoardElement.End(to, "right")));
        return e;
    }

    @Test
    void normalizeSetConvertsIntGeometryToDouble() {
        Map<String, Object> out = ElementNormalizer.normalizeSet(Map.of("x", 100, "z", 2));
        assertEquals(2, out.size());
        assertEquals(Double.class, out.get("x").getClass());
        assertEquals(100.0, out.get("x"));
        assertEquals(2.0, out.get("z"));
    }

    @Test
    void sameTreatsIntAndDoubleAsEqual() {
        assertTrue(ElementNormalizer.same(100, 100.0));
        assertTrue(ElementNormalizer.same(3L, 3));
        assertTrue(ElementNormalizer.same(Map.of("x", 100), Map.of("x", 100.0)));
        assertTrue(ElementNormalizer.same(List.of(1, 2L), List.of(1.0, 2.0)));
        assertFalse(ElementNormalizer.same(100, 100.5));
        assertFalse(ElementNormalizer.same(100, "100"));
        assertFalse(ElementNormalizer.same(List.of(1), List.of(1, 2)));
        assertTrue(ElementNormalizer.same(null, null));
        assertFalse(ElementNormalizer.same(null, 0));
    }

    @Test
    void sameComparesNestedMapsDeeplyAndMissingKeyEqualsNull() {
        Map<String, Object> withNull = new HashMap<>();
        withNull.put("fill", "#fff");
        withNull.put("stroke", null);
        assertTrue(ElementNormalizer.same(withNull, Map.of("fill", "#fff")));
        assertFalse(ElementNormalizer.same(withNull, Map.of("fill", "#000")));
        assertTrue(ElementNormalizer.same(
                Map.of("from", Map.of("elementId", "a", "w", 1)),
                Map.of("from", Map.of("elementId", "a", "w", 1.0))));
        assertFalse(ElementNormalizer.same(
                Map.of("from", Map.of("elementId", "a")),
                Map.of("from", Map.of("elementId", "b"))));
    }

    @Test
    void normalizeSetStyleKeepsNullsAndDoubles() {
        Map<String, Object> out = ElementNormalizer.normalizeSet(
                Map.of("style", Map.of("fill", "#fff", "strokeWidth", 2)));
        Map<String, Object> style = (Map<String, Object>) out.get("style");
        assertEquals(Set.of("fill", "stroke", "strokeWidth", "fontSize"), style.keySet());
        assertNull(style.get("stroke"));
        assertNull(style.get("fontSize"));
        assertEquals(2.0, style.get("strokeWidth"));
        // style từ patch phải khớp style từ element đã lưu
        BoardElement e = image("650000000000000000000001");
        assertEquals(style, ElementNormalizer.full(e).get("style"));
    }

    @Test
    void normalizeSetKeepsNullTextAndNullStyle() {
        Map<String, Object> set = new HashMap<>();
        set.put("text", null);
        set.put("style", null);
        Map<String, Object> out = ElementNormalizer.normalizeSet(set);
        assertTrue(out.containsKey("text"));
        assertNull(out.get("text"));
        assertTrue(out.containsKey("style"));
        assertNull(out.get("style"));
    }

    @Test
    void connectorBecomesNestedMap() {
        Map<String, Object> set = Map.of("connector", Map.of(
                "from", Map.of("elementId", "a", "anchor", "auto"),
                "to", Map.of("elementId", "b", "anchor", "right")));
        Map<String, Object> c = (Map<String, Object>) ElementNormalizer.normalizeSet(set).get("connector");
        assertEquals(Map.of("elementId", "a", "anchor", "auto"), c.get("from"));
        assertEquals(Map.of("elementId", "b", "anchor", "right"), c.get("to"));
        assertEquals(List.of("a", "b"), ElementKeys.connectorEnds(c));

        Map<String, Object> full = ElementNormalizer.full(connector("650000000000000000000003", "a", "b"));
        assertTrue(ElementKeys.isConnector(full));
        assertEquals(c, full.get("connector"));
    }

    @Test
    void fullHasEveryKeyWithNormalizedTypes() {
        Map<String, Object> m = ElementNormalizer.full(image("650000000000000000000001"));
        Set<String> expected = new HashSet<>(ElementKeys.K);
        expected.addAll(Set.of("id", "type", "boardId", "owner", "image", "migratedFrom", "fieldSeq", "version"));
        assertEquals(expected, m.keySet());
        assertEquals("650000000000000000000001", m.get("id"));
        assertEquals(BOARD, m.get("boardId"));
        assertEquals(OWNER, m.get("owner"));
        assertEquals(Double.class, m.get("x").getClass());
        assertEquals(10.0, m.get("x"));
        assertEquals(0.0, m.get("rotation"));
        assertEquals(4L, m.get("version"));
        assertNull(m.get("text"));
        assertNull(m.get("shape"));
        assertNull(m.get("connector"));
        assertNull(m.get("migratedFrom"));
        assertEquals(Map.of("x", 12L, "style", 7L), m.get("fieldSeq"));
        assertEquals(Map.of("url", "https://img/a.png", "cloudinaryId", "cid-1", "alt", "alt"), m.get("image"));
    }

    @Test
    void imageSurvivesFullToElementRoundTrip() {
        BoardElement src = image("650000000000000000000001");
        Map<String, Object> full = ElementNormalizer.full(src);
        BoardElement back = ElementNormalizer.toElement(full);
        assertEquals(src.getImage(), back.getImage());
        assertEquals(src.getStyle(), back.getStyle());
        assertEquals(src.getId(), back.getId());
        assertEquals(src.getBoardId(), back.getBoardId());
        assertEquals(src.getOwner(), back.getOwner());
        assertEquals("image", back.getType());
        assertEquals(10.0, back.getX());
        assertEquals(3.0, back.getZ());
        assertEquals(4L, back.getVersion());
        assertEquals(Map.of("x", 12L, "style", 7L), back.getFieldSeq());
        assertTrue(ElementNormalizer.same(full, ElementNormalizer.full(back)));
    }

    @Test
    void toElementAcceptsIntegerNumbersFromMongo() {
        Map<String, Object> m = new HashMap<>(ElementNormalizer.full(image("650000000000000000000001")));
        m.put("x", 5);
        m.put("version", 3);
        m.put("fieldSeq", Map.of("x", 9));
        BoardElement e = ElementNormalizer.toElement(m);
        assertEquals(5.0, e.getX());
        assertEquals(3L, e.getVersion());
        assertEquals(Map.of("x", 9L), e.getFieldSeq());
    }

    @Test
    void legacyElementWithoutFieldSeqGetsEmptyMap() {
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000002");
        e.setBoardId(BOARD);
        e.setType("sticky");
        e.setText("hi");
        e.setMigratedFrom("stickyNote");
        Map<String, Object> m = ElementNormalizer.full(e);
        assertEquals(Map.of(), m.get("fieldSeq"));
        assertEquals(0L, m.get("version"));
        assertNull(m.get("image"));
        assertEquals("stickyNote", m.get("migratedFrom"));
        assertEquals(Map.of(), ElementNormalizer.toElement(m).getFieldSeq());
    }

    @Test
    void normalizeSetRejectsInvalidKeysAndValues() {
        assertThrows(IllegalArgumentException.class,
                () -> ElementNormalizer.normalizeSet(Map.of("image", Map.of("url", "https://x"))));
        assertThrows(IllegalArgumentException.class,
                () -> ElementNormalizer.normalizeSet(Map.of("fieldSeq", Map.of("x", 1))));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("version", 9)));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("type", "shape")));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("x", "10px")));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of()));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(null));
    }
}
```

- [ ] **Step 7: Run the test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='ElementNormalizerTest'
```
Expected: the build fails with `[ERROR] COMPILATION ERROR` and `cannot find symbol ... class ElementNormalizer`. If it also reports `cannot find symbol ... method setFieldSeq`, Task 1 is not done yet. Stop and finish Task 1 first.

- [ ] **Step 8: Implement ElementNormalizer**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementNormalizer.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.service.element.ElementPatches;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

// Dạng Map chuẩn hóa của element (spec §5): geometry là Double, POJO -> Map giữ cả null
public final class ElementNormalizer {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final Set<String> POJO_KEYS = Set.of("style", "shape", "connector");

    private ElementNormalizer() {
    }

    public static Map<String, Object> full(BoardElement e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("type", e.getType());
        m.put("boardId", e.getBoardId());
        m.put("owner", e.getOwner());
        m.put("image", toMap(e.getImage()));
        m.put("migratedFrom", e.getMigratedFrom());
        m.put("x", e.getX());
        m.put("y", e.getY());
        m.put("w", e.getW());
        m.put("h", e.getH());
        m.put("rotation", e.getRotation());
        m.put("z", e.getZ());
        m.put("text", e.getText());
        m.put("style", toMap(e.getStyle()));
        m.put("shape", toMap(e.getShape()));
        m.put("connector", toMap(e.getConnector()));
        // element cũ chưa có fieldSeq thì coi như mọi key = 0
        m.put("fieldSeq", fieldSeq(e.getFieldSeq()));
        m.put("version", e.getVersion());
        return m;
    }

    public static Map<String, Object> normalizeSet(Map<String, Object> set) {
        // toUpdate kiểm key ∈ K và kiểu giá trị; lấy lại đúng giá trị nó ghi vào $set
        Document applied = (Document) ElementPatches.toUpdate(set).getUpdateObject().get("$set");
        Map<String, Object> out = new LinkedHashMap<>();
        applied.forEach((key, value) -> out.put(key, POJO_KEYS.contains(key) ? toMap(value) : value));
        return out;
    }

    public static BoardElement toElement(Map<String, Object> full) {
        BoardElement e = new BoardElement();
        e.setId((String) full.get("id"));
        e.setType((String) full.get("type"));
        e.setBoardId((String) full.get("boardId"));
        e.setOwner((String) full.get("owner"));
        e.setImage(fromMap(full.get("image"), BoardElement.ImageData.class));
        e.setMigratedFrom((String) full.get("migratedFrom"));
        e.setX(num(full.get("x")));
        e.setY(num(full.get("y")));
        e.setW(num(full.get("w")));
        e.setH(num(full.get("h")));
        e.setRotation(num(full.get("rotation")));
        e.setZ(num(full.get("z")));
        e.setText((String) full.get("text"));
        e.setStyle(fromMap(full.get("style"), BoardElement.Style.class));
        e.setShape(fromMap(full.get("shape"), BoardElement.ShapeData.class));
        e.setConnector(fromMap(full.get("connector"), BoardElement.ConnectorData.class));
        e.setFieldSeq(fieldSeq(full.get("fieldSeq")));
        e.setVersion(full.get("version") instanceof Number n ? n.longValue() : 0L);
        return e;
    }

    public static boolean same(Object a, Object b) {
        if (a == b) return true;
        if (a instanceof Number x && b instanceof Number y) return x.doubleValue() == y.doubleValue();
        if (a instanceof Map<?, ?> ma && b instanceof Map<?, ?> mb) {
            // Mongo không lưu field null của POJO nên key thiếu = null
            Set<Object> keys = new HashSet<>(ma.keySet());
            keys.addAll(mb.keySet());
            for (Object k : keys) {
                if (!same(ma.get(k), mb.get(k))) return false;
            }
            return true;
        }
        if (a instanceof List<?> la && b instanceof List<?> lb) {
            if (la.size() != lb.size()) return false;
            for (int i = 0; i < la.size(); i++) {
                if (!same(la.get(i), lb.get(i))) return false;
            }
            return true;
        }
        return Objects.equals(a, b);
    }

    private static Map<String, Object> toMap(Object pojo) {
        return pojo == null ? null : MAPPER.convertValue(pojo, MAP_TYPE);
    }

    private static <T> T fromMap(Object value, Class<T> type) {
        return value == null ? null : MAPPER.convertValue(value, type);
    }

    private static double num(Object value) {
        return value instanceof Number n ? n.doubleValue() : 0.0;
    }

    // Đọc từ Mongo có thể ra Integer, ép hết về Long
    private static Map<String, Long> fieldSeq(Object value) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (value instanceof Map<?, ?> m) {
            m.forEach((k, s) -> {
                if (s instanceof Number n) out.put(String.valueOf(k), n.longValue());
            });
        }
        return out;
    }
}
```

- [ ] **Step 9: Run the test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='ElementNormalizerTest'
```
Expected: exit code 0 with no `[ERROR]` lines. Without `-q` the summary reads `Tests run: 11, Failures: 0, Errors: 0`.

- [ ] **Step 10: Checkpoint (run the gate)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='ElementKeysTest,ElementNormalizerTest,ElementPatchesTest,ElementValidatorTest'
```
Expected: both commands exit 0 with no `[ERROR]` lines. There are 5 + 11 tests from this task. `ElementPatchesTest` and `ElementValidatorTest` are included to show that `toUpdate` was reused and not changed. Report the results; do NOT commit.

---

### Task 3: HistoryMath.replay and HistoryMath.diff

Pure functions for §8.2 (rebuild board state at seq N) and §8.3 (restore diff). No DB access, no Spring. Task 4 later adds `Direction`, `InverseResult` and `inverse(...)` to the same class; this task does not add them.

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryMath.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathReplayTest.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathDiffTest.java`
- No existing file is modified. Style reference: `BT/service/element/ElementPatchesTest.java:1-40` (plain JUnit 5, `import static org.junit.jupiter.api.Assertions.*`, package-private test class, no Mockito for pure code).

**Interfaces:**
- Consumes (from Task 1): `domain.model.BoardOp` (`@Data`: `getSeq/getKind/getElementId/getAfter/getFsAfter/getV` and setters).
- Consumes (from Task 2): `ElementKeys.K`; `ElementNormalizer.same(Object a, Object b)` (deep equality, Double vs Integer safe); `Intent.create(Map<String,Object>)`, `Intent.patch(String, Map<String,Object>)`, `Intent.delete(String)` and the record accessors `kind()`, `elementId()`, `element()`, `set()`. Intent `kind` values are `"create" | "patch" | "delete"` (same strings as `BoardOp.kind`).
- Produces:
  - `static Map<String,Map<String,Object>> replay(Map<String,Map<String,Object>> base, List<BoardOp> ops)`
  - `static List<Intent> diff(Map<String,Map<String,Object>> target, Map<String,Map<String,Object>> current)`
  - package-private helpers `static Map<String,Object> copyMap(Map<String,Object>)` and `static Object copyValue(Object)` (deep copy of Map/List trees; Task 4 may reuse them).

Behaviour pinned by this task:
- replay: `create` puts a deep copy of `after` (then `fieldSeq = fsAfter`, `version = v`, mirroring §6.3 step 11); `patch` merges `after` into the element, merges `fsAfter` into `fieldSeq`, sets `version = v`, and is skipped when the id is missing; `delete` removes the id and is skipped when it is missing. Seq holes are ignored (ops are applied in list order, the caller sorts). `base` and the ops are never mutated; the result shares no nested Map/List with `base`.
- diff: in current but not target → `delete`; in target but not current → `create` (deep copy of the target map, `_id` kept); in both → `patch` of the K keys that differ (value taken from target) using `ElementNormalizer.same`; `type` or `image` differs → `delete` + `create`. `version`, `updateAt`, `owner`, `migratedFrom`, `boardId`, `fieldSeq` are ignored. Output order is not part of the contract (the planner orders ops).

- [ ] **Step 1: Write the failing replay test**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathReplayTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HistoryMathReplayTest {

    private static Map<String, Object> el(String id, String type, double x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", "650000000000000000000009");
        m.put("owner", "u1");
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", x);
        m.put("y", 0.0);
        m.put("w", 200.0);
        m.put("h", 200.0);
        m.put("rotation", 0.0);
        m.put("z", 1.0);
        m.put("text", null);
        m.put("style", null);
        m.put("shape", null);
        m.put("connector", null);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static Map<String, Object> style(String fill) {
        Map<String, Object> s = new HashMap<>();
        s.put("fill", fill);
        s.put("stroke", null);
        s.put("strokeWidth", null);
        s.put("fontSize", 12.0);
        return s;
    }

    private static BoardOp op(long seq, String kind, String id, Map<String, Object> after,
                              Map<String, Long> fsAfter, long v) {
        BoardOp o = new BoardOp();
        o.setSeq(seq);
        o.setKind(kind);
        o.setElementId(id);
        o.setAfter(after);
        o.setFsAfter(fsAfter);
        o.setV(v);
        return o;
    }

    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    @Test
    void createPutsAfterWithFieldSeqAndVersion() {
        Map<String, Long> fs = Map.of("x", 5L, "y", 5L);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(),
                List.of(op(5, "create", "E", el("E", "sticky", 10.0), fs, 1)));
        assertEquals(1, out.size());
        assertEquals(10.0, out.get("E").get("x"));
        assertEquals("sticky", out.get("E").get("type"));
        assertEquals(fs, out.get("E").get("fieldSeq"));
        assertEquals(1L, out.get("E").get("version"));
    }

    @Test
    void patchMergesAfterKeepsOtherKeysAndMergesFieldSeq() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("y", 5.0);
        e.put("fieldSeq", new LinkedHashMap<>(Map.of("y", 3L)));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("x", 100.0);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(e),
                List.of(op(7, "patch", "E", after, Map.of("x", 7L), 2)));
        assertEquals(100.0, out.get("E").get("x"));
        assertEquals(5.0, out.get("E").get("y"));
        assertEquals(Map.of("x", 7L, "y", 3L), out.get("E").get("fieldSeq"));
        assertEquals(2L, out.get("E").get("version"));
    }

    @Test
    void patchCanSetKeyToNull() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("text", "hello");
        Map<String, Object> after = new HashMap<>();
        after.put("text", null);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(e),
                List.of(op(3, "patch", "E", after, Map.of("text", 3L), 2)));
        assertTrue(out.get("E").containsKey("text"));
        assertNull(out.get("E").get("text"));
    }

    @Test
    void patchOnMissingIdIsSkipped() {
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(el("E", "sticky", 0.0)),
                List.of(op(4, "patch", "GONE", new HashMap<>(Map.of("x", 1.0)), Map.of("x", 4L), 2)));
        assertEquals(1, out.size());
        assertFalse(out.containsKey("GONE"));
        assertEquals(0.0, out.get("E").get("x"));
    }

    @Test
    void deleteRemovesAndMissingDeleteIsSkipped() {
        Map<String, Map<String, Object>> out = HistoryMath.replay(
                board(el("E", "sticky", 0.0), el("F", "sticky", 0.0)),
                List.of(op(2, "delete", "F", null, null, 1),
                        op(3, "delete", "NOPE", null, null, 1)));
        assertEquals(List.of("E"), List.copyOf(out.keySet()));
    }

    @Test
    void toleratesSeqHoles() {
        // seq 1, 4, 9: lỗ seq do commit hỏng trước WAL
        Map<String, Object> after4 = new HashMap<>(Map.of("x", 40.0));
        Map<String, Object> after9 = new HashMap<>(Map.of("y", 90.0));
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(), List.of(
                op(1, "create", "E", el("E", "sticky", 0.0), Map.of(), 1),
                op(4, "patch", "E", after4, Map.of("x", 4L), 2),
                op(9, "patch", "E", after9, Map.of("y", 9L), 3)));
        assertEquals(40.0, out.get("E").get("x"));
        assertEquals(90.0, out.get("E").get("y"));
        assertEquals(3L, out.get("E").get("version"));
        assertEquals(Map.of("x", 4L, "y", 9L), out.get("E").get("fieldSeq"));
    }

    @Test
    void recreateAfterDeleteUsesLatestCreate() {
        Map<String, Object> again = el("E", "sticky", 77.0);
        again.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 2L)));
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(), List.of(
                op(1, "create", "E", el("E", "sticky", 0.0), Map.of(), 1),
                op(2, "delete", "E", null, null, 1),
                op(3, "create", "E", again, Map.of("x", 2L), 2)));
        assertEquals(77.0, out.get("E").get("x"));
        assertEquals(2L, out.get("E").get("version"));
        assertEquals(Map.of("x", 2L), out.get("E").get("fieldSeq"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void doesNotMutateBase() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("style", style("#fff"));
        Map<String, Map<String, Object>> base = board(e, el("F", "sticky", 0.0));
        Map<String, Object> after = new HashMap<>();
        after.put("x", 50.0);
        after.put("style", style("#000"));

        Map<String, Map<String, Object>> out = HistoryMath.replay(base, List.of(
                op(1, "patch", "E", after, Map.of("x", 1L, "style", 1L), 2),
                op(2, "delete", "F", null, null, 1)));

        assertEquals(50.0, out.get("E").get("x"));
        assertEquals(0.0, base.get("E").get("x"));
        assertEquals("#fff", ((Map<String, Object>) base.get("E").get("style")).get("fill"));
        assertEquals(1L, base.get("E").get("version"));
        assertTrue(((Map<String, Long>) base.get("E").get("fieldSeq")).isEmpty());
        assertTrue(base.containsKey("F"));

        // kết quả không chia sẻ map lồng nhau với base
        Map<String, Map<String, Object>> copy = HistoryMath.replay(base, List.of());
        ((Map<String, Object>) copy.get("E").get("style")).put("fill", "#123");
        assertEquals("#fff", ((Map<String, Object>) base.get("E").get("style")).get("fill"));
        assertNotSame(base.get("E"), copy.get("E"));
    }

    @Test
    void nullBaseAndNullOpsGiveEmptyState() {
        assertTrue(HistoryMath.replay(null, null).isEmpty());
        assertTrue(HistoryMath.replay(board(), List.of()).isEmpty());
    }
}
```

- [ ] **Step 2: Run the replay test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryMathReplayTest'
```
Expected: FAIL at test-compile with `[ERROR] ... HistoryMathReplayTest.java:[..] cannot find symbol` / `symbol: variable HistoryMath` (the class does not exist yet). Non-zero exit code.

- [ ] **Step 3: Create `HistoryMath` with `replay` and the copy helpers**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryMath.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Toán thuần cho lịch sử (replay, diff, inverse): không đọc/ghi DB
public final class HistoryMath {

    private HistoryMath() {
    }

    // Dựng lại board từ base + ops (seq tăng dần, caller đã sort); chịu được lỗ seq, không sửa base
    public static Map<String, Map<String, Object>> replay(Map<String, Map<String, Object>> base, List<BoardOp> ops) {
        Map<String, Map<String, Object>> state = new LinkedHashMap<>();
        if (base != null) base.forEach((id, el) -> state.put(id, copyMap(el)));
        if (ops == null) return state;
        for (BoardOp op : ops) {
            if (op == null) continue;
            String id = op.getElementId();
            String kind = op.getKind();
            if ("create".equals(kind)) {
                Map<String, Object> el = copyMap(op.getAfter());
                el.putIfAbsent("id", id);
                if (op.getFsAfter() != null) el.put("fieldSeq", new LinkedHashMap<>(op.getFsAfter()));
                el.put("version", op.getV());
                state.put(id, el);
            } else if ("patch".equals(kind)) {
                Map<String, Object> el = state.get(id);
                // element đã bị xóa trước đó: bỏ qua
                if (el == null) continue;
                if (op.getAfter() != null) op.getAfter().forEach((k, v) -> el.put(k, copyValue(v)));
                if (op.getFsAfter() != null && !op.getFsAfter().isEmpty()) {
                    Map<String, Object> fs = new LinkedHashMap<>();
                    if (el.get("fieldSeq") instanceof Map<?, ?> cur) cur.forEach((k, v) -> fs.put(String.valueOf(k), v));
                    fs.putAll(op.getFsAfter());
                    el.put("fieldSeq", fs);
                }
                el.put("version", op.getV());
            } else if ("delete".equals(kind)) {
                state.remove(id);
            } else {
                throw new IllegalArgumentException("unknown op kind: " + kind);
            }
        }
        return state;
    }

    static Map<String, Object> copyMap(Map<String, Object> m) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (m != null) m.forEach((k, v) -> out.put(k, copyValue(v)));
        return out;
    }

    // Copy sâu Map/List; giá trị lá (String, Number, Boolean, null) dùng lại được
    static Object copyValue(Object v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, val) -> out.put(String.valueOf(k), copyValue(val)));
            return out;
        }
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>(l.size());
            l.forEach(x -> out.add(copyValue(x)));
            return out;
        }
        return v;
    }
}
```

- [ ] **Step 4: Run the replay test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryMathReplayTest'
```
Expected: PASS — exit code 0, no `[ERROR]` lines (with `-q` a green run prints nothing or only the surefire summary `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0`).

- [ ] **Step 5: Write the failing diff test**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathDiffTest.java`:

```java
package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HistoryMathDiffTest {

    private static Map<String, Object> el(String id, String type, double x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", "650000000000000000000009");
        m.put("owner", "u1");
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", x);
        m.put("y", 0.0);
        m.put("w", 200.0);
        m.put("h", 200.0);
        m.put("rotation", 0.0);
        m.put("z", 1.0);
        m.put("text", null);
        m.put("style", null);
        m.put("shape", null);
        m.put("connector", null);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> c = el(id, "connector", 0.0);
        c.put("connector", conn(from, to));
        return c;
    }

    private static Map<String, Object> conn(String from, String to) {
        return Map.of("from", Map.of("elementId", from, "anchor", "auto"),
                "to", Map.of("elementId", to, "anchor", "auto"));
    }

    private static Map<String, Object> image(String id, String url) {
        Map<String, Object> e = el(id, "image", 0.0);
        Map<String, Object> img = new LinkedHashMap<>();
        img.put("url", url);
        img.put("cloudinaryId", "cld-" + url);
        img.put("alt", null);
        e.put("image", img);
        return e;
    }

    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    private static Intent find(List<Intent> intents, String kind, String id) {
        return intents.stream()
                .filter(i -> kind.equals(i.kind()) && id.equals(i.elementId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("missing " + kind + " " + id + " in " + intents));
    }

    @Test
    void elementOnlyInCurrentIsDeleted() {
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0)),
                board(el("E", "sticky", 0.0), el("G", "sticky", 0.0)));
        assertEquals(1, out.size());
        find(out, "delete", "G");
    }

    @Test
    void elementOnlyInTargetIsCreatedKeepingId() {
        Map<String, Object> f = el("F", "sticky", 30.0);
        f.put("text", "hi");
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0), f), board(el("E", "sticky", 0.0)));
        assertEquals(1, out.size());
        Intent create = find(out, "create", "F");
        assertEquals("F", create.element().get("id"));
        assertEquals(30.0, create.element().get("x"));
        assertEquals("hi", create.element().get("text"));
        assertNotSame(f, create.element());
    }

    @Test
    void bothPresentPatchesOnlyDifferingKeysWithTargetValues() {
        Map<String, Object> target = el("E", "sticky", 100.0);
        target.put("text", "old");
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("text", "new");
        List<Intent> out = HistoryMath.diff(board(target), board(current));
        assertEquals(1, out.size());
        Intent patch = find(out, "patch", "E");
        assertEquals(Map.of("x", 100.0, "text", "old"), patch.set());
    }

    @Test
    void patchCanClearKeyToNull() {
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("style", Map.of("fill", "#000"));
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0)), board(current));
        Intent patch = find(out, "patch", "E");
        assertEquals(1, patch.set().size());
        assertTrue(patch.set().containsKey("style"));
        assertNull(patch.set().get("style"));
    }

    @Test
    void ignoresNonPatchableMetadata() {
        Map<String, Object> target = el("E", "sticky", 0.0);
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("version", 42L);
        current.put("updateAt", "2026-09-25 10:00:00");
        current.put("owner", "someone-else");
        current.put("migratedFrom", "stickyNote");
        current.put("boardId", "650000000000000000000001");
        current.put("fieldSeq", Map.of("x", 99L));
        assertTrue(HistoryMath.diff(board(target), board(current)).isEmpty());
    }

    @Test
    void intVersusDoubleGivesNoSpuriousPatch() {
        Map<String, Object> target = el("E", "sticky", 100.0);
        Map<String, Object> styleT = new HashMap<>();
        styleT.put("fill", "#fff");
        styleT.put("stroke", null);
        styleT.put("strokeWidth", 2.0);
        styleT.put("fontSize", 12.0);
        target.put("style", styleT);

        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("x", 100);
        current.put("z", 1);
        Map<String, Object> styleC = new HashMap<>();
        styleC.put("fill", "#fff");
        styleC.put("stroke", null);
        styleC.put("strokeWidth", 2);
        styleC.put("fontSize", 12);
        current.put("style", styleC);

        assertTrue(HistoryMath.diff(board(target), board(current)).isEmpty());
    }

    @Test
    void emptyDiff() {
        assertTrue(HistoryMath.diff(board(), board()).isEmpty());
        assertTrue(HistoryMath.diff(
                board(el("E", "sticky", 5.0), connector("C", "E", "E")),
                board(el("E", "sticky", 5.0), connector("C", "E", "E"))).isEmpty());
    }

    @Test
    void imageChangeGivesDeleteAndCreateWithImageIntact() {
        Map<String, Object> target = image("I", "a.png");
        List<Intent> out = HistoryMath.diff(board(target), board(image("I", "b.png")));
        assertEquals(2, out.size());
        find(out, "delete", "I");
        Intent create = find(out, "create", "I");
        assertEquals(target.get("image"), create.element().get("image"));
        assertEquals("image", create.element().get("type"));
        assertTrue(out.stream().noneMatch(i -> "patch".equals(i.kind())));
    }

    @Test
    void typeChangeGivesDeleteAndCreate() {
        List<Intent> out = HistoryMath.diff(board(el("E", "shape", 0.0)), board(el("E", "sticky", 0.0)));
        assertEquals(2, out.size());
        find(out, "delete", "E");
        assertEquals("shape", find(out, "create", "E").element().get("type"));
    }

    @Test
    void connectorRepointedToElementCreatedAfterN() {
        // tại N: C nối E→F; sau N: tạo G rồi đổi C sang E→G
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                connector("C", "E", "F"));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                el("G", "sticky", 0.0), connector("C", "E", "G"));
        List<Intent> out = HistoryMath.diff(target, current);
        assertEquals(2, out.size());
        find(out, "delete", "G");
        Intent patch = find(out, "patch", "C");
        assertEquals(Map.of("connector", conn("E", "F")), patch.set());
    }

    @Test
    void connectorPointingToElementDeletedAfterN() {
        // tại N: E, F, C(E→F); sau N: xóa F (cascade xóa C)
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                connector("C", "E", "F"));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0));
        List<Intent> out = HistoryMath.diff(target, current);
        assertEquals(2, out.size());
        find(out, "create", "F");
        Intent c = find(out, "create", "C");
        assertEquals(conn("E", "F"), c.element().get("connector"));
        assertTrue(out.stream().noneMatch(i -> "delete".equals(i.kind())));
    }

    @Test
    void doesNotMutateInputs() {
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 100.0));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0), el("G", "sticky", 0.0));
        HistoryMath.diff(target, current);
        assertEquals(100.0, target.get("E").get("x"));
        assertEquals(0.0, current.get("E").get("x"));
        assertEquals(2, current.size());
    }
}
```

- [ ] **Step 6: Run the diff test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryMathDiffTest'
```
Expected: FAIL at test-compile with `[ERROR] ... HistoryMathDiffTest.java:[..] cannot find symbol` / `symbol: method diff(java.util.Map<...>,java.util.Map<...>)` / `location: class com.example.ie213backend.service.history.HistoryMath`. Non-zero exit code.

- [ ] **Step 7: Add `diff` to `HistoryMath`**

Replace the whole content of `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryMath.java` with (Step 3 code plus `diff`):

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Toán thuần cho lịch sử (replay, diff, inverse): không đọc/ghi DB
public final class HistoryMath {

    private HistoryMath() {
    }

    // Dựng lại board từ base + ops (seq tăng dần, caller đã sort); chịu được lỗ seq, không sửa base
    public static Map<String, Map<String, Object>> replay(Map<String, Map<String, Object>> base, List<BoardOp> ops) {
        Map<String, Map<String, Object>> state = new LinkedHashMap<>();
        if (base != null) base.forEach((id, el) -> state.put(id, copyMap(el)));
        if (ops == null) return state;
        for (BoardOp op : ops) {
            if (op == null) continue;
            String id = op.getElementId();
            String kind = op.getKind();
            if ("create".equals(kind)) {
                Map<String, Object> el = copyMap(op.getAfter());
                el.putIfAbsent("id", id);
                if (op.getFsAfter() != null) el.put("fieldSeq", new LinkedHashMap<>(op.getFsAfter()));
                el.put("version", op.getV());
                state.put(id, el);
            } else if ("patch".equals(kind)) {
                Map<String, Object> el = state.get(id);
                // element đã bị xóa trước đó: bỏ qua
                if (el == null) continue;
                if (op.getAfter() != null) op.getAfter().forEach((k, v) -> el.put(k, copyValue(v)));
                if (op.getFsAfter() != null && !op.getFsAfter().isEmpty()) {
                    Map<String, Object> fs = new LinkedHashMap<>();
                    if (el.get("fieldSeq") instanceof Map<?, ?> cur) cur.forEach((k, v) -> fs.put(String.valueOf(k), v));
                    fs.putAll(op.getFsAfter());
                    el.put("fieldSeq", fs);
                }
                el.put("version", op.getV());
            } else if ("delete".equals(kind)) {
                state.remove(id);
            } else {
                throw new IllegalArgumentException("unknown op kind: " + kind);
            }
        }
        return state;
    }

    // Diff để restore (§8.3): chỉ so type, image và K; thứ tự intent do planner sắp lại
    public static List<Intent> diff(Map<String, Map<String, Object>> target, Map<String, Map<String, Object>> current) {
        Map<String, Map<String, Object>> t = target == null ? Map.of() : target;
        Map<String, Map<String, Object>> c = current == null ? Map.of() : current;
        List<Intent> out = new ArrayList<>();
        for (String id : c.keySet()) {
            if (!t.containsKey(id)) out.add(Intent.delete(id));
        }
        for (Map.Entry<String, Map<String, Object>> entry : t.entrySet()) {
            String id = entry.getKey();
            Map<String, Object> want = entry.getValue();
            Map<String, Object> have = c.get(id);
            if (have == null) {
                out.add(Intent.create(copyMap(want)));
                continue;
            }
            // type/image không nằm trong K nên không patch được: xóa rồi tạo lại
            if (!ElementNormalizer.same(want.get("type"), have.get("type"))
                    || !ElementNormalizer.same(want.get("image"), have.get("image"))) {
                out.add(Intent.delete(id));
                out.add(Intent.create(copyMap(want)));
                continue;
            }
            Map<String, Object> set = new LinkedHashMap<>();
            for (String k : ElementKeys.K) {
                if (!ElementNormalizer.same(want.get(k), have.get(k))) set.put(k, copyValue(want.get(k)));
            }
            if (!set.isEmpty()) out.add(Intent.patch(id, set));
        }
        return out;
    }

    static Map<String, Object> copyMap(Map<String, Object> m) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (m != null) m.forEach((k, v) -> out.put(k, copyValue(v)));
        return out;
    }

    // Copy sâu Map/List; giá trị lá (String, Number, Boolean, null) dùng lại được
    static Object copyValue(Object v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, val) -> out.put(String.valueOf(k), copyValue(val)));
            return out;
        }
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>(l.size());
            l.forEach(x -> out.add(copyValue(x)));
            return out;
        }
        return v;
    }
}
```

- [ ] **Step 8: Run both HistoryMath tests and confirm they pass**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryMathReplayTest,HistoryMathDiffTest'
```
Expected: PASS — exit code 0, no `[ERROR]` lines (21 tests: 9 replay + 12 diff, 0 failures). If `intVersusDoubleGivesNoSpuriousPatch` fails, the defect is in Task 2's `ElementNormalizer.same` (must compare numbers by `doubleValue()` recursively inside Maps/Lists); fix it there, not by normalizing inside `diff`.

- [ ] **Step 9: Checkpoint (gate)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='HistoryMathReplayTest,HistoryMathDiffTest,ElementPatchesTest,ElementValidatorTest,BoardElementServiceTest'
```
Expected: both commands exit 0 with no `[ERROR]` lines (the existing element tests stay green because this task changes no existing file). Report results; do NOT commit.

---

### Task 4: HistoryMath.inverse and HistoryResult

Pure undo/redo inverse (§7.2) using the `fieldSeq` rules in §6.4, plus the `HistoryResult` record that STOMP returns (§7). There is no DB access and no Spring. Every example in §7.5 is a test, along with Review Focus 5 (image delete undo keeps `image`) and part of Review Focus 4 (a legacy element with no `fieldSeq` counts as fs 0).

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryResult.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryMath.java`. Task 3 creates this file, so it is not on disk yet and has no line numbers to cite. Add the new imports to the import block. Add the new members **after** `replay(...)`/`diff(...)` and **before** the package-private helpers `copyMap` / `copyValue` that Task 3 defines. Reuse those two helpers and do not redefine them.
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryResultTest.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathInverseTest.java`
- Style references: `BT/service/element/ElementPatchesTest.java:1-35` (plain JUnit 5, package-private test class, `import static org.junit.jupiter.api.Assertions.*`, no Mockito for pure code), and Task 3's `HistoryMath` (short Vietnamese comments, `public static`).

**Interfaces:**
- Consumes:
  - Task 1: `BoardOp` (`@Data @NoArgsConstructor`: `getSeq()`, `getUserId()`, `getKind()`, `getElementId()`, `getBefore()`, `getAfter()`, `getFsBefore()`, `getFsAfter()`, `getV()` and their setters).
  - Task 2: `ElementKeys.K`, `ElementKeys.isConnector(Map<String,Object>)`, `ElementKeys.connectorEnds(Map<String,Object>)` (returns `List.of()` for null and skips a missing end). `Intent.create(Map<String,Object>)` (its `elementId` comes from `get("id")`), `Intent.patch(String, Map<String,Object>, Map<String,Long>)`, `Intent.delete(String)`, and `kind()` ∈ `"create" | "patch" | "delete"`.
  - Task 3: `HistoryMath` (`public final class`) with the package-private helpers `static Map<String,Object> copyMap(Map<String,Object>)` and `static Object copyValue(Object)`.
  - Task 5 (behaviour only, from its plan): when a create intent's `element.fieldSeq` is non-empty, `CommitPlanner` keeps that `fieldSeq`. This is how undo-delete and redo-create give back the old "dấu".
- Produces (exactly as in the contract):
  ```java
  public record HistoryResult(String op, int applied, List<Skip> skipped) {
    public record Skip(String elementId, String key, String reason, String byUserId) {}
    public static HistoryResult empty(String op);
  }
  // in HistoryMath
  public enum Direction { UNDO, REDO }
  public record InverseResult(List<Intent> intents, List<HistoryResult.Skip> skipped) {}
  public static InverseResult inverse(Direction dir, List<BoardOp> txOps, List<BoardOp> undoOps,
                                      Map<String,Map<String,Object>> current, String actorUserId,
                                      java.util.function.BiFunction<String, Long, List<BoardOp>> laterOps);
  ```
- Semantics that later tasks (Task 8 UndoService) rely on:
  - `inverse` never mutates `txOps`, `undoOps` or `current`. Every map in the returned intents is a deep copy.
  - Intents come out in the order: create non-connector, patch, create connector, delete. The patch intents always carry a non-null `fsOverride`.
  - When no intent is produced, `intents` is empty (never null). The caller then marks T `dead` (§7.3/§7.4).
  - The `"empty"` reason is never produced here. Only `HistoryResult.empty(op)` produces it, and UndoService uses that.
  - `guardSeq` is the highest seq of T for UNDO and the highest seq of U for REDO (T's highest when `undoOps` is null or empty). `laterOps` is always called with `guardSeq`.
  - Skip `byUserId` is the user of the op with the highest seq among `laterOps` whose `userId != actor`. For a key skip, only ops whose `after` contains that key count. For `end-missing` it is `null`.
  - Skip reasons produced: `modified` (fs mismatch, or other-user later ops for create/delete), `gone` (element absent), `exists` (id already present on recreate), `end-missing` (a connector end is not a non-connector alive after the batch).

---

- [ ] **Step 1: Write the failing HistoryResult test**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryResultTest.java`:

```java
package com.example.ie213backend.service.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HistoryResultTest {
    @Test
    void emptyHasSingleEmptySkip() {
        HistoryResult r = HistoryResult.empty("undo");
        assertEquals("undo", r.op());
        assertEquals(0, r.applied());
        assertEquals(List.of(new HistoryResult.Skip(null, null, "empty", null)), r.skipped());
    }

    @Test
    void serializesToQueueHistoryShape() throws Exception {
        HistoryResult r = new HistoryResult("redo", 1,
                List.of(new HistoryResult.Skip("S", "x", "modified", "bob")));
        String json = new ObjectMapper().writeValueAsString(r);
        assertTrue(json.contains("\"op\":\"redo\""), json);
        assertTrue(json.contains("\"applied\":1"), json);
        assertTrue(json.contains("\"elementId\":\"S\""), json);
        assertTrue(json.contains("\"key\":\"x\""), json);
        assertTrue(json.contains("\"reason\":\"modified\""), json);
        assertTrue(json.contains("\"byUserId\":\"bob\""), json);
    }
}
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryResultTest'
```
Expected: FAIL at test-compile with `[ERROR] ... HistoryResultTest.java:[..] cannot find symbol` / `symbol: class HistoryResult`. Exit code is non-zero.

- [ ] **Step 3: Create HistoryResult**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryResult.java`:

```java
package com.example.ie213backend.service.history;

import java.util.List;

// Kết quả undo/redo/restore gửi về /user/queue/history
public record HistoryResult(String op, int applied, List<Skip> skipped) {

    // reason: modified | gone | exists | end-missing | empty
    public record Skip(String elementId, String key, String reason, String byUserId) {
    }

    public static HistoryResult empty(String op) {
        return new HistoryResult(op, 0, List.of(new Skip(null, null, "empty", null)));
    }
}
```

- [ ] **Step 4: Run it and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryResultTest'
```
Expected: exit code 0 with no `[ERROR]` lines. Without `-q` the summary shows `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`.

- [ ] **Step 5: Write the failing inverse test (every §7.5 example + grouping + Review Focus 4/5)**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryMathInverseTest.java`. The helpers `userCreate` / `userPatch` / `userDelete` / `apply` imitate what the writer records (fs of a user op = its seq, and undo/redo ops take `fsAfter = fsOverride`). They write both to `board` (the "current" elements) and to `log` (the source for `laterOps`), so a test can chain undo, redo and undo over real op data.

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

import static com.example.ie213backend.service.history.HistoryMath.Direction.REDO;
import static com.example.ie213backend.service.history.HistoryMath.Direction.UNDO;
import static org.junit.jupiter.api.Assertions.*;

class HistoryMathInverseTest {
    private static final String BOARD = "650000000000000000000009";
    private static final String ALICE = "alice";
    private static final String BOB = "bob";

    // board giả lập (id -> full normalized) + op log; JUnit tạo instance mới cho mỗi test
    private final Map<String, Map<String, Object>> board = new LinkedHashMap<>();
    private final List<BoardOp> log = new ArrayList<>();
    private long nextSeq = 10;
    private int nextTx = 1;

    private final BiFunction<String, Long, List<BoardOp>> later = (id, afterSeq) -> log.stream()
            .filter(o -> o.getElementId().equals(id) && o.getSeq() > afterSeq)
            .sorted(Comparator.comparingLong(BoardOp::getSeq))
            .toList();

    // ---------- builders ----------

    private static Map<String, Object> base(String id, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", BOARD);
        m.put("owner", ALICE);
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", 0.0);
        m.put("y", 0.0);
        m.put("w", 100.0);
        m.put("h", 100.0);
        m.put("rotation", 0.0);
        m.put("z", 1.0);
        m.put("text", null);
        m.put("style", null);
        m.put("shape", null);
        m.put("connector", null);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static Map<String, Object> shape(String id, double x) {
        Map<String, Object> m = base(id, "shape");
        m.put("x", x);
        m.put("shape", map("kind", "rect"));
        return m;
    }

    private static Map<String, Object> imageEl(String id) {
        Map<String, Object> img = new LinkedHashMap<>();
        img.put("url", "https://res.cloudinary.com/demo/image/upload/a.png");
        img.put("cloudinaryId", "a");
        img.put("alt", "logo");
        Map<String, Object> m = base(id, "image");
        m.put("image", img);
        return m;
    }

    private static Map<String, Object> end(String elementId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("elementId", elementId);
        m.put("anchor", "auto");
        return m;
    }

    private static Map<String, Object> conn(String from, String to) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", end(from));
        m.put("to", end(to));
        return m;
    }

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> m = base(id, "connector");
        m.put("connector", conn(from, to));
        return m;
    }

    private static Map<String, Object> map(String k, Object v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(k, v);
        return m;
    }

    @SuppressWarnings("unchecked")
    private static <T> T copy(T v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, x) -> out.put((String) k, copy(x)));
            return (T) out;
        }
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>();
            l.forEach(x -> out.add(copy(x)));
            return (T) out;
        }
        return v;
    }

    private static long fs(Map<String, Object> el, String k) {
        if (el.get("fieldSeq") instanceof Map<?, ?> m && m.get(k) instanceof Number n) return n.longValue();
        return 0L;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> fsMap(Map<String, Object> el) {
        if (!(el.get("fieldSeq") instanceof Map)) el.put("fieldSeq", new LinkedHashMap<String, Object>());
        return (Map<String, Object>) el.get("fieldSeq");
    }

    private static Map<String, Long> longs(Map<String, Object> el) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (el.get("fieldSeq") instanceof Map<?, ?> m) {
            m.forEach((k, v) -> out.put((String) k, ((Number) v).longValue()));
        }
        return out;
    }

    private static long version(Map<String, Object> el) {
        return el.get("version") instanceof Number n ? n.longValue() : 0L;
    }

    @SafeVarargs
    private static List<BoardOp> concat(List<BoardOp>... parts) {
        List<BoardOp> out = new ArrayList<>();
        for (List<BoardOp> p : parts) out.addAll(p);
        return out;
    }

    // ---------- giả lập writer ----------

    private BoardOp op(String tx, String user, String kind, String id, Map<String, Object> before,
                       Map<String, Object> after, Map<String, Long> fsB, Map<String, Long> fsA, long v) {
        BoardOp o = new BoardOp();
        o.setBoardId(BOARD);
        o.setSeq(nextSeq++);
        o.setTxId(tx);
        o.setUserId(user);
        o.setTs(Instant.now());
        o.setKind(kind);
        o.setElementId(id);
        o.setBefore(before);
        o.setAfter(after);
        o.setFsBefore(fsB);
        o.setFsAfter(fsA);
        o.setV(v);
        log.add(o);
        return o;
    }

    private List<BoardOp> userCreate(String user, Map<String, Object> el) {
        long seq = nextSeq;
        Map<String, Object> e = copy(el);
        Map<String, Long> fsA = new LinkedHashMap<>();
        ElementKeys.K.forEach(k -> fsA.put(k, seq));
        e.put("fieldSeq", new LinkedHashMap<>(fsA));
        e.put("version", 1L);
        String id = (String) e.get("id");
        board.put(id, e);
        return List.of(op("t" + nextTx++, user, "create", id, null, copy(e), Map.of(), fsA, 1L));
    }

    private List<BoardOp> userPatch(String user, String id, String key, Object value) {
        long seq = nextSeq;
        Map<String, Object> cur = board.get(id);
        BoardOp o = op("t" + nextTx++, user, "patch", id, map(key, copy(cur.get(key))), map(key, copy(value)),
                Map.of(key, fs(cur, key)), Map.of(key, seq), version(cur) + 1);
        cur.put(key, copy(value));
        fsMap(cur).put(key, seq);
        cur.put("version", o.getV());
        return List.of(o);
    }

    private List<BoardOp> userDelete(String user, String... ids) {
        String tx = "t" + nextTx++;
        List<BoardOp> out = new ArrayList<>();
        for (String id : ids) {
            Map<String, Object> cur = board.remove(id);
            out.add(op(tx, user, "delete", id, copy(cur), null, longs(cur), Map.of(), version(cur)));
        }
        return out;
    }

    // Áp kết quả inverse như một tx undo/redo của `user`, trả về ops của tx đó
    private List<BoardOp> apply(HistoryMath.InverseResult r, String user) {
        String tx = "t" + nextTx++;
        List<BoardOp> out = new ArrayList<>();
        for (Intent in : r.intents()) {
            long seq = nextSeq;
            switch (in.kind()) {
                case "create" -> {
                    Map<String, Object> el = copy(in.element());
                    long v = version(el) + 1;
                    el.put("version", v);
                    board.put(in.elementId(), el);
                    out.add(op(tx, user, "create", in.elementId(), null, copy(el), Map.of(), longs(el), v));
                }
                case "patch" -> {
                    Map<String, Object> cur = board.get(in.elementId());
                    Map<String, Object> before = new LinkedHashMap<>();
                    Map<String, Long> fsB = new LinkedHashMap<>();
                    Map<String, Long> fsA = new LinkedHashMap<>();
                    for (String k : in.set().keySet()) {
                        before.put(k, copy(cur.get(k)));
                        fsB.put(k, fs(cur, k));
                        fsA.put(k, in.fsOverride().getOrDefault(k, seq));
                    }
                    long v = version(cur) + 1;
                    out.add(op(tx, user, "patch", in.elementId(), before, copy(in.set()), fsB, fsA, v));
                    in.set().forEach((k, val) -> cur.put(k, copy(val)));
                    fsA.forEach((k, s) -> fsMap(cur).put(k, s));
                    cur.put("version", v);
                }
                case "delete" -> {
                    Map<String, Object> cur = board.remove(in.elementId());
                    out.add(op(tx, user, "delete", in.elementId(), copy(cur), null, longs(cur), Map.of(), version(cur)));
                }
                default -> fail("unknown intent kind " + in.kind());
            }
        }
        return out;
    }

    private HistoryMath.InverseResult run(HistoryMath.Direction dir, List<BoardOp> t, List<BoardOp> u) {
        return HistoryMath.inverse(dir, t, u, board, ALICE, later);
    }

    private void assertX(String id, double x, long fsX) {
        assertEquals(x, ((Number) board.get(id).get("x")).doubleValue());
        assertEquals(fsX, fs(board.get(id), "x"));
    }

    // ---------- §7.5 ----------

    @Test
    void example1_undoSkipsKeyModifiedByOtherUser() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);          // seq 10
        userPatch(BOB, "S", "style", map("fill", "#ff0000"));          // seq 11
        userPatch(BOB, "S", "x", 200.0);                               // seq 12

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", BOB)), r.skipped());
    }

    @Test
    void example2_sameUserMultiStepUndoRedoOnSameKey() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);         // seq 10, fsB 0, fsA 10
        List<BoardOp> t2 = userPatch(ALICE, "S", "x", 200.0);         // seq 11, fsB 10, fsA 11

        HistoryMath.InverseResult undoT2 = run(UNDO, t2, null);
        assertTrue(undoT2.skipped().isEmpty());
        List<BoardOp> u2 = apply(undoT2, ALICE);
        assertX("S", 100.0, 10);

        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        assertX("S", 0.0, 0);

        HistoryMath.InverseResult redoT1 = run(REDO, t1, u1);
        assertTrue(redoT1.skipped().isEmpty());
        apply(redoT1, ALICE);
        assertX("S", 100.0, 10);

        List<BoardOp> r2 = apply(run(REDO, t2, u2), ALICE);
        assertX("S", 200.0, 11);
        // R2 mang fsBefore = T2.fsB, fsAfter = T2.fsA
        assertEquals(Map.of("x", 10L), r2.get(0).getFsBefore());
        assertEquals(Map.of("x", 11L), r2.get(0).getFsAfter());

        HistoryMath.InverseResult undoR2 = run(UNDO, r2, null);
        assertTrue(undoR2.skipped().isEmpty());
        apply(undoR2, ALICE);
        assertX("S", 100.0, 10);
    }

    @Test
    void example2_variant_redoBlockedWhenOtherUserWroteKey() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);
        List<BoardOp> t2 = userPatch(ALICE, "S", "x", 200.0);
        apply(run(UNDO, t2, null), ALICE);
        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        userPatch(BOB, "S", "x", 50.0);                                // fs x = seq của Bob

        HistoryMath.InverseResult r = run(REDO, t1, u1);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", BOB)), r.skipped());
    }

    @Test
    void example3_createMoveUndoUndoRedoRedo() {
        List<BoardOp> t1 = userCreate(ALICE, shape("E", 0.0));        // seq 10
        List<BoardOp> t2 = userPatch(ALICE, "E", "x", 100.0);         // seq 11

        List<BoardOp> u2 = apply(run(UNDO, t2, null), ALICE);
        assertX("E", 0.0, 10);

        HistoryMath.InverseResult undoT1 = run(UNDO, t1, null);
        assertEquals(1, undoT1.intents().size());
        assertEquals("delete", undoT1.intents().get(0).kind());
        List<BoardOp> u1 = apply(undoT1, ALICE);
        assertFalse(board.containsKey("E"));

        // LIFO: UndoService chọn U1 trước (Task 8); ở đây gọi theo đúng thứ tự đó
        HistoryMath.InverseResult redoT1 = run(REDO, t1, u1);
        assertTrue(redoT1.skipped().isEmpty());
        assertEquals("create", redoT1.intents().get(0).kind());
        apply(redoT1, ALICE);
        assertX("E", 0.0, 10);

        HistoryMath.InverseResult redoT2 = run(REDO, t2, u2);
        assertTrue(redoT2.skipped().isEmpty());
        apply(redoT2, ALICE);
        assertTrue(board.containsKey("E"));
        assertX("E", 100.0, 11);
    }

    @Test
    void example4_patchDeleteUndoDeleteThenUndoPatch() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);         // seq 10
        List<BoardOp> t2 = userDelete(ALICE, "S");                     // seq 11

        HistoryMath.InverseResult undoDelete = run(UNDO, t2, null);
        assertTrue(undoDelete.skipped().isEmpty());
        assertEquals("create", undoDelete.intents().get(0).kind());
        apply(undoDelete, ALICE);
        assertX("S", 100.0, 10);                                       // fieldSeq được khôi phục

        HistoryMath.InverseResult undoPatch = run(UNDO, t1, null);
        assertTrue(undoPatch.skipped().isEmpty());
        apply(undoPatch, ALICE);
        assertX("S", 0.0, 0);
    }

    @Test
    void example5_connectorRetargetUndoEndMissing() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("G", shape("G", 400.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userPatch(ALICE, "C", "connector", conn("E", "G"));
        userDelete(BOB, "F");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("C", "connector", "end-missing", null)), r.skipped());
    }

    @Test
    void example6_redoAfterOwnNewActionProducesNoIntent() {
        // "empty" do UndoService trả (Task 8: post-commit đã chuyển T sang dead); ở mức math,
        // thao tác mới (user hoặc restore) đổi "dấu" nên redo cũng không sinh intent
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);
        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        userPatch(ALICE, "S", "x", 50.0);

        HistoryMath.InverseResult r = run(REDO, t1, u1);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", null)), r.skipped());
        assertX("S", 50.0, 12);
    }

    // ---------- Review Focus 4 / 5 ----------

    @Test
    void imageDeleteUndoKeepsImagePayload() {
        board.put("I", imageEl("I"));
        List<BoardOp> t = userDelete(ALICE, "I");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        Intent in = r.intents().get(0);
        assertEquals("create", in.kind());
        assertEquals("I", in.elementId());
        assertEquals("image", in.element().get("type"));
        Object original = t.get(0).getBefore().get("image");
        assertEquals(original, in.element().get("image"));
        assertNotSame(original, in.element().get("image"));
    }

    @Test
    void legacyElementWithoutFieldSeqCountsAsZero() {
        Map<String, Object> s = shape("S", 100.0);
        s.put("fieldSeq", map("x", 10L));                              // legacy: chỉ key vừa patch có dấu
        board.put("S", s);
        List<BoardOp> t = List.of(op("t0", ALICE, "patch", "S", map("x", 0.0), map("x", 100.0),
                null, Map.of("x", 10L), 1L));                          // fsBefore thiếu = 0

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        assertTrue(undo.skipped().isEmpty());
        Intent in = undo.intents().get(0);
        assertEquals(0.0, ((Number) in.set().get("x")).doubleValue());
        assertEquals(Map.of("x", 0L), in.fsOverride());

        // element hoàn toàn không có field fieldSeq: redo cần fs == T.fsB = 0
        board.get("S").remove("fieldSeq");
        board.get("S").put("x", 0.0);
        HistoryMath.InverseResult redo = run(REDO, t, List.of());
        assertTrue(redo.skipped().isEmpty());
        assertEquals(100.0, ((Number) redo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 10L), redo.intents().get(0).fsOverride());
    }

    // ---------- gộp theo element / key ----------

    @Test
    void groupCreateThenPatchUndoIsSingleDelete() {
        List<BoardOp> t = concat(userCreate(ALICE, shape("E", 0.0)), userPatch(ALICE, "E", "x", 100.0));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        assertEquals("delete", r.intents().get(0).kind());
        assertEquals("E", r.intents().get(0).elementId());
    }

    @Test
    void groupCreateThenDeleteCancels() {
        List<BoardOp> t = concat(userCreate(ALICE, shape("E", 0.0)), userDelete(ALICE, "E"));

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        HistoryMath.InverseResult redo = run(REDO, t, List.of());

        assertTrue(undo.intents().isEmpty());
        assertTrue(undo.skipped().isEmpty());
        assertTrue(redo.intents().isEmpty());
        assertTrue(redo.skipped().isEmpty());
    }

    @Test
    void groupPatchPatchUsesEarliestBeforeAndLatestAfter() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = concat(userPatch(ALICE, "S", "x", 100.0),   // seq 10, fsB 0
                userPatch(ALICE, "S", "x", 200.0));                    // seq 11, fsA 11

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        assertTrue(undo.skipped().isEmpty());
        assertEquals(1, undo.intents().size());
        assertEquals(0.0, ((Number) undo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 0L), undo.intents().get(0).fsOverride());
        List<BoardOp> u = apply(undo, ALICE);

        HistoryMath.InverseResult redo = run(REDO, t, u);
        assertTrue(redo.skipped().isEmpty());
        assertEquals(200.0, ((Number) redo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 11L), redo.intents().get(0).fsOverride());
    }

    @Test
    void groupPatchThenDeleteUndoRecreatesPreTxState() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = concat(userPatch(ALICE, "S", "x", 100.0), userDelete(ALICE, "S"));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        Intent in = r.intents().get(0);
        assertEquals("create", in.kind());
        assertEquals(0.0, ((Number) in.element().get("x")).doubleValue());
        assertEquals(0L, ((Number) ((Map<?, ?>) in.element().get("fieldSeq")).get("x")).longValue());
    }

    // ---------- các dòng còn lại của bảng §7.2 ----------

    @Test
    void undoCreateBlockedByOtherUserConnectorAttached() {
        board.put("F", shape("F", 200.0));
        List<BoardOp> t = userCreate(ALICE, shape("E", 0.0));
        userCreate(BOB, connector("C", "E", "F"));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("E", null, "modified", BOB)), r.skipped());
    }

    @Test
    void undoDeleteSkipsConnectorWhoseOtherEndIsGone() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userDelete(ALICE, "E", "C");                 // delete + cascade trong cùng tx
        userDelete(BOB, "F");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertEquals(1, r.intents().size());
        assertEquals("create", r.intents().get(0).kind());
        assertEquals("E", r.intents().get(0).elementId());
        assertEquals(List.of(new HistoryResult.Skip("C", null, "end-missing", null)), r.skipped());
    }

    @Test
    void undoDeleteRecreatesNodeBeforeConnector() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userDelete(ALICE, "E", "C");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(List.of("E", "C"), r.intents().stream().map(Intent::elementId).toList());
        assertTrue(r.intents().stream().allMatch(i -> "create".equals(i.kind())));
    }

    @Test
    void redoDeleteBlockedByOtherUserAfterUndo() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userDelete(ALICE, "S");
        List<BoardOp> u = apply(run(UNDO, t, null), ALICE);
        userPatch(BOB, "S", "x", 5.0);

        HistoryMath.InverseResult r = run(REDO, t, u);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "modified", BOB)), r.skipped());
    }

    @Test
    void undoPatchOnDeletedElementSkipsGone() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);
        userDelete(BOB, "S");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "gone", BOB)), r.skipped());
    }

    @Test
    void undoDeleteWhenIdExistsSkipsExists() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userDelete(ALICE, "S");
        userCreate(BOB, shape("S", 0.0));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "exists", BOB)), r.skipped());
    }

    @Test
    void inverseDoesNotMutateInputs() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);
        Map<String, Map<String, Object>> before = copy(board);
        Map<String, Object> opBefore = copy(t.get(0).getBefore());

        run(UNDO, t, null);

        assertEquals(before, board);
        assertEquals(opBefore, t.get(0).getBefore());
    }
}
```

- [ ] **Step 6: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryMathInverseTest'
```
Expected: FAIL at test-compile with `[ERROR] ... HistoryMathInverseTest.java:[..] cannot find symbol` for `class Direction` / `class InverseResult` / `method inverse(...)` in `HistoryMath`. Exit code is non-zero.

- [ ] **Step 7: Add the inverse to HistoryMath**

In `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryMath.java`, first make the import block contain the following lines (Task 3 already has `BoardOp`, `ArrayList`, `LinkedHashMap`, `List` and `Map`, so add only the lines that are missing):

```java
import com.example.ie213backend.domain.model.BoardOp;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Predicate;
```

Then insert the block below into the class body after Task 3's public `replay`/`diff` methods and before its `static Map<String, Object> copyMap(...)` helper. It reuses Task 3's `copyMap` and `copyValue`.

```java
    // ===== Undo/redo inverse (§7.2, §6.4) =====

    public enum Direction { UNDO, REDO }

    public record InverseResult(List<Intent> intents, List<HistoryResult.Skip> skipped) {
    }

    private static final String CANCEL = "cancel";

    // Op của T sau khi gộp theo element (và theo key nếu là patch)
    private static final class Entry {
        final String id;
        String kind;                                   // create | patch | delete | cancel
        Map<String, Object> full;                      // create: element cuối; delete: element trước T
        final Map<String, Object> before = new LinkedHashMap<>();
        final Map<String, Object> after = new LinkedHashMap<>();
        final Map<String, Long> fsB = new LinkedHashMap<>();
        final Map<String, Long> fsA = new LinkedHashMap<>();

        Entry(String id) {
            this.id = id;
        }
    }

    // txOps: ops của tx gốc T; undoOps: ops của U mới nhất nhắm tới T (chỉ REDO)
    public static InverseResult inverse(Direction dir, List<BoardOp> txOps, List<BoardOp> undoOps,
                                        Map<String, Map<String, Object>> current, String actorUserId,
                                        BiFunction<String, Long, List<BoardOp>> laterOps) {
        boolean undo = dir == Direction.UNDO;
        List<BoardOp> tOps = sortedBySeq(txOps);
        List<BoardOp> uOps = sortedBySeq(undoOps);
        long maxT = tOps.isEmpty() ? 0L : tOps.get(tOps.size() - 1).getSeq();
        // mốc "sau thao tác": seq cuối của T khi undo, của U khi redo
        long guard = undo || uOps.isEmpty() ? maxT : uOps.get(uOps.size() - 1).getSeq();

        List<HistoryResult.Skip> skipped = new ArrayList<>();
        Set<String> deletes = new LinkedHashSet<>();
        Map<String, Map<String, Object>> nodeCreates = new LinkedHashMap<>();
        Map<String, Map<String, Object>> connCreates = new LinkedHashMap<>();
        List<Entry> patches = new ArrayList<>();

        for (Entry e : groupByElement(tOps).values()) {
            if (e.kind == null || CANCEL.equals(e.kind)) continue;
            if ("patch".equals(e.kind)) {
                patches.add(e);
                continue;
            }
            // undo create / redo delete -> xóa; undo delete / redo create -> tạo lại
            boolean remove = undo == "create".equals(e.kind);
            if (remove) {
                if (!current.containsKey(e.id)) {
                    skipped.add(skip(e.id, null, "gone", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                    continue;
                }
                List<BoardOp> watch = new ArrayList<>(laterOps.apply(e.id, guard));
                if (undo) {
                    // undo create: người khác sửa connector đang nối vào cũng chặn
                    for (Map.Entry<String, Map<String, Object>> c : current.entrySet()) {
                        if (ElementKeys.isConnector(c.getValue())
                                && endsOf(c.getValue().get("connector")).contains(e.id)) {
                            watch.addAll(laterOps.apply(c.getKey(), guard));
                        }
                    }
                }
                String by = newestOther(watch, actorUserId, null);
                if (by != null) {
                    skipped.add(skip(e.id, null, "modified", by));
                    continue;
                }
                deletes.add(e.id);
            } else {
                if (current.containsKey(e.id)) {
                    skipped.add(skip(e.id, null, "exists", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                    continue;
                }
                Map<String, Object> el = undo ? e.full : deletedBefore(uOps, e.id);
                if (el == null) {
                    skipped.add(skip(e.id, null, "gone", null));
                    continue;
                }
                if (ElementKeys.isConnector(el)) connCreates.put(e.id, el);
                else nodeCreates.put(e.id, el);
            }
        }

        // đầu connector hợp lệ: non-connector còn tồn tại sau batch này
        Predicate<String> nodeAlive = id -> {
            if (id == null) return false;
            if (nodeCreates.containsKey(id)) return true;
            Map<String, Object> cur = current.get(id);
            return cur != null && !deletes.contains(id) && !ElementKeys.isConnector(cur);
        };

        List<Intent> patchIntents = new ArrayList<>();
        for (Entry e : patches) {
            Map<String, Object> cur = current.get(e.id);
            if (cur == null) {
                skipped.add(skip(e.id, null, "gone", newestOther(laterOps.apply(e.id, guard), actorUserId, null)));
                continue;
            }
            Map<String, Object> set = new LinkedHashMap<>();
            Map<String, Long> fsOverride = new LinkedHashMap<>();
            for (String k : e.after.keySet()) {
                // điều kiện "dấu": undo cần fs == T.fsA, redo cần fs == T.fsB
                long expected = undo ? e.fsA.get(k) : e.fsB.get(k);
                if (seqOf(cur.get("fieldSeq"), k) != expected) {
                    skipped.add(skip(e.id, k, "modified", newestOther(laterOps.apply(e.id, guard), actorUserId, k)));
                    continue;
                }
                Object value = undo ? e.before.get(k) : e.after.get(k);
                if ("connector".equals(k) && !endsOf(value).stream().allMatch(nodeAlive)) {
                    skipped.add(skip(e.id, k, "end-missing", null));
                    continue;
                }
                set.put(k, copyValue(value));
                fsOverride.put(k, undo ? e.fsB.get(k) : e.fsA.get(k));
            }
            if (!set.isEmpty()) patchIntents.add(Intent.patch(e.id, set, fsOverride));
        }

        List<Intent> connIntents = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> c : connCreates.entrySet()) {
            if (!endsOf(c.getValue().get("connector")).stream().allMatch(nodeAlive)) {
                skipped.add(skip(c.getKey(), null, "end-missing", null));
                continue;
            }
            connIntents.add(Intent.create(copyMap(c.getValue())));
        }

        // thứ tự: create non-connector -> patch -> create connector -> delete
        List<Intent> intents = new ArrayList<>();
        nodeCreates.values().forEach(el -> intents.add(Intent.create(copyMap(el))));
        intents.addAll(patchIntents);
        intents.addAll(connIntents);
        deletes.forEach(id -> intents.add(Intent.delete(id)));
        return new InverseResult(intents, skipped);
    }

    // Gộp: create+patch -> create; patch+delete -> delete (element trước T); create+delete -> triệt tiêu
    private static Map<String, Entry> groupByElement(List<BoardOp> ops) {
        Map<String, Entry> out = new LinkedHashMap<>();
        for (BoardOp op : ops) {
            Entry e = out.computeIfAbsent(op.getElementId(), Entry::new);
            switch (op.getKind()) {
                case "create" -> {
                    if (e.kind == null || CANCEL.equals(e.kind)) {
                        e.kind = "create";
                        e.full = copyMap(op.getAfter());
                    }
                }
                case "patch" -> {
                    if ("create".equals(e.kind)) {
                        overlayCreate(e, op);
                    } else if (e.kind == null || "patch".equals(e.kind)) {
                        e.kind = "patch";
                        mergeKeys(e, op);
                    }
                }
                case "delete" -> {
                    if ("create".equals(e.kind)) {
                        e.kind = CANCEL;
                        e.full = null;
                    } else if (e.kind == null || "patch".equals(e.kind)) {
                        Map<String, Object> full = copyMap(op.getBefore());
                        // patch + delete: before của delete, đè bằng before/fsBefore sớm nhất của patch
                        e.before.forEach((k, v) -> full.put(k, copyValue(v)));
                        Map<String, Long> fs = toLongMap(full.get("fieldSeq"));
                        fs.putAll(e.fsB);
                        full.put("fieldSeq", fs);
                        e.kind = "delete";
                        e.full = full;
                    }
                }
                default -> throw new IllegalArgumentException("unknown op kind: " + op.getKind());
            }
        }
        return out;
    }

    // Theo key: before/fsB lấy op sớm nhất, after/fsA lấy op muộn nhất
    private static void mergeKeys(Entry e, BoardOp op) {
        if (op.getAfter() == null) return;
        for (Map.Entry<String, Object> kv : op.getAfter().entrySet()) {
            String k = kv.getKey();
            if (!e.before.containsKey(k)) {
                e.before.put(k, copyValue(op.getBefore() == null ? null : op.getBefore().get(k)));
                e.fsB.put(k, seqOf(op.getFsBefore(), k));
            }
            e.after.put(k, copyValue(kv.getValue()));
            e.fsA.put(k, seqOf(op.getFsAfter(), k));
        }
    }

    private static void overlayCreate(Entry e, BoardOp op) {
        Map<String, Long> fs = toLongMap(e.full.get("fieldSeq"));
        if (op.getAfter() != null) {
            op.getAfter().forEach((k, v) -> {
                e.full.put(k, copyValue(v));
                fs.put(k, seqOf(op.getFsAfter(), k));
            });
        }
        e.full.put("fieldSeq", fs);
        e.full.put("version", op.getV());
    }

    // before của op delete trong U cho element (nguồn để redo create)
    private static Map<String, Object> deletedBefore(List<BoardOp> undoOps, String id) {
        Map<String, Object> found = null;
        for (BoardOp o : undoOps) {
            if ("delete".equals(o.getKind()) && id.equals(o.getElementId())) found = o.getBefore();
        }
        return found == null ? null : copyMap(found);
    }

    // user của op mới nhất không phải người bấm; key != null thì chỉ xét op có after chứa key
    private static String newestOther(List<BoardOp> ops, String actorUserId, String key) {
        if (ops == null) return null;
        BoardOp best = null;
        for (BoardOp o : ops) {
            if (Objects.equals(o.getUserId(), actorUserId)) continue;
            if (key != null && (o.getAfter() == null || !o.getAfter().containsKey(key))) continue;
            if (best == null || o.getSeq() > best.getSeq()) best = o;
        }
        return best == null ? null : best.getUserId();
    }

    private static HistoryResult.Skip skip(String elementId, String key, String reason, String byUserId) {
        return new HistoryResult.Skip(elementId, key, reason, byUserId);
    }

    @SuppressWarnings("unchecked")
    private static List<String> endsOf(Object connectorValue) {
        return connectorValue instanceof Map<?, ?> m
                ? ElementKeys.connectorEnds((Map<String, Object>) m)
                : List.of();
    }

    // fieldSeq thiếu key (element legacy) = 0
    private static long seqOf(Object fsMap, String k) {
        if (fsMap instanceof Map<?, ?> m && m.get(k) instanceof Number n) return n.longValue();
        return 0L;
    }

    private static Map<String, Long> toLongMap(Object v) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (v instanceof Map<?, ?> m) {
            m.forEach((k, n) -> {
                if (n instanceof Number num) out.put(String.valueOf(k), num.longValue());
            });
        }
        return out;
    }

    private static List<BoardOp> sortedBySeq(List<BoardOp> ops) {
        if (ops == null) return List.of();
        List<BoardOp> out = new ArrayList<>(ops);
        out.sort(Comparator.comparingLong(BoardOp::getSeq));
        return out;
    }
```

- [ ] **Step 8: Run the inverse test and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw test -Dtest='HistoryMathInverseTest'
```
Expected: `Tests run: 20, Failures: 0, Errors: 0, Skipped: 0` and `BUILD SUCCESS`.

- [ ] **Step 9: Checkpoint (gate)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='HistoryResultTest,HistoryMathInverseTest,HistoryMathReplayTest,HistoryMathDiffTest,ElementKeysTest,ElementPatchesTest,BoardElementServiceTest'
```
Expected: both commands exit 0 with no `[ERROR]` lines. Report the results. Do NOT commit.

---

### Task 5: CommitPlanner

Pure implementation of spec §6.3 steps 2-7. The planner reads nothing from the DB. It takes the batch intents, the board state at lock time (`id -> full normalized`) and a `lastVersion` lookup, and returns the ordered `BoardOp` list that `ElementWriter` (Task 6) numbers and applies. It takes over the in-memory parts of today's `BoardElementService`: dropping existing ids on create (`BoardElementService.java:43-48`), connector ends checked against the batch (`:39-42`, `:97-106`) and the connector cascade on delete (`:77-95`). Task 7 removes those parts from the service. This task does not touch the service.

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/CommitPlanner.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/CommitPlannerTest.java` (new, plain JUnit 5 with no Mockito, in the same package so it can reach package-private members)

**Interfaces:**
- Consumes:
  - Task 1: `domain.model.BoardOp` (Lombok `@Data`: `setKind`, `setElementId`, `setBefore`, `setAfter`, `setFsBefore`, `setFsAfter`, `setV`, plus the getters)
  - Task 2: `record Intent(String kind, String elementId, Map<String,Object> element, Map<String,Object> set, Map<String,Long> fsOverride)` with `Intent.create(Map)`, `Intent.patch(String, Map)`, `Intent.patch(String, Map, Map<String,Long>)` and `Intent.delete(String)`
  - Task 2: `ElementKeys.K`, `ElementKeys.isConnector(Map<String,Object>)` and `ElementKeys.connectorEnds(Map<String,Object>)`
- Produces:
  ```java
  public final class CommitPlanner {
      public static final long SEQ = -1L;
      public static List<BoardOp> plan(List<Intent> intents, Map<String, Map<String, Object>> board,
                                       Function<String, Long> lastVersion);
  }
  ```
  Output rules that Task 6 relies on:
  - `seq`, `txId`, `userId`, `ts`, `id` and `boardId` are left null or 0. The writer fills them in.
  - Any `SEQ` sentinel in `fsAfter` stands for the op's own seq. On a create op the same sentinels also appear in `after.fieldSeq`, and the writer must resolve both maps.
  - For a create op, `after.version == v`.
  - For a patch op, `before` and `after` hold exactly the keys in the folded `set`.
  - For a delete op, `before` is the full current element (including `fieldSeq`, `version` and `image`), `after` is null, `fsAfter` is empty and `v` is the current version.

- [ ] **Step 1: Write the failing test**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/CommitPlannerTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class CommitPlannerTest {
    private static final Function<String, Long> NO_HISTORY = id -> 0L;
    private static final long SEQ = CommitPlanner.SEQ;

    // element đã chuẩn hoá, cùng dạng ElementNormalizer.full
    private static Map<String, Object> el(String id, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", "650000000000000000000009");
        m.put("owner", "u1");
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", 0.0);
        m.put("y", 0.0);
        m.put("w", 100.0);
        m.put("h", 100.0);
        m.put("rotation", 0.0);
        m.put("z", 1.0);
        m.put("text", null);
        m.put("style", null);
        m.put("shape", null);
        m.put("connector", null);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static Map<String, Object> end(String elementId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("elementId", elementId);
        m.put("anchor", null);
        return m;
    }

    private static Map<String, Object> conn(String from, String to) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", end(from));
        m.put("to", end(to));
        return m;
    }

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> m = el(id, "connector");
        m.put("connector", conn(from, to));
        return m;
    }

    @SafeVarargs
    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    private static Map<String, Object> set(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static List<String> kinds(List<BoardOp> ops) {
        return ops.stream().map(o -> o.getKind() + ":" + o.getElementId()).toList();
    }

    @Test
    void latePatchForDeletedElementIsDropped() {
        // Review Focus 3: người khác vừa xoá element, patch text đến muộn thì bỏ im lặng
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("GONE", set("text", "hi"))),
                board(el("A", "sticky")), id -> {
                    throw new AssertionError("không được hỏi version của element đã mất");
                });
        assertTrue(ops.isEmpty());
    }

    @Test
    void deleteOfMissingElementIsDropped() {
        assertTrue(CommitPlanner.plan(List.of(Intent.delete("GONE")), board(el("A", "sticky")), NO_HISTORY).isEmpty());
    }

    @Test
    void duplicateCreateIsDropped() {
        assertTrue(CommitPlanner.plan(List.of(Intent.create(el("A", "sticky"))), board(el("A", "sticky")), NO_HISTORY)
                .isEmpty());
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky")), Intent.create(el("N", "sticky"))),
                board(), NO_HISTORY);
        assertEquals(List.of("create:N"), kinds(ops));
    }

    @Test
    void createThenPatchFoldsIntoCreate() {
        Map<String, Object> n = el("N", "sticky");
        n.put("text", "a");
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(n), Intent.patch("N", set("x", 50.0, "text", "b"))),
                board(), NO_HISTORY);
        assertEquals(List.of("create:N"), kinds(ops));
        BoardOp op = ops.get(0);
        assertNull(op.getBefore());
        assertEquals(50.0, op.getAfter().get("x"));
        assertEquals("b", op.getAfter().get("text"));
        assertEquals(1L, op.getV());
        assertEquals(1L, op.getAfter().get("version"));
        assertEquals(SEQ, op.getFsAfter().get("x"));
        assertEquals(SEQ, op.getFsAfter().get("text"));
        assertFalse(op.getFsAfter().containsKey("style"));
        assertEquals(op.getFsAfter(), op.getAfter().get("fieldSeq"));
        assertTrue(op.getFsBefore().isEmpty());
        assertEquals(0.0, n.get("x"), "không được sửa map của intent");
    }

    @Test
    void patchThenPatchMergesIntoOnePatch() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 10.0);
        a.put("version", 4L);
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 7L)));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 20.0)),
                Intent.patch("A", set("x", 30.0, "y", 5.0))), board(a), NO_HISTORY);
        assertEquals(List.of("patch:A"), kinds(ops));
        BoardOp op = ops.get(0);
        assertEquals(Map.of("x", 10.0, "y", 0.0), op.getBefore());
        assertEquals(Map.of("x", 30.0, "y", 5.0), op.getAfter());
        assertEquals(Map.of("x", 7L, "y", 0L), op.getFsBefore());
        assertEquals(Map.of("x", SEQ, "y", SEQ), op.getFsAfter());
        assertEquals(5L, op.getV());
    }

    @Test
    void patchThenDeleteBecomesDelete() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 20.0)), Intent.delete("A")),
                board(el("A", "sticky")), NO_HISTORY);
        assertEquals(List.of("delete:A"), kinds(ops));
        assertEquals(0.0, ops.get(0).getBefore().get("x"));
        assertEquals(1L, ops.get(0).getV());
    }

    @Test
    void createThenDeleteCancelsOut() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky")), Intent.delete("N"),
                Intent.patch("N", set("x", 1.0))), board(), NO_HISTORY);
        assertTrue(ops.isEmpty());
    }

    @Test
    void deleteKeepsFullElementIncludingImage() {
        Map<String, Object> img = el("I", "image");
        img.put("image", new LinkedHashMap<>(Map.of("url", "https://x/a.png", "cloudinaryId", "cid", "alt", "a")));
        img.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 11L)));
        img.put("version", 6L);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("I")), board(img), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals("delete", op.getKind());
        assertEquals(img, op.getBefore());
        assertEquals(Map.of("url", "https://x/a.png", "cloudinaryId", "cid", "alt", "a"), op.getBefore().get("image"));
        assertNull(op.getAfter());
        assertEquals(Map.of("x", 11L), op.getFsBefore());
        assertTrue(op.getFsAfter().isEmpty());
        assertEquals(6L, op.getV());
    }

    @Test
    void cascadeDeletesAttachedConnectorsOnce() {
        Map<String, Map<String, Object>> b = board(el("A", "sticky"), el("B", "sticky"), connector("C", "A", "B"));
        assertEquals(List.of("delete:A", "delete:B", "delete:C"),
                kinds(CommitPlanner.plan(List.of(Intent.delete("A"), Intent.delete("B")), b, NO_HISTORY)));
        assertEquals(List.of("delete:C", "delete:A", "delete:B"),
                kinds(CommitPlanner.plan(List.of(Intent.delete("C"), Intent.delete("A"), Intent.delete("B")), b, NO_HISTORY)));
    }

    @Test
    void cascadeUsesPostPatchStateRepointAway() {
        // C đang nối E→F, batch đổi sang E→G rồi xoá F: C không bị xoá
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), el("G", "sticky"),
                connector("C", "E", "F"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("C", set("connector", conn("E", "G"))),
                Intent.delete("F")), b, NO_HISTORY);
        assertEquals(List.of("patch:C", "delete:F"), kinds(ops));
    }

    @Test
    void cascadeUsesPostPatchStateRepointOnto() {
        // C đang nối E→G, batch đổi sang E→F rồi xoá F: C bị cascade, patch của C bị bỏ
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), el("G", "sticky"),
                connector("C", "E", "G"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("C", set("connector", conn("E", "F"))),
                Intent.delete("F")), b, NO_HISTORY);
        assertEquals(List.of("delete:C", "delete:F"), kinds(ops));
    }

    @Test
    void connectorToElementCreatedInSameBatchIsAllowed() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(connector("K", "N", "E")),
                Intent.create(el("N", "sticky"))), board(el("E", "sticky")), NO_HISTORY);
        assertEquals(List.of("create:N", "create:K"), kinds(ops));
    }

    @Test
    void invalidConnectorEndThrows() {
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), connector("C", "E", "F"));
        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "X"))), b, NO_HISTORY));
        assertEquals("connector end not found on this board", missing.getMessage());
        // đầu trỏ tới element bị xoá cùng batch
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "F")), Intent.delete("F")), b, NO_HISTORY));
        // đầu là connector
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "C"))), b, NO_HISTORY));
        // patch connector trỏ tới id không có
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.patch("C", set("connector", conn("E", "X")))), b, NO_HISTORY));
    }

    @Test
    void opsFollowFixedOrder() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("D"), Intent.create(connector("K", "E", "N")),
                        Intent.patch("E", set("x", 5.0)), Intent.create(el("N", "sticky"))),
                board(el("E", "sticky"), el("D", "sticky")), NO_HISTORY);
        assertEquals(List.of("create:N", "patch:E", "create:K", "delete:D"), kinds(ops));
    }

    @Test
    void recreateKeepsFieldSeqAndVersionNeverDecreases() {
        // undo-delete: element mang fieldSeq cũ, op mới nhất trên A có v = 7
        Map<String, Object> a = el("A", "sticky");
        a.put("text", "hi");
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 12L, "text", 15L)));
        a.put("version", 3L);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(a)), board(), id -> "A".equals(id) ? 7L : 0L);
        BoardOp op = ops.get(0);
        assertEquals("create", op.getKind());
        assertEquals(8L, op.getV());
        assertEquals(8L, op.getAfter().get("version"));
        assertEquals(Map.of("x", 12L, "text", 15L), op.getFsAfter());
        assertEquals(Map.of("x", 12L, "text", 15L), op.getAfter().get("fieldSeq"));
    }

    @Test
    void freshCreateStampsSeqOnNonNullKeys() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky"))), board(), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals(1L, op.getV());
        assertEquals(Set.of("x", "y", "w", "h", "rotation", "z"), op.getFsAfter().keySet());
        op.getFsAfter().values().forEach(v -> assertEquals(SEQ, v));
    }

    @Test
    void fsOverrideIsHonored() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 100.0);
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 12L)));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 0.0, "y", 3.0), Map.of("x", 3L))),
                board(a), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals(Map.of("x", 3L, "y", SEQ), op.getFsAfter());
        assertEquals(Map.of("x", 12L, "y", 0L), op.getFsBefore());
        assertEquals(Map.of("x", 100.0, "y", 0.0), op.getBefore());
    }

    @Test
    void patchWithUnchangedValueStillProducesOp() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 10.0);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 10.0))), board(a), NO_HISTORY);
        assertEquals(List.of("patch:A"), kinds(ops));
        assertEquals(Map.of("x", 10.0), ops.get(0).getBefore());
        assertEquals(Map.of("x", 10.0), ops.get(0).getAfter());
        assertEquals(2L, ops.get(0).getV());
    }

    @Test
    void deleteThenCreateSameIdReplacesWithoutCascade() {
        // restore đổi type/image (Review Focus 5): diff sinh delete + create cùng id
        Map<String, Object> e = el("E", "sticky");
        e.put("version", 3L);
        Map<String, Object> img = el("E", "image");
        img.put("image", new LinkedHashMap<>(Map.of("url", "https://x/a.png")));
        Map<String, Map<String, Object>> b = board(e, el("F", "sticky"), connector("C", "E", "F"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("E"), Intent.create(img)), b, id -> 3L);
        assertEquals(List.of("delete:E", "create:E"), kinds(ops));
        assertEquals(3L, ops.get(0).getV());
        assertEquals(4L, ops.get(1).getV());
        assertEquals(Map.of("url", "https://x/a.png"), ops.get(1).getAfter().get("image"));
    }
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='CommitPlannerTest'
```
Expected: FAIL at `testCompile` with `cannot find symbol ... symbol: variable CommitPlanner` (or `class CommitPlanner`) in `CommitPlannerTest.java`. If the error names `Intent`, `ElementKeys` or `BoardOp` instead, Task 1 or Task 2 is not done yet. Stop and finish those tasks first.

- [ ] **Step 3: Write the minimal implementation**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/CommitPlanner.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;

import java.util.*;
import java.util.function.Function;

// Chuẩn hoá batch intent theo trạng thái board lúc giữ lock và sinh op (spec §6.3 bước 2-7), không đọc DB
public final class CommitPlanner {
    // fsAfter mang giá trị này nghĩa là "seq của chính op", writer thay khi cấp seq
    public static final long SEQ = -1L;

    private CommitPlanner() {
    }

    // Intent sau khi gộp theo elementId. kind: create | replace | patch | delete
    private static final class Folded {
        String kind;
        Map<String, Object> element;
        Map<String, Object> set;
        Map<String, Long> fs = new HashMap<>();
        Set<String> patchedKeys = new LinkedHashSet<>();
        boolean recreate;
    }

    public static List<BoardOp> plan(List<Intent> intents, Map<String, Map<String, Object>> board,
                                     Function<String, Long> lastVersion) {
        Map<String, Folded> folded = new LinkedHashMap<>();
        for (Intent in : intents) fold(folded, in, board);
        cascade(folded, board);
        checkConnectorEnds(folded, board);
        return build(folded, board, lastVersion);
    }

    private static void fold(Map<String, Folded> folded, Intent in, Map<String, Map<String, Object>> board) {
        String id = in.elementId();
        if (id == null) throw new IllegalArgumentException("element id required");
        Folded cur = folded.get(id);
        boolean onBoard = board.containsKey(id);
        switch (in.kind()) {
            case "create" -> {
                if (cur == null && !onBoard) folded.put(id, createOf(in, "create"));
                    // xoá rồi tạo lại cùng id trong batch (restore đổi type/image): thay thế
                else if (cur != null && "delete".equals(cur.kind) && onBoard) folded.put(id, createOf(in, "replace"));
                // còn lại: id đã tồn tại hoặc create trùng trong batch -> bỏ
            }
            case "patch" -> {
                if (cur == null) {
                    // element đã bị xoá (có thể bởi người khác): bỏ im lặng
                    if (!onBoard) return;
                    Folded f = new Folded();
                    f.kind = "patch";
                    f.set = new LinkedHashMap<>();
                    mergeSet(f, in);
                    folded.put(id, f);
                } else if (!"delete".equals(cur.kind)) {
                    mergeSet(cur, in);
                }
            }
            case "delete" -> {
                if (cur == null) {
                    if (onBoard) folded.put(id, deleteOf());
                } else if ("create".equals(cur.kind)) {
                    // create + delete trong cùng batch triệt tiêu
                    folded.remove(id);
                } else if (!"delete".equals(cur.kind)) {
                    folded.put(id, deleteOf());
                }
            }
            default -> throw new IllegalArgumentException("unknown intent kind: " + in.kind());
        }
    }

    private static Folded createOf(Intent in, String kind) {
        Folded f = new Folded();
        f.kind = kind;
        f.element = new LinkedHashMap<>(in.element());
        // create mang sẵn fieldSeq = tạo lại từ undo/redo/restore, giữ nguyên "dấu"
        f.recreate = in.fsOverride() == null && in.element().get("fieldSeq") instanceof Map<?, ?> m && !m.isEmpty();
        return f;
    }

    private static Folded deleteOf() {
        Folded f = new Folded();
        f.kind = "delete";
        return f;
    }

    private static void mergeSet(Folded f, Intent in) {
        boolean isPatch = "patch".equals(f.kind);
        Map<String, Object> target = isPatch ? f.set : f.element;
        in.set().forEach((k, v) -> {
            target.put(k, v);
            if (!isPatch) f.patchedKeys.add(k);
            Long ov = in.fsOverride() == null ? null : in.fsOverride().get(k);
            if (ov != null) f.fs.put(k, ov);
            else f.fs.remove(k);
        });
    }

    // Cascade tính trên trạng thái sau khi áp patch connector của batch
    private static void cascade(Map<String, Folded> folded, Map<String, Map<String, Object>> board) {
        Set<String> gone = new HashSet<>();
        folded.forEach((id, f) -> {
            if ("delete".equals(f.kind)) gone.add(id);
        });
        if (gone.isEmpty()) return;
        List<String> extra = new ArrayList<>();
        board.forEach((id, el) -> {
            if (!ElementKeys.isConnector(el)) return;
            Folded f = folded.get(id);
            if (f != null && !"patch".equals(f.kind)) return;
            Object connector = f != null && f.set.containsKey("connector") ? f.set.get("connector") : el.get("connector");
            if (ElementKeys.connectorEnds(asMap(connector)).stream().anyMatch(gone::contains)) extra.add(id);
        });
        extra.forEach(id -> folded.put(id, deleteOf()));
    }

    // Hai đầu phải là non-connector còn tồn tại sau batch: (hiện có - bị xoá) ∪ (non-connector được tạo trong batch)
    private static void checkConnectorEnds(Map<String, Folded> folded, Map<String, Map<String, Object>> board) {
        Set<String> targets = new HashSet<>();
        board.forEach((id, el) -> {
            Folded f = folded.get(id);
            if ((f == null || "patch".equals(f.kind)) && !ElementKeys.isConnector(el)) targets.add(id);
        });
        folded.forEach((id, f) -> {
            if (f.element != null && !ElementKeys.isConnector(f.element)) targets.add(id);
        });
        folded.forEach((id, f) -> {
            Object connector = null;
            if (f.element != null && ElementKeys.isConnector(f.element)) connector = f.element.get("connector");
            else if (f.set != null) connector = f.set.get("connector");
            for (String end : ElementKeys.connectorEnds(asMap(connector)))
                if (!targets.contains(end)) throw new IllegalArgumentException("connector end not found on this board");
        });
    }

    // Thứ tự cố định: create non-connector -> patch -> create connector -> delete
    private static List<BoardOp> build(Map<String, Folded> folded, Map<String, Map<String, Object>> board,
                                       Function<String, Long> lastVersion) {
        List<BoardOp> replaced = new ArrayList<>();
        List<BoardOp> creates = new ArrayList<>();
        List<BoardOp> patches = new ArrayList<>();
        List<BoardOp> connectors = new ArrayList<>();
        List<BoardOp> deletes = new ArrayList<>();
        folded.forEach((id, f) -> {
            Map<String, Object> cur = board.get(id);
            switch (f.kind) {
                case "create", "replace" -> {
                    // thay thế: phải xoá bản cũ trước khi tạo lại cùng id
                    if ("replace".equals(f.kind)) replaced.add(deleteOp(id, cur));
                    BoardOp op = createOp(id, f, cur, lastVersion);
                    (ElementKeys.isConnector(f.element) ? connectors : creates).add(op);
                }
                case "patch" -> patches.add(patchOp(id, f, cur));
                default -> deletes.add(deleteOp(id, cur));
            }
        });
        List<BoardOp> out = new ArrayList<>(replaced);
        out.addAll(creates);
        out.addAll(patches);
        out.addAll(connectors);
        out.addAll(deletes);
        return out;
    }

    private static BoardOp createOp(String id, Folded f, Map<String, Object> cur, Function<String, Long> lastVersion) {
        Map<String, Long> fsAfter = new LinkedHashMap<>();
        if (f.recreate) fsAfter.putAll(asLongMap(f.element.get("fieldSeq")));
        else for (String k : ElementKeys.K) if (f.element.get(k) != null) fsAfter.put(k, SEQ);
        for (String k : f.patchedKeys) fsAfter.put(k, f.fs.getOrDefault(k, SEQ));
        Long last = lastVersion.apply(id);
        long base = last == null ? 0L : last;
        if (cur != null) base = Math.max(base, version(cur));
        // tạo lại id cũ: version tiếp nối, không bao giờ giảm
        long v = base + 1;
        Map<String, Object> after = new LinkedHashMap<>(f.element);
        after.put("fieldSeq", new LinkedHashMap<>(fsAfter));
        after.put("version", v);
        return op("create", id, null, after, new LinkedHashMap<>(), fsAfter, v);
    }

    private static BoardOp patchOp(String id, Folded f, Map<String, Object> cur) {
        Map<String, Object> before = new LinkedHashMap<>();
        Map<String, Object> after = new LinkedHashMap<>();
        Map<String, Long> fsBefore = new LinkedHashMap<>();
        Map<String, Long> fsAfter = new LinkedHashMap<>();
        Map<String, Long> curFs = asLongMap(cur.get("fieldSeq"));
        f.set.forEach((k, val) -> {
            before.put(k, cur.get(k));
            after.put(k, val);
            fsBefore.put(k, curFs.getOrDefault(k, 0L));
            fsAfter.put(k, f.fs.getOrDefault(k, SEQ));
        });
        return op("patch", id, before, after, fsBefore, fsAfter, version(cur) + 1);
    }

    private static BoardOp deleteOp(String id, Map<String, Object> cur) {
        return op("delete", id, new LinkedHashMap<>(cur), null, asLongMap(cur.get("fieldSeq")), new LinkedHashMap<>(),
                version(cur));
    }

    private static BoardOp op(String kind, String id, Map<String, Object> before, Map<String, Object> after,
                              Map<String, Long> fsBefore, Map<String, Long> fsAfter, long v) {
        BoardOp op = new BoardOp();
        op.setKind(kind);
        op.setElementId(id);
        op.setBefore(before);
        op.setAfter(after);
        op.setFsBefore(fsBefore);
        op.setFsAfter(fsAfter);
        op.setV(v);
        return op;
    }

    private static long version(Map<String, Object> el) {
        return el.get("version") instanceof Number n ? n.longValue() : 0L;
    }

    private static Map<String, Long> asLongMap(Object o) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (o instanceof Map<?, ?> m)
            m.forEach((k, v) -> {
                if (v instanceof Number n) out.put(String.valueOf(k), n.longValue());
            });
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map<?, ?> ? (Map<String, Object>) o : null;
    }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='CommitPlannerTest'
```
Expected: exit code 0 and no `[ERROR]` lines. `target/surefire-reports/com.example.ie213backend.service.history.CommitPlannerTest.txt` shows `Tests run: 19, Failures: 0, Errors: 0, Skipped: 0`.

- [ ] **Step 5: Checkpoint (gate)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='CommitPlannerTest'
cat target/surefire-reports/com.example.ie213backend.service.history.CommitPlannerTest.txt
```
Expected: both Maven commands exit 0, and the report shows `Tests run: 19, Failures: 0, Errors: 0, Skipped: 0`. Report the results. Do NOT commit.

---

### Task 6: BoardLocks, ElementWriter, BatchPublisher, BatchEvent

Implements spec §6.1-6.7: the per-board lock, the single write path (`ElementWriter`: roll-forward, snapshot 0 + counter, plan, seq allocation, mergeKey, WAL, apply, post-commit, broadcast) and the broadcast seam.

**Out of scope (explicit):** §6.3 step 14 (snapshot every 200 seq). Task 6 does **not** reference `SnapshotJob` anywhere. Task 9 creates `SnapshotJob` and adds the one-line call (`snapshotJob.maybeSnapshot(boardId, prevSeqTo, seqTo)`) to `ElementWriter.doCommit` right after the broadcast. Wiring `ElementWriter` into `BoardElementService` / `TemplateServiceImpl` / the socket controller is Task 7.

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/BoardLocks.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/BatchEvent.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/BatchPublisher.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/StompBatchPublisher.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementWriter.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/BoardLocksTest.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/StompBatchPublisherTest.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementWriterEventOpsTest.java`
- Test: `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementWriterIT.java` (Mongo, env-gated)
- No existing file is modified. Style references read from disk:
  - `service/element/BoardElementService.java:19-24` (`@Service @RequiredArgsConstructor`, `private final MongoTemplate mongo`) and `:108-110` (`toOid`: hex → `ObjectId`, used for `_id`/`boardId` queries). `ElementWriter` copies that helper as a private `oid()` because `BoardElementService.toOid` is package-private in `service.element`.
  - `controller/BoardElementSocketController.java:42-49` (message built as a `HashMap`, sent with `messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", message)`). `StompBatchPublisher` follows it; a `HashMap` is required because `senderSessionId` may be null.
  - `config/socket/WebSocketConfig.java:26,30` (`enableSimpleBroker`, `setPreservePublishOrder(true)`): the broker is in-process, so publishing inside the lock keeps message order = seq order (§6.3 step 13).
  - `service/element/ElementPatches.java:56-57` (`$inc version`, `currentDate updateAt`). The writer uses `$set version = v` instead (§6.3 step 11, idempotent roll-forward) and keeps `currentDate updateAt`.
  - Tests follow `BoardElementServiceTest.java` / `BoardElementSocketControllerTest.java` (JUnit 5, `static org.junit.jupiter.api.Assertions.*`, Mockito `mock(...)`, short Vietnamese messages).

**Interfaces:**
- Consumes (earlier tasks, via the contract only):
  - Task 1: `BoardOp`, `BoardTx` (+ `BoardTx.Pending/Prev/Summary` all-args constructors), `BoardCounter`, `BoardSnapshot` (Lombok `@Data` getters/setters), `BoardElement.getFieldSeq()/setFieldSeq(Map<String,Long>)`.
  - Task 2: `ElementKeys.K`, `ElementKeys.isConnector(Map)`, `ElementKeys.connectorEnds(Map)`, `ElementNormalizer.full(BoardElement)`, `ElementNormalizer.normalizeSet(Map)`, `ElementNormalizer.toElement(Map)`, `ElementNormalizer.same(Object,Object)`, `Intent.create(Map)`, `Intent.patch(String,Map)`, `Intent.delete(String)`, `Intent.kind()/elementId()`.
  - Task 3: `HistoryMath.replay(Map<String,Map<String,Object>>, List<BoardOp>)` (IT invariant only).
  - Task 5: `CommitPlanner.plan(List<Intent>, Map<String,Map<String,Object>>, Function<String,Long>)`, `CommitPlanner.SEQ`.
- Produces (exact contract):
  - `@Component public class BoardLocks { public <T> T withLock(String boardId, java.util.function.Supplier<T> fn); public boolean isHeldByCurrentThread(String boardId); }`
  - `public record BatchEvent(String txId, String source, long seqFrom, long seqTo, String senderSessionId, String userId, List<Map<String,Object>> ops) {}`
  - `public interface BatchPublisher { void publish(String boardId, BatchEvent event); }`
  - `@Component public class StompBatchPublisher implements BatchPublisher` (constructor `StompBatchPublisher(SimpMessagingTemplate)`)
  - `@Service public class ElementWriter` with constructor `ElementWriter(MongoTemplate mongo, BoardLocks locks, BatchPublisher publisher)` (Lombok, field order) and:
    - `public record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents, String mergeKey, String target) {}`
    - `public record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops) { public static final CommitResult EMPTY; public boolean isEmpty(); }`
    - `public <T> T withLock(String boardId, Supplier<T> fn)`, `public CommitResult commit(CommitRequest req)`, `public Map<String,Map<String,Object>> loadBoard(String boardId)`, `public long committedSeq(String boardId)`, `public List<BoardOp> opsOfTx(String boardId, String txId)`, `public List<BoardOp> laterOps(String boardId, String elementId, long afterSeq)`
    - package-private `Runnable afterWalHook = () -> {};` and (addition, see CONTRACT ISSUES) package-private `Clock clock = Clock.systemUTC();`
    - package-private `static List<Map<String,Object>> eventOps(List<BoardOp> ops)` (internal helper, unit-tested)

**Assumptions (not verifiable until Tasks 1-5 exist; flagged, not facts):**
- `Intent.kind()` is one of the literals `"create" | "patch" | "delete"` and `Intent.create(full).elementId()` equals `full.get("id")`.
- `CommitPlanner.plan` returns ops with `fsAfter` non-null for create/patch, patch `after` holds only K keys, and every `BoardOp.kind` is one of the three literals.
- `BoardTx.Pending/Prev/Summary` are `public static` (the contract omits modifiers; `ElementWriter` lives in another package).
- Spring Data MongoDB is 4.4.x (found `~/.m2/repository/org/springframework/data/spring-data-mongodb/4.4.3`; `IndexOperations.ensureIndex`, `Update.max`, `Update.setOnInsert` verified in that jar).

- [ ] **Step 1: Write the failing `BoardLocksTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/BoardLocksTest.java`:

```java
package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class BoardLocksTest {
    BoardLocks locks = new BoardLocks();

    @Test
    void reentrantOnSameThread() {
        assertFalse(locks.isHeldByCurrentThread("b"));
        boolean inner = locks.withLock("b", () -> locks.withLock("b", () -> locks.isHeldByCurrentThread("b")));
        assertTrue(inner, "lồng withLock cùng thread không được tự chặn");
        assertFalse(locks.isHeldByCurrentThread("b"), "unlock đủ số lần sau khi thoát");
    }

    @Test
    void releasesLockWhenFnThrows() {
        assertThrows(IllegalStateException.class, () -> locks.withLock("b", () -> {
            throw new IllegalStateException("boom");
        }));
        assertFalse(locks.isHeldByCurrentThread("b"));
        assertEquals(1, locks.withLock("b", () -> 1));
    }

    @Test
    void otherThreadHoldingLockGives503AfterTimeout() throws Exception {
        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        Thread holder = new Thread(() -> locks.withLock("b", () -> {
            held.countDown();
            try {
                release.await(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return null;
        }));
        holder.start();
        assertTrue(held.await(5, TimeUnit.SECONDS));

        long start = System.nanoTime();
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> locks.withLock("b", () -> 1));
        long waitedMs = (System.nanoTime() - start) / 1_000_000;
        assertEquals(503, ex.getStatusCode().value());
        assertEquals("board busy", ex.getReason());
        assertTrue(waitedMs >= 1900, "phải chờ ~2s trước khi bỏ cuộc, waited " + waitedMs);
        assertFalse(locks.isHeldByCurrentThread("b"));
        assertEquals(2, locks.withLock("other", () -> 2), "board khác không bị chặn");

        release.countDown();
        holder.join(5000);
        assertEquals(3, locks.withLock("b", () -> 3));
    }
}
```

- [ ] **Step 2: Run it, expect FAIL (compile)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardLocksTest'
```

Expected: BUILD FAILURE in `testCompile` with `cannot find symbol ... class BoardLocks` (the class does not exist yet).

- [ ] **Step 3: Implement `BoardLocks`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/BoardLocks.java`:

```java
package com.example.ie213backend.service.history;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

// Khóa ghi theo board trong JVM (chỉ đúng khi chạy một instance)
@Component
public class BoardLocks {
    private static final long TIMEOUT_SECONDS = 2;

    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T withLock(String boardId, Supplier<T> fn) {
        ReentrantLock lock = locks.computeIfAbsent(boardId, k -> new ReentrantLock());
        boolean acquired;
        try {
            acquired = lock.tryLock(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            acquired = false;
        }
        if (!acquired) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "board busy");
        try {
            return fn.get();
        } finally {
            lock.unlock();
        }
    }

    public boolean isHeldByCurrentThread(String boardId) {
        ReentrantLock lock = locks.get(boardId);
        return lock != null && lock.isHeldByCurrentThread();
    }
}
```

- [ ] **Step 4: Run it, expect PASS**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardLocksTest'
```

Expected: exit code 0, no output (`-q`); `target/surefire-reports/com.example.ie213backend.service.history.BoardLocksTest.txt` shows `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0` (the run takes ~2 s because of the timeout test).

- [ ] **Step 5: Add `BatchEvent`, `BatchPublisher` and the failing `StompBatchPublisherTest`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/BatchEvent.java`:

```java
package com.example.ie213backend.service.history;

import java.util.List;
import java.util.Map;

// Một commit của writer = một message batch; seqFrom/seqTo là dải của commit này (không phải của tx đã merge)
// ops: {op:"create",elements:[full]} | {op:"patch",patches:[{id,set,version}]} | {op:"delete",ids:[..]}
public record BatchEvent(String txId, String source, long seqFrom, long seqTo, String senderSessionId, String userId,
                         List<Map<String, Object>> ops) {
}
```

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/BatchPublisher.java`:

```java
package com.example.ie213backend.service.history;

// Seam broadcast để test thay bằng fake
public interface BatchPublisher {
    void publish(String boardId, BatchEvent event);
}
```

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/StompBatchPublisherTest.java`:

```java
package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StompBatchPublisherTest {
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    StompBatchPublisher publisher = new StompBatchPublisher(messaging);

    @Test
    @SuppressWarnings("unchecked")
    void sendsBatchMessageToElementTopic() {
        List<Map<String, Object>> ops = List.of(Map.of("op", "delete", "ids", List.of("e1")));
        publisher.publish("b1", new BatchEvent("t1", "undo", 5, 6, null, "u1", ops));

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq("/topic/board/b1/el"), captor.capture());
        Map<String, Object> msg = (Map<String, Object>) captor.getValue();
        assertEquals("batch", msg.get("op"));
        assertEquals("t1", msg.get("txId"));
        assertEquals("undo", msg.get("source"));
        assertEquals(5L, msg.get("seqFrom"));
        assertEquals(6L, msg.get("seqTo"));
        assertTrue(msg.containsKey("senderSessionId"), "senderSessionId luôn có mặt, kể cả null");
        assertNull(msg.get("senderSessionId"));
        assertEquals("u1", msg.get("userId"));
        assertEquals(ops, msg.get("ops"));
        assertEquals(8, msg.size());
    }
}
```

- [ ] **Step 6: Run it, expect FAIL (compile)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='StompBatchPublisherTest'
```

Expected: BUILD FAILURE in `testCompile` with `cannot find symbol ... class StompBatchPublisher`.

- [ ] **Step 7: Implement `StompBatchPublisher`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/StompBatchPublisher.java`:

```java
package com.example.ie213backend.service.history;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

// Phát batch lên cùng topic element như BoardElementSocketController.send
@Component
@RequiredArgsConstructor
public class StompBatchPublisher implements BatchPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publish(String boardId, BatchEvent event) {
        // HashMap vì senderSessionId có thể null
        Map<String, Object> message = new HashMap<>();
        message.put("op", "batch");
        message.put("txId", event.txId());
        message.put("source", event.source());
        message.put("seqFrom", event.seqFrom());
        message.put("seqTo", event.seqTo());
        message.put("senderSessionId", event.senderSessionId());
        message.put("userId", event.userId());
        message.put("ops", event.ops());
        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", message);
    }
}
```

- [ ] **Step 8: Run it, expect PASS**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='StompBatchPublisherTest'
```

Expected: exit code 0; surefire report `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0`.

- [ ] **Step 9: Write the failing pure test `ElementWriterEventOpsTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementWriterEventOpsTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElementWriterEventOpsTest {
    private BoardOp op(String kind, String id, Map<String, Object> after, long v) {
        BoardOp op = new BoardOp();
        op.setKind(kind);
        op.setElementId(id);
        op.setAfter(after);
        op.setV(v);
        return op;
    }

    @Test
    void groupsConsecutiveSameKindOpsInOrder() {
        Map<String, Object> a = Map.of("id", "a", "type", "shape");
        Map<String, Object> b = Map.of("id", "b", "type", "shape");
        Map<String, Object> conn = Map.of("id", "conn", "type", "connector");
        List<BoardOp> ops = List.of(
                op("create", "a", a, 1),
                op("create", "b", b, 1),
                op("patch", "c", Map.of("x", 5.0), 4),
                op("patch", "d", Map.of("text", "hi"), 2),
                op("create", "conn", conn, 1),
                op("delete", "e", null, 3),
                op("delete", "f", null, 1));

        List<Map<String, Object>> out = ElementWriter.eventOps(ops);

        assertEquals(List.of("create", "patch", "create", "delete"), out.stream().map(g -> g.get("op")).toList());
        assertEquals(List.of(a, b), out.get(0).get("elements"));
        assertEquals(List.of(
                Map.of("id", "c", "set", Map.of("x", 5.0), "version", 4L),
                Map.of("id", "d", "set", Map.of("text", "hi"), "version", 2L)), out.get(1).get("patches"));
        assertEquals(List.of(conn), out.get(2).get("elements"), "create connector không gộp với create đầu vì bị patch chen giữa");
        assertEquals(List.of("e", "f"), out.get(3).get("ids"));
    }

    @Test
    void emptyOpsGiveEmptyList() {
        assertTrue(ElementWriter.eventOps(List.of()).isEmpty());
    }
}
```

- [ ] **Step 10: Write the failing Mongo integration test `ElementWriterIT`**

Covers Review Focus 1 (2 threads × 100 patches, contiguous seqs, invariant), Review Focus 4 (legacy board without counter → snapshot 0 + counter, fs defaults to 0), the crash-after-WAL roll-forward on a cascading delete, sliding mergeKey merge, snapshot-0 partial-failure idempotency, post-commit state transitions, broadcast seq range per commit, and the empty commit (no tx, no broadcast).

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/ElementWriterIT.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.LongStream;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

// Chạy với Mongo local: MONGO_IT_URI=mongodb://localhost:27017
@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class ElementWriterIT {
    static final List<String> COMPARED = Stream.concat(Stream.of("type", "image"), ElementKeys.K.stream()).toList();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();
    final String board = new ObjectId().toHexString();

    static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }
    }

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        // MongoTemplate dựng tay không tự tạo index: tạo unique (boardId, seq) để trùng seq là lỗi thật
        mongo.indexOps(BoardOp.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());
        writer = new ElementWriter(mongo, new BoardLocks(), (boardId, ev) -> events.add(ev));
    }

    @AfterEach
    void tearDown() {
        mongo.getDb().drop();
        client.close();
    }

    // ---- helpers ----

    private BoardElement element(String type) {
        BoardElement e = new BoardElement();
        e.setId(new ObjectId().toHexString());
        e.setBoardId(board);
        e.setType(type);
        e.setW(100);
        e.setH(80);
        e.setOwner(new ObjectId().toHexString());
        e.setVersion(1L);
        return e;
    }

    // element "legacy": ghi thẳng, không có fieldSeq
    private BoardElement seed(BoardElement e) {
        return mongo.insert(e);
    }

    private ElementWriter.CommitResult patch(String user, String id, Map<String, Object> set, String mergeKey) {
        return writer.commit(new ElementWriter.CommitRequest(board, user, "s-" + user, "user",
                List.of(Intent.patch(id, ElementNormalizer.normalizeSet(set))), mergeKey, null));
    }

    private Query byBoard() {
        return Query.query(Criteria.where("boardId").is(new ObjectId(board)));
    }

    private List<BoardOp> ops() {
        return mongo.find(byBoard().with(Sort.by("seq")), BoardOp.class);
    }

    private List<BoardTx> txs() {
        return mongo.find(byBoard().with(Sort.by("seqTo")), BoardTx.class);
    }

    private List<BoardSnapshot> snapshots() {
        return mongo.find(byBoard(), BoardSnapshot.class);
    }

    private BoardCounter counter() {
        return mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(board))), BoardCounter.class);
    }

    private BoardTx tx(String id) {
        return mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(id))), BoardTx.class);
    }

    private BoardElement live(String id) {
        return mongo.findById(id, BoardElement.class);
    }

    private String seedTx(String user, String state) {
        BoardTx t = new BoardTx();
        t.setId(new ObjectId().toHexString());
        t.setBoardId(board);
        t.setUserId(user);
        t.setTs(Instant.now());
        t.setSource("user");
        t.setState(state);
        t.setSummary(new BoardTx.Summary(0, 1, 0));
        mongo.insert(t);
        return t.getId();
    }

    // Invariant §8.2: replay(snapshot 0 + mọi op) == boardElements trên id, type, image và K
    private void assertInvariant() {
        BoardSnapshot snap0 = mongo.findOne(Query.query(Criteria.where("boardId").is(new ObjectId(board))
                .and("seq").is(0L)), BoardSnapshot.class);
        assertNotNull(snap0, "phải có snapshot 0");
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        snap0.getElements().forEach(e -> base.put((String) e.get("id"), e));
        Map<String, Map<String, Object>> replayed = HistoryMath.replay(base, ops());
        Map<String, Map<String, Object>> current = writer.loadBoard(board);
        assertEquals(current.keySet(), replayed.keySet());
        current.forEach((id, el) -> COMPARED.forEach(k -> assertTrue(
                ElementNormalizer.same(el.get(k), replayed.get(id).get(k)),
                id + "." + k + ": " + el.get(k) + " vs " + replayed.get(id).get(k))));
    }

    @SuppressWarnings("unchecked")
    private void assertNoDanglingConnector() {
        Map<String, Map<String, Object>> current = writer.loadBoard(board);
        current.values().stream().filter(ElementKeys::isConnector).forEach(conn -> {
            for (String end : ElementKeys.connectorEnds((Map<String, Object>) conn.get("connector")))
                assertTrue(current.containsKey(end), "connector " + conn.get("id") + " trỏ tới " + end + " không tồn tại");
        });
    }

    // ---- tests ----

    @Test
    void firstCommitOnLegacyBoardCreatesSnapshotZeroAndCounter() {
        BoardElement a = element("sticky");
        a.setVersion(3L);
        seed(a);
        seed(element("sticky"));
        assertNull(counter());
        assertEquals(0, writer.committedSeq(board), "chưa có counter thì committedSeq = 0");

        ElementWriter.CommitResult r = patch("u1", a.getId(), Map.of("x", 50), null);

        assertEquals(1, r.seqFrom());
        assertEquals(1, r.seqTo());
        assertEquals(1, counter().getSeq());
        assertEquals(1, counter().getCommittedSeq());
        assertEquals(1, writer.committedSeq(board));
        List<BoardSnapshot> snaps = snapshots();
        assertEquals(1, snaps.size());
        assertEquals(0, snaps.get(0).getSeq());
        assertEquals(2, snaps.get(0).getElements().size());
        Map<String, Object> snapA = snaps.get(0).getElements().stream()
                .filter(e -> a.getId().equals(e.get("id"))).findFirst().orElseThrow();
        assertTrue(ElementNormalizer.same(0.0, snapA.get("x")), "snapshot 0 chụp trạng thái trước commit đầu");

        BoardOp op = ops().get(0);
        assertEquals("patch", op.getKind());
        assertEquals(0L, op.getFsBefore().getOrDefault("x", 0L), "thiếu fieldSeq thì fs mặc định 0");
        assertEquals(1L, op.getFsAfter().get("x"));
        assertEquals(4L, op.getV());
        BoardElement liveA = live(a.getId());
        assertEquals(50.0, liveA.getX());
        assertEquals(4L, liveA.getVersion());
        assertEquals(1L, liveA.getFieldSeq().get("x"));
        BoardTx t = tx(r.txId());
        assertEquals("active", t.getState());
        assertNull(t.getPending());
        assertEquals("user", t.getSource());
        assertEquals(1, t.getSummary().getPatched());
        assertInvariant();
    }

    @Test
    void twoThreadsPatchingSameElementGetContiguousSeqs() throws Exception {
        BoardElement a = seed(element("shape"));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<?>> futures = new ArrayList<>();
        for (String user : List.of("u1", "u2"))
            futures.add(pool.submit(() -> {
                for (int i = 0; i < 100; i++)
                    patch(user, a.getId(), Map.of("x", (double) i, "y", (double) i), null);
            }));
        for (Future<?> f : futures) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        List<Long> expected = LongStream.rangeClosed(1, 200).boxed().toList();
        assertEquals(expected, ops().stream().map(BoardOp::getSeq).toList(), "seq liền mạch 1..200");
        assertEquals(200, counter().getSeq());
        assertEquals(200, counter().getCommittedSeq());
        List<BoardTx> all = txs();
        assertEquals(200, all.size());
        assertTrue(all.stream().allMatch(t -> "active".equals(t.getState()) && t.getPending() == null));
        BoardElement liveA = live(a.getId());
        assertEquals(201L, liveA.getVersion());
        assertEquals(200L, liveA.getFieldSeq().get("x"));
        assertEquals(expected, events.stream().map(BatchEvent::seqFrom).toList(), "broadcast theo đúng thứ tự seq");
        assertInvariant();
    }

    @Test
    void twoThreadsPatchingDifferentElementsGetContiguousSeqs() throws Exception {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> fa = pool.submit(() -> {
            for (int i = 0; i < 100; i++) patch("u1", a.getId(), Map.of("x", (double) i), null);
        });
        Future<?> fb = pool.submit(() -> {
            for (int i = 0; i < 100; i++) patch("u2", b.getId(), Map.of("y", (double) i), null);
        });
        fa.get(60, TimeUnit.SECONDS);
        fb.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(LongStream.rangeClosed(1, 200).boxed().toList(), ops().stream().map(BoardOp::getSeq).toList());
        assertEquals(200, counter().getCommittedSeq());
        assertEquals(101L, live(a.getId()).getVersion());
        assertEquals(101L, live(b.getId()).getVersion());
        assertEquals(99.0, live(a.getId()).getX());
        assertEquals(99.0, live(b.getId()).getY());
        assertInvariant();
    }

    @Test
    void crashAfterWalOnCascadeDeleteRollsForwardOnNextCommit() {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        BoardElement c = element("connector");
        c.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End(a.getId(), "right"), new BoardElement.End(b.getId(), "left")));
        seed(c);

        writer.afterWalHook = () -> {
            throw new IllegalStateException("crash after WAL");
        };
        ElementWriter.CommitRequest del = new ElementWriter.CommitRequest(board, "u1", "s1", "user",
                List.of(Intent.delete(a.getId())), null, null);
        assertThrows(IllegalStateException.class, () -> writer.commit(del));

        BoardTx pending = txs().get(0);
        assertEquals("pending", pending.getState());
        assertEquals(1, pending.getPending().getSeqFrom());
        assertEquals(2, pending.getPending().getSeqTo(), "delete A + cascade connector C");
        assertEquals(List.of("delete", "delete"), pending.getPending().getOps().stream().map(BoardOp::getKind).toList());
        assertTrue(ops().isEmpty(), "chưa apply op nào");
        assertNotNull(live(a.getId()));
        assertEquals(0, counter().getCommittedSeq());
        assertTrue(events.isEmpty());

        writer.afterWalHook = () -> {
        };
        ElementWriter.CommitResult next = patch("u2", b.getId(), Map.of("x", 7), null);

        assertEquals(3, next.seqFrom());
        assertEquals(List.of(1L, 2L, 3L), ops().stream().map(BoardOp::getSeq).toList(), "mọi op trong dải đều tồn tại");
        BoardTx rolled = tx(pending.getId());
        assertEquals("active", rolled.getState());
        assertNull(rolled.getPending());
        assertNull(live(a.getId()));
        assertNull(live(c.getId()));
        assertEquals(3, counter().getCommittedSeq());
        assertEquals(1, events.size(), "roll-forward không broadcast");
        assertEquals(3, events.get(0).seqFrom());
        assertNoDanglingConnector();
        assertInvariant();
    }

    @Test
    void mergeKeyMergesWithinSlidingThreeSecondsElseNewTx() {
        BoardElement a = seed(element("sticky"));
        MutableClock clock = new MutableClock(Instant.parse("2026-09-25T10:00:00Z"));
        writer.clock = clock;
        String key = "text:" + a.getId() + ":e1";

        ElementWriter.CommitResult r1 = patch("u1", a.getId(), Map.of("text", "a"), key);
        clock.advance(Duration.ofSeconds(2));
        ElementWriter.CommitResult r2 = patch("u1", a.getId(), Map.of("text", "ab"), key);
        clock.advance(Duration.ofSeconds(2)); // 4s sau r1 nhưng 2s sau r2: cửa sổ trượt
        ElementWriter.CommitResult r3 = patch("u1", a.getId(), Map.of("text", "abc"), key);

        assertEquals(r1.txId(), r2.txId());
        assertEquals(r1.txId(), r3.txId());
        BoardTx merged = tx(r1.txId());
        assertEquals(1, merged.getSeqFrom());
        assertEquals(3, merged.getSeqTo());
        assertEquals(3, merged.getSummary().getPatched());
        assertEquals(Instant.parse("2026-09-25T10:00:04Z"), merged.getTs(), "ts = now mỗi lần merge");
        assertEquals(2, merged.getPrev().getSeqTo());
        assertEquals(2, merged.getPrev().getSummary().getPatched());
        assertEquals("active", merged.getState());
        assertNull(merged.getPending());
        assertEquals(List.of(r1.txId(), r1.txId(), r1.txId()), ops().stream().map(BoardOp::getTxId).toList());
        // broadcast chỉ mang dải seq của từng commit, không phải dải của tx đã merge
        assertEquals(List.of(1L, 2L, 3L), events.stream().map(BatchEvent::seqFrom).toList());
        assertEquals(List.of(1L, 2L, 3L), events.stream().map(BatchEvent::seqTo).toList());
        assertTrue(events.stream().allMatch(e -> r1.txId().equals(e.txId())));
        assertEquals(2, r2.seqFrom());
        assertEquals(2, r2.seqTo());

        clock.advance(Duration.ofMillis(3500));
        ElementWriter.CommitResult r4 = patch("u1", a.getId(), Map.of("text", "abcd"), key);
        assertNotEquals(r1.txId(), r4.txId(), "quá 3s thì tạo tx mới");
        ElementWriter.CommitResult r5 = patch("u2", a.getId(), Map.of("text", "x"), key);
        assertNotEquals(r4.txId(), r5.txId(), "chỉ merge vào tx của chính user");
        assertEquals(3, txs().size());
        assertEquals(5, counter().getCommittedSeq());
        assertEquals("x", live(a.getId()).getText());
        assertInvariant();
    }

    @Test
    void snapshotZeroPartialFailureRerunIsIdempotent() {
        BoardElement a = seed(element("shape"));
        // giả lập lần trước ghi xong snapshot 0 rồi chết trước khi tạo counter
        BoardSnapshot partial = new BoardSnapshot();
        partial.setBoardId(board);
        partial.setSeq(0);
        partial.setElements(new ArrayList<>(writer.loadBoard(board).values()));
        mongo.insert(partial);
        assertNull(counter());

        patch("u1", a.getId(), Map.of("x", 5), null);
        patch("u1", a.getId(), Map.of("x", 6), null);

        List<BoardSnapshot> snaps = snapshots();
        assertEquals(1, snaps.size(), "không tạo snapshot 0 thứ hai");
        assertEquals(partial.getId(), snaps.get(0).getId());
        assertTrue(ElementNormalizer.same(0.0, snaps.get(0).getElements().get(0).get("x")), "$setOnInsert không ghi đè");
        assertEquals(2, counter().getSeq());
        assertEquals(2, counter().getCommittedSeq());
        assertInvariant();
    }

    @Test
    void postCommitStateTransitions() {
        BoardElement a = seed(element("shape"));
        String t2 = seedTx("u1", "active");
        String t3 = seedTx("u1", "undone");
        String t4 = seedTx("u1", "undone");
        String t5 = seedTx("u2", "undone");
        List<Intent> move = List.of(Intent.patch(a.getId(), ElementNormalizer.normalizeSet(Map.of("x", 1))));

        ElementWriter.CommitResult u = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "undo", move, null, t2));
        assertEquals("undone", tx(t2).getState(), "undo: target active -> undone");
        assertEquals("undone", tx(t4).getState(), "undo không giết redo");
        assertEquals("active", tx(u.txId()).getState());
        assertEquals(t2, tx(u.txId()).getTarget());

        writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "redo", move, null, t3));
        assertEquals("dead", tx(t3).getState(), "redo: target undone -> dead");
        assertEquals("undone", tx(t4).getState(), "redo không giết redo khác");

        ElementWriter.CommitResult u2 = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "undo", move, null, t3));
        assertEquals("dead", tx(t3).getState(), "undo chỉ chuyển target khi target đang active");
        assertEquals("active", tx(u2.txId()).getState());

        writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "user", move, null, null));
        assertEquals("dead", tx(t4).getState(), "thao tác mới của user làm mất redo");
        assertEquals("dead", tx(t2).getState());
        assertEquals("undone", tx(t5).getState(), "không đụng tx của user khác");
        assertEquals(4, counter().getCommittedSeq());
    }

    @Test
    void commitWithOnlyMissingIdsIsEmptyAndDoesNotPublish() {
        seed(element("shape"));
        ElementWriter.CommitResult r = patch("u1", new ObjectId().toHexString(), Map.of("x", 1), null);
        assertTrue(r.isEmpty());
        assertSame(ElementWriter.CommitResult.EMPTY, r);
        assertEquals(0, counter().getSeq(), "không cấp seq");
        assertTrue(txs().isEmpty());
        assertTrue(ops().isEmpty());
        assertTrue(events.isEmpty());
    }

    @Test
    void commitInsideWithLockIsReentrant() {
        BoardElement a = seed(element("shape"));
        ElementWriter.CommitResult r = writer.withLock(board, () -> {
            assertEquals(0, writer.committedSeq(board));
            return patch("u1", a.getId(), Map.of("x", 3), null);
        });
        assertEquals(1, r.seqTo());
        assertEquals(1, writer.committedSeq(board));
        assertEquals(1, writer.opsOfTx(board, r.txId()).size());
    }

    @Test
    @SuppressWarnings("unchecked")
    void mixedBatchIsOrderedAndBroadcastAsOneEvent() {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        BoardElement fresh = element("shape");
        ElementWriter.CommitResult r = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "user", List.of(
                Intent.delete(b.getId()),
                Intent.patch(a.getId(), ElementNormalizer.normalizeSet(Map.of("x", 9))),
                Intent.create(ElementNormalizer.full(fresh))), null, null));

        assertEquals(1, r.seqFrom());
        assertEquals(3, r.seqTo());
        assertEquals(List.of("create", "patch", "delete"), ops().stream().map(BoardOp::getKind).toList());
        assertEquals(List.of(1L, 2L, 3L), writer.opsOfTx(board, r.txId()).stream().map(BoardOp::getSeq).toList());
        assertEquals(List.of(2L), writer.laterOps(board, a.getId(), 0).stream().map(BoardOp::getSeq).toList());
        assertTrue(writer.laterOps(board, a.getId(), 2).isEmpty());

        assertEquals(1, events.size());
        BatchEvent ev = events.get(0);
        assertEquals(r.txId(), ev.txId());
        assertEquals("user", ev.source());
        assertEquals(1, ev.seqFrom());
        assertEquals(3, ev.seqTo());
        assertEquals("s1", ev.senderSessionId());
        assertEquals("u1", ev.userId());
        assertEquals(List.of("create", "patch", "delete"), ev.ops().stream().map(o -> o.get("op")).toList());

        Map<String, Object> created = ((List<Map<String, Object>>) ev.ops().get(0).get("elements")).get(0);
        assertEquals(fresh.getId(), created.get("id"));
        assertEquals(1L, created.get("version"));
        Map<String, Long> fs = (Map<String, Long>) created.get("fieldSeq");
        assertFalse(fs.containsValue(CommitPlanner.SEQ), "sentinel SEQ phải được thay bằng seq thật");
        assertEquals(fs, live(fresh.getId()).getFieldSeq());

        Map<String, Object> patchEntry = ((List<Map<String, Object>>) ev.ops().get(1).get("patches")).get(0);
        assertEquals(a.getId(), patchEntry.get("id"));
        assertTrue(ElementNormalizer.same(9.0, ((Map<String, Object>) patchEntry.get("set")).get("x")));
        assertEquals(2L, patchEntry.get("version"));
        assertEquals(List.of(b.getId()), ev.ops().get(2).get("ids"));
        assertInvariant();
    }
}
```

- [ ] **Step 11: Run both new writer tests, expect FAIL (compile)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='ElementWriterEventOpsTest,ElementWriterIT'
```

Expected: BUILD FAILURE in `testCompile` with `cannot find symbol ... class ElementWriter` (and `ElementWriter.CommitRequest` / `CommitResult`).

- [ ] **Step 12: Implement `ElementWriter`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementWriter.java`. Notes:
- `commit` runs `doCommit` directly when the current thread already holds the board lock (UndoService/HistoryService call it inside their own `withLock`, which already rolled forward); otherwise it goes through `withLock`.
- Before planning, create intents whose `_id` already exists on **another** board are dropped. This keeps the current global "skip existing ids" behaviour of `BoardElementService.create` (`BoardElementService.java:43-48`, `repo.findAllById` is not board-scoped), and it makes the `save()` upsert in `apply` safe: without it an `_id` from another board would be overwritten.
- Post-commit order: transitions 2-4, then `committedSeq`, then `state=active` + `$unset pending` last. The tx stays `pending` until every other step has succeeded, so roll-forward re-runs the whole post-commit after a crash (every step is idempotent).
- No `SnapshotJob` reference (Task 9 adds it).

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

// Đường ghi duy nhất vào boardElements: lock theo board, WAL một document, op log, broadcast batch
@Service
@RequiredArgsConstructor
public class ElementWriter {
    private static final Duration MERGE_WINDOW = Duration.ofSeconds(3);

    private final MongoTemplate mongo;
    private final BoardLocks locks;
    private final BatchPublisher publisher;

    // chỉ test thay: đồng hồ cho cửa sổ merge, hook giả lập lỗi sau WAL
    Clock clock = Clock.systemUTC();
    Runnable afterWalHook = () -> {
    };

    public record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents,
                                String mergeKey, String target) {
    }

    public record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops) {
        public static final CommitResult EMPTY = new CommitResult(null, 0, 0, List.of());

        public boolean isEmpty() {
            return txId == null;
        }
    }

    public <T> T withLock(String boardId, Supplier<T> fn) {
        return locks.withLock(boardId, () -> {
            rollForward(boardId);
            return fn.get();
        });
    }

    public CommitResult commit(CommitRequest req) {
        // gọi lồng trong withLock của UndoService/HistoryService: đã roll-forward rồi
        if (locks.isHeldByCurrentThread(req.boardId())) return doCommit(req);
        return withLock(req.boardId(), () -> doCommit(req));
    }

    public Map<String, Map<String, Object>> loadBoard(String boardId) {
        Map<String, Map<String, Object>> board = new LinkedHashMap<>();
        mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId))), BoardElement.class)
                .forEach(e -> board.put(e.getId(), ElementNormalizer.full(e)));
        return board;
    }

    public long committedSeq(String boardId) {
        BoardCounter counter = mongo.findOne(Query.query(Criteria.where("_id").is(oid(boardId))), BoardCounter.class);
        return counter == null ? 0L : counter.getCommittedSeq();
    }

    public List<BoardOp> opsOfTx(String boardId, String txId) {
        return mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId)).and("txId").is(txId))
                .with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
    }

    public List<BoardOp> laterOps(String boardId, String elementId, long afterSeq) {
        return mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId)).and("elementId").is(elementId)
                .and("seq").gt(afterSeq)).with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
    }

    private CommitResult doCommit(CommitRequest req) {
        String boardId = req.boardId();
        ensureCounter(boardId);
        List<Intent> intents = dropForeignCreates(boardId, req.intents());
        List<BoardOp> planned = CommitPlanner.plan(intents, loadBoard(boardId), id -> lastVersion(boardId, id));
        if (planned.isEmpty()) return CommitResult.EMPTY;

        int n = planned.size();
        BoardCounter counter = mongo.findAndModify(Query.query(Criteria.where("_id").is(oid(boardId))),
                new Update().inc("seq", n), FindAndModifyOptions.options().returnNew(true), BoardCounter.class);
        long seqTo = counter.getSeq();
        long seqFrom = seqTo - n + 1;
        Instant now = clock.instant();

        BoardTx merged = mergeTarget(req, now);
        String txId = merged != null ? merged.getId() : new ObjectId().toHexString();
        List<BoardOp> ops = new ArrayList<>(n);
        for (int i = 0; i < n; i++)
            ops.add(stamp(planned.get(i), boardId, seqFrom + i, txId, req.userId(), now));
        BoardTx.Summary summary = summarize(ops);
        BoardTx.Pending pending = new BoardTx.Pending(seqFrom, seqTo, ops);

        // WAL: một document nên atomic
        BoardTx tx;
        if (merged != null) {
            BoardTx.Summary old = merged.getSummary() == null ? new BoardTx.Summary(0, 0, 0) : merged.getSummary();
            BoardTx.Prev prev = new BoardTx.Prev(merged.getSeqTo(), old, merged.getTs());
            BoardTx.Summary total = new BoardTx.Summary(old.getCreated() + summary.getCreated(),
                    old.getPatched() + summary.getPatched(), old.getDeleted() + summary.getDeleted());
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(txId))), new Update()
                    .set("state", "pending").set("pending", pending).set("prev", prev)
                    .set("seqTo", seqTo).set("summary", total).set("ts", now), BoardTx.class);
            merged.setState("pending");
            merged.setPending(pending);
            merged.setPrev(prev);
            merged.setSeqTo(seqTo);
            merged.setSummary(total);
            merged.setTs(now);
            tx = merged;
        } else {
            tx = new BoardTx();
            tx.setId(txId);
            tx.setBoardId(boardId);
            tx.setUserId(req.userId());
            tx.setTs(now);
            tx.setSeqFrom(seqFrom);
            tx.setSeqTo(seqTo);
            tx.setSource(req.source());
            tx.setTarget(req.target());
            tx.setMergeKey(req.mergeKey());
            tx.setState("pending");
            tx.setPending(pending);
            tx.setSummary(summary);
            mongo.insert(tx);
        }
        afterWalHook.run();

        ops.forEach(op -> apply(boardId, op));
        postCommit(tx);
        // vẫn trong lock: simple broker gửi đồng bộ nên thứ tự message = thứ tự seq
        publisher.publish(boardId, new BatchEvent(txId, req.source(), seqFrom, seqTo, req.sessionId(), req.userId(),
                eventOps(ops)));
        return new CommitResult(txId, seqFrom, seqTo, ops);
    }

    // Lỗi sau WAL: áp lại op của tx pending (tối đa một), không broadcast; client lệch sẽ tự reload theo hụt seq
    private void rollForward(String boardId) {
        BoardTx tx = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("state").is("pending")),
                BoardTx.class);
        if (tx == null) return;
        if (tx.getPending() != null && tx.getPending().getOps() != null)
            tx.getPending().getOps().forEach(op -> apply(boardId, op));
        postCommit(tx);
    }

    // Board chưa có counter: chụp snapshot 0 trước; $setOnInsert nên chạy lại sau lỗi dở dang vẫn an toàn
    private void ensureCounter(String boardId) {
        Object bid = oid(boardId);
        Query counterQuery = Query.query(Criteria.where("_id").is(bid));
        if (mongo.exists(counterQuery, BoardCounter.class)) return;
        List<Map<String, Object>> elements = new ArrayList<>(loadBoard(boardId).values());
        mongo.upsert(Query.query(Criteria.where("boardId").is(bid).and("seq").is(0L)),
                new Update().setOnInsert("elements", elements), BoardSnapshot.class);
        mongo.upsert(counterQuery, new Update().setOnInsert("seq", 0L).setOnInsert("committedSeq", 0L), BoardCounter.class);
    }

    // _id đã có ở board khác thì bỏ create (giữ hành vi cũ), để save() không ghi đè element của board khác
    private List<Intent> dropForeignCreates(String boardId, List<Intent> intents) {
        List<Object> createIds = intents.stream()
                .filter(i -> "create".equals(i.kind()) && i.elementId() != null)
                .map(i -> oid(i.elementId())).toList();
        if (createIds.isEmpty()) return intents;
        Set<String> foreign = new HashSet<>();
        mongo.find(Query.query(Criteria.where("_id").in(createIds).and("boardId").ne(oid(boardId))), BoardElement.class)
                .forEach(e -> foreign.add(e.getId()));
        if (foreign.isEmpty()) return intents;
        return intents.stream().filter(i -> !("create".equals(i.kind()) && foreign.contains(i.elementId()))).toList();
    }

    private long lastVersion(String boardId, String elementId) {
        BoardOp last = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("elementId").is(elementId))
                .with(Sort.by(Sort.Direction.DESC, "seq")).limit(1), BoardOp.class);
        return last == null ? 0L : last.getV();
    }

    private BoardTx mergeTarget(CommitRequest req, Instant now) {
        if (req.mergeKey() == null) return null;
        BoardTx last = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(req.boardId()))
                        .and("userId").is(req.userId())).with(Sort.by(Sort.Direction.DESC, "seqTo")).limit(1),
                BoardTx.class);
        if (last == null || !req.mergeKey().equals(last.getMergeKey()) || !"active".equals(last.getState())) return null;
        return Duration.between(last.getTs(), now).compareTo(MERGE_WINDOW) < 0 ? last : null;
    }

    // Gắn seq/txId/userId/ts, thay sentinel SEQ bằng seq của op
    private static BoardOp stamp(BoardOp planned, String boardId, long seq, String txId, String userId, Instant now) {
        Map<String, Long> fsAfter = new HashMap<>();
        if (planned.getFsAfter() != null)
            planned.getFsAfter().forEach((k, s) -> fsAfter.put(k, s.longValue() == CommitPlanner.SEQ ? seq : s));
        Map<String, Object> after = planned.getAfter();
        if ("create".equals(planned.getKind()) && after != null) {
            after = new LinkedHashMap<>(after);
            after.put("fieldSeq", new HashMap<>(fsAfter));
            after.put("version", planned.getV());
        }
        BoardOp op = new BoardOp();
        op.setBoardId(boardId);
        op.setSeq(seq);
        op.setTxId(txId);
        op.setUserId(userId);
        op.setTs(now);
        op.setKind(planned.getKind());
        op.setElementId(planned.getElementId());
        op.setBefore(planned.getBefore());
        op.setAfter(after);
        op.setFsBefore(planned.getFsBefore());
        op.setFsAfter(fsAfter);
        op.setV(planned.getV());
        return op;
    }

    private static BoardTx.Summary summarize(List<BoardOp> ops) {
        int created = 0, patched = 0, deleted = 0;
        for (BoardOp op : ops) {
            switch (op.getKind()) {
                case "create" -> created++;
                case "patch" -> patched++;
                default -> deleted++;
            }
        }
        return new BoardTx.Summary(created, patched, deleted);
    }

    // Idempotent: upsert op theo (boardId, seq); patch dùng $set version thay vì $inc
    private void apply(String boardId, BoardOp op) {
        Object bid = oid(boardId);
        mongo.upsert(Query.query(Criteria.where("boardId").is(bid).and("seq").is(op.getSeq())), new Update()
                .set("txId", op.getTxId()).set("userId", op.getUserId()).set("ts", op.getTs())
                .set("kind", op.getKind()).set("elementId", op.getElementId())
                .set("before", op.getBefore()).set("after", op.getAfter())
                .set("fsBefore", op.getFsBefore()).set("fsAfter", op.getFsAfter()).set("v", op.getV()), BoardOp.class);
        Map<String, Long> fsAfter = op.getFsAfter() == null ? Map.of() : op.getFsAfter();
        Query element = Query.query(Criteria.where("_id").is(oid(op.getElementId())).and("boardId").is(bid));
        switch (op.getKind()) {
            case "create" -> {
                BoardElement e = ElementNormalizer.toElement(op.getAfter());
                e.setBoardId(boardId);
                e.setFieldSeq(new HashMap<>(fsAfter));
                e.setVersion(op.getV());
                e.setUpdateAt(LocalDateTime.now(clock));
                mongo.save(e);
            }
            case "patch" -> {
                Update update = new Update();
                op.getAfter().forEach(update::set);
                fsAfter.forEach((k, s) -> update.set("fieldSeq." + k, s));
                update.set("version", op.getV()).currentDate("updateAt");
                mongo.updateFirst(element, update, BoardElement.class);
            }
            case "delete" -> mongo.remove(element, BoardElement.class);
            default -> throw new IllegalStateException("unknown op kind: " + op.getKind());
        }
    }

    // §6.6, suy ra từ chính document tx; đánh dấu active sau cùng để roll-forward chạy lại được cả khối
    private void postCommit(BoardTx tx) {
        Object bid = oid(tx.getBoardId());
        String source = tx.getSource();
        if ("user".equals(source) || "restore".equals(source))
            mongo.updateMulti(Query.query(Criteria.where("boardId").is(bid).and("userId").is(tx.getUserId())
                    .and("state").is("undone")), new Update().set("state", "dead"), BoardTx.class);
        if ("undo".equals(source) && tx.getTarget() != null)
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getTarget())).and("state").is("active")),
                    new Update().set("state", "undone"), BoardTx.class);
        if ("redo".equals(source) && tx.getTarget() != null)
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getTarget())).and("state").is("undone")),
                    new Update().set("state", "dead"), BoardTx.class);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(bid)), new Update().max("committedSeq", tx.getSeqTo()),
                BoardCounter.class);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getId()))),
                new Update().set("state", "active").unset("pending"), BoardTx.class);
    }

    // Gom các op liên tiếp cùng kind thành một entry, giữ thứ tự seq
    static List<Map<String, Object>> eventOps(List<BoardOp> ops) {
        List<Map<String, Object>> out = new ArrayList<>();
        String kind = null;
        List<Object> items = null;
        for (BoardOp op : ops) {
            if (!op.getKind().equals(kind)) {
                kind = op.getKind();
                items = new ArrayList<>();
                Map<String, Object> group = new LinkedHashMap<>();
                group.put("op", kind);
                group.put(switch (kind) {
                    case "create" -> "elements";
                    case "patch" -> "patches";
                    default -> "ids";
                }, items);
                out.add(group);
            }
            switch (kind) {
                case "create" -> items.add(op.getAfter());
                case "patch" -> {
                    Map<String, Object> patch = new LinkedHashMap<>();
                    patch.put("id", op.getElementId());
                    patch.put("set", op.getAfter());
                    patch.put("version", op.getV());
                    items.add(patch);
                }
                default -> items.add(op.getElementId());
            }
        }
        return out;
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
```

- [ ] **Step 13: Compile and run the pure writer test, expect PASS; IT skipped without Mongo**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && unset MONGO_IT_URI && bash ./mvnw -q test -Dtest='ElementWriterEventOpsTest,ElementWriterIT'
```

Expected: exit code 0. `target/surefire-reports/com.example.ie213backend.service.history.ElementWriterEventOpsTest.txt`: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`. `...ElementWriterIT.txt`: `Tests run: 10, Failures: 0, Errors: 0, Skipped: 10` (gated by `@EnabledIfEnvironmentVariable`). Note: surefire's default includes do not match `*IT`, but an explicit `-Dtest=` runs it.

- [ ] **Step 14: Start local Mongo and run `ElementWriterIT`, expect PASS**

```bash
docker start mobi-it-mongo 2>/dev/null || docker run -d --name mobi-it-mongo -p 27017:27017 mongo:7
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='ElementWriterIT'
```

Expected: exit code 0; `target/surefire-reports/com.example.ie213backend.service.history.ElementWriterIT.txt` shows `Tests run: 10, Failures: 0, Errors: 0, Skipped: 0`. Each test drops its own `it_<uuid>` database, so `docker exec mobi-it-mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>n.startsWith("it_"))'` prints `[]`. If a test fails, fix `ElementWriter` (never weaken the assertion) and re-run this step.

- [ ] **Step 15: Checkpoint (gate)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='BoardLocksTest,StompBatchPublisherTest,ElementWriterEventOpsTest,ElementWriterIT,BoardElementServiceTest,BoardElementSocketControllerTest'
```

Expected: exit code 0; surefire reports: `BoardLocksTest` 3/0/0/0, `StompBatchPublisherTest` 1/0/0/0, `ElementWriterEventOpsTest` 2/0/0/0, `ElementWriterIT` 10/0/0/0, and the existing `BoardElementServiceTest` / `BoardElementSocketControllerTest` still green (Task 6 does not touch them). Report the results; do NOT commit.

---

### Task 7: Wire element writes through ElementWriter (service, controller, template, PatchBody.mergeKey, historySeq)

Spec: §6.2, §6.3 steps 2-5, §6.7, §6.8, §7.6, §9.2. After this task every element write in the running app (socket create/patch/delete and "use template") goes through `ElementWriter.commit`, and `GET /board/{id}` returns `historySeq`. `BoardElementService` keeps only the pure checks that need no lock: `requireEditor`, `ElementValidator.validate`, and `ElementPatches.toUpdate` (reached through `ElementNormalizer.normalizeSet`). Everything that reads the DB moves to the planner/writer (Tasks 5-6): dropping duplicate creates, dropping patches or deletes on missing ids, the delete cascade, and the connector-end check (`requireConnectorEnds` is deleted here). The controller stops broadcasting create/patch/delete, because the writer sends one `batch` event while it still holds the lock (§6.7). `preview`, `lock` and `unlock` keep their old broadcast.

Evidence this task relies on (read on 2026-09-25 from the working tree):
- `BoardElementService.java:36-106`: current `create` / `patch` / `delete` / `requireConnectorEnds`. `toOid` (`:108-110`) is still used by `ElementMigration.java:47,59,88,97`, so it stays.
- `BoardElementSocketController.java:51-66` and `:79-85`: create/patch/delete call the service and then `broadcast(...)`. `preview` (`:69-77`) reads `body.patches()` only.
- `ElementPatches.java:16-17`: `record PatchBody(List<ElementPatch> patches)`. The only users are the controller (`:62`, `:71`) and `BoardElementSocketControllerTest.java:55,63`.
- `TemplateServiceImpl.java:30` (`BoardElementRepository` field) is used only at `:114` (`boardElementRepository.insert(elements)`).
- `BoardServiceImpl.java:64` loads the elements. `BoardFullDetailResponse.java:15-20` has no `historySeq`.
- `TemplateElementConverter.java:29-40` keeps a connector only when both ends were remapped into the same batch, so the planner's connector-end check cannot reject a template commit that used to succeed.

**Circular bean dependency check (verified by grep, and pinned by the test written in Step 12):** after this task the graph is `BoardServiceImpl → ElementWriter`, `BoardElementService → {BoardService, ElementWriter}` and `TemplateServiceImpl → {BoardService, CanvasPathService, ElementWriter}`. A cycle would exist only if `ElementWriter` or one of its dependencies reached `BoardService`, `BoardElementService` or `TemplateService`. `grep -rln "BoardService\|BoardElementService\|TemplateService"` over `BE/` returns only controllers, `service/impl/*` and `service/element/*`. Nothing under `config/` or `security/` matches, so `StompBatchPublisher → SimpMessagingTemplate → WebSocketConfig → AuthService` does not reach them either. `ElementWriter` must therefore never inject `BoardService`: the authorization checks stay in the callers (§6.2). The test in Step 12 walks the constructor parameters and fields of `ElementWriter`, `StompBatchPublisher` and `BoardLocks` and fails if any of them reaches those services.

**Known transient regression (expected; do not demo between Task 7 and Task 11):** after this task the server sends `op:"batch"` instead of `create`/`patch`/`delete`. The FE handles `batch` only from Task 10-11 on, so until then other browsers do not see live element changes until they reload. The optimistic local copy of the sender is unaffected.

**Files:**
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/element/ElementPatches.java`: lines 16-17 (`PatchBody`)
- Modify (full rewrite, lines 1-111): `IE213Backend/src/main/java/com/example/ie213backend/service/element/BoardElementService.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`: lines 51-66 (create, patch) and 79-85 (delete)
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/impl/TemplateServiceImpl.java`: line 4 (import), line 30 (field), lines 108-114 (`usingTemplate` element write)
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/domain/dto/BoardDto/BoardFullDetailResponse.java`: after line 19
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/impl/BoardServiceImpl.java`: import after line 17, field after line 45, line 64 (`getBoard`)
- Test (full rewrite, lines 1-151): `IE213Backend/src/test/java/com/example/ie213backend/service/element/BoardElementServiceTest.java`
- Test (full rewrite, lines 1-94): `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java`
- Test (new): `IE213Backend/src/test/java/com/example/ie213backend/service/impl/TemplateServiceImplTest.java`
- Test (new): `IE213Backend/src/test/java/com/example/ie213backend/service/impl/BoardServiceImplHistorySeqTest.java`

**Interfaces:**
- Consumes (from the Interface Contract, produced by Tasks 1, 2 and 6):
  - `BoardOp` getters `getKind()`, `getElementId()`, `getAfter()`, `getFsAfter()`, `getV()` and setters (Task 1). `BoardElement.setFieldSeq(Map<String,Long>)` (Task 1).
  - `ElementNormalizer.full(BoardElement)`, `ElementNormalizer.normalizeSet(Map<String,Object>)` (validates through `ElementPatches.toUpdate`, throws `IllegalArgumentException`), `ElementNormalizer.toElement(Map<String,Object>)` (Task 2).
  - `Intent.create(Map<String,Object>)`, `Intent.patch(String, Map<String,Object>)`, `Intent.delete(String)`, accessors `kind()`, `elementId()`, `element()`, `set()` (Task 2). This task assumes `kind()` is `"create" | "patch" | "delete"`, the same strings as `BoardOp.kind`.
  - `ElementWriter.commit(CommitRequest)`, `ElementWriter.committedSeq(String)`, `record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents, String mergeKey, String target)`, `record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops)` with `CommitResult.EMPTY` and `isEmpty()` (Task 6). `CommitResult.ops()` holds the committed ops with real seqs (no `CommitPlanner.SEQ` sentinel left) in the §6.3 step 6 order, including cascaded deletes.
  - `StompBatchPublisher`, `BoardLocks` (Task 6, used only by the dependency-graph test).
- Produces:
  - `BoardElementService`: `List<BoardElement> create(String boardId, String userId, String sessionId, List<BoardElement> elements)`, `List<Map<String,Object>> patch(String boardId, String userId, String sessionId, List<ElementPatches.ElementPatch> patches, String mergeKey)`, `List<String> delete(String boardId, String userId, String sessionId, List<String> ids)`. Return shapes as before, derived from `CommitResult.ops()`: the created elements (version = op `v`), `{id, set (normalized), version}` per applied patch, and every deleted id including cascaded connectors. `requireEditor`, `listByBoard` and `toOid` are unchanged.
  - `ElementPatches.PatchBody`: `record PatchBody(List<ElementPatch> patches, String mergeKey)`.
  - `BoardFullDetailResponse`: `private long historySeq;` (Lombok `getHistorySeq()` / `setHistorySeq(long)`, JSON `historySeq`).
  - `BoardServiceImpl.getBoard` sets `historySeq = elementWriter.committedSeq(id)` before `findByBoardIdOrderByZAsc`.
  - Socket controller: create/patch/delete pass `headerAccessor.getSessionId()` and, for patch, `body.mergeKey()`. They broadcast nothing themselves.

- [ ] **Step 1: Rewrite `BoardElementServiceTest` for the writer-based service**

Replace the whole content of `IE213Backend/src/test/java/com/example/ie213backend/service/element/BoardElementServiceTest.java` (currently lines 1-151) with the code below. What changes compared to the old tests:
- `MongoTemplate` is gone and `ElementWriter` is mocked.
- The connector-end tests (old `:110-150`) move to the planner (Task 5). They are replaced by tests showing that the service sends connector batches to the writer in one commit without reading the DB, and that it propagates the writer's `IllegalArgumentException`.
- `createSkipsExistingIds` becomes "writer drops everything → empty".
- The cascade is now asserted on what the writer returns.
- New tests: Review Focus 3 (late patch → empty list, no error), viewer 403 with no writer interaction, and `mergeKey`/`sessionId` forwarding.

```java
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
```

- [ ] **Step 2: Rewrite `BoardElementSocketControllerTest` for the new signatures**

Replace the whole content of `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java` (currently lines 1-94) with the code below. The six existing tests stay. The only changes to them are that `PatchBody` gets a second argument and `service.delete` takes a session id. Five new tests pin that create/patch/delete no longer broadcast from the controller, that `sessionId` and `mergeKey` are forwarded, and Review Focus 3 at the controller level (a late patch sends nothing and throws nothing).

```java
package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.ElementLockRegistry;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.element.ElementPatches;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BoardElementSocketControllerTest {
    BoardElementService service = mock(BoardElementService.class);
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    ElementLockRegistry locks = new ElementLockRegistry();
    BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks);
    SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();

    @BeforeEach
    void setUp() {
        UserDto user = new UserDto();
        user.setId("viewer");
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("user", user);
        headers.setSessionAttributes(attrs);
        headers.setSessionId("s1");
    }

    private void viewerIsForbidden() {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(service).requireEditor("b", "viewer");
    }

    @Test
    void viewerCannotLockOrUnlock() {
        viewerIsForbidden();
        assertThrows(ResponseStatusException.class, () -> controller.lock("b", Map.of("id", "x"), headers));
        assertThrows(ResponseStatusException.class, () -> controller.unlock("b", Map.of("id", "x"), headers));
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void previewRejectsFieldsOutsideWhitelist() {
        ElementPatches.PatchBody body = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("type", "image"))), null);
        assertThrows(IllegalArgumentException.class, () -> controller.preview("b", body, headers));
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void previewRelaysValidGeometry() {
        ElementPatches.PatchBody body = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("x", 10, "y", 20))), null);
        controller.preview("b", body, headers);
        verify(messaging).convertAndSend(eq("/topic/board/b/el"), any(Object.class));
    }

    @Test
    void deleteWithNoIdsBroadcastsNothing() {
        when(service.delete("b", "viewer", "s1", List.of())).thenReturn(List.of());
        controller.delete("b", Map.of("ids", List.of()), headers);
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void lockOrUnlockOfElementHeldByAnotherUserIsIgnored() {
        locks.lock("other-session", "someone-else", "b", "x");
        controller.lock("b", Map.of("id", "x"), headers);
        controller.unlock("b", Map.of("id", "x"), headers);
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
        assertEquals("someone-else", locks.locksOf("b").get(0).userId());
    }

    @Test
    void disconnectReleasesLocksAndBroadcastsUnlock() {
        controller.lock("b", Map.of("id", "x"), headers);
        reset(messaging);
        controller.releaseSessionLocks("s1");
        verify(messaging).convertAndSend(eq("/topic/board/b/el"), argThat((Object m) ->
                m instanceof Map<?, ?> map && "unlock".equals(map.get("op")) && List.of("x").equals(map.get("ids"))));
        assertTrue(locks.locksOf("b").isEmpty());
    }

    @Test
    void createPassesSessionAndDoesNotBroadcastItself() {
        BoardElement e = new BoardElement();
        when(service.create("b", "viewer", "s1", List.of(e))).thenReturn(List.of(e));
        controller.create("b", Map.of("elements", List.of(e)), headers);
        verify(service).create("b", "viewer", "s1", List.of(e));
        verifyNoInteractions(messaging);
    }

    @Test
    void patchForwardsMergeKeyAndDoesNotBroadcastItself() {
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("x", Map.of("text", "hi")));
        when(service.patch("b", "viewer", "s1", patches, "text:x:ed1"))
                .thenReturn(List.of(Map.of("id", "x", "set", Map.of("text", "hi"), "version", 2L)));
        controller.patch("b", new ElementPatches.PatchBody(patches, "text:x:ed1"), headers);
        verify(service).patch("b", "viewer", "s1", patches, "text:x:ed1");
        verifyNoInteractions(messaging);
    }

    @Test
    void latePatchForDeletedElementSendsNothing() {
        // Review Focus 3: service trả rỗng (writer EMPTY) thì không gửi gì, không lỗi
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("gone", Map.of("text", "late")));
        when(service.patch("b", "viewer", "s1", patches, "text:gone:ed1")).thenReturn(List.of());
        assertDoesNotThrow(() -> controller.patch("b", new ElementPatches.PatchBody(patches, "text:gone:ed1"), headers));
        verifyNoInteractions(messaging);
    }

    @Test
    void deleteDoesNotBroadcastItself() {
        when(service.delete("b", "viewer", "s1", List.of("e1"))).thenReturn(List.of("e1", "c1"));
        controller.delete("b", Map.of("ids", List.of("e1")), headers);
        verify(service).delete("b", "viewer", "s1", List.of("e1"));
        verifyNoInteractions(messaging);
    }

    @Test
    void viewerPatchIsForbiddenAndSendsNothing() {
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("x", Map.of("x", 1)));
        when(service.patch("b", "viewer", "s1", patches, null)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class,
                () -> controller.patch("b", new ElementPatches.PatchBody(patches, null), headers));
        verifyNoInteractions(messaging);
    }
}
```

- [ ] **Step 3: Run both tests and confirm they fail**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardElementServiceTest,BoardElementSocketControllerTest'; echo "exit=$?"
```

Expected: FAIL at `testCompile`, with `exit=1` and `[ERROR] COMPILATION ERROR`. The errors include `method create in class BoardElementService cannot be applied to given types` (and the same for `patch` and `delete`, since the old 3-arg signatures are still there) and `constructor PatchBody in record PatchBody cannot be applied to given types` (it still has one component). There must be no `package com.example.ie213backend.service.history does not exist`. If that error shows up, Task 6 is not done yet, so stop.

- [ ] **Step 4: Add `mergeKey` to `PatchBody`**

In `IE213Backend/src/main/java/com/example/ie213backend/service/element/ElementPatches.java`, replace lines 16-17:

```java
    public record PatchBody(List<ElementPatch> patches) {
    }
```

with:

```java
    // mergeKey tuỳ chọn: các patch gõ chữ cùng key trong 3s được gộp thành 1 tx để undo một lần
    public record PatchBody(List<ElementPatch> patches, String mergeKey) {
    }
```

Nothing else in the file changes. Jackson leaves `mergeKey` as `null` when the client does not send it, so old clients and `preview` keep working.

- [ ] **Step 5: Rewrite `BoardElementService` to delegate writes to `ElementWriter`**

Replace the whole content of `IE213Backend/src/main/java/com/example/ie213backend/service/element/BoardElementService.java` (lines 1-111) with the code below. What goes away: `MongoTemplate`, the direct `repo.insert` / `findAndModify` / `remove`, the connector cascade query and `requireConnectorEnds`. The planner owns all of these now (§6.3 steps 2-4). `toOid` stays because `ElementMigration` uses it.

```java
package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.history.ElementNormalizer;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

// Kiểm quyền + validate thuần ở đây (trước lock); mọi lệnh ghi đi qua ElementWriter
@Service
@RequiredArgsConstructor
public class BoardElementService {
    private final BoardElementRepository repo;
    private final BoardService boardService;
    private final ElementWriter writer;

    public void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }

    public List<BoardElement> listByBoard(String boardId) {
        return repo.findByBoardIdOrderByZAsc(boardId);
    }

    // Lọc _id trùng và kiểm đầu connector do planner làm trong lock
    public List<BoardElement> create(String boardId, String userId, String sessionId, List<BoardElement> elements) {
        requireEditor(boardId, userId);
        elements.forEach(ElementValidator::validate);
        List<Intent> intents = new ArrayList<>();
        for (BoardElement e : elements) {
            // cấp id ngay để intent và op log có elementId
            if (e.getId() == null) e.setId(new ObjectId().toHexString());
            e.setBoardId(boardId);
            e.setOwner(userId);
            e.setVersion(1L);
            e.setMigratedFrom(null);
            e.setFieldSeq(null);  // fieldSeq do server quản lý, không nhận từ client
            intents.add(Intent.create(ElementNormalizer.full(e)));
        }
        if (intents.isEmpty()) return List.of();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, null, null));
        List<BoardElement> created = new ArrayList<>();
        for (BoardOp op : result.ops()) {
            if (!"create".equals(op.getKind())) continue;
            BoardElement e = ElementNormalizer.toElement(op.getAfter());
            e.setVersion(op.getV());
            if (op.getFsAfter() != null) e.setFieldSeq(new HashMap<>(op.getFsAfter()));
            created.add(e);
        }
        return created;
    }

    public List<Map<String, Object>> patch(String boardId, String userId, String sessionId,
                                           List<ElementPatches.ElementPatch> patches, String mergeKey) {
        requireEditor(boardId, userId);
        // validate cả batch trước khi ghi (normalizeSet gọi ElementPatches.toUpdate)
        List<Intent> intents = patches.stream()
                .map(p -> Intent.patch(p.id(), ElementNormalizer.normalizeSet(p.set())))
                .toList();
        if (intents.isEmpty()) return List.of();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, mergeKey, null));
        // patch vào id vừa bị xoá bị planner bỏ lặng lẽ: kết quả rỗng, không lỗi
        List<Map<String, Object>> applied = new ArrayList<>();
        for (BoardOp op : result.ops())
            if ("patch".equals(op.getKind()))
                applied.add(Map.of("id", op.getElementId(), "set", op.getAfter(), "version", op.getV()));
        return applied;
    }

    // Planner tự cascade connector nối vào các id bị xoá; trả về toàn bộ id đã xoá
    public List<String> delete(String boardId, String userId, String sessionId, List<String> ids) {
        requireEditor(boardId, userId);
        if (ids.isEmpty()) return List.of();
        List<Intent> intents = ids.stream().distinct().map(Intent::delete).toList();
        ElementWriter.CommitResult result = writer.commit(
                new ElementWriter.CommitRequest(boardId, userId, sessionId, "user", intents, null, null));
        return result.ops().stream()
                .filter(op -> "delete".equals(op.getKind()))
                .map(BoardOp::getElementId)
                .toList();
    }

    static Object toOid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
```

- [ ] **Step 6: Stop the controller's own create/patch/delete broadcast and pass sessionId/mergeKey**

In `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`, replace lines 51-66:

```java
    @MessageMapping("/board/{boardId}/el/create")
    public void create(@DestinationVariable String boardId,
                       @Payload Map<String, List<BoardElement>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        List<BoardElement> created = elementService.create(boardId, user(headerAccessor).getId(),
                body.getOrDefault("elements", List.of()));
        if (!created.isEmpty()) broadcast(boardId, "create", headerAccessor, "elements", created);
    }

    @MessageMapping("/board/{boardId}/el/patch")
    public void patch(@DestinationVariable String boardId,
                      @Payload ElementPatches.PatchBody body,
                      SimpMessageHeaderAccessor headerAccessor) {
        List<Map<String, Object>> applied = elementService.patch(boardId, user(headerAccessor).getId(), body.patches());
        if (!applied.isEmpty()) broadcast(boardId, "patch", headerAccessor, "patches", applied);
    }
```

with:

```java
    // create/patch/delete: ElementWriter phát một event "batch" có seq trong lock, controller không tự gửi
    @MessageMapping("/board/{boardId}/el/create")
    public void create(@DestinationVariable String boardId,
                       @Payload Map<String, List<BoardElement>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        elementService.create(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId(),
                body.getOrDefault("elements", List.of()));
    }

    @MessageMapping("/board/{boardId}/el/patch")
    public void patch(@DestinationVariable String boardId,
                      @Payload ElementPatches.PatchBody body,
                      SimpMessageHeaderAccessor headerAccessor) {
        elementService.patch(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId(),
                body.patches(), body.mergeKey());
    }
```

Then replace the delete handler (originally lines 79-85, now shifted up by 2 lines because the block above got shorter; locate it by its text):

```java
    @MessageMapping("/board/{boardId}/el/delete")
    public void delete(@DestinationVariable String boardId,
                       @Payload Map<String, List<String>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        List<String> ids = elementService.delete(boardId, user(headerAccessor).getId(), body.getOrDefault("ids", List.of()));
        if (!ids.isEmpty()) broadcast(boardId, "delete", headerAccessor, "ids", ids);
    }
```

with:

```java
    @MessageMapping("/board/{boardId}/el/delete")
    public void delete(@DestinationVariable String boardId,
                       @Payload Map<String, List<String>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        elementService.delete(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId(),
                body.getOrDefault("ids", List.of()));
    }
```

`preview`, `lock`, `unlock`, `releaseSessionLocks` and `onError` stay as they are, and so do `broadcast`/`send` (preview/lock/unlock still use them). Every import is still used (`BoardElement` in `create`, `HashMap` in `send`). Errors from the writer (`IllegalArgumentException`, 503 "board busy") still reach `@MessageExceptionHandler` → `/user/queue/errors`.

- [ ] **Step 7: Run both tests and confirm they pass**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardElementServiceTest,BoardElementSocketControllerTest'; echo "exit=$?"; grep -h "Tests run" target/surefire-reports/*BoardElementServiceTest.txt target/surefire-reports/*BoardElementSocketControllerTest.txt
```

Expected: `exit=0`, `BoardElementServiceTest` with `Tests run: 13, Failures: 0, Errors: 0, Skipped: 0`, and `BoardElementSocketControllerTest` with `Tests run: 11, Failures: 0, Errors: 0, Skipped: 0`. `TemplateServiceImpl` still compiles at this point, because it still uses `BoardElementRepository`, which is not touched until Step 10.

- [ ] **Step 8: Write the failing `TemplateServiceImplTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/impl/TemplateServiceImplTest.java`:

```java
package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.repository.TemplateRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TemplateServiceImplTest {
    @Mock
    TemplateRepository templateRepository;
    @Mock
    BoardService boardService;
    @Mock
    CanvasPathService canvasPathService;
    @Mock
    ElementWriter elementWriter;
    @InjectMocks
    TemplateServiceImpl service;

    private static final String BOARD = "650000000000000000000009";

    private Board created() {
        Board b = new Board();
        b.setId(BOARD);
        return b;
    }

    @Test
    void usingTemplateCommitsElementsThroughWriterAsTemplateSource() {
        when(boardService.createBoard(any(Board.class), eq("owner1"))).thenReturn(created());
        when(elementWriter.commit(any())).thenReturn(ElementWriter.CommitResult.EMPTY);
        BoardElement sticky = new BoardElement();
        sticky.setId("t1");
        sticky.setType("sticky");
        sticky.setW(200);
        sticky.setH(200);
        Template template = new Template();
        template.setTitle("T");
        template.setElements(List.of(sticky));

        assertEquals(BOARD, service.usingTemplate(template, "owner1").getId());

        ArgumentCaptor<ElementWriter.CommitRequest> captor = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(elementWriter).commit(captor.capture());
        ElementWriter.CommitRequest req = captor.getValue();
        assertEquals(BOARD, req.boardId());
        assertEquals("owner1", req.userId());
        assertNull(req.sessionId());
        assertEquals("template", req.source());
        assertNull(req.mergeKey());
        assertNull(req.target());
        assertEquals(1, req.intents().size());
        Intent intent = req.intents().get(0);
        assertEquals("create", intent.kind());
        assertNotEquals("t1", intent.elementId());
        assertEquals(BOARD, intent.element().get("boardId"));
        assertEquals("owner1", intent.element().get("owner"));
        verifyNoInteractions(canvasPathService);
    }

    @Test
    void usingEmptyTemplateDoesNotTouchWriter() {
        when(boardService.createBoard(any(Board.class), eq("owner1"))).thenReturn(created());
        service.usingTemplate(new Template(), "owner1");
        verifyNoInteractions(elementWriter);
    }
}
```

- [ ] **Step 9: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='TemplateServiceImplTest'; echo "exit=$?"
```

Expected: `exit=1`. `usingTemplateCommitsElementsThroughWriterAsTemplateSource` errors with `java.lang.NullPointerException` (`boardElementRepository` is `null`, because the Mockito constructor injection gets no mock for `BoardElementRepository`, and `TemplateServiceImpl.java:114` calls `insert` on it). `usingEmptyTemplateDoesNotTouchWriter` passes.

- [ ] **Step 10: Route template elements through the writer**

In `IE213Backend/src/main/java/com/example/ie213backend/service/impl/TemplateServiceImpl.java`:

1. Replace line 4, `import com.example.ie213backend.repository.BoardElementRepository;`, with:

```java
import com.example.ie213backend.service.history.ElementNormalizer;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
```

2. Replace line 30, `    private final BoardElementRepository boardElementRepository;`, with:

```java
    private final ElementWriter elementWriter;
```

3. Replace lines 108-114:

```java
        List<BoardElement> elements = TemplateElementConverter.fromTemplate(template, () -> new ObjectId().toHexString());
        elements.forEach(e -> {
            e.setBoardId(createdBoard.getId());
            e.setOwner(ownerId);
            e.setVersion(1L);
        });
        if (!elements.isEmpty()) boardElementRepository.insert(elements);
```

with:

```java
        List<BoardElement> elements = TemplateElementConverter.fromTemplate(template, () -> new ObjectId().toHexString());
        List<Intent> intents = elements.stream().map(e -> {
            e.setBoardId(createdBoard.getId());
            e.setOwner(ownerId);
            e.setVersion(1L);
            return Intent.create(ElementNormalizer.full(e));
        }).toList();
        // ghi qua writer (source template) để có op log; không đến từ socket nên sessionId null
        if (!intents.isEmpty())
            elementWriter.commit(new ElementWriter.CommitRequest(
                    createdBoard.getId(), ownerId, null, "template", intents, null, null));
```

`BoardElement` still comes from the `com.example.ie213backend.domain.model.*` import (line 3). There is no other use of `boardElementRepository` in the file (`grep -n boardElementRepository` must print nothing).

- [ ] **Step 11: Run it and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='TemplateServiceImplTest'; echo "exit=$?"; grep -h "Tests run" target/surefire-reports/*TemplateServiceImplTest.txt
```

Expected: `exit=0` and `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`.

- [ ] **Step 12: Write the failing `BoardServiceImplHistorySeqTest` (historySeq order + no circular dependency)**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/impl/BoardServiceImplHistorySeqTest.java`:

```java
package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.repository.BoardCustomRepository;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.TemplateService;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.history.BoardLocks;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.StompBatchPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceImplHistorySeqTest {
    @Mock
    BoardCustomRepository boardCustomRepository;
    @Mock
    BoardElementRepository boardElementRepository;
    @Mock
    ElementWriter elementWriter;
    @InjectMocks
    BoardServiceImpl service;

    @Test
    void getBoardReadsHistorySeqBeforeElements() {
        BoardFullDetailResponse board = new BoardFullDetailResponse();
        board.setOwner("u");
        when(boardCustomRepository.getBoardWithCanvasPaths("b")).thenReturn(board);
        when(elementWriter.committedSeq("b")).thenReturn(42L);
        when(boardElementRepository.findByBoardIdOrderByZAsc("b")).thenReturn(List.of());

        BoardFullDetailResponse out = service.getBoard("b", "u");

        assertEquals(42L, out.getHistorySeq());
        // đọc seq trước elements: elements luôn mới bằng hoặc hơn historySeq (§9.2)
        InOrder order = inOrder(elementWriter, boardElementRepository);
        order.verify(elementWriter).committedSeq("b");
        order.verify(boardElementRepository).findByBoardIdOrderByZAsc("b");
    }

    @Test
    void elementWriterDependencyGraphNeverReachesBoardServices() {
        // BoardServiceImpl -> ElementWriter: writer mà phụ thuộc ngược BoardService thì Spring báo vòng
        List<Class<?>> forbidden = List.of(BoardService.class, BoardElementService.class, TemplateService.class);
        Set<Class<?>> seen = new HashSet<>();
        Deque<Class<?>> todo = new ArrayDeque<>(List.of(ElementWriter.class, StompBatchPublisher.class, BoardLocks.class));
        while (!todo.isEmpty()) {
            Class<?> c = todo.pop();
            if (!seen.add(c)) continue;
            for (Class<?> f : forbidden)
                assertFalse(f.isAssignableFrom(c), c.getName() + " phụ thuộc " + f.getSimpleName());
            for (Constructor<?> k : c.getDeclaredConstructors())
                for (Class<?> p : k.getParameterTypes())
                    if (p.getName().startsWith("com.example.ie213backend")) todo.push(p);
            for (Field f : c.getDeclaredFields())
                if (f.getType().getName().startsWith("com.example.ie213backend")) todo.push(f.getType());
        }
    }
}
```

`@InjectMocks` uses the biggest constructor of `BoardServiceImpl` (Lombok `@RequiredArgsConstructor`) and passes `null` for the collaborators that have no mock (`BoardRepository`, `UserRepository`, `MongoTemplate`, `NotificationService`), the same as `BoardServiceImplRoleTest` does today. `getBoard` does not touch those. `BatchPublisher` is an interface, so the walk starts from `StompBatchPublisher` explicitly. When Task 9 adds a `SnapshotJob` field to the writer, the walk reaches it on its own.

- [ ] **Step 13: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardServiceImplHistorySeqTest'; echo "exit=$?"
```

Expected: `exit=1` with `[ERROR] COMPILATION ERROR` `cannot find symbol ... method getHistorySeq()` in `BoardServiceImplHistorySeqTest.java`. The DTO has no `historySeq` field yet.

- [ ] **Step 14: Add `historySeq` to the DTO and set it in `getBoard`**

1. In `IE213Backend/src/main/java/com/example/ie213backend/domain/dto/BoardDto/BoardFullDetailResponse.java`, after line 19 (`    private List<BoardElement> elements;`), add:

```java
    // committedSeq của board lúc đọc (0 nếu chưa có counter); FE dùng làm lastSeq ban đầu
    private long historySeq;
```

2. In `IE213Backend/src/main/java/com/example/ie213backend/service/impl/BoardServiceImpl.java`:
   - After line 17 (`import com.example.ie213backend.service.NotificationService;`), add:

```java
import com.example.ie213backend.service.history.ElementWriter;
```

   - After line 45 (`    private final NotificationService notificationService;`), add:

```java
    private final ElementWriter elementWriter;
```

   - Replace line 64 (`        foundBoard.setElements(boardElementRepository.findByBoardIdOrderByZAsc(id));`, line 66 after the two insertions above) with:

```java
        // đọc seq trước elements: elements luôn mới bằng hoặc hơn historySeq, event trùng áp lại vô hại
        foundBoard.setHistorySeq(elementWriter.committedSeq(id));
        foundBoard.setElements(boardElementRepository.findByBoardIdOrderByZAsc(id));
```

- [ ] **Step 15: Run it and confirm it passes, then re-check the dependency grep**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardServiceImplHistorySeqTest,BoardServiceImplRoleTest'; echo "exit=$?"; grep -h "Tests run" target/surefire-reports/*BoardServiceImpl*.txt; grep -rnE "BoardService|BoardElementService|TemplateService" src/main/java/com/example/ie213backend/service/history src/main/java/com/example/ie213backend/config src/main/java/com/example/ie213backend/security; echo "grep-exit=$?"
```

Expected: `exit=0`, `BoardServiceImplHistorySeqTest` with `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`, and `BoardServiceImplRoleTest` with `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0` (its `@InjectMocks` now also gets `null` for `ElementWriter`, which `getRoleOfMember` never touches). The grep prints nothing and `grep-exit=1`: nothing in `service/history`, `config` or `security` references the board services, so there is no bean cycle. Put this result in the report as the circular-dependency verification.

- [ ] **Step 16: Checkpoint (gate)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='BoardElementServiceTest,BoardElementSocketControllerTest,TemplateServiceImplTest,BoardServiceImplHistorySeqTest,BoardServiceImplRoleTest,ElementPatchesTest,ElementValidatorTest,ElementMigrationTest,LegacyElementMapperTest,TemplateElementConverterTest,ElementLockRegistryTest,HistoryModelsTest,**/service/history/*Test'; echo "exit=$?"; grep -h "Tests run" target/surefire-reports/*.txt; grep -rn "requireConnectorEnds\|boardElementRepository.insert" src/main/java; echo "leftover-exit=$?"
```

Expected:
- `exit=0`, and every surefire line reads `Failures: 0, Errors: 0`. The Mongo integration tests from Task 6 show up as `Skipped` unless `MONGO_IT_URI` is set, which is fine.
- The last grep prints nothing (`leftover-exit=1`), which means no direct element write and no `requireConnectorEnds` remains outside the writer/planner. `ElementMigration` is the known exception (§6.8) and does not match these patterns.
- Do not run the full suite (`contextLoads` needs a full environment).

Report the results, including the Step 15 dependency-grep output and the transient FE regression note above. Do NOT commit.

---

### Task 8: UndoService + STOMP undo/redo

Spec: §7.1 (choosing T), §7.3 (undo), §7.4 (redo, LIFO), §7.5 examples 1, 2 and 6 (the restore variant of 6 is pinned at writer level here and via `HistoryService.restore` in Task 9's `HistoryIT`), §10 (VIEWER gets 403 on undo/redo, empty result goes to `/queue/history`). `UndoService` keeps no state in memory. The undo stack is read from `boardTxs` on every call, which is what makes undo work after a page reload or a STOMP reconnect (Review Focus 2). All reads (T or U, the ops, the board, the later ops) run inside `writer.withLock`, and `writer.commit` is re-entrant inside that lock (§6.1).

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/UndoService.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`: imports (current lines 5-7), a new last field after the field block (current lines 30-32), and two handlers after the `delete` handler (current lines 79-85). Task 7 edits this file first, so line numbers may shift. Anchor on the text named in the step.
- Test (new): `IE213Backend/src/test/java/com/example/ie213backend/service/history/UndoServiceTest.java` (Mockito, same style as `service/element/BoardElementServiceTest.java`)
- Test (new): `IE213Backend/src/test/java/com/example/ie213backend/service/history/UndoIT.java` (local Mongo, Global Constraints IT rules)
- Test (modify): `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java`: imports (lines 3-22), the constructor call at line 28, and two new tests at the end (before the closing `}` at line 94)

**Interfaces:**
- Consumes:
  - Task 1: `BoardTx` (`getId/getBoardId/getUserId/getSource/getState/getTarget/getSeqTo` plus setters), `BoardOp` (`getSeq/getTxId/getUserId/getKind/getElementId/getBefore/getAfter/getFsBefore/getFsAfter/getV` plus setters), `BoardElement.getFieldSeq()/setFieldSeq(Map<String,Long>)`.
  - Task 2: `ElementNormalizer.full(BoardElement)`, `ElementNormalizer.normalizeSet(Map<String,Object>)`, `ElementNormalizer.same(Object,Object)`, `Intent.create(Map<String,Object>)`, `Intent.patch(String, Map<String,Object>)`, `Intent.delete(String)`, record accessors `kind()`, `elementId()`, `set()`, `fsOverride()`.
  - Task 4: `HistoryResult(String op, int applied, List<Skip> skipped)`, `HistoryResult.Skip(String elementId, String key, String reason, String byUserId)`, `HistoryResult.empty(String op)`, `HistoryMath.Direction { UNDO, REDO }`, `HistoryMath.InverseResult(List<Intent> intents, List<HistoryResult.Skip> skipped)`, `static InverseResult HistoryMath.inverse(Direction dir, List<BoardOp> txOps, List<BoardOp> undoOps, Map<String,Map<String,Object>> current, String actorUserId, BiFunction<String, Long, List<BoardOp>> laterOps)`.
  - Task 6: `ElementWriter.withLock(String, Supplier<T>)`, `ElementWriter.commit(CommitRequest)`, `ElementWriter.loadBoard(String)`, `ElementWriter.opsOfTx(String, String)`, `ElementWriter.laterOps(String, String, long)`, `record ElementWriter.CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents, String mergeKey, String target)`, `record ElementWriter.CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops)` with `isEmpty()`, package-private field `Runnable afterWalHook`, `BoardLocks()`, `interface BatchPublisher { void publish(String boardId, BatchEvent event); }`, `record BatchEvent(String txId, String source, long seqFrom, long seqTo, String senderSessionId, String userId, List<Map<String,Object>> ops)`. Post-commit rules §6.6 (undo: target active→undone; redo: target undone→dead; user/restore: kills the user's undone txs) and roll-forward §6.5 are Task 6 behaviour that this task relies on.
  - Existing: `BoardService.getRoleOfMember(String boardId, String userId)` (`service/BoardService.java:19`; returns `OWNER|EDITOR|VIEWER|NONE`, `BoardServiceImpl.java:169-181`).
- Produces:
  - `@Service class UndoService { HistoryResult undo(String boardId, String userId, String sessionId); HistoryResult redo(String boardId, String userId, String sessionId); }`. Constructor (Lombok `@RequiredArgsConstructor`, field order): `UndoService(ElementWriter writer, MongoTemplate mongo, BoardService boardService)`. Task 9 does not depend on it.
  - STOMP `/app/board/{boardId}/el/undo` and `/app/board/{boardId}/el/redo` (empty body), both `@SendToUser("/queue/history")` returning `HistoryResult`. `BoardElementSocketController` gains a last constructor parameter `UndoService undoService`.

Behaviour decisions made here (inside the spec, not new scope):
- When there is no inverse (`intents` empty, the planner throws `IllegalArgumentException`, or `commit` returns `CommitResult.EMPTY`), T is set to `dead` with a conditional update (`state` must still be `active` for undo, `undone` for redo), and the result is `applied 0` with the inverse's `skipped`. A planner rejection adds `Skip(null, null, "end-missing", null)`, because the planner throws only `"connector end not found on this board"` (§6.3 step 4). If `skipped` would otherwise be empty, it gets `Skip(null, null, "empty", null)` so the FE toast always has a reason.
- Any other exception (Mongo error, `afterWalHook`, 503 "board busy") propagates to `@MessageExceptionHandler` (`/queue/errors`) and T is NOT marked dead. The roll-forward then completes the undo (§6.3, §10).
- Redo reads the user's `undone` txs first (one query). Only when there are some does it read the user's `source=undo` txs sorted by `seqTo` descending, and U is the first one whose `target` is in that undone set (§7.4).
- `applied` = number of ops in the commit (`CommitResult.ops().size()`), so a cascaded delete counts each element.

- [ ] **Step 1: Write the failing unit test `UndoServiceTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/UndoServiceTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UndoServiceTest {
    static final String B = "b";
    static final String ALICE = "alice";
    static final String BOB = "bob";
    static final String SID = "s1";
    static final String E = "650000000000000000000001";

    @Mock
    ElementWriter writer;
    @Mock
    MongoTemplate mongo;
    @Mock
    BoardService boardService;
    @InjectMocks
    UndoService service;

    private static BoardTx tx(String id, String source, String state, long seqTo, String target) {
        BoardTx t = new BoardTx();
        t.setId(id);
        t.setBoardId(B);
        t.setUserId(ALICE);
        t.setSource(source);
        t.setState(state);
        t.setSeqFrom(seqTo);
        t.setSeqTo(seqTo);
        t.setTarget(target);
        return t;
    }

    private static BoardOp patchX(long seq, String txId, String userId, double xBefore, double xAfter, long fsBefore, long fsAfter) {
        BoardOp o = new BoardOp();
        o.setSeq(seq);
        o.setTxId(txId);
        o.setUserId(userId);
        o.setKind("patch");
        o.setElementId(E);
        o.setBefore(new HashMap<>(Map.of("x", xBefore)));
        o.setAfter(new HashMap<>(Map.of("x", xAfter)));
        o.setFsBefore(new HashMap<>(Map.of("x", fsBefore)));
        o.setFsAfter(new HashMap<>(Map.of("x", fsAfter)));
        o.setV(seq);
        return o;
    }

    private static Map<String, Map<String, Object>> boardWith(double x, long fsX) {
        BoardElement e = new BoardElement();
        e.setId(E);
        e.setBoardId(B);
        e.setType("shape");
        e.setShape(new BoardElement.ShapeData("rect"));
        e.setX(x);
        e.setW(100);
        e.setH(80);
        e.setVersion(5L);
        e.setFieldSeq(new HashMap<>(Map.of("x", fsX)));
        Map<String, Map<String, Object>> board = new HashMap<>();
        board.put(E, ElementNormalizer.full(e));
        return board;
    }

    private void editor() {
        when(boardService.getRoleOfMember(B, ALICE)).thenReturn("EDITOR");
    }

    @SuppressWarnings("unchecked")
    private void lockRunsInline() {
        when(writer.withLock(eq(B), any(Supplier.class))).thenAnswer(inv -> ((Supplier<Object>) inv.getArgument(1)).get());
    }

    // phân biệt 3 query trên boardTxs theo criteria; doAnswer để stub lại được trong cùng test
    private void txQueries(List<BoardTx> undoStack, List<BoardTx> undone, List<BoardTx> undos) {
        doAnswer(inv -> {
            Document q = inv.<Query>getArgument(0).getQueryObject();
            if ("undone".equals(q.get("state"))) return undone;
            if ("undo".equals(q.get("source"))) return undos;
            return undoStack;
        }).when(mongo).find(any(Query.class), eq(BoardTx.class));
    }

    private void laterOps(List<BoardOp> later) {
        lenient().when(writer.laterOps(eq(B), eq(E), anyLong())).thenReturn(later);
    }

    private ElementWriter.CommitRequest capturedCommit() {
        ArgumentCaptor<ElementWriter.CommitRequest> c = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(writer).commit(c.capture());
        return c.getValue();
    }

    private void assertMarkedDead(String txId, String fromState) {
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(q.capture(), u.capture(), eq(BoardTx.class));
        assertEquals(txId, q.getValue().getQueryObject().get("_id"));
        assertEquals(fromState, q.getValue().getQueryObject().get("state"));
        assertEquals("dead", ((Document) u.getValue().getUpdateObject().get("$set")).get("state"));
    }

    @Test
    void undoPicksNewestActiveTxAndCommitsItsInverse() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t3", "user", "undone", 30, null), tx("t2", "redo", "dead", 20, "t0"),
                tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("u1", 31, 31, List.of(new BoardOp())));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals(new HistoryResult("undo", 1, List.of()), r);
        ElementWriter.CommitRequest req = capturedCommit();
        assertEquals(B, req.boardId());
        assertEquals(ALICE, req.userId());
        assertEquals(SID, req.sessionId());
        assertEquals("undo", req.source());
        assertEquals("t1", req.target());
        assertNull(req.mergeKey());
        assertEquals(1, req.intents().size());
        Intent i = req.intents().get(0);
        assertEquals("patch", i.kind());
        assertEquals(E, i.elementId());
        assertTrue(ElementNormalizer.same(0.0, i.set().get("x")), String.valueOf(i.set()));
        assertEquals(0L, i.fsOverride().get("x"));
        verify(mongo, never()).updateFirst(any(Query.class), any(Update.class), eq(BoardTx.class));
    }

    @Test
    void undoStackIsThe50NewestUndoableTxsAndAfter50UndosIsEmpty() {
        editor();
        lockRunsInline();
        List<BoardTx> fiftyUndone = new ArrayList<>();
        for (int k = 50; k >= 1; k--) fiftyUndone.add(tx("t" + k, "user", "undone", k, null));
        txQueries(fiftyUndone, List.of(), List.of());

        assertEquals(HistoryResult.empty("undo"), service.undo(B, ALICE, SID));

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(q.capture(), eq(BoardTx.class));
        Query stack = q.getValue();
        assertEquals(50, stack.getLimit());
        assertEquals(new Document("seqTo", -1), stack.getSortObject());
        Document crit = stack.getQueryObject();
        assertEquals(B, crit.get("boardId"));
        assertEquals(ALICE, crit.get("userId"));
        assertEquals(List.of("user", "redo", "restore"),
                new ArrayList<>((Collection<?>) ((Document) crit.get("source")).get("$in")));
        assertNull(crit.get("state"), "cap 50 tính trên mọi state");
        verify(writer, never()).commit(any());
        verify(writer, never()).opsOfTx(anyString(), anyString());
    }

    @Test
    void undoWithNoTxIsEmpty() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(), List.of());
        assertEquals(HistoryResult.empty("undo"), service.undo(B, ALICE, SID));
        verify(writer, never()).commit(any());
    }

    // §7.5 ví dụ 1: Bob đã ghi x sau T nên T không còn inverse, T chuyển dead
    @Test
    void undoMarksTDeadWhenTheKeyWasModifiedByAnotherUser() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(200, 12));
        laterOps(List.of(patchX(12, "tb", BOB, 100, 200, 10, 12)));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals("undo", r.op());
        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(E, "x", "modified", BOB)), r.skipped().toString());
        verify(writer, never()).commit(any());
        assertMarkedDead("t1", "active");
    }

    @Test
    void undoTreatsPlannerRejectionAsNoInverse() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenThrow(new IllegalArgumentException("connector end not found on this board"));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(null, null, "end-missing", null)), r.skipped().toString());
        assertMarkedDead("t1", "active");
    }

    @Test
    void viewerAndNonMemberCannotUndoOrRedo() {
        when(boardService.getRoleOfMember(B, "viewer")).thenReturn("VIEWER");
        when(boardService.getRoleOfMember(B, "stranger")).thenReturn("NONE");
        for (String user : List.of("viewer", "stranger")) {
            ResponseStatusException undo = assertThrows(ResponseStatusException.class, () -> service.undo(B, user, SID));
            ResponseStatusException redo = assertThrows(ResponseStatusException.class, () -> service.redo(B, user, SID));
            assertEquals(HttpStatus.FORBIDDEN, undo.getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, redo.getStatusCode());
        }
        verifyNoInteractions(writer, mongo);
    }

    // Review Focus 2: reload trang / reconnect STOMP = service mới, stack đọc lại từ boardTxs
    @Test
    void freshServiceInstanceOverSameStateStillFindsT() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("u1", 11, 11, List.of(new BoardOp())));

        UndoService fresh = new UndoService(writer, mongo, boardService);
        assertEquals(1, fresh.undo(B, ALICE, SID).applied());
        assertEquals("t1", capturedCommit().target());
        for (Field f : UndoService.class.getDeclaredFields())
            if (!Modifier.isStatic(f.getModifiers()))
                assertTrue(Modifier.isFinal(f.getModifiers()), "UndoService không được giữ state: " + f.getName());
    }

    @Test
    void redoReappliesTargetOfNewestUndoWhoseTargetIsUndone() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)),
                List.of(tx("u2", "undo", "active", 40, "t9"), tx("u1", "undo", "active", 30, "t1")));
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.opsOfTx(B, "u1")).thenReturn(List.of(patchX(30, "u1", ALICE, 100, 0, 10, 0)));
        when(writer.loadBoard(B)).thenReturn(boardWith(0, 0));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("r1", 41, 41, List.of(new BoardOp())));

        HistoryResult r = service.redo(B, ALICE, SID);

        assertEquals(new HistoryResult("redo", 1, List.of()), r);
        ElementWriter.CommitRequest req = capturedCommit();
        assertEquals("redo", req.source());
        assertEquals("t1", req.target());
        Intent i = req.intents().get(0);
        assertEquals("patch", i.kind());
        assertTrue(ElementNormalizer.same(100.0, i.set().get("x")), String.valueOf(i.set()));
        assertEquals(10L, i.fsOverride().get("x"));
    }

    @Test
    void redoIsEmptyWhenNoUndoTargetsAnUndoneTx() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(), List.of(tx("u1", "undo", "active", 30, "t1")));
        assertEquals(HistoryResult.empty("redo"), service.redo(B, ALICE, SID));

        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)), List.of(tx("u1", "undo", "active", 30, "t5")));
        assertEquals(HistoryResult.empty("redo"), service.redo(B, ALICE, SID));
        verify(writer, never()).commit(any());
    }

    // §7.5 ví dụ 2 biến thể: Bob ghi x sau khi Alice undo, redo bị chặn và T chuyển dead
    @Test
    void redoMarksTDeadWhenAnotherUserWroteTheKeyAfterTheUndo() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)), List.of(tx("u1", "undo", "active", 30, "t1")));
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.opsOfTx(B, "u1")).thenReturn(List.of(patchX(30, "u1", ALICE, 100, 0, 10, 0)));
        when(writer.loadBoard(B)).thenReturn(boardWith(50, 35));
        laterOps(List.of(patchX(35, "tb", BOB, 0, 50, 0, 35)));

        HistoryResult r = service.redo(B, ALICE, SID);

        assertEquals("redo", r.op());
        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(E, "x", "modified", BOB)), r.skipped().toString());
        verify(writer, never()).commit(any());
        assertMarkedDead("t1", "undone");
    }
}
```

- [ ] **Step 2: Write the failing integration test `UndoIT`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/UndoIT.java`. The test is in package `service.history` so it can set the package-private `ElementWriter.afterWalHook`. User writes go straight through `ElementWriter.commit(source="user")`, which is the same path `BoardElementService` uses after Task 7. That keeps this test independent of the `BoardElementService` constructor.

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class UndoIT {
    static final String CAROL = new ObjectId().toHexString();
    static final String ALICE = new ObjectId().toHexString();
    static final String BOB = new ObjectId().toHexString();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    BoardService boardService;
    UndoService undo;
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();
    String boardId;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        boardService = mock(BoardService.class);
        when(boardService.getRoleOfMember(anyString(), anyString())).thenReturn("EDITOR");
        writer = newWriter();
        undo = new UndoService(writer, mongo, boardService);
        boardId = new ObjectId().toHexString();
    }

    @AfterEach
    void tearDown() {
        mongo.getDb().drop();
        client.close();
    }

    // constructor của ElementWriter theo Task 6: (MongoTemplate, BoardLocks, BatchPublisher)
    private ElementWriter newWriter() {
        return new ElementWriter(mongo, new BoardLocks(), (b, ev) -> events.add(ev));
    }

    private Map<String, Object> shape(String id, double x) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(boardId);
        e.setOwner(CAROL);
        e.setType("shape");
        e.setShape(new BoardElement.ShapeData("rect"));
        e.setX(x);
        e.setW(100);
        e.setH(80);
        e.setVersion(1L);
        return ElementNormalizer.full(e);
    }

    private Map<String, Object> connector(String id, String from, String to) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(boardId);
        e.setOwner(CAROL);
        e.setType("connector");
        e.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        e.setVersion(1L);
        return ElementNormalizer.full(e);
    }

    private ElementWriter.CommitResult commit(String userId, Intent... intents) {
        return writer.commit(new ElementWriter.CommitRequest(boardId, userId, "s-" + userId, "user",
                List.of(intents), null, null));
    }

    private ElementWriter.CommitResult setX(String userId, String id, double x) {
        return commit(userId, Intent.patch(id, ElementNormalizer.normalizeSet(Map.<String, Object>of("x", x))));
    }

    private HistoryResult undoAlice() {
        return undo.undo(boardId, ALICE, "s-alice");
    }

    private HistoryResult redoAlice() {
        return undo.redo(boardId, ALICE, "s-alice");
    }

    private BoardElement el(String id) {
        return mongo.findById(id, BoardElement.class);
    }

    private String state(String txId) {
        return mongo.findById(txId, BoardTx.class).getState();
    }

    private BoardTx redoOf(String targetTxId) {
        return mongo.findOne(Query.query(Criteria.where("source").is("redo").and("target").is(targetTxId)), BoardTx.class);
    }

    private long pendingCount() {
        return mongo.count(Query.query(Criteria.where("state").is("pending")), BoardTx.class);
    }

    // Mongo có thể trả Integer hoặc Long; thiếu key = 0 (§5.1)
    private static long num(Map<String, ?> m, String key) {
        Object v = m == null ? null : m.get(key);
        return v == null ? 0L : ((Number) v).longValue();
    }

    private long fsX(String id) {
        return num(el(id).getFieldSeq(), "x");
    }

    private long fsBeforeX(String txId) {
        return num(writer.opsOfTx(boardId, txId).get(0).getFsBefore(), "x");
    }

    private long fsAfterX(String txId) {
        List<BoardOp> ops = writer.opsOfTx(boardId, txId);
        return num(ops.get(ops.size() - 1).getFsAfter(), "x");
    }

    // §7.5 ví dụ 1
    @Test
    void example1_undoSkipsKeyModifiedByAnotherUserAndKillsT() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();
        commit(BOB, Intent.patch(s, ElementNormalizer.normalizeSet(
                Map.<String, Object>of("style", Map.<String, Object>of("fill", "#ff0000")))));
        setX(BOB, s, 200);
        int broadcastsBefore = events.size();

        HistoryResult r = undoAlice();

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(s, "x", "modified", BOB)), r.skipped().toString());
        assertEquals("dead", state(t));
        assertEquals(200.0, el(s).getX());
        assertEquals(broadcastsBefore, events.size(), "không có inverse thì không commit, không broadcast");
        assertEquals(HistoryResult.empty("undo"), undoAlice());
    }

    // §7.5 ví dụ 2: một user undo/redo nhiều bước trên cùng key
    @Test
    void example2_multiStepUndoRedoByOneUser() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t1 = setX(ALICE, s, 100).txId();
        String t2 = setX(ALICE, s, 200).txId();
        long t1fsB = fsBeforeX(t1);
        long t1fsA = fsAfterX(t1);
        long t2fsA = fsAfterX(t2);
        assertEquals(t1fsA, fsBeforeX(t2));

        assertEquals(1, undoAlice().applied());          // undo T2
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("undone", state(t2));

        assertEquals(1, undoAlice().applied());          // undo T1
        assertEquals(0.0, el(s).getX());
        assertEquals(t1fsB, fsX(s));
        assertEquals("undone", state(t1));

        assertEquals(1, redoAlice().applied());          // redo LIFO: T1 trước
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("dead", state(t1));

        assertEquals(1, redoAlice().applied());          // redo T2
        assertEquals(200.0, el(s).getX());
        assertEquals(t2fsA, fsX(s));
        assertEquals("dead", state(t2));

        assertEquals(1, undoAlice().applied());          // undo R2
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("undone", redoOf(t2).getState());
    }

    // §7.5 ví dụ 2 biến thể: Bob ghi x sau khi Alice undo xong, redo bị chặn
    @Test
    void example2Variant_redoBlockedAfterAnotherUserWritesTheKey() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t1 = setX(ALICE, s, 100).txId();
        String t2 = setX(ALICE, s, 200).txId();
        assertEquals(1, undoAlice().applied());
        assertEquals(1, undoAlice().applied());
        setX(BOB, s, 50);

        HistoryResult r = redoAlice();

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(s, "x", "modified", BOB)), r.skipped().toString());
        assertEquals("dead", state(t1));
        assertEquals(50.0, el(s).getX());

        assertEquals(0, redoAlice().applied());          // T2 cũng bị chặn vì dấu x là của Bob
        assertEquals("dead", state(t2));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
    }

    // §7.5 ví dụ 6: undo, rồi thao tác mới (user), rồi redo -> empty (post-commit §6.6 giết tx undone)
    @Test
    void undoThenNewUserActionThenRedoIsEmpty() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals("undone", state(t));

        setX(ALICE, s, 50);

        assertEquals("dead", state(t));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
        assertEquals(50.0, el(s).getX());
    }

    // §7.5 ví dụ 6 biến thể restore, ở mức writer: commit(source="restore") của cùng user cũng giết tx undone.
    // Biến thể đầy đủ qua HistoryService.restore (OWNER) nằm trong HistoryIT của Task 9.
    @Test
    void undoThenRestoreCommitThenRedoIsEmpty() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals("undone", state(t));

        writer.commit(new ElementWriter.CommitRequest(boardId, ALICE, "s-alice", "restore",
                List.of(Intent.patch(s, ElementNormalizer.normalizeSet(Map.<String, Object>of("x", 30.0)))),
                null, null));

        assertEquals("dead", state(t));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
        assertEquals(30.0, el(s).getX());
    }

    @Test
    void undoFailingAfterWalIsRolledForwardByTheNextCommitAndCanBeRedone() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        writer.afterWalHook = () -> {
            throw new IllegalStateException("injected failure after WAL");
        };
        assertThrows(RuntimeException.class, this::undoAlice);
        writer.afterWalHook = () -> {
        };
        assertEquals(1, pendingCount());
        assertEquals("active", state(t), "post-commit chưa chạy nên T vẫn active");

        commit(BOB, Intent.create(shape(new ObjectId().toHexString(), 500)));   // withLock kế tiếp roll-forward

        assertEquals(0, pendingCount());
        assertEquals("undone", state(t));
        assertEquals(0.0, el(s).getX());

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(t));
    }

    @Test
    void undoRedoUndoCycle() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(t));

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(t));
        BoardTx r = redoOf(t);
        assertEquals("active", r.getState());

        assertEquals(1, undoAlice().applied());          // undo tx redo R
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(r.getId()));

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(r.getId()));
        assertEquals(0, pendingCount());
    }

    @Test
    void undoDeleteOfShapeWithConnectorRecreatesBoth() {
        String a = new ObjectId().toHexString();
        String b = new ObjectId().toHexString();
        String c = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(a, 0)), Intent.create(shape(b, 300)), Intent.create(connector(c, a, b)));
        long aVersion = el(a).getVersion();

        ElementWriter.CommitResult del = commit(ALICE, Intent.delete(a));
        assertEquals(Set.of(a, c), del.ops().stream().map(BoardOp::getElementId).collect(Collectors.toSet()));
        assertNull(el(a));
        assertNull(el(c));

        HistoryResult r = undoAlice();

        assertEquals(new HistoryResult("undo", 2, List.of()), r);
        assertNotNull(el(a));
        assertEquals(0.0, el(a).getX());
        assertTrue(el(a).getVersion() > aVersion, "version không bao giờ giảm");
        BoardElement conn = el(c);
        assertNotNull(conn);
        assertEquals(a, conn.getConnector().getFrom().getElementId());
        assertEquals(b, conn.getConnector().getTo().getElementId());
        assertEquals("undone", state(del.txId()));

        BatchEvent last = events.get(events.size() - 1);
        assertEquals("undo", last.source());
        assertEquals("s-alice", last.senderSessionId());
        Set<Object> created = new HashSet<>();
        last.ops().stream().filter(o -> "create".equals(o.get("op")))
                .forEach(o -> ((List<?>) o.get("elements")).forEach(e -> created.add(((Map<?, ?>) e).get("id"))));
        assertEquals(Set.of(a, c), created);

        assertEquals(2, redoAlice().applied());
        assertNull(el(a));
        assertNull(el(c));
        assertNotNull(el(b));
    }

    // Review Focus 2 ở mức IT: writer + service mới (như restart / reload), chỉ còn state trong Mongo
    @Test
    void undoWorksFromFreshWriterAndServiceInstances() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        UndoService fresh = new UndoService(newWriter(), mongo, boardService);

        assertEquals(1, fresh.undo(boardId, ALICE, "s-alice-2").applied());
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(t));
    }
}
```

Hand-off to Task 9: `undoThenRestoreCommitThenRedoIsEmpty` covers the §6.6 kill rule for `source="restore"` at writer level only, because `HistoryService` does not exist until Task 9. Task 9's `HistoryIT` must add the full §7.5 example-6 restore variant: the owner undoes a patch, then `history.restore(boardId, OWNER, "s-owner", someSeq)`, then `assertEquals(HistoryResult.empty("redo"), undo.redo(boardId, OWNER, "s-owner"))`.

- [ ] **Step 3: Run both tests and confirm they fail**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='UndoServiceTest,UndoIT'
```
Expected: FAIL at test-compile with `[ERROR] COMPILATION ERROR` and `cannot find symbol` / `symbol: class UndoService` in `UndoServiceTest.java` and `UndoIT.java`. Non-zero exit code. If the errors mention `ElementWriter`, `HistoryMath.inverse` or `HistoryResult`, Tasks 4/6 are not done. Stop and finish them first. If the only error is `constructor ElementWriter in class ElementWriter cannot be applied`, see the note in Step 6.

- [ ] **Step 4: Implement `UndoService`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/UndoService.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Undo/redo theo từng user; stack đọc lại từ boardTxs mỗi lần nên reload trang vẫn còn
@Service
@RequiredArgsConstructor
public class UndoService {
    static final int DEPTH = 50;
    private static final List<String> UNDOABLE = List.of("user", "redo", "restore");

    private final ElementWriter writer;
    private final MongoTemplate mongo;
    private final BoardService boardService;

    public HistoryResult undo(String boardId, String userId, String sessionId) {
        requireEditor(boardId, userId);
        return writer.withLock(boardId, () -> {
            BoardTx t = undoTarget(boardId, userId);
            if (t == null) return HistoryResult.empty("undo");
            HistoryMath.InverseResult inv = HistoryMath.inverse(HistoryMath.Direction.UNDO,
                    writer.opsOfTx(boardId, t.getId()), null, writer.loadBoard(boardId), userId,
                    (elementId, afterSeq) -> writer.laterOps(boardId, elementId, afterSeq));
            return apply("undo", boardId, userId, sessionId, t, "active", inv);
        });
    }

    public HistoryResult redo(String boardId, String userId, String sessionId) {
        requireEditor(boardId, userId);
        return writer.withLock(boardId, () -> {
            Map<String, BoardTx> undone = mongo.find(Query.query(Criteria.where("boardId").is(toOid(boardId))
                    .and("userId").is(userId).and("state").is("undone")), BoardTx.class)
                    .stream().collect(Collectors.toMap(BoardTx::getId, Function.identity(), (x, y) -> x));
            if (undone.isEmpty()) return HistoryResult.empty("redo");
            // LIFO theo thứ tự undo: U mới nhất có target đang undone
            BoardTx u = mongo.find(Query.query(Criteria.where("boardId").is(toOid(boardId))
                            .and("userId").is(userId).and("source").is("undo"))
                            .with(Sort.by(Sort.Direction.DESC, "seqTo")), BoardTx.class)
                    .stream().filter(x -> x.getTarget() != null && undone.containsKey(x.getTarget()))
                    .findFirst().orElse(null);
            if (u == null) return HistoryResult.empty("redo");
            BoardTx t = undone.get(u.getTarget());
            List<BoardOp> undoOps = writer.opsOfTx(boardId, u.getId());
            HistoryMath.InverseResult inv = HistoryMath.inverse(HistoryMath.Direction.REDO,
                    writer.opsOfTx(boardId, t.getId()), undoOps, writer.loadBoard(boardId), userId,
                    (elementId, afterSeq) -> writer.laterOps(boardId, elementId, afterSeq));
            return apply("redo", boardId, userId, sessionId, t, "undone", inv);
        });
    }

    private void requireEditor(String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if (!"EDITOR".equals(role) && !"OWNER".equals(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
    }

    // 50 tx mới nhất (mọi state) của user; T là tx active đầu tiên
    private BoardTx undoTarget(String boardId, String userId) {
        Query q = Query.query(Criteria.where("boardId").is(toOid(boardId))
                        .and("userId").is(userId).and("source").in(UNDOABLE))
                .with(Sort.by(Sort.Direction.DESC, "seqTo")).limit(DEPTH);
        return mongo.find(q, BoardTx.class).stream()
                .filter(tx -> "active".equals(tx.getState())).findFirst().orElse(null);
    }

    private HistoryResult apply(String op, String boardId, String userId, String sessionId,
                                BoardTx t, String fromState, HistoryMath.InverseResult inv) {
        List<HistoryResult.Skip> skipped = new ArrayList<>(inv.skipped());
        if (!inv.intents().isEmpty()) {
            try {
                ElementWriter.CommitResult res = writer.commit(new ElementWriter.CommitRequest(
                        boardId, userId, sessionId, op, inv.intents(), null, t.getId()));
                if (!res.isEmpty()) return new HistoryResult(op, res.ops().size(), skipped);
            } catch (IllegalArgumentException ex) {
                // planner chặn đầu connector: coi như không có inverse (§7.2)
                skipped.add(new HistoryResult.Skip(null, null, "end-missing", null));
            }
        }
        // không có inverse: T dead để lần sau tới tx trước đó, stack không bị kẹt
        mongo.updateFirst(Query.query(Criteria.where("_id").is(t.getId()).and("state").is(fromState)),
                Update.update("state", "dead"), BoardTx.class);
        if (skipped.isEmpty()) skipped.add(new HistoryResult.Skip(null, null, "empty", null));
        return new HistoryResult(op, 0, skipped);
    }

    private static Object toOid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
```

Notes:
- `toOid` copies the private helper `BoardElementService.toOid` (`service/element/BoardElementService.java:108-110`). That one is package-private in another package, and `BoardTx.boardId` is stored as `ObjectId` (`@Field(targetType = OBJECT_ID)`, Task 1). In the unit test `"b"` is not a valid ObjectId, so the criteria keeps the plain string the test asserts on.
- `requireEditor` runs before the lock (§6.2) and matches `BoardElementService.requireEditor` (`BoardElementService.java:26-30`), including the message. It depends on `BoardService` directly, not on `BoardElementService`, so there is no cycle with Task 7's `BoardElementService -> ElementWriter`.

- [ ] **Step 5: Run the unit test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='UndoServiceTest'
```
Expected: exit code 0 with no `[ERROR]` lines. Without `-q` the summary reads `Tests run: 10, Failures: 0, Errors: 0`. If `undoPicksNewestActiveTxAndCommitsItsInverse` fails on `fsOverride` or `set`, compare with Task 4's `HistoryMath.inverse` test for a single-key undo. The expected values come from §6.4 (undo writes `T.fsB`, redo writes `T.fsA`), so fix `inverse`, not this test.

- [ ] **Step 6: Run the integration test against local Mongo and confirm it passes**

Run:
```bash
docker start mobi-it-mongo 2>/dev/null || docker run -d --name mobi-it-mongo -p 27017:27017 mongo:7
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='UndoIT'
```
Expected: exit code 0 with no `[ERROR]` lines. Without `-q` the summary reads `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0`. `Skipped: 9` means `MONGO_IT_URI` was not exported in the same shell.

Note: `newWriter()` assumes that Task 6's `ElementWriter` is built by `@RequiredArgsConstructor` with the fields `MongoTemplate mongo, BoardLocks locks, BatchPublisher publisher` in that order (the contract does not pin the constructor). If Task 6 declared a different order or more collaborators, change only the body of `newWriter()` to match Task 6's IT, and use the same recording `BatchPublisher` lambda.

- [ ] **Step 7: Write the failing controller test**

Edit `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java`:

1. After line 6 (`import com.example.ie213backend.service.element.ElementPatches;`) add:
```java
import com.example.ie213backend.service.history.HistoryResult;
import com.example.ie213backend.service.history.UndoService;
```
2. After line 10 (`import org.springframework.messaging.simp.SimpMessageHeaderAccessor;`) add:
```java
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
```
3. After line 13 (the blank line after the `ResponseStatusException` import) add:
```java
import java.lang.reflect.Method;
```
4. Replace line 18 (`import static org.junit.jupiter.api.Assertions.assertEquals;`) with:
```java
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
```
5. Replace line 28 (`BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks);`) with the two lines below. If Task 7 already changed the argument list, keep its arguments and append `undo` as the last one:
```java
    UndoService undo = mock(UndoService.class);
    BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks, undo);
```
6. Before the class's closing `}` (line 94) add:
```java

    @Test
    void undoAndRedoDelegateWithUserAndSessionAndReplyOnHistoryQueue() throws Exception {
        HistoryResult undone = new HistoryResult("undo", 1, List.of());
        when(undo.undo("b", "viewer", "s1")).thenReturn(undone);
        when(undo.redo("b", "viewer", "s1")).thenReturn(HistoryResult.empty("redo"));

        assertEquals(undone, controller.undo("b", headers));
        assertEquals(HistoryResult.empty("redo"), controller.redo("b", headers));
        for (String name : List.of("undo", "redo")) {
            Method m = BoardElementSocketController.class.getMethod(name, String.class, SimpMessageHeaderAccessor.class);
            assertArrayEquals(new String[]{"/board/{boardId}/el/" + name}, m.getAnnotation(MessageMapping.class).value());
            assertArrayEquals(new String[]{"/queue/history"}, m.getAnnotation(SendToUser.class).value());
        }
        // kết quả chỉ về người bấm; batch do writer broadcast
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void viewerUndoIsForbiddenAndReportedOnErrorsQueue() {
        ResponseStatusException forbidden = new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
        when(undo.undo("b", "viewer", "s1")).thenThrow(forbidden);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.undo("b", headers));
        assertEquals(Map.of("reason", "Bạn không có quyền chỉnh sửa bảng này"), controller.onError(ex));
    }
```

- [ ] **Step 8: Run the controller test and confirm it fails**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardElementSocketControllerTest'
```
Expected: FAIL at test-compile with `[ERROR] COMPILATION ERROR`, `constructor BoardElementSocketController in class ... cannot be applied to given types` and `cannot find symbol` / `symbol: method undo(java.lang.String,org.springframework.messaging.simp.SimpMessageHeaderAccessor)`. Non-zero exit code.

- [ ] **Step 9: Add the undo/redo STOMP handlers**

Edit `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`:

1. After the import `com.example.ie213backend.service.element.ElementPatches;` (current line 7) add:
```java
import com.example.ie213backend.service.history.HistoryResult;
import com.example.ie213backend.service.history.UndoService;
```
2. After the last `private final` field (current line 32: `private final ElementLockRegistry lockRegistry;`, or the last field Task 7 left) add:
```java
    private final UndoService undoService;
```
3. After the closing `}` of the `delete` handler (current line 85, the method annotated `@MessageMapping("/board/{boardId}/el/delete")`) add:
```java

    // Kết quả undo/redo chỉ gửi về người bấm; thay đổi thật đi qua batch của writer
    @MessageMapping("/board/{boardId}/el/undo")
    @SendToUser("/queue/history")
    public HistoryResult undo(@DestinationVariable String boardId, SimpMessageHeaderAccessor headerAccessor) {
        return undoService.undo(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId());
    }

    @MessageMapping("/board/{boardId}/el/redo")
    @SendToUser("/queue/history")
    public HistoryResult redo(@DestinationVariable String boardId, SimpMessageHeaderAccessor headerAccessor) {
        return undoService.redo(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId());
    }
```
`MessageMapping`, `DestinationVariable`, `SendToUser` and `SimpMessageHeaderAccessor` are already imported (current lines 10, 12, 14, 16). Exceptions (403, 503 "board busy", Mongo errors) reach the existing `@MessageExceptionHandler` `onError` (current lines 120-125) and go to `/queue/errors`, as §10 requires.

- [ ] **Step 10: Run the controller test and confirm it passes**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='BoardElementSocketControllerTest'
```
Expected: exit code 0 with no `[ERROR]` lines. Without `-q` the summary reads `Tests run: 13, Failures: 0, Errors: 0` (11 from Task 7 plus 2 new ones).

- [ ] **Step 11: Checkpoint (run the gate)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='UndoServiceTest,BoardElementSocketControllerTest,BoardElementServiceTest'
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='UndoIT'
```
Expected: all three commands exit 0 with no `[ERROR]` lines. The task adds 10 (`UndoServiceTest`) + 7 (`UndoIT`, not skipped) + 2 (`BoardElementSocketControllerTest`) tests. `BoardElementServiceTest` is included to show that Task 7's service is unchanged. Report the results (including whether `UndoIT` ran or was skipped); do NOT commit.

---

### Task 9: SnapshotJob, HistoryService, HistoryController, STOMP restore

Spec: §8.1 (REST history + state, 403 for non-members, 400 for `seq > committedSeq`), §8.2 (state at N = nearest snapshot ≤ N + replay of committed ops, async snapshot every 200 seq, errors only logged, invariant), §8.3 (OWNER-only restore inside `withLock`, diff → `commit(source="restore")`), §6.3 step 14 (snapshot trigger), §10 (403/400 rows). Pins Review Focus 4 (restore to seq 0 on a migrated board seeded without a counter) and, as a side effect, Review Focus 5 (restore recreates an `image` element with its payload intact).

**Files:**
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/SnapshotJob.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryService.java`
- Create: `IE213Backend/src/main/java/com/example/ie213backend/controller/HistoryController.java`
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementWriter.java` (created by Task 6; line numbers below are those of the Task 6 code block): import block (lines 8-23), a new field + setter after the test-hook fields (lines 35-38), one call between the `publisher.publish(...)` statement (lines 147-148) and `return new CommitResult(txId, seqFrom, seqTo, ops);` (line 149) in `doCommit`.
- Modify: `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`: imports (on disk today lines 5-7; Task 8 adds `service.history.HistoryResult` / `UndoService` imports right after line 7), the field block (today lines 30-32; Task 8 appends `private final UndoService undoService;`), one handler after Task 8's `redo` handler (today the `unlock` handler ends at line 107 and the comment `// Người giữ lock mất kết nối...` is line 109). Anchor on the text named in the step, not on the numbers.
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/SnapshotJobTest.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryServiceTest.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/controller/HistoryControllerTest.java`
- Test (create): `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryIT.java` (local Mongo, env-gated)
- Test (modify): `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java`: imports, the `new BoardElementSocketController(...)` field (today line 28; Task 8 makes it `new BoardElementSocketController(service, messaging, locks, undo)` after `UndoService undo = mock(UndoService.class);`), two new tests before the class's closing `}`.

Style references read from disk:
- `controller/BoardController.java:18-32`: `@RestController`, `@RequestMapping("${api.prefix}/board")`, `@RequiredArgsConstructor`, and the current user comes from `@RequestAttribute("user") UserDto userDto` (set by `security/JwtAuthenticationFilter.java:56`). `api.prefix=/api/v1` (`src/main/resources/application.properties:22`).
- `service/impl/BoardServiceImpl.java:169-181`: `getRoleOfMember` returns `OWNER | EDITOR | VIEWER | NONE` and throws 404 itself when the board is missing.
- `repository/UserRepository.java:11` (`MongoRepository<User, String>`, so `findAllById(Iterable<String>)` exists), `domain/model/User.java:21-25` (`id`, `firstName`, `lastName`, Lombok `@Getter @Setter`).
- `service/element/BoardElementService.java:19-30` (`@Service @RequiredArgsConstructor`, Vietnamese 403 message) and `:108-110` (`toOid`). `SnapshotJob`/`HistoryService` copy it as a private `oid()`, like `ElementWriter` does.
- `service/element/ElementMigration.java:7,25` (`lombok.extern.slf4j.Slf4j` + `@Slf4j` for logging).
- `src/main/resources/application.properties:2` (`spring.data.mongodb.auto-index-creation=true`): in production the unique `snap_board_seq` index exists, so a second insert of the same `(boardId, seq)` throws `DuplicateKeyException`. The IT creates that index by hand, as Task 6's `ElementWriterIT` does for `boardOps`.
- Tests: `BoardElementServiceTest.java:23-31` (`@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`), `BoardElementSocketControllerTest.java:24-40` (plain `mock(...)` fields), Task 6 `ElementWriterIT` / Task 8 `UndoIT` (hand-wired `new ElementWriter(mongo, new BoardLocks(), (b, ev) -> events.add(ev))`, `new UndoService(writer, mongo, boardService)`).

**Interfaces:**
- Consumes:
  - Task 1: `BoardOp` (`getSeq/getAfter/getFsAfter/getV`, setters), `BoardTx` (`getId/getUserId/getTs/getSource/getState/getSummary/getSeqTo/getSeqFrom/getPending`, setters; `BoardTx.Pending(long seqFrom, long seqTo, List<BoardOp> ops)`, `BoardTx.Summary(int created, int patched, int deleted)`), `BoardCounter`, `BoardSnapshot` (`getId/getBoardId/getSeq/getElements`, setters).
  - Task 2: `ElementKeys.K`, `ElementKeys.connectorEnds(Map<String,Object>)`, `ElementNormalizer.full(BoardElement)`, `ElementNormalizer.normalizeSet(Map<String,Object>)`, `ElementNormalizer.same(Object,Object)`, `Intent.create(Map)`, `Intent.patch(String, Map)`, `Intent.delete(String)`, `Intent.kind()/elementId()`.
  - Task 3: `static Map<String,Map<String,Object>> HistoryMath.replay(Map<String,Map<String,Object>> base, List<BoardOp> ops)`, `static List<Intent> HistoryMath.diff(Map<String,Map<String,Object>> target, Map<String,Map<String,Object>> current)`.
  - Task 4: `record HistoryResult(String op, int applied, List<Skip> skipped)`, `HistoryResult.Skip(String elementId, String key, String reason, String byUserId)`, `static HistoryResult empty(String op)`.
  - Task 6: `ElementWriter(MongoTemplate, BoardLocks, BatchPublisher)`, `<T> T withLock(String, Supplier<T>)`, `CommitResult commit(CommitRequest)`, `Map<String,Map<String,Object>> loadBoard(String)`, `long committedSeq(String)`, `record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents, String mergeKey, String target)`, `record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops)` + `isEmpty()`, `BoardLocks()`, `BatchPublisher`, `BatchEvent(txId, source, seqFrom, seqTo, senderSessionId, userId, ops)`. Snapshot 0 + counter are created by the writer on the first commit of a board (§6.3 step 1).
  - Task 8: `UndoService(ElementWriter writer, MongoTemplate mongo, BoardService boardService)`, `HistoryResult undo(String boardId, String userId, String sessionId)` (restore txs are on the undo stack, §7.1). `BoardElementSocketController` constructor `(service, messaging, locks, undoService)`.
  - Existing: `BoardService.getRoleOfMember(String, String)`, `UserRepository.findAllById(Iterable<String>)`.
- Produces (exact contract names):
  - `@Service public class SnapshotJob` — constructor `SnapshotJob(MongoTemplate mongo)` (Lombok); `public void maybeSnapshot(String boardId, long prevSeqTo, long seqTo)`; `public BoardSnapshot build(String boardId, long seq)`. Package-private (not in the contract, same package only): `Map<String,Map<String,Object>> replayTo(String boardId, long seq)` (the shared "nearest snapshot + replay" routine) and `@PreDestroy void shutdown()`.
  - `@Service public class HistoryService` — constructor `HistoryService(ElementWriter writer, SnapshotJob snapshotJob, BoardService boardService, UserRepository userRepository, MongoTemplate mongo)` (Lombok, field order); `public record TxView(String txId, String userId, String userName, Instant ts, String source, String state, BoardTx.Summary summary, long seqTo)`; `public record StateView(long seq, List<Map<String,Object>> elements)`; `public List<TxView> list(String boardId, String userId, Long beforeSeq, int limit)`; `public StateView stateAt(String boardId, String userId, long seq)`; `public Map<String,Map<String,Object>> stateMap(String boardId, long seq)`; `public HistoryResult restore(String boardId, String userId, String sessionId, long seq)`.
  - `ElementWriter` gains package-private `@Autowired(required = false) void setSnapshotJob(SnapshotJob)`; its constructor stays `(MongoTemplate, BoardLocks, BatchPublisher)`, so every Task 6-8 test that does `new ElementWriter(...)` compiles unchanged and simply never snapshots.
  - REST `GET ${api.prefix}/board/{id}/history?beforeSeq=&limit=` → `List<HistoryService.TxView>` (limit default 30); `GET ${api.prefix}/board/{id}/history/state?seq=` → `HistoryService.StateView`.
  - STOMP `/app/board/{boardId}/el/restore` with body `{seq: number}`, `@SendToUser("/queue/history")`, returns `HistoryResult`. `BoardElementSocketController` gains a last constructor parameter `HistoryService historyService`.

Behaviour decisions made here (inside the spec, not new scope):
- "Ops of non-pending txs" is implemented as "ops whose seq is not inside the `pending.seqFrom..seqTo` range of a `state=pending` tx". For a normal tx this is identical. For a tx that is being merged (Task 6 sets the whole tx doc to `pending` while it appends a new range), the earlier, already committed ops of that tx stay visible, which is what §8.2 means.
- No snapshot ≤ N and no `boardCounters` doc: the board has never been committed through the writer, so its current `boardElements` are the state at seq 0 (this is what lets `restore(0)` on a fresh migrated board return `empty`). No snapshot but a counter exists (should not happen, snapshot 0 is written first): replay from an empty board.
- The snapshot target seq is `(seqTo / 200) * 200`. It is ≤ `seqTo` ≤ `committedSeq` when the job is submitted (the call sits after post-commit), so the job never snapshots past `committedSeq` (§8.2).
- `restore` returns `applied = CommitResult.ops().size()` (same counting as Task 8's undo). A diff whose commit is dropped entirely by the planner returns `HistoryResult.empty("restore")`.
- `stateAt` returns the elements sorted by `z` ascending (the FE renders in that order), and also rejects `seq < 0` with 400.
- `userName` = `(firstName + " " + lastName).trim()` with null parts treated as `""`; an unknown user gives `""`.

- [ ] **Step 1: Write the failing `SnapshotJobTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/SnapshotJobTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SnapshotJobTest {
    static final String B = "650000000000000000000009";
    static final String A = "650000000000000000000001";

    MongoTemplate mongo = mock(MongoTemplate.class);
    SnapshotJob job = new SnapshotJob(mongo);

    @AfterEach
    void tearDown() {
        job.shutdown();
    }

    private static Map<String, Object> el(String id, double x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", "sticky");
        m.put("image", null);
        m.put("x", x);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static BoardSnapshot snapshot(long seq, List<Map<String, Object>> elements) {
        BoardSnapshot s = new BoardSnapshot();
        s.setId(new ObjectId().toHexString());
        s.setBoardId(B);
        s.setSeq(seq);
        s.setElements(elements);
        return s;
    }

    private static BoardOp patchX(long seq, double x) {
        BoardOp op = new BoardOp();
        op.setSeq(seq);
        op.setKind("patch");
        op.setElementId(A);
        op.setAfter(Map.of("x", x));
        op.setFsAfter(Map.of("x", seq));
        op.setV(2);
        return op;
    }

    @Test
    void noSnapshotWhenSeqDoesNotCrossAMultipleOf200() {
        job.maybeSnapshot(B, 198, 199);
        job.maybeSnapshot(B, 200, 399);
        job.maybeSnapshot(B, 0, 0);
        job.shutdown();
        verifyNoInteractions(mongo);
    }

    @Test
    void crossingBuildsAtTheMultipleAsynchronously() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(snapshot(400, List.of()));
        // tx merge có thể nhảy qua nhiều mốc: chụp tại mốc cao nhất <= seqTo
        job.maybeSnapshot(B, 150, 401);
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo, timeout(2000)).findOne(q.capture(), eq(BoardSnapshot.class));
        assertEquals(400L, q.getValue().getQueryObject().get("seq"));
        assertEquals(new ObjectId(B), q.getValue().getQueryObject().get("boardId"));
        job.shutdown();
        verify(mongo, never()).insert(any(BoardSnapshot.class));
    }

    @Test
    void buildErrorIsOnlyLoggedAndTheJobKeepsRunning() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class)))
                .thenThrow(new RuntimeException("mongo down"))
                .thenReturn(snapshot(400, List.of()));
        assertDoesNotThrow(() -> job.maybeSnapshot(B, 199, 200));
        job.maybeSnapshot(B, 399, 400);
        verify(mongo, timeout(2000).times(2)).findOne(any(Query.class), eq(BoardSnapshot.class));
    }

    @Test
    void buildReplaysCommittedOpsOnNearestSnapshotAndSkipsPendingRange() {
        BoardSnapshot snap0 = snapshot(0, List.of(el(A, 0)));
        // lần 1: chưa có snapshot 200; lần 2: snapshot gần nhất <= 200 là snapshot 0
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(null, snap0);
        BoardTx pending = new BoardTx();
        pending.setState("pending");
        pending.setSeqFrom(130);
        pending.setSeqTo(130);
        pending.setPending(new BoardTx.Pending(130, 130, List.of()));
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of(pending));
        when(mongo.find(any(Query.class), eq(BoardOp.class))).thenReturn(List.of(patchX(120, 50), patchX(130, 999)));
        when(mongo.insert(any(BoardSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));

        BoardSnapshot out = job.build(B, 200);

        assertEquals(B, out.getBoardId());
        assertEquals(200, out.getSeq());
        assertEquals(1, out.getElements().size());
        Map<String, Object> a = out.getElements().get(0);
        assertEquals(50.0, a.get("x"), "op của tx đang pending không được replay");
        assertEquals(Map.of("x", 120L), a.get("fieldSeq"));
        assertEquals(0.0, snap0.getElements().get(0).get("x"), "không sửa snapshot gốc");

        ArgumentCaptor<Query> ops = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(ops.capture(), eq(BoardOp.class));
        assertEquals(new Document("$gt", 0L).append("$lte", 200L), ops.getValue().getQueryObject().get("seq"));
        assertEquals(new Document("seq", 1), ops.getValue().getSortObject());
    }

    @Test
    void buildReturnsTheExistingSnapshotOnDuplicateKey() {
        BoardSnapshot existing = snapshot(200, List.of(el(A, 7)));
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class)))
                .thenReturn(null, snapshot(0, List.of(el(A, 0))), existing);
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of());
        when(mongo.find(any(Query.class), eq(BoardOp.class))).thenReturn(List.of());
        when(mongo.insert(any(BoardSnapshot.class))).thenThrow(new DuplicateKeyException("dup (boardId, seq)"));

        assertSame(existing, job.build(B, 200));
    }

    @Test
    void boardWithoutSnapshotOrCounterIsItsCurrentElements() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(null);
        when(mongo.exists(any(Query.class), eq(BoardCounter.class))).thenReturn(false);
        BoardElement e = new BoardElement();
        e.setId(A);
        e.setBoardId(B);
        e.setType("sticky");
        e.setX(5);
        when(mongo.find(any(Query.class), eq(BoardElement.class))).thenReturn(List.of(e));

        Map<String, Map<String, Object>> state = job.replayTo(B, 0);

        assertEquals(Set.of(A), state.keySet());
        assertEquals(5.0, state.get(A).get("x"));
        verify(mongo, never()).find(any(Query.class), eq(BoardOp.class));
    }
}
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='SnapshotJobTest'
```

Expected: non-zero exit, `[ERROR] COMPILATION ERROR` in `testCompile` with `cannot find symbol ... class SnapshotJob`.

- [ ] **Step 3: Implement `SnapshotJob`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/SnapshotJob.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

// Snapshot board mỗi 200 seq để dựng trạng thái lịch sử không phải replay từ đầu (spec §8.2)
@Slf4j
@Service
@RequiredArgsConstructor
public class SnapshotJob {
    static final long EVERY = 200;

    private final MongoTemplate mongo;
    // một thread: snapshot chạy tuần tự, không giữ lock của board
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "board-snapshot");
        t.setDaemon(true);
        return t;
    });

    public void maybeSnapshot(String boardId, long prevSeqTo, long seqTo) {
        if (seqTo / EVERY <= prevSeqTo / EVERY) return;
        long at = (seqTo / EVERY) * EVERY;
        executor.submit(() -> {
            try {
                build(boardId, at);
            } catch (Exception e) {
                log.error("snapshot failed board={} seq={}", boardId, at, e);
            }
        });
    }

    public BoardSnapshot build(String boardId, long seq) {
        BoardSnapshot existing = exact(boardId, seq);
        if (existing != null) return existing;
        BoardSnapshot snap = new BoardSnapshot();
        snap.setBoardId(boardId);
        snap.setSeq(seq);
        snap.setElements(new ArrayList<>(replayTo(boardId, seq).values()));
        try {
            return mongo.insert(snap);
        } catch (DuplicateKeyException e) {
            // lần build khác vừa ghi cùng (boardId, seq): nội dung giống nhau
            return exact(boardId, seq);
        }
    }

    // Trạng thái tại seq: snapshot gần nhất <= seq + replay op đã commit trong (snap.seq, seq]
    Map<String, Map<String, Object>> replayTo(String boardId, long seq) {
        Object bid = oid(boardId);
        BoardSnapshot snap = mongo.findOne(Query.query(Criteria.where("boardId").is(bid).and("seq").lte(seq))
                .with(Sort.by(Sort.Direction.DESC, "seq")).limit(1), BoardSnapshot.class);
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        long from = 0;
        if (snap != null) {
            if (snap.getElements() != null)
                snap.getElements().forEach(e -> base.put((String) e.get("id"), e));
            from = snap.getSeq();
        } else if (!mongo.exists(Query.query(Criteria.where("_id").is(bid)), BoardCounter.class)) {
            // board chưa từng commit qua writer: trạng thái hiện tại chính là seq 0
            mongo.find(Query.query(Criteria.where("boardId").is(bid)), BoardElement.class)
                    .forEach(e -> base.put(e.getId(), ElementNormalizer.full(e)));
            return base;
        }
        List<long[]> pending = pendingRanges(bid);
        List<BoardOp> ops = mongo.find(Query.query(Criteria.where("boardId").is(bid).and("seq").gt(from).lte(seq))
                        .with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class).stream()
                .filter(op -> pending.stream().noneMatch(r -> op.getSeq() >= r[0] && op.getSeq() <= r[1]))
                .toList();
        return HistoryMath.replay(base, ops);
    }

    // Dải seq của tx đang pending (tx merge giữ nguyên các op đã commit trước đó)
    private List<long[]> pendingRanges(Object bid) {
        List<long[]> ranges = new ArrayList<>();
        mongo.find(Query.query(Criteria.where("boardId").is(bid).and("state").is("pending")), BoardTx.class)
                .forEach(tx -> ranges.add(tx.getPending() != null
                        ? new long[]{tx.getPending().getSeqFrom(), tx.getPending().getSeqTo()}
                        : new long[]{tx.getSeqFrom(), tx.getSeqTo()}));
        return ranges;
    }

    private BoardSnapshot exact(String boardId, long seq) {
        return mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("seq").is(seq)),
                BoardSnapshot.class);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
        try {
            executor.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
```

Note: Lombok `@RequiredArgsConstructor` skips the initialized `final` field `executor`, so the constructor is `SnapshotJob(MongoTemplate mongo)`.

- [ ] **Step 4: Run it and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='SnapshotJobTest'
```

Expected: exit code 0, no `[ERROR]`; `target/surefire-reports/com.example.ie213backend.service.history.SnapshotJobTest.txt` shows `Tests run: 6, Failures: 0, Errors: 0, Skipped: 0`. The `buildErrorIsOnlyLogged...` test prints one `ERROR ... snapshot failed board=650000000000000000000009 seq=200` log line with the `mongo down` stack trace; that is expected.

- [ ] **Step 5: Call `maybeSnapshot` from `ElementWriter.doCommit` after the broadcast**

Edit `IE213Backend/src/main/java/com/example/ie213backend/service/history/ElementWriter.java` (Task 6 file):

1. After `import lombok.RequiredArgsConstructor;` (line 8) add:
```java
import org.springframework.beans.factory.annotation.Autowired;
```
2. After the test-hook fields (lines 35-38, ending with the `Runnable afterWalHook = () -> {` / `};` pair) add:
```java

    // setter injection: giữ nguyên constructor (MongoTemplate, BoardLocks, BatchPublisher) mà các test tự new
    private SnapshotJob snapshotJob;

    @Autowired(required = false)
    void setSnapshotJob(SnapshotJob snapshotJob) {
        this.snapshotJob = snapshotJob;
    }
```
3. In `doCommit`, between the broadcast statement (lines 147-148, `publisher.publish(boardId, new BatchEvent(txId, req.source(), seqFrom, seqTo, req.sessionId(), req.userId(),` / `eventOps(ops)));`) and `return new CommitResult(txId, seqFrom, seqTo, ops);` (line 149) add:
```java
        // §6.3 bước 14: seqTo vượt bội số 200 thì chụp snapshot (bất đồng bộ, lỗi chỉ log)
        if (snapshotJob != null) snapshotJob.maybeSnapshot(boardId, seqFrom - 1, seqTo);
```
`seqFrom - 1` is the counter value before this commit (`prevSeqTo`). It is the range of this commit, not of a merged tx, so a merge still triggers exactly once per crossing. There is no bean cycle: `SnapshotJob` depends only on `MongoTemplate`.

Then compile:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile
```
Expected: exit code 0, no output. The wiring is proven by `HistoryIT.snapshotAt200...` (Step 16), which waits for the snapshot without calling `build` itself.

- [ ] **Step 6: Write the failing `HistoryServiceTest`**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryServiceTest.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HistoryServiceTest {
    static final String B = "650000000000000000000009";

    @Mock
    ElementWriter writer;
    @Mock
    SnapshotJob snapshotJob;
    @Mock
    BoardService boardService;
    @Mock
    UserRepository userRepository;
    @Mock
    MongoTemplate mongo;
    @InjectMocks
    HistoryService service;

    private static Map<String, Object> el(String id, double x, double z) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", "sticky");
        m.put("image", null);
        m.put("x", x);
        m.put("z", z);
        return m;
    }

    private static BoardTx tx(String id, String userId, long seqTo) {
        BoardTx t = new BoardTx();
        t.setId(id);
        t.setUserId(userId);
        t.setTs(Instant.parse("2026-09-25T08:00:00Z"));
        t.setSource("user");
        t.setState("active");
        t.setSeqTo(seqTo);
        t.setSummary(new BoardTx.Summary(0, 1, 0));
        return t;
    }

    private static User user(String id, String first, String last) {
        User u = new User();
        u.setId(id);
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    private void lockRunsInline() {
        when(writer.withLock(eq(B), any())).thenAnswer(inv -> ((Supplier<?>) inv.getArgument(1)).get());
    }

    private static int status(ResponseStatusException e) {
        return e.getStatusCode().value();
    }

    @Test
    void nonMemberGets403OnListAndStateAt() {
        when(boardService.getRoleOfMember(B, "x")).thenReturn("NONE");
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.list(B, "x", null, 30))));
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "x", 0))));
        verifyNoInteractions(mongo, writer, snapshotJob, userRepository);
    }

    @Test
    void nonOwnerGets403OnRestore() {
        when(boardService.getRoleOfMember(B, "e")).thenReturn("EDITOR");
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "e", "s1", 0))));
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "v", "s1", 0))));
        verifyNoInteractions(writer, snapshotJob, mongo);
    }

    @Test
    void listClampsLimitSortsBySeqToDescAndExcludesPending() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of());

        service.list(B, "v", null, 500);
        service.list(B, "v", null, 0);
        service.list(B, "v", null, -5);
        service.list(B, "v", null, 30);

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo, times(4)).find(q.capture(), eq(BoardTx.class));
        assertEquals(List.of(100, 1, 1, 30), q.getAllValues().stream().map(Query::getLimit).toList());
        Document filter = q.getAllValues().get(0).getQueryObject();
        assertEquals(new ObjectId(B), filter.get("boardId"));
        assertEquals(new Document("$ne", "pending"), filter.get("state"));
        assertFalse(filter.containsKey("seqTo"), "không có beforeSeq thì không lọc seqTo");
        assertEquals(new Document("seqTo", -1), q.getAllValues().get(0).getSortObject());
        verifyNoInteractions(userRepository);
    }

    @Test
    void listBeforeSeqIsExclusiveAndJoinsUserNames() {
        when(boardService.getRoleOfMember(B, "u1")).thenReturn("EDITOR");
        when(mongo.find(any(Query.class), eq(BoardTx.class)))
                .thenReturn(List.of(tx("t3", "u1", 42), tx("t2", "u2", 41), tx("t1", "u3", 40)));
        when(userRepository.findAllById(any())).thenReturn(List.of(user("u1", "An", "Nguyen"), user("u2", "Binh", null)));

        List<HistoryService.TxView> out = service.list(B, "u1", 50L, 30);

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(q.capture(), eq(BoardTx.class));
        assertEquals(new Document("$lt", 50L), q.getValue().getQueryObject().get("seqTo"));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<String>> ids = ArgumentCaptor.forClass(Iterable.class);
        verify(userRepository).findAllById(ids.capture());
        Set<String> asked = new java.util.HashSet<>();
        ids.getValue().forEach(asked::add);
        assertEquals(Set.of("u1", "u2", "u3"), asked);

        assertEquals(List.of("An Nguyen", "Binh", ""), out.stream().map(HistoryService.TxView::userName).toList());
        HistoryService.TxView first = out.get(0);
        assertEquals("t3", first.txId());
        assertEquals("u1", first.userId());
        assertEquals(42, first.seqTo());
        assertEquals("user", first.source());
        assertEquals("active", first.state());
        assertEquals(1, first.summary().getPatched());
        assertEquals(Instant.parse("2026-09-25T08:00:00Z"), first.ts());
    }

    @Test
    void stateAtRejectsSeqAfterCommittedSeq() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(writer.committedSeq(B)).thenReturn(5L);
        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "v", 6))));
        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "v", -1))));
        verifyNoInteractions(snapshotJob);
    }

    @Test
    void stateAtReturnsReplayedElementsSortedByZ() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(writer.committedSeq(B)).thenReturn(5L);
        Map<String, Map<String, Object>> state = new LinkedHashMap<>();
        state.put("a", el("a", 0, 2));
        state.put("b", el("b", 0, 1));
        when(snapshotJob.replayTo(B, 3L)).thenReturn(state);

        HistoryService.StateView view = service.stateAt(B, "v", 3);

        assertEquals(3, view.seq());
        assertEquals(List.of("b", "a"), view.elements().stream().map(e -> (String) e.get("id")).toList());
    }

    @Test
    void restoreRejectsSeqAfterCommittedSeqInsideTheLock() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);

        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "o", "s1", 6))));

        InOrder order = inOrder(writer);
        order.verify(writer).withLock(eq(B), any());
        order.verify(writer).committedSeq(B);
        verify(writer, never()).commit(any());
    }

    @Test
    void restoreWithEmptyDiffReturnsEmptyAndDoesNotCommit() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);
        when(snapshotJob.replayTo(B, 2L)).thenReturn(Map.of("a", el("a", 10, 1)));
        when(writer.loadBoard(B)).thenReturn(Map.of("a", el("a", 10, 1)));

        assertEquals(HistoryResult.empty("restore"), service.restore(B, "o", "s1", 2));
        verify(writer, never()).commit(any());
    }

    @Test
    void restoreCommitsTheDiffAsARestoreTx() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);
        when(snapshotJob.replayTo(B, 2L)).thenReturn(Map.of("a", el("a", 0, 1)));
        Map<String, Map<String, Object>> current = new LinkedHashMap<>();
        current.put("a", el("a", 100, 1));
        current.put("b", el("b", 5, 1));
        when(writer.loadBoard(B)).thenReturn(current);
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("tx9", 6, 7, List.of(new BoardOp(), new BoardOp())));

        HistoryResult r = service.restore(B, "o", "s1", 2);

        assertEquals(new HistoryResult("restore", 2, List.of()), r);
        ArgumentCaptor<ElementWriter.CommitRequest> req = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(writer).commit(req.capture());
        assertEquals(B, req.getValue().boardId());
        assertEquals("o", req.getValue().userId());
        assertEquals("s1", req.getValue().sessionId());
        assertEquals("restore", req.getValue().source());
        assertNull(req.getValue().mergeKey());
        assertNull(req.getValue().target());
        assertEquals(Set.of("patch:a", "delete:b"),
                req.getValue().intents().stream().map(i -> i.kind() + ":" + i.elementId()).collect(Collectors.toSet()));
    }
}
```

- [ ] **Step 7: Run it and confirm it fails**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryServiceTest'
```

Expected: non-zero exit, `[ERROR] COMPILATION ERROR` with `cannot find symbol ... class HistoryService` (and `HistoryService.TxView` / `StateView`).

- [ ] **Step 8: Implement `HistoryService`**

Create `IE213Backend/src/main/java/com/example/ie213backend/service/history/HistoryService.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

// Lịch sử board: timeline, xem trạng thái tại một seq, khôi phục (spec §8)
@Service
@RequiredArgsConstructor
public class HistoryService {
    static final int MAX_LIMIT = 100;

    private final ElementWriter writer;
    private final SnapshotJob snapshotJob;
    private final BoardService boardService;
    private final UserRepository userRepository;
    private final MongoTemplate mongo;

    public record TxView(String txId, String userId, String userName, Instant ts, String source, String state,
                         BoardTx.Summary summary, long seqTo) {
    }

    public record StateView(long seq, List<Map<String, Object>> elements) {
    }

    public List<TxView> list(String boardId, String userId, Long beforeSeq, int limit) {
        requireMember(boardId, userId);
        Criteria c = Criteria.where("boardId").is(oid(boardId)).and("state").ne("pending");
        if (beforeSeq != null) c = c.and("seqTo").lt(beforeSeq);
        Query q = Query.query(c).with(Sort.by(Sort.Direction.DESC, "seqTo"))
                .limit(Math.max(1, Math.min(MAX_LIMIT, limit)));
        List<BoardTx> txs = mongo.find(q, BoardTx.class);
        Map<String, String> names = userNames(txs);
        return txs.stream().map(t -> new TxView(t.getId(), t.getUserId(), names.getOrDefault(t.getUserId(), ""),
                t.getTs(), t.getSource(), t.getState(), t.getSummary(), t.getSeqTo())).toList();
    }

    public StateView stateAt(String boardId, String userId, long seq) {
        requireMember(boardId, userId);
        requireCommitted(boardId, seq);
        List<Map<String, Object>> elements = new ArrayList<>(stateMap(boardId, seq).values());
        elements.sort(Comparator.comparingDouble(HistoryService::z));
        return new StateView(seq, elements);
    }

    public Map<String, Map<String, Object>> stateMap(String boardId, long seq) {
        return snapshotJob.replayTo(boardId, seq);
    }

    public HistoryResult restore(String boardId, String userId, String sessionId, long seq) {
        if (!"OWNER".equals(boardService.getRoleOfMember(boardId, userId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ chủ bảng mới được khôi phục phiên bản");
        // đọc trạng thái + diff + ghi trong cùng một lock (sau roll-forward)
        return writer.withLock(boardId, () -> {
            requireCommitted(boardId, seq);
            // create của restore phải đóng dấu seq mới (§6.4), nên bỏ fieldSeq cũ của phiên bản đích
            List<Intent> intents = HistoryMath.diff(stateMap(boardId, seq), writer.loadBoard(boardId)).stream()
                    .map(i -> "create".equals(i.kind()) ? Intent.create(withoutFieldSeq(i.element())) : i)
                    .toList();
            if (intents.isEmpty()) return HistoryResult.empty("restore");
            ElementWriter.CommitResult res = writer.commit(new ElementWriter.CommitRequest(
                    boardId, userId, sessionId, "restore", intents, null, null));
            return res.isEmpty() ? HistoryResult.empty("restore")
                    : new HistoryResult("restore", res.ops().size(), List.of());
        });
    }

    private static Map<String, Object> withoutFieldSeq(Map<String, Object> element) {
        Map<String, Object> copy = new java.util.LinkedHashMap<>(element);
        copy.put("fieldSeq", new java.util.LinkedHashMap<String, Long>());
        return copy;
    }

    private void requireMember(String boardId, String userId) {
        if ("NONE".equals(boardService.getRoleOfMember(boardId, userId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem lịch sử bảng này");
    }

    private void requireCommitted(String boardId, long seq) {
        if (seq < 0 || seq > writer.committedSeq(boardId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seq vượt quá lịch sử đã commit");
    }

    private Map<String, String> userNames(List<BoardTx> txs) {
        Set<String> ids = new HashSet<>();
        txs.forEach(t -> {
            if (t.getUserId() != null) ids.add(t.getUserId());
        });
        Map<String, String> names = new HashMap<>();
        if (ids.isEmpty()) return names;
        userRepository.findAllById(ids).forEach(u -> names.put(u.getId(), fullName(u)));
        return names;
    }

    static String fullName(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName();
        String last = u.getLastName() == null ? "" : u.getLastName();
        return (first + " " + last).trim();
    }

    private static double z(Map<String, Object> el) {
        return el.get("z") instanceof Number n ? n.doubleValue() : 0;
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
```

- [ ] **Step 9: Run it and confirm it passes**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryServiceTest'
```

Expected: exit code 0; `target/surefire-reports/com.example.ie213backend.service.history.HistoryServiceTest.txt` shows `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0`. `MockitoExtension` is strict, so an `UnnecessaryStubbingException` here means the service skipped a call the spec requires (for example the lock); fix the service, not the test.

- [ ] **Step 10: Write the failing controller tests (REST + STOMP restore)**

Create `IE213Backend/src/test/java/com/example/ie213backend/controller/HistoryControllerTest.java`:

```java
package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.history.HistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HistoryControllerTest {
    HistoryService service = mock(HistoryService.class);
    HistoryController controller = new HistoryController(service);
    UserDto user = UserDto.builder().id("u1").build();

    @Test
    void listUsesTheRequestUserAndMapsUnderBoardPrefix() throws Exception {
        List<HistoryService.TxView> views = List.of(new HistoryService.TxView("t1", "u1", "An Nguyen",
                Instant.EPOCH, "user", "active", new BoardTx.Summary(1, 0, 0), 3));
        when(service.list("b", "u1", 10L, 30)).thenReturn(views);

        ResponseEntity<List<HistoryService.TxView>> res = controller.getHistory("b", 10L, 30, user);

        assertEquals(200, res.getStatusCode().value());
        assertSame(views, res.getBody());
        assertArrayEquals(new String[]{"${api.prefix}/board"}, HistoryController.class.getAnnotation(RequestMapping.class).value());
        assertArrayEquals(new String[]{"/{id}/history"}, HistoryController.class
                .getMethod("getHistory", String.class, Long.class, int.class, UserDto.class)
                .getAnnotation(GetMapping.class).value());
    }

    @Test
    void stateUsesTheRequestUser() throws Exception {
        HistoryService.StateView view = new HistoryService.StateView(5, List.of());
        when(service.stateAt("b", "u1", 5)).thenReturn(view);

        assertSame(view, controller.getStateAt("b", 5, user).getBody());
        assertArrayEquals(new String[]{"/{id}/history/state"}, HistoryController.class
                .getMethod("getStateAt", String.class, long.class, UserDto.class)
                .getAnnotation(GetMapping.class).value());
    }
}
```

Edit `IE213Backend/src/test/java/com/example/ie213backend/controller/BoardElementSocketControllerTest.java` (after Tasks 7-8):

1. After the import `com.example.ie213backend.service.element.ElementPatches;` add:
```java
import com.example.ie213backend.service.history.HistoryService;
```
(`HistoryResult`, `Method`, `MessageMapping`, `SendToUser`, `assertArrayEquals` are imported by Task 8. If any of them is missing, add `import com.example.ie213backend.service.history.HistoryResult;`, `import java.lang.reflect.Method;`, `import org.springframework.messaging.handler.annotation.MessageMapping;`, `import org.springframework.messaging.simp.annotation.SendToUser;`, `import static org.junit.jupiter.api.Assertions.assertArrayEquals;`.)
2. Replace the controller field that Task 8 left, `BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks, undo);`, with the two lines below (keep any extra arguments Task 7/8 put before `undo`, and append `history` last):
```java
    HistoryService history = mock(HistoryService.class);
    BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks, undo, history);
```
3. Before the class's closing `}` add:
```java

    @Test
    void restoreDelegatesSeqUserAndSessionAndRepliesOnHistoryQueue() throws Exception {
        HistoryResult restored = new HistoryResult("restore", 2, List.of());
        when(history.restore("b", "viewer", "s1", 7L)).thenReturn(restored);

        assertEquals(restored, controller.restore("b", Map.of("seq", 7), headers));
        Method m = BoardElementSocketController.class.getMethod("restore", String.class, Map.class, SimpMessageHeaderAccessor.class);
        assertArrayEquals(new String[]{"/board/{boardId}/el/restore"}, m.getAnnotation(MessageMapping.class).value());
        assertArrayEquals(new String[]{"/queue/history"}, m.getAnnotation(SendToUser.class).value());
        // thay đổi thật đi qua batch của writer, controller không tự broadcast
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void restoreWithoutNumericSeqIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> controller.restore("b", Map.of(), headers));
        assertThrows(IllegalArgumentException.class, () -> controller.restore("b", Map.of("seq", "7"), headers));
        verifyNoInteractions(history);
    }
```

- [ ] **Step 11: Run the controller tests and confirm they fail**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q test -Dtest='HistoryControllerTest,BoardElementSocketControllerTest'
```

Expected: non-zero exit, `[ERROR] COMPILATION ERROR` with `cannot find symbol ... class HistoryController`, `constructor BoardElementSocketController in class ... cannot be applied to given types` and `cannot find symbol ... method restore(java.lang.String,java.util.Map<...>,org.springframework.messaging.simp.SimpMessageHeaderAccessor)`.

- [ ] **Step 12: Implement `HistoryController`**

Create `IE213Backend/src/main/java/com/example/ie213backend/controller/HistoryController.java`:

```java
package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.history.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Lịch sử phiên bản của board (chỉ đọc); khôi phục đi qua STOMP /el/restore
@RestController
@RequestMapping("${api.prefix}/board")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;

    @GetMapping("/{id}/history")
    public ResponseEntity<List<HistoryService.TxView>> getHistory(
            @PathVariable String id,
            @RequestParam(required = false) Long beforeSeq,
            @RequestParam(defaultValue = "30") int limit,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(historyService.list(id, userDto.getId(), beforeSeq, limit));
    }

    @GetMapping("/{id}/history/state")
    public ResponseEntity<HistoryService.StateView> getStateAt(
            @PathVariable String id,
            @RequestParam long seq,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(historyService.stateAt(id, userDto.getId(), seq));
    }
}
```

- [ ] **Step 13: Add the STOMP restore handler**

Edit `IE213Backend/src/main/java/com/example/ie213backend/controller/BoardElementSocketController.java`:

1. After the import `com.example.ie213backend.service.history.HistoryResult;` (added by Task 8 right after `service.element.ElementPatches`, on-disk line 7) add:
```java
import com.example.ie213backend.service.history.HistoryService;
```
2. After the last `private final` field (Task 8's `private final UndoService undoService;`, which follows on-disk line 32 `private final ElementLockRegistry lockRegistry;`) add:
```java
    private final HistoryService historyService;
```
3. After the closing `}` of Task 8's `redo` handler (the method annotated `@MessageMapping("/board/{boardId}/el/redo")`) add:
```java

    // Chỉ OWNER (HistoryService kiểm); kết quả chỉ về người bấm, board đổi qua batch của writer
    @MessageMapping("/board/{boardId}/el/restore")
    @SendToUser("/queue/history")
    public HistoryResult restore(@DestinationVariable String boardId,
                                 @Payload Map<String, Object> body,
                                 SimpMessageHeaderAccessor headerAccessor) {
        if (!(body.get("seq") instanceof Number seq)) throw new IllegalArgumentException("seq required");
        return historyService.restore(boardId, user(headerAccessor).getId(), headerAccessor.getSessionId(), seq.longValue());
    }
```
`Payload`, `Map`, `DestinationVariable`, `SendToUser`, `MessageMapping` are already imported (on-disk lines 10, 12, 13, 16, 23). The 403 (non-owner), 400 (`seq > committedSeq`) and 503 ("board busy") exceptions reach the existing `@MessageExceptionHandler onError` (on-disk lines 120-125) and go to `/queue/errors {reason}` (§10).

- [ ] **Step 14: Run the controller tests and confirm they pass**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='HistoryControllerTest,BoardElementSocketControllerTest'
```

Expected: exit code 0, no `[ERROR]`. Surefire reports: `HistoryControllerTest` `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`; `BoardElementSocketControllerTest` has Task 8's count + 2, all passing.

- [ ] **Step 15: Write `HistoryIT` (local Mongo)**

Create `IE213Backend/src/test/java/com/example/ie213backend/service/history/HistoryIT.java`:

```java
package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Chạy với Mongo local: MONGO_IT_URI=mongodb://localhost:27017 (spec §12.3)
@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class HistoryIT {
    static final String OWNER = "650000000000000000000a01";
    static final String BOB = "650000000000000000000a02";
    static final List<String> COMPARED = Stream.concat(Stream.of("type", "image"), ElementKeys.K.stream()).toList();

    final String boardId = new ObjectId().toHexString();
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    SnapshotJob snapshots;
    UndoService undo;
    HistoryService history;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        // MongoTemplate dựng tay không tự tạo index: cần unique để trùng seq / trùng snapshot là lỗi thật
        mongo.indexOps(BoardOp.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());
        mongo.indexOps(BoardSnapshot.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());

        BoardService boardService = mock(BoardService.class);
        when(boardService.getRoleOfMember(eq(boardId), anyString())).thenReturn("EDITOR");
        when(boardService.getRoleOfMember(boardId, OWNER)).thenReturn("OWNER");
        UserRepository users = mock(UserRepository.class);
        when(users.findAllById(any())).thenReturn(List.of(user(OWNER, "Owner", "Test"), user(BOB, "Bob", null)));

        writer = new ElementWriter(mongo, new BoardLocks(), (b, ev) -> events.add(ev));
        snapshots = new SnapshotJob(mongo);
        writer.setSnapshotJob(snapshots);
        undo = new UndoService(writer, mongo, boardService);
        history = new HistoryService(writer, snapshots, boardService, users, mongo);
    }

    @AfterEach
    void tearDown() {
        // chờ job snapshot xong rồi mới drop DB
        snapshots.shutdown();
        mongo.getDb().drop();
        client.close();
    }

    // ---- helpers ----

    private static User user(String id, String first, String last) {
        User u = new User();
        u.setId(id);
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    private static String oid() {
        return new ObjectId().toHexString();
    }

    private BoardElement base(String id, String type) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType(type);
        e.setBoardId(boardId);
        e.setOwner(OWNER);
        e.setW(200);
        e.setH(120);
        e.setZ(1);
        e.setVersion(1L);
        return e;
    }

    private BoardElement sticky(String id, double x) {
        BoardElement e = base(id, "sticky");
        e.setX(x);
        e.setText("note " + id.substring(18));
        return e;
    }

    private BoardElement image(String id) {
        BoardElement e = base(id, "image");
        e.setImage(new BoardElement.ImageData("https://img.example/p.png", "cld-1", "ảnh"));
        return e;
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement e = base(id, "connector");
        e.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        return e;
    }

    private static Map<String, Object> ends(String from, String to) {
        return Map.of("from", Map.of("elementId", from, "anchor", "auto"), "to", Map.of("elementId", to, "anchor", "auto"));
    }

    private static Intent create(BoardElement e) {
        return Intent.create(ElementNormalizer.full(e));
    }

    private static Intent patch(String id, String key, Object value) {
        return Intent.patch(id, ElementNormalizer.normalizeSet(Map.of(key, value)));
    }

    private ElementWriter.CommitResult commit(String userId, Intent... intents) {
        ElementWriter.CommitResult r = writer.commit(new ElementWriter.CommitRequest(
                boardId, userId, "s-" + userId, "user", List.of(intents), null, null));
        assertFalse(r.isEmpty(), "commit không được rỗng");
        return r;
    }

    private long committed() {
        return writer.committedSeq(boardId);
    }

    // So trên id, type, image và K (đã chuẩn hóa)
    private static void assertSameBoard(Map<String, Map<String, Object>> expected, Map<String, Map<String, Object>> actual) {
        assertEquals(expected.keySet(), actual.keySet(), "tập id khác nhau");
        for (String id : expected.keySet())
            for (String k : COMPARED)
                assertTrue(ElementNormalizer.same(expected.get(id).get(k), actual.get(id).get(k)),
                        id + "." + k + ": " + expected.get(id).get(k) + " != " + actual.get(id).get(k));
    }

    // So toàn bộ map (gồm fieldSeq, version)
    private static void assertSameFull(Map<String, Map<String, Object>> expected, Map<String, Map<String, Object>> actual) {
        assertEquals(expected.keySet(), actual.keySet(), "tập id khác nhau");
        for (String id : expected.keySet())
            assertTrue(ElementNormalizer.same(expected.get(id), actual.get(id)),
                    id + ": " + expected.get(id) + " != " + actual.get(id));
    }

    // Invariant §8.2: stateMap(committedSeq) == boardElements
    private void assertInvariant() {
        assertSameBoard(history.stateMap(boardId, committed()), writer.loadBoard(boardId));
    }

    private Query snapQuery(long seq) {
        return Query.query(Criteria.where("boardId").is(new ObjectId(boardId)).and("seq").is(seq));
    }

    private BoardSnapshot awaitSnapshot(long seq) throws InterruptedException {
        for (int i = 0; i < 50; i++) {
            BoardSnapshot s = mongo.findOne(snapQuery(seq), BoardSnapshot.class);
            if (s != null) return s;
            Thread.sleep(100);
        }
        return null;
    }

    // Replay từ snapshot 0 qua mọi op <= n (không dùng snapshot trung gian)
    private Map<String, Map<String, Object>> replayFromZero(long n) {
        BoardSnapshot s0 = mongo.findOne(snapQuery(0), BoardSnapshot.class);
        assertNotNull(s0, "phải có snapshot 0");
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        s0.getElements().forEach(e -> base.put((String) e.get("id"), e));
        List<BoardOp> ops = mongo.find(Query.query(Criteria.where("boardId").is(new ObjectId(boardId))
                .and("seq").lte(n)).with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
        return HistoryMath.replay(base, ops);
    }

    @SuppressWarnings("unchecked")
    private static List<String> endsOf(Map<String, Object> connectorElement) {
        return ElementKeys.connectorEnds((Map<String, Object>) connectorElement.get("connector"));
    }

    // ---- tests ----

    @Test
    void restoreToEarlierSeqThenUndoRestoreReturnsToPreRestoreState() {
        String a = oid(), b = oid(), c = oid();
        commit(OWNER, create(sticky(a, 0)));
        commit(OWNER, create(sticky(b, 50)));
        long checkpoint = committed();
        Map<String, Map<String, Object>> atCheckpoint = writer.loadBoard(boardId);
        commit(BOB, patch(a, "x", 300));
        commit(OWNER, Intent.delete(b));
        commit(BOB, create(sticky(c, 10)));
        assertInvariant();
        assertEquals(Set.of(a, b), history.stateAt(boardId, BOB, checkpoint).elements().stream()
                .map(e -> (String) e.get("id")).collect(java.util.stream.Collectors.toSet()));
        Map<String, Map<String, Object>> preRestore = writer.loadBoard(boardId);
        events.clear();

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", checkpoint);

        // patch a.x + create b + delete c
        assertEquals(new HistoryResult("restore", 3, List.of()), r);
        assertSameBoard(atCheckpoint, writer.loadBoard(boardId));
        assertInvariant();
        assertEquals(1, events.size(), "restore là một batch");
        assertEquals("restore", events.get(0).source());
        assertEquals(3, events.get(0).seqTo() - events.get(0).seqFrom() + 1);
        HistoryService.TxView newest = history.list(boardId, BOB, null, 30).get(0);
        assertEquals("restore", newest.source());
        assertEquals("Owner Test", newest.userName());
        assertEquals(committed(), newest.seqTo());

        HistoryResult u = undo.undo(boardId, OWNER, "s-owner");

        assertEquals("undo", u.op());
        assertTrue(u.applied() > 0, "undo restore phải áp dụng được");
        assertTrue(u.skipped().isEmpty(), "không có xung đột: " + u.skipped());
        assertSameBoard(preRestore, writer.loadBoard(boardId));
        assertInvariant();
    }

    @Test
    void restoreToSeqZeroOnMigratedBoardSeededWithoutCounter() {
        String a = oid(), p = oid(), n = oid();
        // element legacy/migrate: ghi thẳng, không fieldSeq, chưa có boardCounters
        BoardElement legacy = sticky(a, 5);
        legacy.setVersion(3L);
        legacy.setMigratedFrom("stickyNote");
        BoardElement pic = image(p);
        pic.setVersion(2L);
        pic.setMigratedFrom("Images");
        mongo.insert(legacy);
        mongo.insert(pic);
        assertNull(mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(boardId))), BoardCounter.class));
        Map<String, Map<String, Object>> seeded = writer.loadBoard(boardId);

        // chưa commit lần nào: seq 0 == trạng thái hiện tại
        assertEquals(HistoryResult.empty("restore"), history.restore(boardId, OWNER, "s-owner", 0));
        assertSameBoard(seeded, history.stateMap(boardId, 0));

        commit(OWNER, patch(a, "x", 400));
        commit(BOB, Intent.delete(p));
        commit(OWNER, create(sticky(n, 0)));
        BoardSnapshot s0 = mongo.findOne(snapQuery(0), BoardSnapshot.class);
        assertNotNull(s0, "commit đầu tiên phải tạo snapshot 0");
        assertEquals(2, s0.getElements().size());
        Map<String, Map<String, Object>> preRestore = writer.loadBoard(boardId);

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", 0);

        // patch a.x + create p + delete n
        assertEquals(new HistoryResult("restore", 3, List.of()), r);
        Map<String, Map<String, Object>> after = writer.loadBoard(boardId);
        assertSameBoard(seeded, after);
        assertTrue(ElementNormalizer.same(seeded.get(p).get("image"), after.get(p).get("image")), "image giữ nguyên");
        assertTrue(((Number) after.get(p).get("version")).longValue() > 2L, "version không giảm khi tạo lại");
        assertInvariant();

        // restore trên board migrate cũng undo được
        HistoryResult u = undo.undo(boardId, OWNER, "s-owner");
        assertTrue(u.applied() > 0);
        assertTrue(u.skipped().isEmpty(), "không có xung đột: " + u.skipped());
        assertSameBoard(preRestore, writer.loadBoard(boardId));
        assertInvariant();
    }

    @Test
    void snapshotAt200MatchesReplayFromZero() throws InterruptedException {
        String a = oid();
        commit(OWNER, create(sticky(a, 0)));
        for (int i = 1; i < 200; i++) commit(i % 2 == 0 ? OWNER : BOB, patch(a, "x", i));
        assertEquals(200, committed());

        // job do ElementWriter gọi sau broadcast, không gọi build ở đây
        BoardSnapshot auto = awaitSnapshot(200);
        assertNotNull(auto, "maybeSnapshot không chạy khi seq vượt 200");
        BoardSnapshot again = snapshots.build(boardId, 200);
        assertEquals(auto.getId(), again.getId(), "build lại trả snapshot đã có");
        assertEquals(1, mongo.count(snapQuery(200), BoardSnapshot.class));

        for (int i = 0; i < 10; i++) commit(BOB, patch(a, "y", i));
        assertEquals(210, committed());
        assertNull(mongo.findOne(snapQuery(400), BoardSnapshot.class));

        for (long n : new long[]{150, 199, 200, 205, 210})
            assertSameFull(replayFromZero(n), history.stateMap(boardId, n));
        assertSameFull(replayFromZero(200), toMap(again.getElements()));
        assertInvariant();
    }

    @Test
    void restoreRepointedConnectorAndDeletedEnd() {
        String e = oid(), f = oid(), g = oid(), c = oid();
        commit(OWNER, create(sticky(e, 0)), create(sticky(f, 300)), create(sticky(g, 600)), create(connector(c, e, f)));
        long s1 = committed();
        commit(OWNER, patch(c, "connector", ends(e, g)));
        commit(BOB, Intent.delete(f));
        long s3 = committed();
        assertTrue(writer.loadBoard(boardId).containsKey(c), "C đã trỏ sang G nên không bị cascade");

        // về s1: tạo lại F, C trỏ lại E→F (F tạo trước patch nên đầu hợp lệ)
        assertEquals(new HistoryResult("restore", 2, List.of()), history.restore(boardId, OWNER, "s-owner", s1));
        Map<String, Map<String, Object>> b1 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, f, g, c), b1.keySet());
        assertEquals(List.of(e, f), endsOf(b1.get(c)));
        assertInvariant();

        // về s3: xóa F + patch C→G; cascade tính sau patch nên C còn
        assertEquals(new HistoryResult("restore", 2, List.of()), history.restore(boardId, OWNER, "s-owner", s3));
        Map<String, Map<String, Object>> b2 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, g, c), b2.keySet());
        assertEquals(List.of(e, g), endsOf(b2.get(c)));
        assertInvariant();

        // Bob xóa G (cascade C); về s3 thì tạo lại G rồi mới tới C
        commit(BOB, Intent.delete(g));
        assertEquals(Set.of(e), writer.loadBoard(boardId).keySet(), "xóa G phải cascade C");
        restoreAndCheck(s3, 2);
        Map<String, Map<String, Object>> b3 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, g, c), b3.keySet());
        assertEquals(List.of(e, g), endsOf(b3.get(c)));
        assertInvariant();
    }

    private void restoreAndCheck(long seq, int applied) {
        HistoryResult r = history.restore(boardId, OWNER, "s-owner", seq);
        assertEquals("restore", r.op());
        assertEquals(applied, r.applied());
        assertTrue(r.skipped().isEmpty());
    }

    private static Map<String, Map<String, Object>> toMap(List<Map<String, Object>> elements) {
        Map<String, Map<String, Object>> m = new LinkedHashMap<>();
        new ArrayList<>(elements).forEach(el -> m.put((String) el.get("id"), el));
        return m;
    }
}
```

Counting in `restoreRepointedConnectorAndDeletedEnd`: before the last restore the board is `{E}` (F was deleted by the `s3` restore, G and C by Bob's cascade), and the target is `{E, G, C→G}`, so the diff is `create G` + `create C` = 2 ops. The planner orders `create non-connector` before `create connector`, so C's ends (E, G) are valid.

- [ ] **Step 16: Start local Mongo and run `HistoryIT`, expect PASS**

```bash
docker start mobi-it-mongo 2>/dev/null || docker run -d --name mobi-it-mongo -p 27017:27017 mongo:7
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='HistoryIT'
```

Expected: exit code 0; `target/surefire-reports/com.example.ie213backend.service.history.HistoryIT.txt` shows `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`. `docker exec mobi-it-mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>n.startsWith("it_"))'` prints `[]`. Without `MONGO_IT_URI` the same command reports `Skipped: 4`. If a test fails, fix the code of this task (or report the Task 3-8 defect it exposes); never weaken an assertion.

- [ ] **Step 17: Checkpoint (gate)**

```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw -q compile && export MONGO_IT_URI=mongodb://localhost:27017 && bash ./mvnw -q test -Dtest='SnapshotJobTest,HistoryServiceTest,HistoryControllerTest,BoardElementSocketControllerTest,BoardElementServiceTest,ElementWriterIT,UndoIT,HistoryIT'
```

Expected: exit code 0, no `[ERROR]`. Surefire reports: `SnapshotJobTest` 6/0/0/0, `HistoryServiceTest` 9/0/0/0, `HistoryControllerTest` 2/0/0/0, `HistoryIT` 4/0/0/0, `BoardElementSocketControllerTest` Task 8's count + 2 with 0 failures, and `BoardElementServiceTest`, `ElementWriterIT`, `UndoIT` unchanged and green (they show that the `ElementWriter` setter + snapshot call did not break Task 6-8 behaviour). Report the results, including whether the ITs ran or were skipped; do NOT commit.

---

### Task 10: FE batch types, seqSync, sceneStore.applyBatch

Spec: §6.7 (broadcast contract, echo rule), §9.1 (seq sync, version cleanup), §12.4 (FE vitest). Review Focus 1 is pinned here (`seqSync` interleaving tests).

**Files:**
- Modify: `client/components/Scene/types.ts` — append after line 55 (end of `ElementEvent`). `ElementEvent` (lines 48-55) stays unchanged.
- Create: `client/components/Scene/seqSync.ts`
- Modify: `client/lib/Zustand/sceneStore.ts`
  - line 2 (type import)
  - line 19 (`SceneState.applyRemote`): add `applyBatch` after it
  - after line 68 (end of `withoutIds`): new helper `applyServerPatches`
  - lines 119-128 (`removeLocal`): clean up the version maps
  - lines 136-162 (`applyRemote` `case "patch"`): delegate to the helper
  - after line 185 (end of `applyRemote`): new `applyBatch`
- Test (create): `client/components/Scene/__tests__/seqSync.test.ts`
- Test (create): `client/components/Scene/__tests__/sceneStoreBatch.test.ts` (a separate file, so Task 12's edits to `sceneStore.test.ts` do not conflict)

**Interfaces:**
- Consumes: the server broadcast shape from §6.7 / Task 6 `BatchEvent` (`{op:"batch", txId, source, seqFrom, seqTo, senderSessionId, userId, ops}`). No TS code from earlier tasks.
- Produces (exactly as in the Interface Contract):
  - `types.ts`: `BatchOp`, `HistorySource`, `BatchEvent`, `HistorySkip`, `HistoryResult`.
  - `seqSync.ts`: `SeqSyncDeps`, `SeqSync`, `createSeqSync(deps: SeqSyncDeps): SeqSync`.
  - `sceneStore.ts`: `applyBatch: (ev: BatchEvent, mySessionId: string | null) => void`. It skips echoes only when `mySessionId !== null && senderSessionId === mySessionId && source ∈ {user, template}`. `removeLocal` also deletes the `fieldVersions`, `baseVersions` and `pendingCommits` entries of every removed id, cascaded connectors included.

Behaviour decisions (evidence: `sceneStore.ts:89-97, 119-162`, `sceneSocket.ts:33-37`):
- A batch `create` always goes through `upsertLocal`, the same as the current `applyRemote` `case "create"` (`sceneStore.ts:133-135`). The echo rule changes only the per-field patch logic, which is the `pendingCommits` path at `sceneStore.ts:148-153`.
- The `mySessionId !== null` guard exists because template writes come in over REST with `senderSessionId = null` (**assumption**, based on Task 7 wiring `TemplateServiceImpl` without a STOMP session). Without the guard, `null === null` would count the template batch as my echo and wrongly decrement `pendingCommits`.
- `seqSync` treats "no progress for `gapWaitMs`" as a real gap. The timer is started once when a gap appears. A new buffered event that does not advance `lastSeq` does not restart it. Progress (a drained event) with a gap still left does restart it. Without that restart, a continuous out-of-order stream would reload at 500 ms even though every hole gets filled (Review Focus 1, "long stream" test).
- Once `lastSeq` has been reached, an event with `seqFrom <= lastSeq + 1` and `seqTo > lastSeq` is applied. The spec's case `seqFrom == lastSeq + 1` is a subset of this. Re-applying an overlapping batch is safe per §9.2 (create is an upsert, patch is `$set` plus the version check).

- [ ] **Step 1: Add the batch and history types to `types.ts`**

Append after line 55 of `client/components/Scene/types.ts` (right after the closing `}` of `ElementEvent`, before `let counter`):

```ts

// ElementEvent giữ preview/lock/unlock; create/patch/delete còn trong union để tương thích ngược
export type BatchOp =
  | { op: "create"; elements: BoardElement[] }
  | { op: "patch"; patches: ElementPatch[] } // version luôn có trong batch
  | { op: "delete"; ids: string[] };

export type HistorySource = "user" | "undo" | "redo" | "restore" | "template";

export interface BatchEvent {
  op: "batch";
  txId: string;
  source: HistorySource;
  seqFrom: number;
  seqTo: number;
  senderSessionId: string | null;
  userId: string;
  ops: BatchOp[];
}

export interface HistorySkip {
  elementId?: string | null;
  key?: string | null;
  reason: "modified" | "gone" | "exists" | "end-missing" | "empty";
  byUserId?: string | null;
}

export interface HistoryResult {
  op: "undo" | "redo" | "restore";
  applied: number;
  skipped: HistorySkip[];
}
```

Run: `cd client && npx tsc --noEmit`
Expected: no output, exit code 0. These are type-only additions and nothing references them yet.

- [ ] **Step 2: Write the failing `seqSync` test**

Create `client/components/Scene/__tests__/seqSync.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createSeqSync } from "../seqSync";
import type { BatchEvent } from "../types";

// Đồng hồ giả: timer chỉ chạy khi gọi advance
function fakeClock() {
  let now = 0;
  const timers: { at: number; fn: () => void; alive: boolean }[] = [];
  return {
    setTimer: (fn: () => void, ms: number): unknown => {
      const t = { at: now + ms, fn, alive: true };
      timers.push(t);
      return t;
    },
    clearTimer: (h: unknown) => {
      (h as { alive: boolean }).alive = false;
    },
    advance(ms: number) {
      now += ms;
      timers
        .filter((t) => t.alive && t.at <= now)
        .forEach((t) => {
          t.alive = false;
          t.fn();
        });
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const ev = (seqFrom: number, seqTo = seqFrom, userId = "alice"): BatchEvent => ({
  op: "batch",
  txId: `tx${seqFrom}`,
  source: "user",
  seqFrom,
  seqTo,
  senderSessionId: `s-${userId}`,
  userId,
  ops: [],
});

// reloads: mỗi lần reload lấy promise kế tiếp trong danh sách (hết thì treo mãi)
function setup(reloads: Promise<number>[] = []) {
  const clock = fakeClock();
  const applied: number[] = [];
  let reloadCount = 0;
  const sync = createSeqSync({
    apply: (e) => applied.push(e.seqFrom),
    reload: () => reloads[reloadCount++] ?? new Promise<number>(() => {}),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { sync, clock, applied, reloadCount: () => reloadCount };
}

describe("seqSync", () => {
  it("applies in-order batches and advances lastSeq", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(11));
    sync.onBatch(ev(12, 13));
    expect(applied).toEqual([11, 12]);
    expect(sync.lastSeq()).toBe(13);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
  });

  it("ignores duplicate and stale batches", () => {
    const { sync, applied } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(11));
    sync.onBatch(ev(11));
    sync.onBatch(ev(5, 9));
    sync.onBatch(ev(10));
    expect(applied).toEqual([11]);
    expect(sync.lastSeq()).toBe(11);
  });

  it("gap filled within the wait window applies in seq order without reload", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(10);
    clock.advance(300);
    sync.onBatch(ev(11));
    expect(applied).toEqual([11, 12]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
  });

  it("gap not filled triggers exactly one reload after 500 ms", () => {
    const { sync, clock, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(200);
    sync.onBatch(ev(13)); // không tiến triển → không khởi động lại timer
    clock.advance(299);
    expect(reloadCount()).toBe(0);
    clock.advance(1);
    expect(reloadCount()).toBe(1);
    expect(sync.isReloading()).toBe(true);
    clock.advance(5000);
    sync.onBatch(ev(14));
    expect(reloadCount()).toBe(1);
  });

  it("progress with a gap still open waits another 500 ms from the progress", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.onBatch(ev(14));
    clock.advance(300);
    sync.onBatch(ev(11));
    expect(applied).toEqual([11, 12]);
    clock.advance(499);
    expect(reloadCount()).toBe(0);
    clock.advance(1);
    expect(reloadCount()).toBe(1);
  });

  it("buffers every batch during reload, drops seqTo <= historySeq and applies the rest in order", async () => {
    const d = deferred<number>();
    const { sync, clock, applied, reloadCount } = setup([d.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    expect(reloadCount()).toBe(1);
    sync.onBatch(ev(14, 15));
    sync.onBatch(ev(11));
    sync.onBatch(ev(13));
    expect(applied).toEqual([]);
    d.resolve(12);
    await flush();
    expect(sync.isReloading()).toBe(false);
    expect(applied).toEqual([13, 14]);
    expect(sync.lastSeq()).toBe(15);
    clock.advance(1000);
    expect(reloadCount()).toBe(1);
  });

  it("restarts the wait after reload when a gap remains, then reloads once more", async () => {
    const d1 = deferred<number>();
    const { sync, clock, applied, reloadCount } = setup([d1.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    sync.onBatch(ev(14));
    d1.resolve(12);
    await flush();
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(499);
    expect(reloadCount()).toBe(1);
    clock.advance(1);
    expect(reloadCount()).toBe(2);
  });

  it("reload failure keeps lastSeq and retries after the wait", async () => {
    const d1 = deferred<number>();
    const { sync, clock, reloadCount } = setup([d1.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    d1.reject(new Error("network"));
    await flush();
    expect(sync.isReloading()).toBe(false);
    expect(sync.lastSeq()).toBe(10);
    clock.advance(500);
    expect(reloadCount()).toBe(2);
  });

  it("interleaved commits of two users arriving out of order do not reload (Review Focus 1)", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    [ev(12, 12, "bob"), ev(11, 11, "alice"), ev(14, 14, "bob"), ev(13, 13, "alice"), ev(16, 17, "bob"), ev(15, 15, "alice")]
      .forEach((e) => {
        sync.onBatch(e);
        clock.advance(40);
      });
    expect(applied).toEqual([11, 12, 13, 14, 15, 16]);
    expect(sync.lastSeq()).toBe(17);
    clock.advance(2000);
    expect(reloadCount()).toBe(0);
  });

  it("a long interleaved stream whose buffer never empties for 660 ms does not reload (Review Focus 1)", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    [12, 14, 11, 16, 13, 18, 15, 20, 17, 22, 19, 21].forEach((s) => {
      sync.onBatch(ev(s, s, s % 2 ? "alice" : "bob"));
      clock.advance(60);
    });
    expect(applied).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    expect(sync.lastSeq()).toBe(22);
    clock.advance(2000);
    expect(reloadCount()).toBe(0);
  });

  it("setBaseline drops buffered batches it already covers", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.setBaseline(12);
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
    sync.onBatch(ev(13));
    expect(applied).toEqual([13]);
  });

  it("dispose cancels the pending gap timer and ignores later batches", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.dispose();
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
    sync.onBatch(ev(11));
    expect(applied).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the `seqSync` test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/seqSync.test.ts`
Expected: FAIL. The suite errors with `Failed to resolve import "../seqSync" from "components/Scene/__tests__/seqSync.test.ts"` (0 tests run), because the module does not exist yet.

- [ ] **Step 4: Implement `seqSync.ts`**

Create `client/components/Scene/seqSync.ts`:

```ts
import type { BatchEvent } from "./types";

export interface SeqSyncDeps {
  apply: (ev: BatchEvent) => void;
  reload: () => Promise<number>; // resolve historySeq sau khi đã reset store
  gapWaitMs?: number; // mặc định 500
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

export interface SeqSync {
  onBatch(ev: BatchEvent): void;
  setBaseline(seq: number): void;
  lastSeq(): number;
  isReloading(): boolean;
  dispose(): void;
}

// Áp batch đúng thứ tự seq; chỉ reload khi hụt seq mà không tiến triển trong gapWaitMs
export function createSeqSync(deps: SeqSyncDeps): SeqSync {
  const gapWaitMs = deps.gapWaitMs ?? 500;
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number): unknown => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let last = 0;
  let buffer: BatchEvent[] = [];
  let timer: unknown = null;
  let reloading = false;
  let disposed = false;

  function stopTimer() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    timer = setTimer(onGapTimeout, gapWaitMs);
  }

  // Áp các batch liền mạch trong buffer; có tiến triển mà vẫn hụt thì tính lại thời gian chờ
  function drain() {
    buffer.sort((a, b) => a.seqFrom - b.seqFrom);
    let progressed = false;
    while (buffer.length) {
      const ev = buffer[0];
      if (ev.seqTo <= last) {
        buffer.shift();
        continue;
      }
      if (ev.seqFrom > last + 1) break;
      buffer.shift();
      deps.apply(ev);
      last = ev.seqTo;
      progressed = true;
    }
    if (!buffer.length) stopTimer();
    else if (progressed || timer === null) startTimer();
  }

  function onGapTimeout() {
    timer = null;
    if (disposed || reloading || !buffer.length) return;
    reloading = true;
    deps.reload().then(
      (seq) => {
        if (disposed) return;
        reloading = false;
        last = seq;
        drain();
      },
      () => {
        if (disposed) return;
        // reload lỗi: giữ lastSeq, buffer còn hụt thì chờ rồi thử lại
        reloading = false;
        drain();
      },
    );
  }

  return {
    onBatch(ev) {
      if (disposed || ev.seqTo <= last) return;
      buffer.push(ev);
      // đang reload: chỉ buffer, reload xong mới áp
      if (!reloading) drain();
    },
    setBaseline(seq) {
      last = seq;
      stopTimer();
      if (!reloading) drain();
    },
    lastSeq: () => last,
    isReloading: () => reloading,
    dispose() {
      disposed = true;
      stopTimer();
      buffer = [];
    },
  };
}
```

- [ ] **Step 5: Run the `seqSync` test and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/seqSync.test.ts`
Expected: PASS, `Tests  12 passed (12)`.

- [ ] **Step 6: Write the failing `applyBatch` test**

Create `client/components/Scene/__tests__/sceneStoreBatch.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BatchEvent, BatchOp, BoardElement, HistorySource } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const connector = (id: string, from: string, to: string, extra: Partial<BoardElement> = {}): BoardElement =>
  el(id, { type: "connector", shape: undefined, z: 3,
    connector: { from: { elementId: from, anchor: "auto" }, to: { elementId: to, anchor: "auto" } }, ...extra });
const S = () => useSceneStore.getState();

let seq = 0;
const batch = (source: HistorySource, senderSessionId: string | null, ops: BatchOp[]): BatchEvent => {
  seq += 1;
  return { op: "batch", txId: `tx${seq}`, source, seqFrom: seq, seqTo: seq, senderSessionId, userId: "u", ops };
};

beforeEach(() => {
  setDragging([]);
  seq = 0;
  S().reset("b", [el("a", { z: 2 }), el("b", { z: 1 }), connector("c", "a", "b")]);
});

describe("sceneStore.applyBatch", () => {
  it("applies ops in order: create, patch on the new element, delete with cascade", () => {
    S().applyBatch(batch("user", "other", [
      { op: "create", elements: [el("d", { z: 0.5 })] },
      { op: "patch", patches: [{ id: "d", set: { x: 9 }, version: 2 }] },
      { op: "delete", ids: ["b"] },
    ]), "me");
    expect(S().elements.d.x).toBe(9);
    expect(S().elements.d.version).toBe(2);
    expect(S().elements.b).toBeUndefined();
    expect(S().elements.c).toBeUndefined();
    expect(S().order).toEqual(["d", "a"]);
  });

  it("own user batch echo keeps a newer unacknowledged local value", () => {
    S().commitLocal([{ id: "a", set: { text: "Hel" } }]);
    S().commitLocal([{ id: "a", set: { text: "Hello" } }]);
    S().applyBatch(batch("user", "me", [{ op: "patch", patches: [{ id: "a", set: { text: "Hel" }, version: 2 }] }]), "me");
    expect(S().elements.a.text).toBe("Hello");
    expect(S().elements.a.version).toBe(2);
  });

  it("undo batch from my own session IS applied even with unacknowledged local commits", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().commitLocal([{ id: "a", set: { x: 80 } }]);
    S().applyBatch(batch("undo", "me", [{ op: "patch", patches: [{ id: "a", set: { x: 0 }, version: 3 }] }]), "me");
    expect(S().elements.a.x).toBe(0);
    expect(S().elements.a.version).toBe(3);
  });

  it("redo and restore batches from my own session are applied", () => {
    (["redo", "restore"] as const).forEach((source) => {
      S().reset("b", [el("a", { z: 2 })]);
      S().commitLocal([{ id: "a", set: { y: 70 } }]);
      S().commitLocal([{ id: "a", set: { y: 80 } }]);
      S().applyBatch(batch(source, "me", [{ op: "patch", patches: [{ id: "a", set: { y: 5 }, version: 4 }] }]), "me");
      expect(S().elements.a.y).toBe(5);
    });
  });

  it("template batch without a session is not treated as my echo", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().commitLocal([{ id: "a", set: { x: 80 } }]);
    S().applyBatch(batch("template", null, [{ op: "patch", patches: [{ id: "a", set: { x: 5 }, version: 2 }] }]), null);
    expect(S().elements.a.x).toBe(5);
  });

  it("undo-delete from my own session recreates the element", () => {
    S().removeLocal(["a"]);
    expect(S().elements.a).toBeUndefined();
    S().applyBatch(batch("undo", "me", [{ op: "create", elements: [el("a", { z: 2, x: 33, version: 3 })] }]), "me");
    expect(S().elements.a.x).toBe(33);
    expect(S().order).toEqual(["b", "a"]);
  });

  it("delete then recreate same id with lower version then patch applies", () => {
    S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }]), "me");
    expect(S().elements.a.x).toBe(50);
    S().applyBatch(batch("user", "other", [{ op: "delete", ids: ["a"] }]), "me");
    S().applyBatch(batch("restore", "other", [{ op: "create", elements: [el("a", { z: 2, version: 2 })] }]), "me");
    expect(S().elements.a.x).toBe(0);
    expect(S().elements.a.version).toBe(2);
    S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { x: 77 }, version: 3 }] }]), "me");
    expect(S().elements.a.x).toBe(77);
    expect(S().elements.a.version).toBe(3);
  });

  it("removeLocal clears pending commits of cascaded connectors", () => {
    S().commitLocal([{ id: "c", set: { z: 9 } }]);
    S().commitLocal([{ id: "c", set: { z: 10 } }]);
    S().removeLocal(["a"]);
    expect(S().elements.c).toBeUndefined();
    S().applyBatch(batch("undo", "other", [{ op: "create", elements: [el("a", { z: 2, version: 2 }), connector("c", "a", "b", { version: 2 })] }]), "me");
    S().applyBatch(batch("user", "me", [{ op: "patch", patches: [{ id: "c", set: { z: 4 }, version: 3 }] }]), "me");
    expect(S().elements.c.z).toBe(4);
  });

  it("late patch for an element deleted locally is dropped silently (Review Focus 3)", () => {
    S().removeLocal(["a"]);
    expect(() =>
      S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { text: "late" }, version: 9 }] }]), "me"),
    ).not.toThrow();
    expect(S().elements.a).toBeUndefined();
  });
});
```

- [ ] **Step 7: Run the `applyBatch` test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneStoreBatch.test.ts`
Expected: FAIL. all 9 tests fail. 8 of them fail with `TypeError: S(...).applyBatch is not a function`, because `applyBatch` does not exist yet. The one test that calls `removeLocal` before `applyBatch` inside `expect(...).not.toThrow()` (Review Focus 3) also fails, because the `TypeError` is caught and counted as a throw. That makes 9 failed.

- [ ] **Step 8: Add `applyBatch` to the store type and import `BatchEvent`**

In `client/lib/Zustand/sceneStore.ts`, replace line 2:

```ts
import type { BoardElement, ElementEvent, ElementPatch } from "@/components/Scene/types";
```

with:

```ts
import type { BatchEvent, BoardElement, ElementEvent, ElementPatch } from "@/components/Scene/types";
```

Replace line 19:

```ts
  applyRemote: (ev: ElementEvent, mySessionId: string | null) => void;
```

with:

```ts
  applyRemote: (ev: ElementEvent, mySessionId: string | null) => void;
  applyBatch: (ev: BatchEvent, mySessionId: string | null) => void;
```

- [ ] **Step 9: Extract the server-patch logic into a helper**

In `client/lib/Zustand/sceneStore.ts`, insert right after line 68 (the closing `}` of `withoutIds`, before the blank line and `export const useSceneStore`):

```ts

// Áp patch từ server theo last-writer-wins từng field; echo = xác nhận commit của chính session này
function applyServerPatches(
  state: SceneState,
  patches: ElementPatch[],
  echo: boolean
): Partial<Pick<SceneState, "elements" | "order">> {
  const elements = { ...state.elements };
  let zChanged = false;
  patches.forEach((p) => {
    const cur = elements[p.id];
    if (!cur) return;
    const version = p.version ?? cur.version;
    const next: BoardElement = { ...cur, version: Math.max(cur.version, version) };
    (Object.keys(p.set) as (keyof typeof p.set)[]).forEach((f) => {
      let apply = version > fieldVersion(p.id, f);
      if (apply) setField(fieldVersions, p.id, f, version);
      if (echo) {
        const pending = Math.max(0, (getField(pendingCommits, p.id, f) ?? 0) - 1);
        setField(pendingCommits, p.id, f, pending);
        // commit mới hơn của chính mình chưa được xác nhận → giữ giá trị local
        if (pending > 0) apply = false;
      }
      if (!apply) return;
      (next as unknown as Record<string, unknown>)[f] = p.set[f];
      if (f === "z") zChanged = true;
    });
    elements[p.id] = next;
  });
  return zChanged ? { elements, order: sortOrder(elements) } : { elements };
}
```

Then replace the `case "patch":` block of `applyRemote` (original lines 136-162):

```ts
      case "patch":
        set((state) => {
          const elements = { ...state.elements };
          let zChanged = false;
          (ev.patches ?? []).forEach((p) => {
            const cur = elements[p.id];
            if (!cur) return;
            const version = p.version ?? cur.version;
            const next: BoardElement = { ...cur, version: Math.max(cur.version, version) };
            (Object.keys(p.set) as (keyof typeof p.set)[]).forEach((f) => {
              let apply = version > fieldVersion(p.id, f);
              if (apply) setField(fieldVersions, p.id, f, version);
              if (mine) {
                const pending = Math.max(0, (getField(pendingCommits, p.id, f) ?? 0) - 1);
                setField(pendingCommits, p.id, f, pending);
                // commit mới hơn của chính mình chưa được xác nhận → giữ giá trị local
                if (pending > 0) apply = false;
              }
              if (!apply) return;
              (next as unknown as Record<string, unknown>)[f] = p.set[f];
              if (f === "z") zChanged = true;
            });
            elements[p.id] = next;
          });
          return zChanged ? { elements, order: sortOrder(elements) } : { elements };
        });
        break;
```

with:

```ts
      case "patch":
        set((state) => applyServerPatches(state, ev.patches ?? [], mine));
        break;
```

This is a pure refactor for `applyRemote`, and the existing `sceneStore.test.ts` pins it.

- [ ] **Step 10: Clean up the version maps in `removeLocal`**

In `client/lib/Zustand/sceneStore.ts`, replace `removeLocal` (original lines 119-128):

```ts
  removeLocal: (ids) =>
    set((state) => {
      const { next, drop } = withoutIds(state.elements, ids);
      return {
```

with:

```ts
  removeLocal: (ids) =>
    set((state) => {
      const { next, drop } = withoutIds(state.elements, ids);
      // id bị xoá có thể được tạo lại (undo/restore) với version thấp hơn → bỏ dấu version cũ
      drop.forEach((id) => {
        fieldVersions.delete(id);
        baseVersions.delete(id);
        pendingCommits.delete(id);
      });
      return {
```

The rest of `removeLocal` (the returned object `elements/order/selection/editingId` and the closing `}),`) stays unchanged.

- [ ] **Step 11: Implement `applyBatch`**

In `client/lib/Zustand/sceneStore.ts`, insert right after the closing `},` of `applyRemote` (original line 185, before `setSelection: (ids) => ...`):

```ts

  applyBatch: (ev, mySessionId) => {
    // chỉ user/template đã được áp lạc quan ở local; undo/redo/restore luôn áp kể cả với người bấm
    const echo =
      mySessionId !== null && ev.senderSessionId === mySessionId && (ev.source === "user" || ev.source === "template");
    ev.ops.forEach((o) => {
      switch (o.op) {
        case "create":
          get().upsertLocal(o.elements);
          break;
        case "patch":
          set((state) => applyServerPatches(state, o.patches, echo));
          break;
        case "delete":
          get().removeLocal(o.ids);
          break;
      }
    });
  },
```

- [ ] **Step 12: Run the store tests and confirm they pass**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneStoreBatch.test.ts components/Scene/__tests__/sceneStore.test.ts`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  26 passed (26)` (9 new + 17 existing, so the `applyRemote` refactor did not regress).

- [ ] **Step 13: Checkpoint — run the FE gate**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: `tsc` prints nothing (exit 0). Vitest prints `Test Files  11 passed (11)` and `Tests  96 passed (96)`: the baseline measured 2026-09-25 was 9 files / 75 tests, plus 12 `seqSync` tests and 9 `applyBatch` tests.

Report the results (tsc output, vitest summary, and any failures verbatim). Do NOT commit.

---

### Task 11: FE socket wiring, keyboard, toast, mergeKey, baseline

Spec: §6.7 (echo rule, batch shape), §7 (result shape `/user/queue/history`), §7.6 (mergeKey), §9.1 (seq sync, buffering during reload), §9.2 (`historySeq`), §9.3 (shortcuts), §9.4 "Toast", §12.4. Review Focus 2 is pinned here (`reloadBoard` sets the baseline from `historySeq`).

**Files:**
- Modify: `client/components/Scene/keyboard.ts` — lines 1-4 (`KeyLike` gains optional modifier fields), append after line 18.
- Modify: `client/components/Scene/__tests__/keyboard.test.ts` — line 2 (import), append after line 23.
- Create: `client/components/Scene/HistoryToast.tsx`
- Test (create): `client/components/Scene/__tests__/historyToast.test.ts`
- Modify: `client/lib/Zustand/type.type.ts` — after line 96 (`elements?: BoardElement[];` in `interface Board`, the return type of `BoardAPI.getBoardById`, `client/api/BoardAPI.ts:1,34`).
- Modify: `client/components/Scene/sceneSocket.ts` — whole file (lines 1-93) replaced.
- Test (create): `client/components/Scene/__tests__/sceneSocket.test.ts`
- Modify: `client/app/user/board/[id]/useBoard.ts` — line 3 (import), after line 28 (invalidate the baseline before the fetch), after line 34 (initial load).
- Modify: `client/app/user/board/[id]/BoardSubscription.tsx` — line 2 (import), line 62 (`subscribeScene` call gets `onHistory`). **Not in the File Map**: this is the only caller of `subscribeScene` (`grep -rn subscribeScene client/app client/components`), so the toast callback has to be passed here.
- Modify: `client/components/Scene/BoardScene.tsx` — line 16 (import), insert after line 73 (inside the `keydown` handler, lines 60-92).
- Modify: `client/components/Scene/TextEditOverlay.tsx` — line 7 (imports), after line 24, line 31.

**Interfaces:**
- Consumes (Task 10, exactly as in the contract):
  - `client/components/Scene/types.ts`: `BatchEvent`, `HistoryResult`, `HistorySkip`.
  - `client/components/Scene/seqSync.ts`: `createSeqSync(deps: SeqSyncDeps): SeqSync`, `SeqSync` (`onBatch`, `setBaseline`, `lastSeq`, `isReloading`, `dispose`).
  - `client/lib/Zustand/sceneStore.ts`: `applyBatch: (ev: BatchEvent, mySessionId: string | null) => void`.
  - Backend (Tasks 7-9): `ElementPatches.PatchBody(List<ElementPatch> patches, String mergeKey)`; STOMP `/app/board/{id}/el/undo`, `/el/redo` (empty body), `/el/restore` (`{seq}`) replying on `/user/queue/history` with `HistoryResult`; `BoardFullDetailResponse.historySeq`.
- Produces (exactly as in the contract):
  - `sceneSocket.patch(boardId: string, patches: ElementPatch[], opts?: { mergeKey?: string }): void`
  - `sceneSocket.undo(boardId: string): void`, `sceneSocket.redo(boardId: string): void`, `sceneSocket.restore(boardId: string, seq: number): void`
  - `export function subscribeScene(client: Client, boardId: string, sessionId: string, onError: () => void, onHistory?: (r: HistoryResult) => void): () => void`
  - `export function setSceneBaseline(seq: number): void`
  - `export function isUndoKey(e: KeyLike): boolean`, `export function isRedoKey(e: KeyLike): boolean`
  - Also (not in the contract, local to this task): `export function invalidateSceneBaseline(): void` in `sceneSocket.ts` (sets the module `baseline` to `null`, used by `useBoard` before its initial fetch). `HistoryToast.tsx` exports `formatHistoryResult(r: HistoryResult, userNameById: Record<string, string>): string` and `showHistoryToast(r: HistoryResult): void`. `reloadBoard(boardId: string): Promise<number | null>` (was `Promise<void>`; `null` on failure, so the two fire-and-forget callers in `BoardSubscription.tsx:15,62` are unchanged).

Behaviour decisions (evidence cited):
- **Toast:** `client/components/ui/toast.tsx` wraps `@radix-ui/react-toast`, `client/hooks/use-toast.ts:145,194` exports `toast()`, and `<Toaster/>` is mounted globally in `client/app/layout.tsx:52`. So `HistoryToast.tsx` does not render a component. It formats the text and calls `toast({ description, duration: 3000 })`. `TOAST_LIMIT = 1` (`use-toast.ts:11`), so a new result replaces the previous toast.
- **User names:** taken from `useUserInBoardStore.getState().users` (`userId`, `firstName`, `lastName`, `client/lib/Zustand/userInBoardStore.ts:3-11`). Whether the board owner is in that member list is not verified (**assumption**). Unknown ids fall back to "người khác".
- **Baseline per board:** `setSceneBaseline(seq)` has no `boardId` parameter (contract), so it tags the baseline with `useSceneStore.getState().boardId`. Both callers (`useBoard` initial load and `reloadBoard`) call `reset(boardId, …)` right before it, so the tag is correct.
- **Held batches:** a batch that arrives (a) before a baseline is known for the subscribed board, or (b) while `reloadBoard` is fetching, is held in `sceneSocket` and handed to the `SeqSync` after `reset()` + baseline. Without (b), a batch with `seqFrom == lastSeq + 1` arriving during a manual reload (error or reconnect path, not via SeqSync) would be applied and then wiped by `reset()`, and `setBaseline` would never ask for it again (§9.1 "Trong lúc reloadBoard đang chạy: buffer mọi event batch"). When the reload is the one SeqSync itself started, the held events go into SeqSync while it is still `isReloading()`, and Task 10's `seqSync` buffers them and drops `seqTo <= historySeq` after the reload resolves.
- **Reconnect:** when a subscription is torn down, the last applied seq is kept as the board's baseline, so the next `subscribeScene` on the same board continues from there instead of 0.
- **Leaving and re-entering a board (same SPA session):** the kept baseline is stale once `useBoard` resets the store. `useBoard`'s initial fetch does not go through `loadBoard`, so `reloadDepth` stays 0 and, with a stale baseline, batches arriving during the fetch would be applied to the empty store reset at `useBoard.ts:28` (creates added, patches dropped), wiped by the reset at `:34`, and then `setSceneBaseline(historySeq)` could move `lastSeq` backwards, so they are never re-applied. To prevent this, `useBoard` calls `invalidateSceneBaseline()` right after the reset at line 28. `readySync()` then returns `null`, batches are held, and the `setSceneBaseline(res.historySeq ?? 0)` after the fetch releases them. Held batches with `seqTo <= historySeq` are dropped by `SeqSync`.
- **Keyboard gate:** this task gates undo/redo on `canEdit` only (`useCanEdit()` at `BoardScene.tsx:50`, already in the effect deps at line 92). `historyMode` does not exist until Task 12, and Task 12 adds the `!historyMode` gate to this handler. The existing guard at `BoardScene.tsx:62` already returns for typing targets and while a text element is being edited, and `isUndoKey`/`isRedoKey` also check `isTypingTarget` themselves (the same pattern as `shouldHandleDeleteKey`).
- **Cmd+Y** is not redo. On macOS it opens browser history, and the spec lists only `Ctrl+Y` (§9.3).

- [ ] **Step 1: Write the failing keyboard tests**

In `client/components/Scene/__tests__/keyboard.test.ts`, replace line 2:

```ts
import { shouldHandleDeleteKey } from "../keyboard";
```

with:

```ts
import { isRedoKey, isUndoKey, shouldHandleDeleteKey } from "../keyboard";
```

Append after line 23 (the closing `});` of `describe("shouldHandleDeleteKey")`):

```ts

const k = (key: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {}, target: unknown = t("body")) => ({
  key,
  target,
  metaKey: !!mods.meta,
  ctrlKey: !!mods.ctrl,
  shiftKey: !!mods.shift,
});

describe("isUndoKey / isRedoKey", () => {
  it("Cmd+Z and Ctrl+Z are undo, not redo", () => {
    expect(isUndoKey(k("z", { meta: true }))).toBe(true);
    expect(isUndoKey(k("z", { ctrl: true }))).toBe(true);
    expect(isRedoKey(k("z", { meta: true }))).toBe(false);
    expect(isRedoKey(k("z", { ctrl: true }))).toBe(false);
  });
  it("key is case-insensitive", () => {
    expect(isUndoKey(k("Z", { ctrl: true }))).toBe(true);
    expect(isRedoKey(k("Y", { ctrl: true }))).toBe(true);
  });
  it("Shift+Cmd+Z, Shift+Ctrl+Z and Ctrl+Y are redo, not undo", () => {
    expect(isRedoKey(k("Z", { meta: true, shift: true }))).toBe(true);
    expect(isRedoKey(k("z", { ctrl: true, shift: true }))).toBe(true);
    expect(isRedoKey(k("y", { ctrl: true }))).toBe(true);
    expect(isUndoKey(k("Z", { meta: true, shift: true }))).toBe(false);
    expect(isUndoKey(k("y", { ctrl: true }))).toBe(false);
  });
  it("requires Cmd or Ctrl", () => {
    expect(isUndoKey(k("z"))).toBe(false);
    expect(isRedoKey(k("z", { shift: true }))).toBe(false);
    expect(isRedoKey(k("y"))).toBe(false);
  });
  it("Cmd+Y is not redo", () => {
    expect(isRedoKey(k("y", { meta: true }))).toBe(false);
  });
  it("ignored while typing", () => {
    expect(isUndoKey(k("z", { meta: true }, t("textarea")))).toBe(false);
    expect(isRedoKey(k("y", { ctrl: true }, t("input")))).toBe(false);
    expect(isRedoKey(k("z", { ctrl: true, shift: true }, t("div", true)))).toBe(false);
  });
  it("events without modifier fields are not undo/redo", () => {
    expect(isUndoKey({ key: "z", target: t("body") })).toBe(false);
    expect(isRedoKey({ key: "y", target: t("body") })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the keyboard test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/keyboard.test.ts`
Expected: FAIL, `Tests  7 failed | 4 passed (11)`. Each new test fails with `TypeError: isUndoKey is not a function` (or `isRedoKey`), because neither function is exported yet. The 4 existing `shouldHandleDeleteKey` tests pass.

- [ ] **Step 3: Implement `isUndoKey` / `isRedoKey`**

In `client/components/Scene/keyboard.ts`, replace lines 1-4:

```ts
interface KeyLike {
  key: string;
  target: unknown;
}
```

with:

```ts
interface KeyLike {
  key: string;
  target: unknown;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}
```

Append after line 18 (the closing `}` of `isTypingTarget`):

```ts

// Cmd/Ctrl+Z (không Shift) = hoàn tác
export function isUndoKey(e: KeyLike): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return false;
  return e.key.toLowerCase() === "z" && !isTypingTarget(e.target);
}

// Cmd/Ctrl+Shift+Z hoặc Ctrl+Y = làm lại (Cmd+Y trên macOS là lịch sử trình duyệt)
export function isRedoKey(e: KeyLike): boolean {
  const key = e.key.toLowerCase();
  const redo = (key === "z" && !!e.shiftKey && !!(e.metaKey || e.ctrlKey)) || (key === "y" && !!e.ctrlKey);
  return redo && !isTypingTarget(e.target);
}
```

- [ ] **Step 4: Run the keyboard test and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/keyboard.test.ts`
Expected: PASS, `Tests  11 passed (11)`.

- [ ] **Step 5: Write the failing `formatHistoryResult` test**

Create `client/components/Scene/__tests__/historyToast.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatHistoryResult } from "../HistoryToast";

const names: Record<string, string> = { bob: "Bob Tran" };

describe("formatHistoryResult", () => {
  it("applied undo / redo / restore without skips", () => {
    expect(formatHistoryResult({ op: "undo", applied: 2, skipped: [] }, names)).toBe("Đã hoàn tác");
    expect(formatHistoryResult({ op: "redo", applied: 1, skipped: [] }, names)).toBe("Đã làm lại");
    expect(formatHistoryResult({ op: "restore", applied: 5, skipped: [] }, names)).toBe("Đã khôi phục phiên bản");
  });

  it("empty result per op", () => {
    const empty = [{ reason: "empty" as const }];
    expect(formatHistoryResult({ op: "undo", applied: 0, skipped: empty }, names)).toBe("Không còn gì để hoàn tác");
    expect(formatHistoryResult({ op: "redo", applied: 0, skipped: empty }, names)).toBe("Không còn gì để làm lại");
    expect(formatHistoryResult({ op: "restore", applied: 0, skipped: empty }, names)).toBe("Phiên bản này giống board hiện tại");
  });

  it("names the user who modified the key (spec §7.5 example 1)", () => {
    expect(
      formatHistoryResult(
        { op: "undo", applied: 0, skipped: [{ elementId: "s", key: "x", reason: "modified", byUserId: "bob" }] },
        names,
      ),
    ).toBe("1 thay đổi không hoàn tác được vì Bob Tran đã sửa");
  });

  it("partial apply lists done and skipped, deduplicating the reason", () => {
    expect(
      formatHistoryResult(
        {
          op: "undo",
          applied: 1,
          skipped: [
            { elementId: "s", key: "x", reason: "modified", byUserId: "bob" },
            { elementId: "s", key: "y", reason: "modified", byUserId: "bob" },
          ],
        },
        names,
      ),
    ).toBe("Đã hoàn tác. 2 thay đổi không hoàn tác được vì Bob Tran đã sửa");
  });

  it("unknown user and the other reasons", () => {
    expect(
      formatHistoryResult({ op: "redo", applied: 0, skipped: [{ key: "x", reason: "modified", byUserId: "zed" }] }, names),
    ).toBe("1 thay đổi không làm lại được vì người khác đã sửa");
    expect(
      formatHistoryResult({ op: "undo", applied: 0, skipped: [{ elementId: "c", key: "connector", reason: "end-missing" }] }, names),
    ).toBe("1 thay đổi không hoàn tác được vì điểm nối đã bị xóa");
    expect(
      formatHistoryResult(
        { op: "undo", applied: 0, skipped: [{ elementId: "e", reason: "gone" }, { elementId: "f", reason: "exists" }] },
        names,
      ),
    ).toBe("2 thay đổi không hoàn tác được vì phần tử đã bị xóa, phần tử đã tồn tại");
  });
});
```

- [ ] **Step 6: Run the toast test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/historyToast.test.ts`
Expected: FAIL. The suite errors with `Failed to resolve import "../HistoryToast" from "components/Scene/__tests__/historyToast.test.ts"` (0 tests run), because the file does not exist yet.

- [ ] **Step 7: Implement `HistoryToast.tsx`**

Create `client/components/Scene/HistoryToast.tsx`:

```tsx
"use client";

import { toast } from "@/hooks/use-toast";
import useUserInBoardStore from "@/lib/Zustand/userInBoardStore";
import type { HistoryResult, HistorySkip } from "./types";

const TOAST_MS = 3000;

const DONE: Record<HistoryResult["op"], string> = {
  undo: "Đã hoàn tác",
  redo: "Đã làm lại",
  restore: "Đã khôi phục phiên bản",
};
const EMPTY: Record<HistoryResult["op"], string> = {
  undo: "Không còn gì để hoàn tác",
  redo: "Không còn gì để làm lại",
  restore: "Phiên bản này giống board hiện tại",
};
const VERB: Record<HistoryResult["op"], string> = { undo: "hoàn tác", redo: "làm lại", restore: "khôi phục" };

function reasonText(s: HistorySkip, userNameById: Record<string, string>): string {
  switch (s.reason) {
    case "modified":
      return `${(s.byUserId && userNameById[s.byUserId]) || "người khác"} đã sửa`;
    case "gone":
      return "phần tử đã bị xóa";
    case "exists":
      return "phần tử đã tồn tại";
    case "end-missing":
      return "điểm nối đã bị xóa";
    default:
      return "";
  }
}

export function formatHistoryResult(r: HistoryResult, userNameById: Record<string, string>): string {
  const skips = r.skipped.filter((s) => s.reason !== "empty");
  if (r.applied === 0 && skips.length === 0) return EMPTY[r.op];
  const parts: string[] = [];
  if (r.applied > 0) parts.push(DONE[r.op]);
  if (skips.length > 0) {
    const reasons = Array.from(new Set(skips.map((s) => reasonText(s, userNameById))));
    parts.push(`${skips.length} thay đổi không ${VERB[r.op]} được vì ${reasons.join(", ")}`);
  }
  return parts.join(". ");
}

// Toast kết quả undo/redo/restore qua <Toaster/> toàn cục (app/layout.tsx); tên lấy từ thành viên board
export function showHistoryToast(r: HistoryResult): void {
  const names: Record<string, string> = {};
  useUserInBoardStore.getState().users.forEach((u) => {
    names[u.userId] = `${u.firstName} ${u.lastName}`.trim();
  });
  toast({ description: formatHistoryResult(r, names), duration: TOAST_MS });
}
```

- [ ] **Step 8: Run the toast test and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/historyToast.test.ts`
Expected: PASS, `Tests  5 passed (5)`.

- [ ] **Step 9: Add `historySeq` to the `Board` type**

In `client/lib/Zustand/type.type.ts`, insert after line 96 (`  elements?: BoardElement[];`, inside `export interface Board`):

```ts
  historySeq?: number; // committedSeq của op log, đọc trước elements (BoardFullDetailResponse.historySeq)
```

Run: `cd client && npx tsc --noEmit`
Expected: no output, exit code 0. The field is optional, and nothing reads it yet.

- [ ] **Step 10: Write the failing `sceneSocket` test**

Create `client/components/Scene/__tests__/sceneSocket.test.ts`:

```ts
import type { Client } from "@stomp/stompjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { invalidateSceneBaseline, reloadBoard, sceneSocket, setSceneBaseline, subscribeScene } from "../sceneSocket";
import type { BatchEvent, BoardElement, HistoryResult } from "../types";

const h = vi.hoisted(() => ({ publish: vi.fn(), getBoardById: vi.fn() }));

vi.mock("@/lib/Zustand/socketStore", () => ({
  useStompStore: { getState: () => ({ client: { connected: true, publish: h.publish } }) },
}));
vi.mock("@/api/BoardAPI", () => ({ default: { getBoardById: h.getBoardById } }));
vi.mock("@/lib/Zustand/store", () => ({ useBoardStoreof: { getState: () => ({ setBoard: () => {} }) } }));

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const S = () => useSceneStore.getState();

const patchBatch = (seq: number, id: string, x: number, version = seq): BatchEvent => ({
  op: "batch", txId: `tx${seq}`, source: "user", seqFrom: seq, seqTo: seq, senderSessionId: "other", userId: "bob",
  ops: [{ op: "patch", patches: [{ id, set: { x }, version }] }],
});

function fakeClient() {
  const handlers = new Map<string, (m: { body: string }) => void>();
  const unsubscribed: string[] = [];
  const client = {
    subscribe: (dest: string, cb: (m: { body: string }) => void) => {
      handlers.set(dest, cb);
      return { unsubscribe: () => unsubscribed.push(dest) };
    },
  };
  return {
    client: client as unknown as Client,
    unsubscribed,
    send(dest: string, body: unknown) {
      const cb = handlers.get(dest);
      if (!cb) throw new Error(`no subscription for ${dest}`);
      cb({ body: JSON.stringify(body) });
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const published = () =>
  h.publish.mock.calls.map(([arg]) => {
    const { destination, body } = arg as { destination: string; body: string };
    return [destination, JSON.parse(body)];
  });

let unsub: (() => void) | null = null;

afterEach(() => {
  unsub?.();
  unsub = null;
  h.publish.mockReset();
  h.getBoardById.mockReset();
});

describe("sceneSocket publish", () => {
  it("patch sends mergeKey top-level next to patches", () => {
    S().reset("b1", [el("a")]);
    sceneSocket.patch("b1", [{ id: "a", set: { text: "hi" }, version: 7 }], { mergeKey: "text:a:s1" });
    expect(published()).toEqual([
      ["/app/board/b1/el/patch", { patches: [{ id: "a", set: { text: "hi" } }], mergeKey: "text:a:s1" }],
    ]);
  });

  it("patch without opts sends no mergeKey", () => {
    S().reset("b1", [el("a")]);
    sceneSocket.patch("b1", [{ id: "a", set: { x: 3 } }]);
    const [[, body]] = published();
    expect(body).toEqual({ patches: [{ id: "a", set: { x: 3 } }] });
    expect("mergeKey" in body).toBe(false);
  });

  it("undo, redo and restore publish to el/undo, el/redo and el/restore", () => {
    sceneSocket.undo("b1");
    sceneSocket.redo("b1");
    sceneSocket.restore("b1", 12);
    expect(published()).toEqual([
      ["/app/board/b1/el/undo", {}],
      ["/app/board/b1/el/redo", {}],
      ["/app/board/b1/el/restore", { seq: 12 }],
    ]);
  });
});

describe("subscribeScene", () => {
  it("applies batches through seqSync after the baseline and drops duplicates", () => {
    S().reset("b2", [el("a")]);
    setSceneBaseline(10);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b2", "me", () => {});
    f.send("/topic/board/b2/el", patchBatch(11, "a", 5));
    expect(S().elements.a.x).toBe(5);
    f.send("/topic/board/b2/el", patchBatch(11, "a", 99, 50));
    expect(S().elements.a.x).toBe(5);
  });

  it("holds batches until a baseline for the subscribed board is known", () => {
    S().reset("b5", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b5", "me", () => {});
    f.send("/topic/board/b5/el", patchBatch(21, "a", 4));
    expect(S().elements.a.x).toBe(0);
    setSceneBaseline(20);
    expect(S().elements.a.x).toBe(4);
  });

  it("non-batch element events still go through applyRemote", () => {
    S().reset("b6", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b6", "me", () => {});
    f.send("/topic/board/b6/el", { op: "lock", senderSessionId: "other", userId: "bob", ids: ["a"] });
    expect(S().locks.a).toBe("bob");
  });

  it("history results go to onHistory", () => {
    S().reset("b7", []);
    const results: HistoryResult[] = [];
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b7", "me", () => {}, (r) => results.push(r));
    f.send("/user/queue/history", { op: "undo", applied: 0, skipped: [{ reason: "empty" }] });
    expect(results).toEqual([{ op: "undo", applied: 0, skipped: [{ reason: "empty" }] }]);
  });

  it("unsubscribe removes the element, error and history subscriptions", () => {
    S().reset("b8", []);
    const f = fakeClient();
    const stop = subscribeScene(f.client, "b8", "me", () => {});
    stop();
    expect([...f.unsubscribed].sort()).toEqual(["/topic/board/b8/el", "/user/queue/errors", "/user/queue/history"]);
  });

  it("reloadBoard sets the baseline from historySeq (Review Focus 2)", async () => {
    S().reset("b3", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b3", "me", () => {});
    h.getBoardById.mockResolvedValue({ id: "b3", elements: [el("a", { boardId: "b3" })], canvasPaths: [], historySeq: 42 });
    await expect(reloadBoard("b3")).resolves.toBe(42);
    f.send("/topic/board/b3/el", patchBatch(42, "a", 99, 60));
    expect(S().elements.a.x).toBe(0);
    f.send("/topic/board/b3/el", patchBatch(43, "a", 7));
    expect(S().elements.a.x).toBe(7);
  });

  it("a contiguous batch that arrives while reloadBoard is in flight is applied after the reset", async () => {
    S().reset("b4", [el("a")]);
    setSceneBaseline(42);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b4", "me", () => {});
    const d = deferred<unknown>();
    h.getBoardById.mockReturnValue(d.promise);
    const p = reloadBoard("b4");
    f.send("/topic/board/b4/el", patchBatch(43, "a", 7));
    expect(S().elements.a.x).toBe(0);
    d.resolve({ id: "b4", elements: [el("a", { boardId: "b4" })], canvasPaths: [], historySeq: 42 });
    await expect(p).resolves.toBe(42);
    expect(S().elements.a.x).toBe(7);
  });

  it("re-entering a board after invalidateSceneBaseline holds batches until the new baseline", () => {
    S().reset("b10", [el("a")]);
    setSceneBaseline(5);
    const f1 = fakeClient();
    const stop = subscribeScene(f1.client, "b10", "me", () => {});
    stop();
    // như useBoard khi vào lại board: reset store rồi bỏ baseline cũ trước khi fetch
    S().reset("b10", [el("a")]);
    invalidateSceneBaseline();
    const f2 = fakeClient();
    unsub = subscribeScene(f2.client, "b10", "me", () => {});
    f2.send("/topic/board/b10/el", patchBatch(6, "a", 6));
    expect(S().elements.a.x).toBe(0);
    setSceneBaseline(7);
    expect(S().elements.a.x).toBe(0);
    f2.send("/topic/board/b10/el", patchBatch(8, "a", 8));
    expect(S().elements.a.x).toBe(8);
  });

  it("reloadBoard resolves null when the request fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getBoardById.mockRejectedValue(new Error("network"));
    await expect(reloadBoard("b9")).resolves.toBeNull();
    spy.mockRestore();
  });
});
```

- [ ] **Step 11: Run the `sceneSocket` test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneSocket.test.ts`
Expected: FAIL, `Tests  10 failed | 2 passed (12)`. The reasons:
- `patch sends mergeKey…` fails with an `AssertionError`, because the body has no `mergeKey`.
- The undo/redo/restore test fails with `TypeError: sceneSocket.undo is not a function`.
- The baseline tests fail with `TypeError: setSceneBaseline is not a function` (the re-entry test too, at its first `setSceneBaseline` call; `invalidateSceneBaseline` does not exist yet either).
- The history test fails with `Error: no subscription for /user/queue/history`.
- The unsubscribe test fails with an `AssertionError` (2 subscriptions, not 3).
- Both `reloadBoard` tests fail, because it resolves `undefined`.

`patch without opts…` and `non-batch element events…` pass, since that behaviour already exists.

- [ ] **Step 12: Rewrite `sceneSocket.ts`**

Replace the whole content of `client/components/Scene/sceneSocket.ts` (lines 1-93) with:

```ts
import BoardAPI from "@/api/BoardAPI";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import type { Client } from "@stomp/stompjs";
import { createSeqSync, type SeqSync } from "./seqSync";
import type { BatchEvent, BoardElement, ElementEvent, ElementPatch, HistoryResult } from "./types";

const PREVIEW_INTERVAL = 50;

function publish(boardId: string, op: string, body: unknown) {
  const client = useStompStore.getState().client;
  if (!client?.connected) {
    console.warn("STOMP client chưa kết nối, bỏ qua", op);
    return;
  }
  client.publish({ destination: `/app/board/${boardId}/el/${op}`, body: JSON.stringify(body) });
}

// Gộp preview theo id rồi gửi tối đa mỗi PREVIEW_INTERVAL ms
let pendingPreview = new Map<string, ElementPatch>();
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let previewBoard: string | null = null;

function flushPreview() {
  previewTimer = null;
  if (!previewBoard || pendingPreview.size === 0) return;
  publish(previewBoard, "preview", { patches: Array.from(pendingPreview.values()) });
  pendingPreview = new Map();
}

export const sceneSocket = {
  create(boardId: string, elements: BoardElement[]) {
    if (!elements.length) return;
    useSceneStore.getState().upsertLocal(elements);
    publish(boardId, "create", { elements });
  },
  patch(boardId: string, patches: ElementPatch[], opts?: { mergeKey?: string }) {
    if (!patches.length) return;
    // commit thay thế preview đang chờ của cùng id
    patches.forEach((p) => pendingPreview.delete(p.id));
    useSceneStore.getState().commitLocal(patches);
    const body: { patches: ElementPatch[]; mergeKey?: string } = { patches: patches.map(({ id, set }) => ({ id, set })) };
    // mergeKey ở top-level: server gộp các lần gõ liên tiếp (< 3s) vào cùng một tx
    if (opts?.mergeKey) body.mergeKey = opts.mergeKey;
    publish(boardId, "patch", body);
  },
  preview(boardId: string, patches: ElementPatch[]) {
    if (!patches.length) return;
    useSceneStore.getState().patchLocal(patches);
    previewBoard = boardId;
    patches.forEach((p) => {
      const prev = pendingPreview.get(p.id);
      pendingPreview.set(p.id, { id: p.id, set: { ...prev?.set, ...p.set } });
    });
    if (!previewTimer) previewTimer = setTimeout(flushPreview, PREVIEW_INTERVAL);
  },
  remove(boardId: string, ids: string[]) {
    if (!ids.length) return;
    useSceneStore.getState().removeLocal(ids);
    publish(boardId, "delete", { ids });
  },
  lock(boardId: string, id: string) {
    publish(boardId, "lock", { id });
  },
  unlock(boardId: string, id: string) {
    publish(boardId, "unlock", { id });
  },
  // undo/redo/restore không áp lạc quan: kết quả tới qua batch + /user/queue/history
  undo(boardId: string) {
    publish(boardId, "undo", {});
  },
  redo(boardId: string) {
    publish(boardId, "redo", {});
  },
  restore(boardId: string, seq: number) {
    publish(boardId, "restore", { seq });
  },
};

// Đồng bộ seq của batch: một SeqSync cho board đang subscribe
let sync: SeqSync | null = null;
let syncBoardId: string | null = null;
let baseline: { boardId: string; seq: number } | null = null;
let reloadDepth = 0;
let held: BatchEvent[] = [];

function readySync(): SeqSync | null {
  return sync && reloadDepth === 0 && baseline?.boardId === syncBoardId ? sync : null;
}

// Chưa có baseline của board hoặc đang tải lại: giữ batch, áp sau khi reset store
function routeBatch(ev: BatchEvent) {
  const s = readySync();
  if (s) s.onBatch(ev);
  else held.push(ev);
}

function releaseHeld() {
  const s = readySync();
  if (!s) return;
  const evs = held;
  held = [];
  evs.forEach((ev) => s.onBatch(ev));
}

// Bỏ baseline cũ (vào lại board): giữ batch cho tới khi setSceneBaseline sau lần fetch mới
export function invalidateSceneBaseline(): void {
  baseline = null;
}

export function setSceneBaseline(seq: number) {
  const boardId = useSceneStore.getState().boardId;
  if (!boardId) return;
  baseline = { boardId, seq };
  if (sync && syncBoardId === boardId) sync.setBaseline(seq);
  releaseHeld();
}

export function subscribeScene(
  client: Client,
  boardId: string,
  sessionId: string,
  onError: () => void,
  onHistory?: (r: HistoryResult) => void
) {
  const own = createSeqSync({
    apply: (ev) => useSceneStore.getState().applyBatch(ev, sessionId),
    reload: () => loadBoard(boardId),
  });
  sync?.dispose();
  sync = own;
  syncBoardId = boardId;
  held = [];
  if (baseline?.boardId === boardId) own.setBaseline(baseline.seq);

  const elementSub = client.subscribe(`/topic/board/${boardId}/el`, (message) => {
    const event = JSON.parse(message.body) as ElementEvent | BatchEvent;
    if (event.op === "batch") routeBatch(event);
    else useSceneStore.getState().applyRemote(event, sessionId);
  });
  const errorSub = client.subscribe("/user/queue/errors", (message) => {
    console.error("Element error:", message.body);
    onError();
  });
  const historySub = client.subscribe("/user/queue/history", (message) => {
    onHistory?.(JSON.parse(message.body) as HistoryResult);
  });
  return () => {
    elementSub.unsubscribe();
    errorSub.unsubscribe();
    historySub.unsubscribe();
    if (sync === own) {
      // giữ seq đã áp để lần subscribe lại (reconnect) tiếp tục từ đó
      if (baseline?.boardId === boardId) baseline = { boardId, seq: own.lastSeq() };
      sync = null;
      syncBoardId = null;
      held = [];
    }
    own.dispose();
  };
}

// Tải board, reset store, đặt baseline = historySeq; ném lỗi để SeqSync thử lại
async function loadBoard(boardId: string): Promise<number> {
  reloadDepth += 1;
  try {
    const board = await BoardAPI.getBoardById(boardId);
    useBoardStoreof.getState().setBoard(board);
    useSceneStore.getState().reset(boardId, board.elements ?? []);
    useCanvasPathsStore.getState().setCanvasPaths(board.canvasPaths ?? []);
    const seq = board.historySeq ?? 0;
    setSceneBaseline(seq);
    return seq;
  } finally {
    reloadDepth -= 1;
    releaseHeld();
  }
}

// Tải lại toàn bộ board (khi server báo lỗi hoặc sau khi kết nối lại); null nếu lỗi
export async function reloadBoard(boardId: string): Promise<number | null> {
  try {
    return await loadBoard(boardId);
  } catch (e) {
    console.error("reload board error:", e);
    return null;
  }
}
```

Lines 1-66 of the old file are kept verbatim, except for these changes: the imports (lines 7-8), `patch` (the `opts` parameter and the body), and the new `undo`/`redo`/`restore` methods. `subscribeScene` and `reloadBoard` are rewritten as shown.

- [ ] **Step 13: Run the `sceneSocket` test and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneSocket.test.ts`
Expected: PASS, `Tests  12 passed (12)`.

- [ ] **Step 14: Set the baseline on the initial board load**

In `client/app/user/board/[id]/useBoard.ts`, replace line 3:

```ts
import { sceneSocket } from "@/components/Scene/sceneSocket";
```

with:

```ts
import { invalidateSceneBaseline, sceneSocket, setSceneBaseline } from "@/components/Scene/sceneSocket";
```

Insert after line 28 (`    useSceneStore.getState().reset(boardId, []);`, before `useCanvasPathsStore.getState().setCanvasPaths([]);`):

```ts
    // baseline cũ (lần vào board trước) đã lỗi thời: giữ batch cho tới khi có historySeq mới
    invalidateSceneBaseline();
```

Insert after line 35 (was line 34 before the insert above) (`        useSceneStore.getState().reset(boardId, res.elements ?? []);`):

```ts
        // lastSeq bắt đầu từ historySeq (server đọc trước elements) → batch cũ hơn bị bỏ, không reload thừa
        setSceneBaseline(res.historySeq ?? 0);
```

- [ ] **Step 15: Pass the toast callback to `subscribeScene`**

In `client/app/user/board/[id]/BoardSubscription.tsx`, replace line 2:

```ts
import { reloadBoard, subscribeScene } from '@/components/Scene/sceneSocket';
```

with:

```ts
import { showHistoryToast } from '@/components/Scene/HistoryToast';
import { reloadBoard, subscribeScene } from '@/components/Scene/sceneSocket';
```

Replace line 62 (line 63 after the import above):

```ts
    const unsubscribeScene = subscribeScene(client, boardId, sessionId, () => reloadBoard(boardId));
```

with:

```ts
    const unsubscribeScene = subscribeScene(client, boardId, sessionId, () => reloadBoard(boardId), showHistoryToast);
```

- [ ] **Step 16: Wire the undo/redo keys in `BoardScene`**

In `client/components/Scene/BoardScene.tsx`, replace line 16:

```ts
import { isTypingTarget, shouldHandleDeleteKey } from "./keyboard";
```

with:

```ts
import { isRedoKey, isTypingTarget, isUndoKey, shouldHandleDeleteKey } from "./keyboard";
```

Insert after line 73 (the closing `}` of the `if (e.key === "Escape") { … }` block, before `if (shouldHandleDeleteKey(e) && canEdit) {`):

```ts
      // Cmd/Ctrl+Z hoàn tác, Shift+Cmd/Ctrl+Z hoặc Ctrl+Y làm lại (stack ở server, chỉ thao tác của mình)
      if (isUndoKey(e) || isRedoKey(e)) {
        e.preventDefault();
        if (!canEdit) return;
        if (isRedoKey(e)) sceneSocket.redo(boardId);
        else sceneSocket.undo(boardId);
        return;
      }
```

The dependency array at line 92 already contains `boardId` and `canEdit`, so it stays unchanged. Task 12 adds `|| useSceneStore.getState().historyMode` to the `!canEdit` gate.

- [ ] **Step 17: Send `mergeKey` per edit session from `TextEditOverlay`**

In `client/components/Scene/TextEditOverlay.tsx`, replace line 7:

```ts
import { sceneSocket } from "./sceneSocket";
```

with:

```ts
import { sceneSocket } from "./sceneSocket";
import { newObjectId } from "./types";
```

Insert after line 24 (`  const lastSent = useRef(el?.text ?? "");`, before the blank line and `const send`):

```ts
  // mỗi lần mở ô sửa là một phiên: các lần gõ trong phiên gộp thành một tx trên server
  const [editSessionId] = useState(newObjectId);
```

Replace line 31 (line 33 after the insert above):

```ts
    sceneSocket.patch(boardId, [{ id, set: { text: value } }]);
```

with:

```ts
    sceneSocket.patch(boardId, [{ id, set: { text: value } }], { mergeKey: `text:${id}:${editSessionId}` });
```

`Editor` is keyed by `editingId` (line 15), so every opening mounts a new `Editor` and gets a new `editSessionId`. The hook sits before the early `return null` at line 63, so the hook order stays stable.

- [ ] **Step 18: Type-check the wiring**

Run: `cd client && npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 19: Checkpoint — run the FE gate**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: `tsc` prints nothing (exit 0). Vitest prints `Test Files  13 passed (13)` and `Tests  120 passed (120)`. That is Task 10's 11 files / 96 tests, plus 7 new keyboard tests (in an existing file), `historyToast.test.ts` (5) and `sceneSocket.test.ts` (12). If an earlier task changed the baseline count, the delta must still be +2 files / +24 tests.

Report the results (the tsc output, the vitest summary and any failures verbatim). Do NOT commit.

---

### Task 12: FE history mode: store, selectors, gating, HistoryPanel, HistoryBanner, historyApi

Spec: §9.3 (no undo/redo in history mode), §9.4 (history mode), §8.1 (REST shape). Line numbers below are from the working tree on 2026-09-25, **before** Tasks 10 and 11. Those tasks insert lines into `sceneStore.ts` (and Task 11 may touch `BoardScene.tsx`), so every edit below names the exact anchor text to find. Use the anchor text, not the line number, when they disagree.

**Files:**
- Modify: `client/lib/Zustand/sceneStore.ts`
  - line 5 `interface SceneState {`: export it, because the contract selectors take `SceneState`
  - after line 13 (`ghosts: BoardElement[];`) and after line 23 (`setGhosts: ...`): new state fields and actions
  - after line 78 (`ghosts: [],`): initial values
  - line 86 (`set({ boardId, elements, ... ghosts: [] });` in `reset`): leave history mode only when the board changes
  - after line 190 (`setGhosts: (ghosts) => set({ ghosts }),`): `enterHistory` / `exitHistory`
  - after line 204 (end of file `}));`): `selectDisplayedElements`, `selectDisplayedOrder`
- Modify: `client/components/Scene/useCanEdit.ts` (lines 1-11, whole file): pure `canEditFrom` + history gate
- Create: `client/api/historyApi.ts`
- Create: `client/components/Scene/HistoryPanel.tsx` (exports pure `groupTimeline`, `formatHHmm`)
- Create: `client/components/Scene/HistoryBanner.tsx`
- Modify: `client/components/Scene/BoardScene.tsx` lines 6, 46-48, 112, 135-148, 171, 191 (+ undo/redo gate of Task 11)
- Modify: `client/components/Scene/SceneElement.tsx` lines 1, 29, 31
- Modify: `client/components/Scene/elements/ConnectorView.tsx` lines 1, 8-9
- Modify: `client/components/Scene/SelectionOverlay.tsx` lines 1, 26, 112
- Modify: `client/components/Scene/ElementContextMenu.tsx` lines 2, 15
- Modify: `client/components/Scene/usePointerController.ts` lines 1, 238, 310, 428
- Modify: `client/components/SideBar/LeftToolBar.jsx` lines 5, 265 (after), 362
- Modify: `client/components/SideBar/ImageTool.tsx` lines 11 (after), 35-38, 62
- Modify: `client/app/user/board/[id]/page.tsx` lines 14 (after), 29 (after), 45-47, 66, 69 (after)
- Test (create): `client/components/Scene/__tests__/sceneStoreHistory.test.ts` (separate file, so it does not conflict with Task 10's `sceneStoreBatch.test.ts`)
- Test (create): `client/components/Scene/__tests__/useCanEdit.test.ts`
- Test (create): `client/components/Scene/__tests__/historyApi.test.ts`
- Test (create): `client/components/Scene/__tests__/historyTimeline.test.ts`

**Interfaces:**
- Consumes (from the contract, produced by Tasks 10, 11 and 9):
  - `client/components/Scene/types.ts` (Task 10): `export type HistorySource = "user" | "undo" | "redo" | "restore" | "template";`
  - `client/components/Scene/sceneSocket.ts` (Task 11): `sceneSocket.restore(boardId: string, seq: number): void;`
  - `client/components/Scene/keyboard.ts` (Task 11): `isUndoKey(e: KeyLike): boolean`, `isRedoKey(e: KeyLike): boolean` and the undo/redo key handler that uses them
  - REST (Task 9): `GET ${api.prefix}/board/{id}/history?beforeSeq=&limit=` → `List<TxView>`, `GET ${api.prefix}/board/{id}/history/state?seq=` → `StateView {seq, elements}`
- Produces (exact contract signatures):
  - `sceneStore.ts`:
    - `historyMode: null | { seq: number; txId: string; label: string };`
    - `historyElements: Record<string, BoardElement>;`
    - `enterHistory: (mode: { seq: number; txId: string; label: string }, elements: BoardElement[]) => void;` (clears `selection` and `editingId`)
    - `exitHistory: () => void;`
    - `export const selectDisplayedElements: (s: SceneState) => Record<string, BoardElement>;`
    - `export const selectDisplayedOrder: (s: SceneState) => string[];`
  - `client/api/historyApi.ts`:
    - `export interface TxView { txId: string; userId: string; userName: string; ts: string; source: HistorySource; state: string; summary: { created: number; patched: number; deleted: number }; seqTo: number; }`
    - `export const HistoryAPI: { list(boardId: string, beforeSeq?: number, limit?: number): Promise<TxView[]>; state(boardId: string, seq: number): Promise<{ seq: number; elements: BoardElement[] }>; };`
  - Non-contract helpers (local to this task): `canEditFrom(board, userId, historyMode): boolean` in `useCanEdit.ts`; `groupTimeline(txs: TxView[]): TimelineGroup[]` and `formatHHmm(ts: string): string` in `HistoryPanel.tsx`.

Decisions (evidence):
- `vitest.config.ts:5` runs `environment: "node"` and only `**/__tests__/**/*.test.ts`, and there is no React Testing Library in `package.json`. Hooks are therefore tested through the pure `canEditFrom`. A probe run on 2026-09-25 confirmed that a node-env vitest file can import `@/components/Scene/useCanEdit` (which pulls `store.ts` and `tokenStore.ts`), `@/utils/httpRequest`, and `.tsx` modules such as `SelectionOverlay.tsx`, so `groupTimeline` can live in `HistoryPanel.tsx`.
- `historyApi.ts` uses the authenticated axios instance `@/utils/httpRequest` (baseURL `http://localhost:8080/api/v1` or `NEXT_PUBLIC_BACKEND_URL`, `utils/httpRequest.ts:7-18`), the same one `api/BoardAPI.ts:2` uses for `/board/{id}`. `templatesApi.tsx:4-9` builds its own unauthenticated instance, which is wrong for a member-only endpoint.
- `selectDisplayedOrder` must return a stable array reference. Zustand's `useSceneStore(selector)` re-renders forever when a selector returns a fresh array each call. In live mode it returns `s.order`. In history mode it memoizes `sortOrder(historyElements)` by the `historyElements` reference. It reuses the existing `sortOrder` (`sceneStore.ts:49-52`, z then id), so the history order has the same tie-break as live.
- `reset` (`sceneStore.ts:80-87`) is also called by `reloadBoard` (`sceneSocket.ts:88`) on errors and seq gaps. A reload of the **same** board keeps history mode, so the viewer is not kicked out by a gap reload. A reset for a **different** board clears it.
- `enterHistory` sets `editingId = null`. That unmounts `Editor` (`TextEditOverlay.tsx:13-15`), whose effect cleanup calls `sceneSocket.unlock` when it holds the lock (`TextEditOverlay.tsx:45-49`). This is how the spec's "nhả lock text đang giữ" happens, with no extra code.
- Write paths that already gate on `canEdit` and are therefore closed once `useCanEdit()` returns false: Delete key (`BoardScene.tsx:74`), `StylePanel` (`BoardScene.tsx:209`), context-menu edit items (`ElementContextMenu.tsx:47-60`), every edit branch of `onPointerDown` (`usePointerController.ts:164, 171, 189, 201, 210, 217, 241, 259, 270`) and `onDoubleClick` (`:493`), LeftToolBar create buttons (`LeftToolBar.jsx:286, 293-304, 310`). Paths that do not go through `canEdit` and get an explicit gate here: `ImageTool` upload callback (`ImageTool.tsx:35-38`, the upload can finish after entering history), `ImageTool` render (`LeftToolBar.jsx:362`, always rendered), and the ghost save in `page.tsx:45-56, 66-68`.
- `beforeSeq` is passed as the `seqTo` of the oldest loaded tx. **Assumption:** Task 9 treats `beforeSeq` as exclusive (`seqTo < beforeSeq`). If Task 9 made it inclusive, the first row of each new page is a duplicate. The fix would then be `last.seqTo - 1` in `HistoryPanel.tsx`.
- The toggle button sits at `fixed bottom-20 right-4`, directly above `AIChatButton` (`AIChatButton.tsx:23`, `fixed bottom-4 right-4`), because `TopRightBar` owns the top-right corner (`TopRightBar.tsx:123`). The banner reuses the `ConfirmSaveBar` slot (`ConfirmSaveBar.tsx:9`, `fixed top-4 left-1/2`), because that bar is hidden in history mode.

- [ ] **Step 1: Write the failing store history test**

Create `client/components/Scene/__tests__/sceneStoreHistory.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { selectDisplayedElements, selectDisplayedOrder, useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BoardElement } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const S = () => useSceneStore.getState();
const MODE = { seq: 7, txId: "t7", label: "09:05 · Alice" };

beforeEach(() => {
  S().exitHistory();
  S().reset("b", [el("a", { z: 2 }), el("b", { z: 1 })]);
});

describe("sceneStore history mode", () => {
  it("starts live: selectors return the live elements and order", () => {
    expect(S().historyMode).toBeNull();
    expect(selectDisplayedElements(S())).toBe(S().elements);
    expect(selectDisplayedOrder(S())).toBe(S().order);
  });
  it("enterHistory clears selection and editingId", () => {
    S().setSelection(["a"]);
    S().setEditing("a");
    S().enterHistory(MODE, [el("x", { z: 5 })]);
    expect(S().historyMode).toEqual(MODE);
    expect(S().selection).toEqual([]);
    expect(S().editingId).toBeNull();
  });
  it("selectors switch to the history elements, ordered by z, and live state is untouched", () => {
    S().enterHistory(MODE, [el("x", { z: 5 }), el("y", { z: -1 })]);
    expect(Object.keys(selectDisplayedElements(S())).sort()).toEqual(["x", "y"]);
    expect(selectDisplayedOrder(S())).toEqual(["y", "x"]);
    expect(S().elements.a).toBeDefined();
    expect(S().order).toEqual(["b", "a"]);
  });
  it("history order breaks z ties by id like the live order", () => {
    S().enterHistory(MODE, [el("q", { z: 1 }), el("p", { z: 1 })]);
    expect(selectDisplayedOrder(S())).toEqual(["p", "q"]);
  });
  it("selectDisplayedOrder is referentially stable while in history (zustand selector safety)", () => {
    S().enterHistory(MODE, [el("x", { z: 5 }), el("y", { z: -1 })]);
    expect(selectDisplayedOrder(S())).toBe(selectDisplayedOrder(S()));
  });
  it("live store keeps receiving remote events while viewing history", () => {
    S().enterHistory(MODE, [el("x")]);
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }, "me");
    expect(S().elements.a.x).toBe(50);
    expect(selectDisplayedElements(S()).a).toBeUndefined();
  });
  it("exitHistory clears history elements and selection, selectors return live again", () => {
    S().enterHistory(MODE, [el("x")]);
    S().setSelection(["x"]);
    S().exitHistory();
    expect(S().historyMode).toBeNull();
    expect(S().historyElements).toEqual({});
    expect(S().selection).toEqual([]);
    expect(selectDisplayedElements(S())).toBe(S().elements);
    expect(selectDisplayedOrder(S())).toBe(S().order);
  });
  it("reset of the same board (reloadBoard) keeps history mode", () => {
    S().enterHistory(MODE, [el("x")]);
    S().reset("b", [el("a")]);
    expect(S().historyMode).toEqual(MODE);
    expect(Object.keys(selectDisplayedElements(S()))).toEqual(["x"]);
  });
  it("reset for another board leaves history mode", () => {
    S().enterHistory(MODE, [el("x")]);
    S().reset("b2", []);
    expect(S().historyMode).toBeNull();
    expect(S().historyElements).toEqual({});
  });
});
```

- [ ] **Step 2: Run the store history test and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneStoreHistory.test.ts`
Expected: FAIL, `Tests  9 failed (9)`. Every test fails in `beforeEach` with `TypeError: S(...).exitHistory is not a function`, because the store has no history actions yet.

- [ ] **Step 3: Add the history fields and actions to `SceneState`**

In `client/lib/Zustand/sceneStore.ts`, replace line 5:

```ts
interface SceneState {
```

with:

```ts
export interface SceneState {
```

Replace line 13:

```ts
  ghosts: BoardElement[];
```

with:

```ts
  ghosts: BoardElement[];
  historyMode: null | { seq: number; txId: string; label: string };
  historyElements: Record<string, BoardElement>;
```

Replace line 23:

```ts
  setGhosts: (ghosts: BoardElement[]) => void;
```

with:

```ts
  setGhosts: (ghosts: BoardElement[]) => void;
  enterHistory: (mode: { seq: number; txId: string; label: string }, elements: BoardElement[]) => void;
  exitHistory: () => void;
```

- [ ] **Step 4: Initial values, `reset`, `enterHistory`, `exitHistory`**

In `client/lib/Zustand/sceneStore.ts`, replace line 78 (initial state):

```ts
  ghosts: [],
```

with:

```ts
  ghosts: [],
  historyMode: null,
  historyElements: {},
```

In `reset`, replace line 86:

```ts
    set({ boardId, elements, order: sortOrder(elements), selection: [], editingId: null, locks: {}, ghosts: [] });
```

with:

```ts
    // reloadBoard cùng board khi đang xem lịch sử thì giữ chế độ xem; đổi board thì thoát
    const leaveHistory = get().boardId !== boardId ? { historyMode: null, historyElements: {} } : {};
    set({ boardId, elements, order: sortOrder(elements), selection: [], editingId: null, locks: {}, ghosts: [], ...leaveHistory });
```

Replace line 190:

```ts
  setGhosts: (ghosts) => set({ ghosts }),
```

with:

```ts
  setGhosts: (ghosts) => set({ ghosts }),

  enterHistory: (mode, els) => {
    const historyElements: Record<string, BoardElement> = {};
    els.forEach((e) => (historyElements[e.id] = e));
    // editingId = null làm TextEditOverlay unmount và nhả lock text đang giữ
    set({ historyMode: mode, historyElements, selection: [], editingId: null });
  },
  exitHistory: () => set({ historyMode: null, historyElements: {}, selection: [] }),
```

- [ ] **Step 5: Add the selectors**

Append at the end of `client/lib/Zustand/sceneStore.ts`, after the final `}));` (line 204):

```ts

// Các component vẽ / hit-test đọc qua 2 selector này: đang xem lịch sử thì trả bản lịch sử
export const selectDisplayedElements = (s: SceneState): Record<string, BoardElement> =>
  s.historyMode ? s.historyElements : s.elements;

// Cache theo tham chiếu historyElements: selector của zustand phải trả mảng ổn định
let historyOrderCache: { src: Record<string, BoardElement>; order: string[] } | null = null;
export const selectDisplayedOrder = (s: SceneState): string[] => {
  if (!s.historyMode) return s.order;
  if (historyOrderCache?.src !== s.historyElements)
    historyOrderCache = { src: s.historyElements, order: sortOrder(s.historyElements) };
  return historyOrderCache.order;
};
```

- [ ] **Step 6: Run the store tests and confirm they pass**

Run: `cd client && npx vitest run components/Scene/__tests__/sceneStoreHistory.test.ts components/Scene/__tests__/sceneStore.test.ts components/Scene/__tests__/sceneStoreBatch.test.ts`
Expected: PASS, `Test Files  3 passed (3)`. `sceneStoreHistory.test.ts` has 9 passing tests. The existing `sceneStore.test.ts` still passes, including `"reset clears state for a new board"` (it resets to `"b2"`).

- [ ] **Step 7: Write the failing `canEditFrom` test**

Create `client/components/Scene/__tests__/useCanEdit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canEditFrom } from "../useCanEdit";

const board = {
  owner: "o",
  members: [
    { memberId: "e", role: "EDITOR" as const },
    { memberId: "v", role: "VIEWER" as const },
  ],
};
const MODE = { seq: 3, txId: "t3", label: "10:00 · O" };

describe("canEditFrom", () => {
  it("owner and editor can edit, viewer and stranger cannot", () => {
    expect(canEditFrom(board, "o", null)).toBe(true);
    expect(canEditFrom(board, "e", null)).toBe(true);
    expect(canEditFrom(board, "v", null)).toBe(false);
    expect(canEditFrom(board, "x", null)).toBe(false);
  });
  it("no board or no user → false", () => {
    expect(canEditFrom(null, "o", null)).toBe(false);
    expect(canEditFrom(board, undefined, null)).toBe(false);
  });
  it("history mode makes everyone read-only, owner included", () => {
    expect(canEditFrom(board, "o", MODE)).toBe(false);
    expect(canEditFrom(board, "e", MODE)).toBe(false);
  });
});
```

- [ ] **Step 8: Run it and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/useCanEdit.test.ts`
Expected: FAIL, `Tests  3 failed (3)`, each with `TypeError: (0 , __vi_import_0__.canEditFrom) is not a function`, because `useCanEdit.ts` exports only the hook.

- [ ] **Step 9: Implement `canEditFrom` and gate `useCanEdit`**

Replace the whole of `client/components/Scene/useCanEdit.ts` (lines 1-11) with:

```ts
import { SceneState, useSceneStore } from "@/lib/Zustand/sceneStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import type { Board } from "@/lib/Zustand/type.type";

// OWNER hoặc EDITOR mới được chỉnh sửa; VIEWER chỉ xem / pan / zoom; đang xem lịch sử thì ai cũng chỉ xem
export function canEditFrom(
  board: Pick<Board, "owner" | "members"> | null,
  userId: string | undefined,
  historyMode: SceneState["historyMode"]
): boolean {
  if (historyMode) return false;
  if (!board || !userId) return false;
  if (board.owner === userId) return true;
  return board.members?.some((m) => m.memberId === userId && m.role === "EDITOR") ?? false;
}

export function useCanEdit(): boolean {
  const board = useBoardStoreof((s) => s.board);
  const userId = useTokenStore((s) => s.user?.id);
  const historyMode = useSceneStore((s) => s.historyMode);
  return canEditFrom(board, userId, historyMode);
}
```

- [ ] **Step 10: Run it and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/useCanEdit.test.ts`
Expected: PASS, `Tests  3 passed (3)`.

- [ ] **Step 11: Write the failing `historyApi` test**

Create `client/components/Scene/__tests__/historyApi.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/httpRequest", () => ({ default: { get: vi.fn() } }));

import { HistoryAPI } from "@/api/historyApi";
import httpRequest from "@/utils/httpRequest";

const get = vi.mocked(httpRequest.get);

beforeEach(() => {
  get.mockReset();
});

describe("HistoryAPI", () => {
  it("list sends beforeSeq and limit to GET /board/{id}/history", async () => {
    get.mockResolvedValue({ data: [{ txId: "t1" }] } as never);
    await expect(HistoryAPI.list("b1", 40, 10)).resolves.toEqual([{ txId: "t1" }]);
    expect(get).toHaveBeenCalledWith("/board/b1/history", { params: { beforeSeq: 40, limit: 10 } });
  });
  it("list without beforeSeq omits it and defaults limit to 30", async () => {
    get.mockResolvedValue({ data: [] } as never);
    await HistoryAPI.list("b1");
    const params = (get.mock.calls[0][1] as { params: Record<string, number> }).params;
    expect(params).toStrictEqual({ limit: 30 });
  });
  it("state sends seq to GET /board/{id}/history/state", async () => {
    get.mockResolvedValue({ data: { seq: 5, elements: [] } } as never);
    await expect(HistoryAPI.state("b1", 5)).resolves.toEqual({ seq: 5, elements: [] });
    expect(get).toHaveBeenCalledWith("/board/b1/history/state", { params: { seq: 5 } });
  });
});
```

- [ ] **Step 12: Run it and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/historyApi.test.ts`
Expected: FAIL, `Test Files  1 failed (1)` with `Error: Failed to resolve import "@/api/historyApi"`, because the file does not exist yet.

- [ ] **Step 13: Implement `historyApi.ts`**

Create `client/api/historyApi.ts`:

```ts
import type { BoardElement, HistorySource } from "@/components/Scene/types";
import httpRequest from "@/utils/httpRequest";

export interface TxView {
  txId: string;
  userId: string;
  userName: string;
  ts: string;
  source: HistorySource;
  state: string;
  summary: { created: number; patched: number; deleted: number };
  seqTo: number;
}

const DEFAULT_LIMIT = 30;

// Timeline mới nhất trước; beforeSeq để lấy trang cũ hơn
const list = async (boardId: string, beforeSeq?: number, limit: number = DEFAULT_LIMIT): Promise<TxView[]> => {
  const params: Record<string, number> = { limit };
  if (beforeSeq !== undefined) params.beforeSeq = beforeSeq;
  const res = await httpRequest.get(`/board/${boardId}/history`, { params });
  return res.data;
};

// Trạng thái board tại seq (chỉ xem)
const state = async (boardId: string, seq: number): Promise<{ seq: number; elements: BoardElement[] }> => {
  const res = await httpRequest.get(`/board/${boardId}/history/state`, { params: { seq } });
  return res.data;
};

export const HistoryAPI = { list, state };
```

- [ ] **Step 14: Run it and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/historyApi.test.ts`
Expected: PASS, `Tests  3 passed (3)`.

- [ ] **Step 15: Write the failing `groupTimeline` test**

Create `client/components/Scene/__tests__/historyTimeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TxView } from "@/api/historyApi";
import { formatHHmm, groupTimeline } from "../HistoryPanel";

const T0 = Date.UTC(2026, 8, 25, 2, 0, 0);
// offsetSec càng lớn càng mới; API trả seqTo giảm dần nên test truyền mới nhất trước
const tx = (seqTo: number, userId: string, offsetSec: number, extra: Partial<TxView> = {}): TxView => ({
  txId: `t${seqTo}`,
  userId,
  userName: userId.toUpperCase(),
  ts: new Date(T0 + offsetSec * 1000).toISOString(),
  source: "user",
  state: "active",
  summary: { created: 0, patched: 1, deleted: 0 },
  seqTo,
  ...extra,
});

describe("groupTimeline", () => {
  it("empty list → no groups", () => {
    expect(groupTimeline([])).toEqual([]);
  });
  it("groups consecutive txs of the same user within 2 minutes; head is the newest", () => {
    const g = groupTimeline([tx(5, "alice", 300), tx(4, "alice", 250), tx(3, "alice", 200)]);
    expect(g).toHaveLength(1);
    expect(g[0].head.txId).toBe("t5");
    expect(g[0].txs.map((t) => t.txId)).toEqual(["t5", "t4", "t3"]);
    expect(g[0].userName).toBe("ALICE");
  });
  it("the 2-minute window is measured between neighbours (sliding)", () => {
    const g = groupTimeline([tx(4, "alice", 400), tx(3, "alice", 300), tx(2, "alice", 200), tx(1, "alice", 100)]);
    expect(g).toHaveLength(1);
  });
  it("exactly 120s stays grouped, 121s splits", () => {
    expect(groupTimeline([tx(2, "alice", 300), tx(1, "alice", 180)])).toHaveLength(1);
    expect(groupTimeline([tx(2, "alice", 300), tx(1, "alice", 179)])).toHaveLength(2);
  });
  it("another user in between splits the run and is never merged across", () => {
    const g = groupTimeline([tx(3, "alice", 300), tx(2, "bob", 290), tx(1, "alice", 280)]);
    expect(g.map((x) => x.userId)).toEqual(["alice", "bob", "alice"]);
  });
  it("sums the summaries of the grouped txs", () => {
    const g = groupTimeline([
      tx(3, "alice", 300, { summary: { created: 1, patched: 0, deleted: 0 } }),
      tx(2, "alice", 290, { summary: { created: 0, patched: 2, deleted: 0 } }),
      tx(1, "alice", 280, { summary: { created: 0, patched: 0, deleted: 3 } }),
    ]);
    expect(g[0].summary).toEqual({ created: 1, patched: 2, deleted: 3 });
  });
  it("does not mutate the input summaries", () => {
    const first = tx(2, "alice", 300);
    groupTimeline([first, tx(1, "alice", 290)]);
    expect(first.summary).toEqual({ created: 0, patched: 1, deleted: 0 });
  });
  it("regrouping page1 + page2 merges a run that crosses the page boundary", () => {
    const page1 = [tx(10, "bob", 500), tx(9, "alice", 400)];
    const page2 = [tx(8, "alice", 350), tx(7, "bob", 100)];
    const g = groupTimeline([...page1, ...page2]);
    expect(g.map((x) => x.txs.length)).toEqual([1, 2, 1]);
  });
});

describe("formatHHmm", () => {
  it("formats local time as HH:mm with zero padding", () => {
    expect(formatHHmm(new Date(2026, 8, 25, 9, 5).toISOString())).toBe("09:05");
    expect(formatHHmm(new Date(2026, 8, 25, 23, 59).toISOString())).toBe("23:59");
  });
});
```

- [ ] **Step 16: Run it and confirm it fails**

Run: `cd client && npx vitest run components/Scene/__tests__/historyTimeline.test.ts`
Expected: FAIL, `Test Files  1 failed (1)` with `Error: Failed to resolve import "../HistoryPanel"`, because `HistoryPanel.tsx` does not exist yet.

- [ ] **Step 17: Implement `HistoryPanel.tsx`**

Create `client/components/Scene/HistoryPanel.tsx`:

```tsx
"use client";

import { HistoryAPI, TxView } from "@/api/historyApi";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { History, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HistorySource } from "./types";

const PAGE_SIZE = 30;
// tx liên tiếp của cùng user cách nhau ≤ 2 phút được gộp thành 1 dòng (chỉ ở UI)
const GROUP_WINDOW_MS = 2 * 60 * 1000;

const SOURCE_LABEL: Record<HistorySource, string> = {
  user: "Chỉnh sửa",
  undo: "Hoàn tác",
  redo: "Làm lại",
  restore: "Khôi phục",
  template: "Template",
};

export interface TimelineGroup {
  key: string;
  userId: string;
  userName: string;
  head: TxView; // tx mới nhất của nhóm; bấm dòng thì xem board tại head.seqTo
  txs: TxView[];
  summary: TxView["summary"];
}

// txs đã sắp seqTo giảm dần như API trả về
export function groupTimeline(txs: TxView[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  txs.forEach((tx) => {
    const g = groups[groups.length - 1];
    const prev = g?.txs[g.txs.length - 1];
    if (g && prev && prev.userId === tx.userId && Math.abs(Date.parse(prev.ts) - Date.parse(tx.ts)) <= GROUP_WINDOW_MS) {
      g.txs.push(tx);
      g.summary = {
        created: g.summary.created + tx.summary.created,
        patched: g.summary.patched + tx.summary.patched,
        deleted: g.summary.deleted + tx.summary.deleted,
      };
      return;
    }
    groups.push({ key: tx.txId, userId: tx.userId, userName: tx.userName, head: tx, txs: [tx], summary: { ...tx.summary } });
  });
  return groups;
}

const pad = (n: number) => String(n).padStart(2, "0");
export function formatHHmm(ts: string): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const summaryText = (s: TxView["summary"]) => {
  const parts = [s.created ? `+${s.created}` : "", s.patched ? `~${s.patched}` : "", s.deleted ? `−${s.deleted}` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
};

export default function HistoryPanel({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [txs, setTxs] = useState<TxView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyMode = useSceneStore((s) => s.historyMode);
  const viewReq = useRef(0);

  const load = useCallback(
    async (beforeSeq?: number) => {
      setLoading(true);
      setError(null);
      try {
        const page = await HistoryAPI.list(boardId, beforeSeq, PAGE_SIZE);
        setTxs((prev) => (beforeSeq === undefined ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error("load history error:", e);
        setError("Không tải được lịch sử");
      } finally {
        setLoading(false);
      }
    },
    [boardId]
  );

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const view = async (g: TimelineGroup) => {
    const req = ++viewReq.current;
    try {
      const st = await HistoryAPI.state(boardId, g.head.seqTo);
      // bấm nhiều dòng liên tiếp: chỉ áp kết quả của lần bấm cuối
      if (req !== viewReq.current) return;
      useSceneStore
        .getState()
        .enterHistory({ seq: st.seq, txId: g.head.txId, label: `${formatHHmm(g.head.ts)} · ${g.userName || "Unknown"}` }, st.elements);
    } catch (e) {
      console.error("load history state error:", e);
      setError("Không tải được phiên bản này");
    }
  };

  const groups = groupTimeline(txs);
  const oldest = txs[txs.length - 1];

  return (
    <>
      <button
        title="Lịch sử phiên bản"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-white text-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100"
      >
        <History className="w-6 h-6" />
      </button>
      {open && (
        <aside className="fixed top-0 right-0 z-[60] h-full w-[320px] bg-white text-black shadow-xl border-l flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-semibold">Lịch sử phiên bản</span>
            <div className="flex items-center gap-2">
              <button className="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={loading} onClick={() => void load()}>
                Làm mới
              </button>
              <button title="Đóng" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.key}
                onClick={() => void view(g)}
                className={`w-full text-left px-3 py-2 border-b hover:bg-gray-100 ${historyMode?.seq === g.head.seqTo ? "bg-blue-50" : ""}`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.userName || "Unknown"}</span>
                  <span className="text-gray-500">{formatHHmm(g.head.ts)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {SOURCE_LABEL[g.head.source] ?? g.head.source}
                  {g.txs.length > 1 ? ` · ${g.txs.length} thao tác` : ""} · {summaryText(g.summary)}
                </div>
              </button>
            ))}
            {!loading && !error && groups.length === 0 && <p className="p-3 text-sm text-gray-500">Chưa có lịch sử</p>}
            {error && <p className="p-3 text-sm text-red-600">{error}</p>}
            {hasMore && oldest && (
              <button
                className="w-full py-2 text-sm text-blue-600 hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
                onClick={() => void load(oldest.seqTo)}
              >
                {loading ? "Đang tải..." : "Tải thêm"}
              </button>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
```

- [ ] **Step 18: Run it and confirm it passes**

Run: `cd client && npx vitest run components/Scene/__tests__/historyTimeline.test.ts`
Expected: PASS, `Tests  9 passed (9)` (8 `groupTimeline` + 1 `formatHHmm`).

- [ ] **Step 19: Implement `HistoryBanner.tsx`**

Create `client/components/Scene/HistoryBanner.tsx`:

```tsx
"use client";

import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { sceneSocket } from "./sceneSocket";

// Thanh báo đang xem phiên bản cũ; chỉ OWNER được khôi phục
export default function HistoryBanner({ boardId }: { boardId: string }) {
  const mode = useSceneStore((s) => s.historyMode);
  const owner = useBoardStoreof((s) => s.board?.owner);
  const userId = useTokenStore((s) => s.user?.id);
  if (!mode) return null;
  const isOwner = !!userId && owner === userId;

  const restore = () => {
    sceneSocket.restore(boardId, mode.seq);
    useSceneStore.getState().exitHistory();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-lg border border-gray-300 rounded px-4 py-2 flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">Đang xem phiên bản {mode.label}</span>
        <span className="text-xs text-gray-500">Nét vẽ không có lịch sử</span>
      </div>
      {isOwner && (
        <button onClick={restore} className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded">
          Khôi phục
        </button>
      )}
      <button
        onClick={() => useSceneStore.getState().exitHistory()}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-3 py-1 rounded"
      >
        Thoát
      </button>
    </div>
  );
}
```

The button classes copy `ConfirmSaveBar.tsx:9-14`, so the banner matches the bar it replaces.

- [ ] **Step 20: Switch `SceneElement`, `ConnectorView`, `SelectionOverlay`, `ElementContextMenu` to the selectors**

`client/components/Scene/SceneElement.tsx`:
- Replace line 1 `import { useSceneStore } from "@/lib/Zustand/sceneStore";` with `import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";`
- Replace line 29 `  const el = useSceneStore((s) => s.elements[id]);` with `  const el = useSceneStore((s) => selectDisplayedElements(s)[id]);`
- Replace line 31 `  const locked = useSceneStore((s) => !!s.locks[id]);` with:

```tsx
  // lock là trạng thái live, không hiển thị trên bản lịch sử
  const locked = useSceneStore((s) => !s.historyMode && !!s.locks[id]);
```

`client/components/Scene/elements/ConnectorView.tsx`:
- Replace line 1 with `import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";`
- Replace lines 8-9 with:

```tsx
  const from = useSceneStore((s) => (el.connector ? selectDisplayedElements(s)[el.connector.from.elementId] : undefined));
  const to = useSceneStore((s) => (el.connector ? selectDisplayedElements(s)[el.connector.to.elementId] : undefined));
```

`client/components/Scene/SelectionOverlay.tsx`:
- Replace line 1 with `import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";`
- Replace line 26 `  const elements = useSceneStore((s) => s.elements);` with `  const elements = useSceneStore(selectDisplayedElements);`
- Replace line 112 (in `AnchorDots`) `  const el = useSceneStore((s) => s.elements[id]);` with `  const el = useSceneStore((s) => selectDisplayedElements(s)[id]);`

`client/components/Scene/ElementContextMenu.tsx`:
- Replace line 2 with `import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";`
- Replace line 15 `  const el = useSceneStore((s) => s.elements[menu.id]);` with `  const el = useSceneStore((s) => selectDisplayedElements(s)[menu.id]);`

(The edit items at lines 47-60 are already behind `canEdit`, which is false in history mode after Step 9. Export PDF stays available.)

- [ ] **Step 21: Switch the pointer-controller hit-tests to the selectors**

`client/components/Scene/usePointerController.ts`:
- Replace line 1 `import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";` with:

```ts
import { selectDisplayedElements, selectDisplayedOrder, setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
```

- Replace line 238 (`onPointerDown`, click selection):

```ts
      const hitId = hitElement(w, st.elements, st.order, st.viewport.s);
```

with:

```ts
      const hitId = hitElement(w, selectDisplayedElements(st), selectDisplayedOrder(st), st.viewport.s);
```

- Replace line 310 (`onPointerMove`, hover):

```ts
          const id = hitElement(w, st.elements, st.order, st.viewport.s, { skipConnectors: true });
```

with:

```ts
          const id = hitElement(w, selectDisplayedElements(st), selectDisplayedOrder(st), st.viewport.s, { skipConnectors: true });
```

- Replace line 428 (`onPointerUp`, marquee):

```ts
            const ids = elementsInRect(rect, st.elements);
```

with:

```ts
            const ids = elementsInRect(rect, selectDisplayedElements(st));
```

The other `st.elements` reads (lines 130, 135, 173-175, 190, 241, 260-274, 382, 470, 496-498) run only in edit branches behind `canEdit`. In history mode those branches return before they read, and outside history mode the selectors return `st.elements`, so they stay unchanged.

- [ ] **Step 22: `BoardScene`: order, context-menu hit, hide pencil canvas and ghosts**

`client/components/Scene/BoardScene.tsx`:
- Replace line 6 with `import { selectDisplayedElements, selectDisplayedOrder, useSceneStore } from "@/lib/Zustand/sceneStore";`
- Replace line 46 `  const order = useSceneStore((s) => s.order);` with `  const order = useSceneStore(selectDisplayedOrder);`
- After line 48 (`  const selection = useSceneStore((s) => s.selection);`) insert:

```tsx
  const historyMode = useSceneStore((s) => s.historyMode);
```

- Replace line 112 (in `onContextMenu`):

```tsx
    const id = hitElement(w, st.elements, st.order, st.viewport.s);
```

with:

```tsx
    const id = hitElement(w, selectDisplayedElements(st), selectDisplayedOrder(st), st.viewport.s);
```

- Replace lines 135-148 (the pencil canvas block):

```tsx
      <div className="absolute inset-0 pointer-events-none">
        {pencil.canvasPaths.map((path, index) => (
```

through its closing `</div>` with:

```tsx
      {/* nét vẽ không có lịch sử: ẩn khi đang xem phiên bản cũ */}
      {!historyMode && (
        <div className="absolute inset-0 pointer-events-none">
          {pencil.canvasPaths.map((path, index) => (
            <PencilCanvas
              key={path.id ?? `local-${index}`}
              color={path.color}
              thickness={path.thickness}
              paths={path.paths}
              opacity={path.opacity}
              scale={viewport.s}
              translate={{ x: viewport.tx, y: viewport.ty }}
              isSelected={!!path.isSelected}
            />
          ))}
        </div>
      )}
```

- Replace line 171 `          {ghosts.map((el) => (` with `          {!historyMode && ghosts.map((el) => (`
- Replace line 191:

```tsx
          <SelectionOverlay scale={viewport.s} canEdit={canEdit} pencilBox={pencil.selectionBox} />
```

with:

```tsx
          <SelectionOverlay scale={viewport.s} canEdit={canEdit} pencilBox={historyMode ? null : pencil.selectionBox} />
```

`AnchorDots` (line 192) and `ConnectDraftView` (line 219) render only for `canEdit` gestures, which are closed in history mode. `AnchorDots` already reads through the selector since Step 20.

- [ ] **Step 23: Gate the Task 11 undo/redo key handler on history mode**

Find the handler: `cd client && grep -rn "isUndoKey(\|isRedoKey(" --include=*.ts --include=*.tsx components app | grep -v __tests__ | grep -v "keyboard.ts"`
Expected: one or two lines inside a `keydown` handler (Task 11 owns its location).

In that handler, insert this line right after its `isTypingTarget(...)` early return. If the handler is the `onKeyDown` in `BoardScene.tsx`, that is right after line 62 `if (isTypingTarget(e.target) || useSceneStore.getState().editingId) return;`:

```tsx
      // đang xem lịch sử: không undo/redo (spec §9.3)
      if ((isUndoKey(e) || isRedoKey(e)) && useSceneStore.getState().historyMode) return;
```

If that file does not yet import `isUndoKey`/`isRedoKey` or `useSceneStore`, extend its existing imports: `import { isRedoKey, isUndoKey, ... } from "./keyboard";` (or `@/components/Scene/keyboard` outside the Scene folder) and `import { useSceneStore } from "@/lib/Zustand/sceneStore";`. The guard reads the store directly, not `canEdit`, so it holds even when the handler's closure captured an older `canEdit`.

- [ ] **Step 24: Gate `LeftToolBar` create tools and `ImageTool`**

`client/components/SideBar/LeftToolBar.jsx`:
- Replace line 5 `import { useState } from "react";` with `import { useEffect, useState } from "react";`
- After line 265 (the closing `};` of `resetSelectPopup`) insert:

```jsx

  // mất quyền sửa (VIEWER hoặc đang xem lịch sử): đóng popup tạo element, trả tool về select
  useEffect(() => {
    if (canEdit) return;
    resetSelectPopup();
    setIsPopupVisible(false);
    if (tool !== "select" && tool !== "hand") setTool("select");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);
```

- Replace line 362 `          <ImageTool boardId={boardId} />` with `          {canEdit && <ImageTool boardId={boardId} />}`

`client/components/SideBar/ImageTool.tsx`:
- After line 11 (`    >([]);`) insert:

```tsx
    const historyMode = useSceneStore((s) => s.historyMode);
```

- Replace lines 35-38:

```tsx
                    if (data.url && data.id) {
                        console.log("Image uploaded successfully:", data.url);
                        // call socket api
                        addImageElement(boardId, { alt: file.name, url: data.url, cloudinaryId: data.id });
```

with:

```tsx
                    if (data.url && data.id) {
                        console.log("Image uploaded successfully:", data.url);
                        // upload xong lúc đang xem lịch sử: không tạo element
                        if (useSceneStore.getState().historyMode) return;
                        // call socket api
                        addImageElement(boardId, { alt: file.name, url: data.url, cloudinaryId: data.id });
```

- Replace line 62:

```tsx
            <Button variant={"secondary"} className="w-full h-12 mb-2 text-4xl mt-8" onClick={() => inputRef.current?.click()}>
```

with:

```tsx
            <Button variant={"secondary"} className="w-full h-12 mb-2 text-4xl mt-8" disabled={!!historyMode} onClick={() => inputRef.current?.click()}>
```

- [ ] **Step 25: `page.tsx`: gate ghost save, mount the panel and the banner**

`client/app/user/board/[id]/page.tsx`:
- After line 8 (`import { sceneSocket } from '@/components/Scene/sceneSocket';`) insert:

```tsx
import HistoryBanner from '@/components/Scene/HistoryBanner';
import HistoryPanel from '@/components/Scene/HistoryPanel';
```

- After line 29 (`  const boardId = typeof id === 'string' ? id : '';`) insert:

```tsx
  const historyMode = useSceneStore((s) => s.historyMode);
```

- Replace lines 45-46:

```tsx
  const saveTemp = () => {
    const ghosts = useSceneStore.getState().ghosts;
```

with:

```tsx
  const saveTemp = () => {
    // đang xem lịch sử thì không ghi bản xem trước AI / template
    if (useSceneStore.getState().historyMode) return;
    const ghosts = useSceneStore.getState().ghosts;
```

- Replace line 66 `          {hasTemp && (` with `          {hasTemp && !historyMode && (`
- After line 69 (`          <TopRightBar handleChangeRole={handleChangeRole} />`) insert:

```tsx
          <HistoryPanel boardId={boardId} />
          <HistoryBanner boardId={boardId} />
```

The `useSceneStore` hook call sits before the early returns at lines 58-59, so the hook order stays fixed.

- [ ] **Step 26: Type-check**

Run: `cd client && npx tsc --noEmit`
Expected: no output, exit 0. If `TS2305: Module '"./types"' has no exported member 'HistorySource'` or `Property 'restore' does not exist` appears, Task 10 or Task 11 is not applied yet. Stop and report. Do not add those symbols in this task.

- [ ] **Step 27: Checkpoint: run the FE gate**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: `tsc` prints nothing (exit 0). Vitest prints `0 failed`, and the four new files pass: `sceneStoreHistory.test.ts` (9), `useCanEdit.test.ts` (3), `historyApi.test.ts` (3), `historyTimeline.test.ts` (9). That is 4 more files and 24 more tests than the count reported at the end of Task 11. Every pre-existing test still passes.

Report the results (tsc output, the vitest summary line, and the test counts per new file). Do NOT commit.

---

### Task 13: Final verification and 2-browser demo

This task adds **no production code and no tests**. It runs every gate for Tasks 1-12 from a clean report directory, builds the client, and then walks through the spec §12.5 demo in two browsers against a **local** Mongo and Redis. It finishes by reporting the results. **Do not commit.**

**Files:**
- Create: none
- Modify: none. Do not edit any repo file. Do not copy `.env` into the worktree, because `IE213Backend/.env` is **not** gitignored here: `git check-ignore -v IE213Backend/.env` exits 1.
- Read only:
  - `/Users/lap14671/Project/Mobidrawer/IE213Backend/.env` (main checkout; the worktree has no `.env`)
  - `/Users/lap14671/Project/Mobidrawer/docker-compose.dev.yml` (dev Mongo `mobidrawer-mongo-dev`, `mongo:7`, port 27017, volume `mongodb_data`)
  - `client/components/Scene/HistoryToast.tsx` (Task 11; source of the exact toast strings)
  - `client/components/Scene/HistoryBanner.tsx`, `HistoryPanel.tsx` (Task 12)
- Test: all tests created or changed in Tasks 1-12 (listed in Step 2).

**Interfaces:**
- Consumes these runtime surfaces, exactly as the Interface Contract defines them:
  - STOMP `/app/board/{id}/el/undo`, `/el/redo` and `/el/restore` `{seq}`, with the reply on `/user/queue/history` as `HistoryResult {op, applied, skipped[{elementId,key,reason,byUserId}]}`.
  - `/topic/board/{id}/el` `{op:"batch", txId, source, seqFrom, seqTo, senderSessionId, userId, ops}`.
  - REST `GET /api/v1/board/{id}/history?beforeSeq=&limit=` returning `TxView[]`, and `GET /api/v1/board/{id}/history/state?seq=` returning `{seq, elements}`.
  - `GET /api/v1/board/{id}` returning `historySeq`.
  - Mongo collections `boardOps`, `boardTxs`, `boardCounters`, `boardSnapshots` and `boardElements.fieldSeq`.
- Produces: nothing (verification only).

**Environment facts, checked when this task was written (2026-09-25). Re-check them in Step 1 because they can change:**
- The backend serves HTTPS on `server.port=8443` and adds an HTTP connector on `server.http.port` (default 8080) (`IE213Backend/src/main/resources/application.properties:24,31`, `config/ConnectorConfig.java:13-27`).
- The client hardcodes `http://localhost:8080/api/v1` and `http://localhost:8080/ws` in dev (`client/utils/environment.ts:8-13`, `client/lib/Zustand/socketStore.ts:15`).
- CORS and SockJS only allow origin `http://localhost:3000` (`config/SecurityConfig.java:65-67`, `config/socket/WebSocketConfig.java:37`). So the backend **must** listen on 8080 and the client **must** run on 3000.
- When this task was written, the docker container `airflow-airflow-webserver-1` held host port **8080** and `rig-otel-lgtm` held host port **3000**. Nothing published 6379 (`rig-redis` is on 6380).
- The main-checkout `.env` sets these values (checked with awk, values not printed): `SPRING_DATA_MONGODB_URI=mongodb://localhost:27017`, `SPRING_DATA_MONGODB_DATABASE=mobidrawer_dev`, `SPRING_DATA_REDIS_HOST=localhost`, `SPRING_DATA_REDIS_PORT=6379`.
- Registration keeps the verification code in Redis under the key `<email>`, as JSON (`service/impl/AuthServiceImpl.java:124-131`, `config/CacheConfig.java:20-21`). Mail is a dummy locally. `addMember` adds the member directly, with no invite acceptance, owner only (`service/impl/BoardServiceImpl.java:101-129`). The JWT filter reads `Authorization: Bearer` (`security/JwtAuthenticationFilter.java:91-93`).
- The host has no `mongosh` or `redis-cli`, so every DB peek goes through `docker exec`.

---

- [ ] **Step 1: Preflight (ports, JDK, docker, test inventory)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape
/usr/libexec/java_home -v 17
docker info --format '{{.ServerVersion}}'
for p in 27017 6379 8080 8443 3000; do printf "%s: " $p; lsof -nP -iTCP:$p -sTCP:LISTEN | awk 'NR==2{print $1; f=1} END{if(!f) print "free"}'; done
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '27017|6379|:8080|:3000' || true
find IE213Backend/src/test -name '*Test.java' -o -name '*IT.java' | sort
ls client/components/Scene/__tests__/
```
Expected:
- A JDK 17 path is printed.
- The docker server version is printed.
- The Step 2 list of test files, with every class present.

Do the following before continuing:
- **8080 or 3000 not free:** STOP. Tell the user which process or container holds the port (for example `airflow-airflow-webserver-1`, `rig-otel-lgtm`) and ask them to free it. Never stop other projects' containers yourself. The BE/FE gates (Steps 2-5) do not need these ports, so you may run them first and do the demo after the user frees the ports.
- **27017 held by `mobidrawer-mongo-dev`:** record this. Step 3 stops it for the IT run and Step 6 starts it again.
- **27017 held by anything else:** STOP and ask.

- [ ] **Step 2: BE compile + unit gate (all Task 1-9 tests + pre-existing element tests, ITs skipped)**

The explicit names come from Tasks 1-8. The `**/service/history/*Test` pattern also picks up the Task 9 unit tests (`HistoryService`, `SnapshotJob`) whatever their final names are. `**/controller/*Test` picks up `BoardElementSocketControllerTest` and any `HistoryController` test from Task 9. Neither pattern matches `Ie213BackendApplicationTests` (`contextLoads`).

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
unset MONGO_IT_URI
rm -rf target/surefire-reports
bash ./mvnw -q compile && bash ./mvnw -q test -Dtest='HistoryModelsTest,ElementKeysTest,ElementNormalizerTest,HistoryMathReplayTest,HistoryMathDiffTest,HistoryMathInverseTest,HistoryResultTest,CommitPlannerTest,BoardLocksTest,StompBatchPublisherTest,ElementWriterEventOpsTest,ElementWriterIT,BoardElementServiceTest,BoardElementSocketControllerTest,TemplateServiceImplTest,BoardServiceImplHistorySeqTest,UndoServiceTest,UndoIT,BoardServiceImplRoleTest,ElementPatchesTest,ElementValidatorTest,ElementMigrationTest,LegacyElementMapperTest,TemplateElementConverterTest,ElementLockRegistryTest,**/service/history/*Test,**/service/history/*IT,**/controller/*Test'
echo "exit=$?"
grep -h "Tests run" target/surefire-reports/*.txt | sort
grep -l "Tests run: .*\(Failures: [1-9]\|Errors: [1-9]\)" target/surefire-reports/*.txt || echo "no failing class"
```
Expected:
- `exit=0`.
- One `Tests run: N, Failures: 0, Errors: 0, Skipped: S` line for every class in the list.
- `S = 0` for every `*Test`. Every `*IT` class (`ElementWriterIT`, `UndoIT`, the Task 9 ITs) shows `Skipped` equal to `Tests run`, because `MONGO_IT_URI` is unset.
- The last line prints `no failing class`.
- No `Ie213BackendApplicationTests` line.

If anything fails, stop. Report the class, the test method and the first assertion message. Do not "fix" it in this task, because the fix belongs to the owning task.

- [ ] **Step 3: Start the IT Mongo**

Run:
```bash
docker ps --format '{{.Names}}' | grep -qx mobidrawer-mongo-dev && docker stop mobidrawer-mongo-dev && echo "dev mongo stopped (restart in Step 6)"
docker rm -f mobi-it-mongo 2>/dev/null
docker run -d --name mobi-it-mongo -p 27017:27017 mongo:7
until docker exec mobi-it-mongo mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; do sleep 1; done; echo mongo-up
```
Expected: a container id, then `mongo-up`. Stopping the dev container does not touch its data, which lives in the named volume `mongodb_data`.

- [ ] **Step 4: Integration tests against the local IT Mongo**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export MONGO_IT_URI=mongodb://localhost:27017
rm -rf target/surefire-reports
bash ./mvnw -q test -Dtest='ElementWriterIT,UndoIT,**/service/history/*IT'
echo "exit=$?"
grep -h "Tests run" target/surefire-reports/*.txt | sort
docker exec mobi-it-mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>n.startsWith("it_"))'
```
Expected:
- `exit=0`.
- Every IT class shows `Failures: 0, Errors: 0, Skipped: 0`. `ElementWriterIT` shows `Tests run: 10`. `UndoIT` and the Task 9 ITs show their own counts.
- The last command prints `[]`, because every test drops its `it_<uuid>` DB.

Together these runs cover Review Focus 1 (2 threads × 100 patches, invariant, contiguous seqs), Review Focus 4 (board seeded without a counter; restore to seq 0 on a migrated board), roll-forward after a WAL failure, and restore then undo.

Then tear down:
```bash
docker rm -f mobi-it-mongo
```

- [ ] **Step 5: FE gate + production build**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/client
npx tsc --noEmit; echo "tsc exit=$?"
npx vitest run; echo "vitest exit=$?"
npx next build; echo "build exit=$?"
```
Expected:
- `tsc exit=0` with no diagnostics.
- vitest prints `Test Files  N passed (N)` and `Tests  M passed (M)`, with `0 failed`, then `vitest exit=0`. The file list includes at least these: `seqSync.test.ts`, `sceneStoreBatch.test.ts`, `sceneStore.test.ts`, `keyboard.test.ts`, and the Task 11/12 test files.
- `next build` ends with `✓ Compiled successfully`, the route table (including `/user/board/[id]`) and `build exit=0`.

`next build` writes to `client/.next`, which is gitignored (`client/.gitignore:13`). If the build fails on a type or lint error in a file from Tasks 10-12, stop and report it. If it fails on a pre-existing file that this feature did not touch, report it separately as "pre-existing". In that case run `git diff --stat` on that file to show the feature did not change it.

- [ ] **Step 6: Start local infra for the demo (local Mongo + Redis only)**

Run:
```bash
docker compose -f /Users/lap14671/Project/Mobidrawer/docker-compose.dev.yml up -d mongodb
until docker exec mobidrawer-mongo-dev mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; do sleep 1; done; echo dev-mongo-up
lsof -nP -iTCP:6379 -sTCP:LISTEN >/dev/null || docker run -d --name mobi-demo-redis -p 6379:6379 redis:7
docker exec $(docker ps --format '{{.Names}}\t{{.Ports}}' | awk '/:6379->/{print $1; exit}') redis-cli ping
awk -F= '/^SPRING_DATA_MONGODB_URI=/{print ($2 ~ /^mongodb:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/) ? "MONGO LOCAL OK" : "MONGO NOT LOCAL - STOP"}' /Users/lap14671/Project/Mobidrawer/IE213Backend/.env
```
Expected: `dev-mongo-up`, `PONG`, `MONGO LOCAL OK`. If the last command prints `MONGO NOT LOCAL - STOP`, stop and ask the user. Never start the backend against a shared or remote DB (Global Constraints).

- [ ] **Step 7: Run the backend (JDK 17, env from main-checkout `.env`, local Mongo)**

Start it with `run_in_background: true`, because it keeps running:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/IE213Backend && set -a && source /Users/lap14671/Project/Mobidrawer/IE213Backend/.env && set +a && export JAVA_HOME=$(/usr/libexec/java_home -v 17) && bash ./mvnw spring-boot:run
```
This is the spec's `set -a && source .env && set +a`, pointed at the main-checkout file by absolute path. Do not copy the file in (see **Files**).

Wait until the log shows `Tomcat started on port 8443 (https) 8080 (http)` and `Started Ie213BackendApplication`. Then run:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/board/000000000000000000000000
```
Expected: `401` or `403` (no token). Any HTTP code proves the server is up; connection refused does not. The exact log wording for "started" depends on the Spring Boot 3.4.3 version (**assumption**). If the log shows `Port 8080 was already in use`, go back to Step 1.

- [ ] **Step 8: Run the client**

In another background command:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/client && npm run dev
```
Expected: `- Local: http://localhost:3000` and `✓ Ready`. If Next prints `Port 3000 is in use, trying 3001`, stop both processes. Port 3001 is not in the CORS/SockJS allow-list, so sockets fail. Return to Step 1.

- [ ] **Step 9: Two users and a shared board**

Use two **isolated** browser sessions. The token lives in cookies and headers per origin, so two tabs of one profile are the same user. Options:
- Chrome profile A (Alice) plus a Chrome incognito window or profile B (Bob).
- Chrome for Alice plus Safari/Firefox for Bob.
- Optional, Playwright MCP for Alice: `mcp__plugin_playwright_playwright__browser_navigate` to `http://localhost:3000/login`. Its tabs share one context, so Bob must still be a real browser window, or a second context created with `browser_run_code_unsafe` (`const ctx = await page.context().browser().newContext(); const bob = await ctx.newPage(); ...`).

Check the local DB for existing users first:
```bash
docker exec mobidrawer-mongo-dev mongosh --quiet mobidrawer_dev --eval 'db.users.find({}, {email:1, firstName:1, lastName:1}).limit(10).toArray()'
```
If fewer than two usable accounts exist (with passwords you know), register `alice@demo.local` (firstName `Alice`) and `bob@demo.local` (firstName `Bob`) through the UI register page. Read each verification code from the local Redis:
```bash
docker exec $(docker ps --format '{{.Names}}\t{{.Ports}}' | awk '/:6379->/{print $1; exit}') redis-cli GET alice@demo.local
```
The code is the `"code"` field in the JSON. Submit it on the verify screen within 5 minutes.

Next:
1. Alice logs in at `http://localhost:3000/login` and creates a new board.
2. Record its id `B` from the URL `/user/board/B`.
3. Alice adds Bob as EDITOR, either through the board's share/member UI or with curl:
```bash
TOKEN_A=$(curl -s -X POST http://localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"alice@demo.local","password":"<alice-password>"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
curl -s -X POST http://localhost:8080/api/v1/board/addMember/B -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"email":"bob@demo.local","role":"EDITOR"}' | head -c 300; echo
```
Expected: the board JSON, with Bob's id in `members` as `EDITOR`.

Finally, Bob logs in and opens `http://localhost:3000/user/board/B`. Put both windows side by side. Open DevTools → Console in both and keep it visible, so any `reloadBoard` or error is noticed.

First run the command below and write down the exact user-facing strings. They are the expected toast texts in Steps 10-13:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape/client && grep -nE '"[^"]*[A-Za-zÀ-ỹ][^"]*"|`[^`]*`' components/Scene/HistoryToast.tsx components/Scene/HistoryBanner.tsx components/Scene/HistoryPanel.tsx | grep -vE 'import|className' | head -60
```
The wording belongs to Tasks 11/12 and is not fixed by the spec (**assumption**: Vietnamese messages keyed by `reason`, naming the key and `byUserId`'s user). The banner text **is** fixed by spec §9.4: `Đang xem phiên bản HH:mm · <user>`, `[Khôi phục]` (OWNER only), `[Thoát]`, `Nét vẽ không có lịch sử`.

- [ ] **Step 10: Demo 1 (spec §7.5 example 1: field conflict, toast)**

1. Alice draws a rectangle S. Bob sees S appear with no reload.
2. Alice drags S to the right (Alice's tx T patches `x` and `y`). Bob sees it move.
3. Bob changes S's fill in StylePanel (key `style`), then drags S somewhere else (keys `x` and `y`).
4. Alice clicks empty canvas (not typing in any input) and presses `Cmd+Z` (`Ctrl+Z` on Windows/Linux).

Expected:
- S stays exactly where Bob put it, in both windows. Nothing flickers and no reload happens (no `reloadBoard` log in either console).
- Alice gets the Task 11 toast for `{op:"undo", applied:0, skipped:[{key:"x",reason:"modified",byUserId:Bob}, {key:"y",reason:"modified",byUserId:Bob}]}`. It says that nothing was undone because Bob changed x and y. Bob gets no toast, because `/user/queue/history` is per user.
- Alice presses `Cmd+Z` again. T is now `dead`, so the next candidate is Alice's create of S. Bob has ops on S after it, so the toast reports `modified` again and S still exists.

DB evidence:
```bash
docker exec mobidrawer-mongo-dev mongosh --quiet mobidrawer_dev --eval 'db.boardTxs.find({boardId:ObjectId("B")},{userId:1,source:1,state:1,seqFrom:1,seqTo:1,_id:0}).sort({seqTo:-1}).limit(6).toArray()'
```
Expected: Alice's drag tx `state:"dead"` and Bob's txs `active`. No tx has `source:"undo"`, because no inverse was committed.

- [ ] **Step 11: Demo 2 (delete a shape that has a connector, then undo)**

1. Alice draws shapes E and F.
2. With the connector tool (the `Waypoints` button, `LeftToolBar.jsx:302`), Alice connects E to F. Bob sees the connector C.
3. Alice selects E and presses `Delete`.

Expected: E **and** C disappear in both windows (cascade, one `batch` with ids `[E, C]`). F stays.

4. Alice presses `Cmd+Z`.

Expected:
- E and C come back in both windows, with the same position, style and text as before, and C is still attached to E and F.
- Bob sees it with no reload. Alice gets the Task 11 success toast for `applied > 0`, or no toast if Task 11 only toasts skips (check the strings recorded in Step 9).
- Moving E now drags C's end in both windows, which proves the ids were preserved.

5. Optional, Review Focus 5 (image): Alice adds an image through `ImageTool`, deletes it, and presses `Cmd+Z`. The image comes back with the same picture, not an empty box.

DB evidence:
```bash
docker exec mobidrawer-mongo-dev mongosh --quiet mobidrawer_dev --eval 'db.boardOps.find({boardId:ObjectId("B")},{seq:1,kind:1,elementId:1,txId:1,_id:0}).sort({seq:-1}).limit(6).toArray()'
```
Expected: the undo tx has 3 ops: `create` E, then `create` C (connectors after non-connectors), on contiguous seqs, after the two `delete` ops of the delete tx.

- [ ] **Step 12: Demo 3 (owner views an old version, restores, Bob sees it, owner undoes)**

1. Alice opens the History panel from its toolbar button (Task 12).

Expected:
- A right-side panel lists txs newest first, with user names `Alice …` and `Bob …` and times.
- Consecutive txs by the same user within 2 minutes are grouped in the UI.
- Scrolling to the end loads older pages (`beforeSeq` paging).
- Bob's panel lists the same txs.

2. Alice clicks an entry from before Step 11 (for example the create of S).

Expected:
- Alice's canvas shows the board **as of that seq**: E, F and C are absent, and S is where it was then.
- The banner shows `Đang xem phiên bản HH:mm · Alice`, `[Khôi phục]`, `[Thoát]` and `Nét vẽ không có lịch sử`. The pencil canvas is hidden.
- Creation tools, Delete, the context menu and StylePanel do nothing (read-only). `Cmd+Z` does nothing in history mode.
- Bob's window is unchanged and live. If Bob moves F now, Alice's live store takes it but her canvas keeps showing the old version.

3. Bob opens the same entry.

Expected: Bob sees the banner **without** `[Khôi phục]` (EDITOR). He clicks `[Thoát]`.

4. Alice clicks `[Khôi phục]`.

Expected:
- One `batch` with `source:"restore"`. Both windows now show the old state, with E, F and C deleted.
- Alice leaves history mode, or stays in it per Task 12's behaviour. Record which one happens.
- Alice gets the restore toast (`applied: n`). Bob gets no toast, but his board changes live with no reload.
- Both History panels show a new `restore` entry at the top.

5. Alice presses `Cmd+Z` in live mode.

Expected: the restore is undone. E, F and C (and S's later position) come back in both windows, and Bob sees it live.

DB evidence:
```bash
docker exec mobidrawer-mongo-dev mongosh --quiet mobidrawer_dev --eval 'db.boardTxs.find({boardId:ObjectId("B"),source:{$in:["restore","undo"]}},{source:1,state:1,target:1,seqTo:1,_id:1}).sort({seqTo:-1}).limit(3).toArray()'
```
Expected: the newest tx is `undo` with `target` = the restore txId, and the restore tx is `state:"undone"`.

Negative check (no toast in the spec, only a 403 on STOMP): in Bob's console there is no `[Khôi phục]` button to click, so skip it.

- [ ] **Step 13: Demo 4 (undo still works after a page reload and after a STOMP reconnect; Review Focus 2)**

1. Alice drags F to a new position. Bob sees it move.
2. Alice reloads the page (`Cmd+R`) and waits for the board to render.
3. Alice presses `Cmd+Z`.

Expected: F returns to its previous position in both windows, and neither console reloads again. This works because the undo stack is server-side and the baseline `lastSeq` came from `GET /board/B` → `historySeq`.

4. Reconnect variant: in Bob's DevTools → Network, set **Offline** for about 5 s, then back to **No throttling**, and wait for the socket to reconnect. Alice drags F again in the meantime.

Expected: after reconnect Bob converges to Alice's position. At most **one** reload may happen, and only when a real seq gap stays open for more than 500 ms. There is never a reload loop.

5. Bob drags S and presses `Cmd+Z`.

Expected: S returns, which shows Bob's own stack also works after the reconnect.

6. Review Focus 1 smoke: both users drag **different** shapes at the same time for about 10 s, then the **same** shape at the same time.

Expected: neither console logs a reload storm, and the final positions match in both windows. Confirm it with an F5 in Bob's window: the positions do not change after the reload.

Invariant spot check (spec §8.2; no writes, read only):
```bash
docker exec mobidrawer-mongo-dev mongosh --quiet mobidrawer_dev --eval 'const b=ObjectId("B"); const c=db.boardCounters.findOne({_id:b}); const pend=db.boardTxs.countDocuments({boardId:b,state:"pending"}); const seqs=db.boardOps.find({boardId:b},{seq:1,_id:0}).sort({seq:1}).toArray().map(o=>o.seq); printjson({counter:c, pending:pend, ops:seqs.length, maxSeq:seqs[seqs.length-1]})'
```
Expected: `pending: 0`, `counter.committedSeq == counter.seq == maxSeq`, and `ops == maxSeq` when no WAL failure happened during the demo (no seq holes).

- [ ] **Step 14: Stop demo processes**

1. Stop the background `spring-boot:run` and `npm run dev` processes (TaskStop, or Ctrl+C).
2. Leave `mobidrawer-mongo-dev` running if it was running before Step 1. Otherwise stop it with `docker stop mobidrawer-mongo-dev`.
3. Run `docker rm -f mobi-demo-redis` only if Step 6 created it.

Do not delete the demo board or the users. They live in the local dev DB only.

- [ ] **Step 15: Checkpoint (report results; do NOT commit)**

Run:
```bash
cd /Users/lap14671/orca/workspaces/Mobidrawer/Design-Feature-Draw-Shape && git status --short | head -80
```
Expected:
- No new tracked-file changes from this task.
- No `IE213Backend/.env`, `client/.next` or `target/` entries in the output. The last two are ignored.

Report to the user, in the terminal:
1. The Step 2 table (class, tests run, failures, errors, skipped).
2. The Step 4 IT table.
3. The Step 5 tsc, vitest and `next build` results.
4. For each demo item 1-4 (Steps 10-13): pass or fail, the exact toast text seen, the history panel and banner behaviour, and any deviation from "Expected". Include screenshots when Playwright or DevTools was used.
5. Environment blockers hit, such as the 8080/3000 port holders.

Do **not** commit, push or open a PR.
