// useCursorBroadcast: publishes /app/board/cursor/{boardId} on a 100ms
// interval while a cursor position exists, sourcing identity from the
// authenticated user (useTokenStore) instead of the prior hardcoded
// placeholder identity literals. The backend overwrites identity
// server-side before broadcasting the cursor (wire-inert cleanup — see
// Sprint 2 contract context.assumptions), so this is dead-code hygiene, not
// a functional wire fix.
import { useEffect, useRef } from "react";
import { useStompStore } from "@/lib/Zustand/socketStore";
import useTokenStore from "@/lib/Zustand/tokenStore";

interface Point {
  x: number;
  y: number;
}

interface UseCursorBroadcastOptions {
  boardId: string;
  cursorPos: Point | null;
}

const CURSOR_INTERVAL_MS = 100;

// Deterministic user.id -> hue derivation (not a per-user-independent
// constant): same user always gets the same color.
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function colorForUser(userId: string): string {
  const hue = hashUserId(userId) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function useCursorBroadcast({
  boardId,
  cursorPos,
}: UseCursorBroadcastOptions) {
  const client = useStompStore((s) => s.client);
  const user = useTokenStore((s) => s.user);

  // Read the latest cursor position inside the interval without re-arming
  // the interval on every mouse move.
  const cursorPosRef = useRef(cursorPos);
  cursorPosRef.current = cursorPos;

  useEffect(() => {
    const interval = setInterval(() => {
      const pos = cursorPosRef.current;
      if (pos && client && boardId && user) {
        client.publish({
          destination: `/app/board/cursor/${boardId}`,
          body: JSON.stringify({
            x: pos.x,
            y: pos.y,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            color: colorForUser(user.id),
            lastUpdated: Date.now(),
          }),
        });
      }
    }, CURSOR_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [client, boardId, user]);
}
