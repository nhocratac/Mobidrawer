import { create } from "zustand";

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role : "EDITOR" | "VIEWER";
  phone: string | null;
}

// Slim presence entry broadcast on /topic/board/{boardId} (no email/phone).
export interface PresenceUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  color: string | null;
}

export interface PresencePayload {
  seq: number;
  users: PresenceUser[];
}

interface PresenceState {
  boardId: string | null;
  seq: number;
  users: PresenceUser[];
}

interface UserStore {
  users: User[];
  presence: PresenceState;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (id: string) => void;
  // Replaces presence when the board changes or the snapshot is newer; drops stale snapshots.
  applyPresence: (boardId: string, payload: PresencePayload) => void;
  clearPresence: () => void;
}

const EMPTY_PRESENCE: PresenceState = { boardId: null, seq: 0, users: [] };

const useUserInBoardStore = create<UserStore>((set) => ({
  users: [],
  presence: EMPTY_PRESENCE,
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((user) => user.userId !== id) })),
  applyPresence: (boardId, payload) =>
    set((state) => {
      if (!payload || typeof payload.seq !== "number" || !Array.isArray(payload.users)) {
        return {};
      }
      if (state.presence.boardId === boardId && payload.seq <= state.presence.seq) {
        return {};
      }
      return { presence: { boardId, seq: payload.seq, users: payload.users } };
    }),
  clearPresence: () => set({ presence: EMPTY_PRESENCE }),
}));

export default useUserInBoardStore;
