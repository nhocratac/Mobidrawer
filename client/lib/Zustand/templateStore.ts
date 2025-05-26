import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface canvasPath {
  color: string;
  thickness: number;
  opacity: number;
  paths: { x: number; y: number }[];
}

interface StickyNote {
  color: string;
  text: string;
  size: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
}

interface Template {
  id: string;
  previewImageUrl: string;
  title: string;
  description: string;
  owner: string;
  canvasPaths: canvasPath[];
  stickyNotes: StickyNote[];
}

interface TemplateState {
  templates: Template[];
  setTemplates: (templates: Template[]) => void;
  addTemplate: (newTemplate: Template) => void;
  updateTemplate: (index: number, newTemplate: Template) => void;
}

  const useTemplateStore = create<TemplateState>()(
  devtools(
    persist(
      (set) => ({
        templates: [],
        setTemplates: (templates) => set({ templates }),
        addTemplate: (newTemplate) =>
          set((state) => ({ templates: [...state.templates, newTemplate] })),
        updateTemplate: (index, newTemplate) =>
          set((state) => {
            const updatedTemplates = [...state.templates];
            if (index >= 0 && index < updatedTemplates.length) {
              updatedTemplates[index] = newTemplate;
            } else {
              console.warn("Index out of range");
            }
            return { templates: updatedTemplates };
          }),
      }),
      {
        name: "template-store",
      }
    )
  )
);

export default useTemplateStore;
export type { Template, canvasPath, StickyNote };