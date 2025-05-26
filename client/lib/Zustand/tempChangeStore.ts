import { CreateStickNoteDto, canvasPath } from '@/lib/Zustand/type.type'
import { create } from 'zustand'

interface TempChangeState {
  canvasPaths: canvasPath[]
  stickyNotes: CreateStickNoteDto[]
  setTempChanges: (canvasPaths: canvasPath[], stickyNotes: CreateStickNoteDto[]) => void
  clearTempChanges: () => void
}

export const useTempChangeStore = create<TempChangeState>()((set) => ({
  canvasPaths: [],
  stickyNotes: [],
  setTempChanges: (canvasPaths, stickyNotes) => set({ canvasPaths, stickyNotes }),
  clearTempChanges: () => set({ canvasPaths: [], stickyNotes: [] }),
}))
