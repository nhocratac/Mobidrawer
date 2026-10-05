import type { BoardElement } from '@/components/Scene/types'
import { CreateImageNoteDto } from '@/lib/Zustand/ImageNoteStore'
import { CreateStickNoteDto, canvasPath } from '@/lib/Zustand/type.type'
import { create } from 'zustand'

interface TempChangeState {
  canvasPaths: canvasPath[]
  stickyNotes: CreateStickNoteDto[],
  imageNotes: CreateImageNoteDto[],
  // file .mobi 2.0: element đã được cấp id mới
  elements: BoardElement[],
  setTempChanges: (canvasPaths: canvasPath[], stickyNotes: CreateStickNoteDto[], imageNotes : CreateImageNoteDto[], elements?: BoardElement[]) => void
  clearTempChanges: () => void
}

export const useTempChangeStore = create<TempChangeState>()((set) => ({
  canvasPaths: [],
  stickyNotes: [],
  imageNotes: [],
  elements: [],
  setTempChanges: (canvasPaths, stickyNotes, imageNotes, elements = []) =>
    set({ canvasPaths: canvasPaths ?? [], stickyNotes: stickyNotes ?? [], imageNotes: imageNotes ?? [], elements }),
  clearTempChanges: () => set({ canvasPaths: [], stickyNotes: [], imageNotes: [], elements: [] }),
}))
