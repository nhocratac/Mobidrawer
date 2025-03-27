import { StickyNote } from "@/lib/Zustand/type.type";
import { create } from "zustand";
import { produce } from "immer";
interface StickyNoteState {
  stickyNotes: StickyNote[];
  setStickyNotes: (notes: StickyNote[]) => void;
  addStickyNote: (note: StickyNote) => void;
  moveStickyNote: (id: string, newPosition: { x: number; y: number }) => void;
  resizeStickyNote: (
    id: string,
    newSize: { height: number; width: number }
  ) => void;
}

const useStickyNoteStore = create<StickyNoteState>((set) => ({
  stickyNotes: [],
  setStickyNotes: (notes) => set({ stickyNotes: notes }),
  addStickyNote: (note) =>
    set((state) => ({ stickyNotes: [...state.stickyNotes, note] })),
  moveStickyNote: (id, newPosition) =>
    set((state) => ({
      stickyNotes: produce(state.stickyNotes, (draft) => {
        const findItem = draft.find((item) => item.id === id);
        if (findItem) {
          findItem.position = { ...findItem.position, ...newPosition };
        }
      }),
    })),
  resizeStickyNote: (id, newSize) =>
    set((state) => ({
      stickyNotes: produce(state.stickyNotes, (draft) => {
        const findItem = draft.find((item) => item.id === id);
        if (findItem) {
          findItem.size = { ...findItem.size, ...newSize };
        }
      }),
    })),
}));

export default useStickyNoteStore;
