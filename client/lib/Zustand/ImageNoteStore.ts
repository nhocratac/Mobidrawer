import { create } from "zustand";

export interface CreateImageNoteDto {
  url: string;
  alt: string;
  cloudinaryId: string;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
}

export interface ImageNote {
  id: string;
  url: string;
  alt : string;
  cloudinaryId: string;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  owner: string;
  updateAt?: string;
  isSelected?: string;
}

interface ImageNoteStore {
  imageNotes: ImageNote[];

  addImageNote: (note: ImageNote) => void;
  updateImageNote: (id: string, updates: Partial<ImageNote>) => void;
  deleteImageNote: (id: string) => void;
  setImageNotes: (notes: ImageNote[]) => void;
  clearImageNotes: () => void;
}

export const useImageNoteStore = create<ImageNoteStore>((set) => ({
  imageNotes: [],

  addImageNote: (note) =>
    set((state) => ({
      imageNotes: [...state.imageNotes, note],
    })),

  updateImageNote: (id, updates) =>
    set((state) => ({
      imageNotes: state.imageNotes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      ),
    })),

  deleteImageNote: (id) =>
    set((state) => ({
      imageNotes: state.imageNotes.filter((note) => note.id !== id),
    })),

  setImageNotes: (notes) => set(() => ({ imageNotes: notes })),
  clearImageNotes: () => set(() => ({ imageNotes: [] })),
}));
