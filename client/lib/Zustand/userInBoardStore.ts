import { create } from "zustand";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface UserStore {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (id: string) => void;
}

const useUserInBoardStore = create<UserStore>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((user) => user.id !== id) })),
}));

export default useUserInBoardStore;
