import { create } from "zustand";

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role : "EDITOR" | "VIEWER";
  phone: string | null;
  isOnline?: boolean;
}

interface UserStore {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (id: string) => void;
  markOnlineUsers: (userDtos: { id: string }[]) => void; 
}

const useUserInBoardStore = create<UserStore>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((user) => user.userId !== id) })),
    markOnlineUsers: (userDtos) =>
    set((state) => {
      const onlineIds = new Set(userDtos.map((dto) => dto.id));
      const updatedUsers = state.users.map((user) => ({
        ...user,
        isOnline: onlineIds.has(user.userId),
      }));
      return { users: updatedUsers };
    }),
}));

export default useUserInBoardStore;
