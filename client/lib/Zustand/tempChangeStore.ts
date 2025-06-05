import { CreateImageNoteDto } from '@/lib/Zustand/ImageNoteStore'
import { CreateStickNoteDto, canvasPath } from '@/lib/Zustand/type.type'
import { create } from 'zustand'

interface TempChangeState {
  canvasPaths: canvasPath[]
  stickyNotes: CreateStickNoteDto[],
  imageNotes: CreateImageNoteDto[], 
  setTempChanges: (canvasPaths: canvasPath[], stickyNotes: CreateStickNoteDto[], imageNotes : CreateImageNoteDto[]) => void
  clearTempChanges: () => void
}

export const useTempChangeStore = create<TempChangeState>()((set) => ({
  canvasPaths: [],
  stickyNotes: [],
  imageNotes: [], 
  setTempChanges: (canvasPaths, stickyNotes,imageNotes ) => set({ canvasPaths, stickyNotes, imageNotes }),
  clearTempChanges: () => set({ canvasPaths: [], stickyNotes: [] }),
}))
