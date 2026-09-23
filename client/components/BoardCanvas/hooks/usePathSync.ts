// usePathSync: single owner of the four path publish destinations
// (/app/board/draw|move-paths|update-paths|delete-paths/{boardId}), the
// draw-batch queue, own-echo id-mapping (double-draw fix), and the
// reconnect/unsynced retry queue. See Sprint 2 contract
// (BRD-REALTIME-SYNC-2026-07-15-01) for the design rationale.
import { useCallback, useEffect, useRef } from "react";
import {
  CanvasPath,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";
import { useStompStore } from "@/lib/Zustand/socketStore";

interface UsePathSyncOptions {
  boardId: string;
}

const DRAW_BATCH_SIZE = 10;
const DRAW_BATCH_INTERVAL = 1000;
const MOVE_THROTTLE_MS = 500;
const UPDATE_DEBOUNCE_MS = 500;

// Strips the client-only fields (localId, ownerId, unsynced) from a
// CanvasPath before it goes over the wire; every publish site below runs
// its outgoing objects through this so wire key-sets stay at parity with
// the pre-Sprint-2 baseline.
function stripClientOnlyFields<
  T extends { localId?: unknown; ownerId?: unknown; unsynced?: unknown }
>(obj: T): Omit<T, "localId" | "ownerId" | "unsynced"> {
  const { localId, ownerId, unsynced, ...rest } = obj;
  void localId;
  void ownerId;
  void unsynced;
  return rest;
}

export function usePathSync({ boardId }: UsePathSyncOptions) {
  const client = useStompStore((s) => s.client);
  const isConnected = useStompStore((s) => s.isConnected);
  const assignServerId = useCanvasPathsStore((s) => s.assignServerId);
  const setPathsUnsynced = useCanvasPathsStore((s) => s.setPathsUnsynced);
  const addCanvasPath = useCanvasPathsStore((s) => s.addCanvasPath);

  // --- draw batching -------------------------------------------------
  const drawQueueRef = useRef<CanvasPath[]>([]);
  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // localIds published by THIS tab and awaiting their echo. Each stroke is
  // sent with clientId = localId and the server echoes clientId back, so an
  // echo is matched by id (not FIFO order): a lost/rejected echo or a stroke
  // drawn by the same user in another tab/device can no longer be paired
  // with the wrong local stroke. Entries are added ONLY from the
  // successful-publish branch of flushDraw.
  const pendingEchoRef = useRef<Set<string>>(new Set());

  const clearDrawTimer = useCallback(() => {
    if (drawTimerRef.current) {
      clearTimeout(drawTimerRef.current);
      drawTimerRef.current = null;
    }
  }, []);

  const flushDraw = useCallback(() => {
    clearDrawTimer();
    const queue = drawQueueRef.current;
    if (queue.length === 0) return;

    if (!client || !client.connected) {
      // Failed flush: keep strokes queued for retry, mark unsynced, and do
      // NOT enqueue their localIds into the pending-echo FIFO (a failed
      // publish never round-trips a server id).
      const localIds = queue
        .map((p) => p.localId)
        .filter((id): id is string => Boolean(id));
      if (localIds.length > 0) setPathsUnsynced(localIds, true);
      return;
    }

    // Successful publish path: drain the queue and publish each stroke.
    drawQueueRef.current = [];
    queue.forEach((path) => {
      const body = stripClientOnlyFields(path);
      client.publish({
        destination: `/app/board/draw/${boardId}`,
        body: JSON.stringify({ ...body, boardId, clientId: path.localId }),
      });
      if (path.localId) {
        pendingEchoRef.current.add(path.localId);
      }
    });
  }, [client, boardId, clearDrawTimer, setPathsUnsynced]);

  const queueDraw = useCallback(
    (path: CanvasPath) => {
      drawQueueRef.current.push(path);
      if (drawQueueRef.current.length >= DRAW_BATCH_SIZE) {
        flushDraw();
      } else {
        clearDrawTimer();
        drawTimerRef.current = setTimeout(flushDraw, DRAW_BATCH_INTERVAL);
      }
    },
    [flushDraw, clearDrawTimer]
  );

  // Reconnect resilience: re-flush the retry queue when the connection
  // transitions from disconnected to connected.
  const prevConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (!prevConnectedRef.current && isConnected) {
      flushDraw();
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, flushDraw]);

  // Unmount: clear the pending timer and attempt a final flush.
  useEffect(() => {
    return () => {
      clearDrawTimer();
      flushDraw();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- own-echo subscription ------------------------------------------
  // Re-subscribes whenever connection state changes (STOMP subscriptions do
  // not survive a reconnect).
  useEffect(() => {
    if (!client || !isConnected || !boardId) return;
    const subscription = client.subscribe(
      `/topic/draw/board/${boardId}`,
      (message) => {
        const { clientId, ...echoed } = JSON.parse(message.body);
        // Own echo from this tab: attach the server id to the local stroke.
        if (clientId && pendingEchoRef.current.delete(clientId)) {
          assignServerId(clientId, echoed.id);
          return;
        }
        // Anyone else's stroke (incl. this user's other tabs/devices). Skip
        // if a path with this id is already present.
        const exists = useCanvasPathsStore
          .getState()
          .canvasPaths.some((p) => p.id && p.id === echoed.id);
        if (!exists) addCanvasPath(echoed);
      }
    );
    return () => subscription.unsubscribe();
  }, [client, isConnected, boardId, assignServerId, addCanvasPath]);

  // --- move-paths (throttled during drag) -----------------------------
  const moveLastPublishRef = useRef(0);
  const moveIsFirstRef = useRef(true);
  const publishMovePaths = useCallback(
    (paths: CanvasPath[]) => {
      if (!client) return;
      const now = Date.now();
      if (moveIsFirstRef.current) {
        moveLastPublishRef.current = now;
        moveIsFirstRef.current = false;
        return;
      }
      if (now - moveLastPublishRef.current < MOVE_THROTTLE_MS) return;
      moveLastPublishRef.current = now;
      const body = paths.map((p) => stripClientOnlyFields(p));
      client.publish({
        destination: `/app/board/move-paths/${boardId}`,
        body: JSON.stringify(body),
      });
    },
    [client, boardId]
  );

  // Called by the consumer when a move gesture ends, so the next gesture's
  // first move is treated as "first" again (parity with baseline isFirstMove).
  const resetMoveThrottle = useCallback(() => {
    moveIsFirstRef.current = true;
  }, []);

  // --- update-paths (debounced on move completion) --------------------
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishUpdatePaths = useCallback(
    (getSelectedPaths: () => CanvasPath[]) => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        const selected = getSelectedPaths();
        if (selected.length > 0 && client) {
          const pathsToUpdate = selected.map((p) => {
            const stripped = stripClientOnlyFields(p) as CanvasPath & {
              isSelected?: boolean;
            };
            delete stripped.isSelected;
            return { ...stripped, boardId };
          });
          client.publish({
            destination: `/app/board/update-paths/${boardId}`,
            body: JSON.stringify({ paths: pathsToUpdate }),
          });
        }
      }, UPDATE_DEBOUNCE_MS);
    },
    [client, boardId]
  );

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  // --- delete-paths (immediate) ---------------------------------------
  const publishDeletePaths = useCallback(
    (ids: string[]) => {
      client?.publish({
        destination: `/app/board/delete-paths/${boardId}`,
        body: JSON.stringify(ids),
      });
    },
    [client, boardId]
  );

  return {
    queueDraw,
    publishMovePaths,
    resetMoveThrottle,
    publishUpdatePaths,
    publishDeletePaths,
  };
}
