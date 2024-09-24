import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // required for devtools typing

// Định nghĩa trạng thái cho số lượng gấu
interface BearState {
    bears: number;
    increase: (by: number) => void;
}

// Định nghĩa kiểu enum cho chế độ

enum ModeType {
    drag = 'drag',
    resize = 'resize',
    rotate = 'rotate',
    paint = 'paint',
}

// Định nghĩa trạng thái cho công cụ phát triển
interface ToolDevState {
    mode: ModeType; // Sửa tên thuộc tính thành 'mode' để nhất quán
    setMode: (mode: string) => void;
}

// Tạo store với Zustand
const useToolDevStore = create<ToolDevState>()(
    devtools(
        persist(
            (set) => ({
                mode: ModeType.drag, // Sửa tên thuộc tính thành 'mode' để nhất quán
                setMode: (mode: string) => {
                    switch (mode) {
                        case 'drag':
                            set({ mode: ModeType.drag });
                            break;
                        case 'resize': // Sửa lỗi chính tả 'rresize' thành 'resize'
                            set({ mode: ModeType.resize });
                            break;
                        case 'rotate':
                            set({ mode: ModeType.rotate });
                            break;
                        case 'paint':
                            set({ mode: ModeType.paint });
                            break;
                        default:
                            break;
                    }
                }
            }),
            {
                name: 'tool-dev-storage', // Đổi tên để phản ánh đúng mục đích
            },
        ),
    ),
);

export { useToolDevStore };
