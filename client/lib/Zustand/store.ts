import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { } from '@redux-devtools/extension'; // required for devtools typing

// Định nghĩa kiểu enum cho chế độ
enum ModeType {
    drag = 'drag',
    idle = 'idle',
    resize = 'resize',
    rotate = 'rotate',
    pen = 'pen',
}

// Định nghĩa trạng thái cho công cụ phát triển
interface ToolDevState {
    mode: ModeType;
    setMode: (mode: string) => void;
    pencil: {
        color?: string;
        thickness?: number;
        setColor?: (color: string) => void;
        setThickness?: (thickness: number) => void;
    };
}

// Tạo store với Zustand
const useToolDevStore = create<ToolDevState>()(
    devtools(
        persist(
            (set, get) => ({
                mode: ModeType.drag,
                setMode: (mode: string) => {
                    switch (mode) {
                        case 'drag':
                            set({ mode: ModeType.drag });
                            break;
                        case 'resize':
                            set({ mode: ModeType.resize });
                            break;
                        case 'rotate':
                            set({ mode: ModeType.rotate });
                            break;
                        case 'pen':
                            set({ mode: ModeType.pen });
                            break;
                        case 'idle': 
                            set({ mode: ModeType.idle });
                        default:
                            break;
                    }
                },
                pencil: {
                    color: 'black',
                    thickness: 15,
                    setColor: (color: string) => {
                        set(state => ({
                            ...state,
                            pencil: {
                                ...state.pencil,
                                color,
                                setColor: state.pencil.setColor, // Giữ lại hàm setColor
                                setThickness: state.pencil.setThickness, // Giữ lại hàm setThickness
                            },
                        }));
                    },
                    setThickness: (thickness: number) => {
                        set(state => (
                            {
                                ...state,
                                pencil: {
                                    ...state.pencil,
                                    thickness,
                                    setColor: state.pencil.setColor, // Giữ lại hàm setColor
                                    setThickness: state.pencil.setThickness, // Giữ lại hàm setThickness
                                },
                            }));
                    },
                },
            }),
            {
                name: 'tool-dev-storage', // Tên lưu trữ trong localStorage
                merge: (persistedState: any, currentState) => ({
                    ...currentState,
                    ...persistedState,
                    pencil: {
                        ...currentState.pencil,
                        ...persistedState?.pencil,
                        setColor: currentState.pencil.setColor, // Đảm bảo setColor không bị ghi đè
                        setThickness: currentState.pencil.setThickness, // Đảm bảo setThickness không bị ghi đè
                    },
                }),
            },
        ),
    ),
);

export { useToolDevStore };
