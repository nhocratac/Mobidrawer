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
    newSize: { height: number | string; width: number | string }
  ) => void;
  changTextStickNote: (id: string, text: string) => void;
  selectStickyNote: (id: string, userId: string) => void;
  deleteStickyNote: (id: string) => void;
  deselectStickyNote: (id: string) => void;
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
          let width =
            typeof newSize.width === "string"
              ? parseInt(newSize.width.replace("px", ""), 10)
              : newSize.width;

          // Chuẩn hóa height
          let height =
            typeof newSize.height === "string"
              ? parseInt(newSize.height.replace("px", ""), 10)
              : newSize.height;

          // Đảm bảo width và height là số hợp lệ
          width = isNaN(width) ? 0 : width; // Nếu parseInt thất bại, mặc định là 0
          height = isNaN(height) ? 0 : height;
          findItem.size = { ...findItem.size, height, width };
        }
      }),
    })),
  changTextStickNote: (id: string, text: string) =>
    set((state) => ({
      stickyNotes: produce(state.stickyNotes, (draft) => {
        const findItem = draft.find((item) => item.id === id);
        if (findItem) {
          findItem.text = text;
        }
      }),
    })),
  selectStickyNote: (id, userId) =>
    set((state) => ({
      stickyNotes: produce(state.stickyNotes, (draft) => {
        const findItem = draft.find((item) => item.id === id);
        if (findItem) {
          findItem.isSelected = userId;
        }
      }),
    })),
  deselectStickyNote: (id) =>
    set((state) => ({
      stickyNotes: produce(state.stickyNotes, (draft) => {
        const findItem = draft.find((item) => item.id === id);
        if (findItem) {
          findItem.isSelected = null;
        }
      }),
    })),
  deleteStickyNote: (id) =>
    set((state) => ({
      stickyNotes: state.stickyNotes.filter((note) => note.id !== id),
    })),
}));

export default useStickyNoteStore;
