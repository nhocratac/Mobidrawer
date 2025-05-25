"use client"

import { useState, useEffect } from "react";
import { useStompStore } from "@/lib/Zustand/socketStore";

interface CursorPosition {
    x: number;
    y: number;
    userId: string;
    userName: string;
    color: string;
    lastUpdated: any;
}

interface MultiCursorProps {
    scale: number;
    translate: { x: number; y: number };
    boardId: string;
}

const MultiCursor : React.FC<MultiCursorProps> = ({ scale, translate, boardId }) => {
    const [cursors, setCursors] = useState<CursorPosition[]>([]);
    const { client, sessionId } = useStompStore();

    useEffect(() => {
        if(!client || !client.connected || !boardId || !sessionId) return;

        const cursorSubscription = client.subscribe(
            `/topic/board/cursor/${boardId}`,
            (message) => {
                const payload = JSON.parse(message.body);
                if(payload.senderSessionId === sessionId) return;
                setCursors(prev => updateCursors(prev, payload.cursorData));
            }
        )

        // Bỏ cursor (khi người dùng rời bảng)
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setCursors((prev) => 
                prev.filter(cursor => now - cursor.lastUpdated < 3000)
            );
        }, 1000);

        return () => {
            cursorSubscription.unsubscribe();
            clearInterval(cleanupInterval);
        }
    }, [client, boardId, sessionId]);

    const updateCursors = (prev: CursorPosition[], newCursor: any) => {
        const existing = prev.find(c => c.userId === newCursor.userId);
        if(existing) {
            return prev.map(c => 
                c.userId === newCursor.userId ? { ...c, ...newCursor } : c
            );
        }
        return [...prev, newCursor];
    }

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {cursors.map((cursor) => (
            <div
            key={cursor.userId}
            className="absolute flex items-center"
            style={{
                transform: `translate(${cursor.x * scale + translate.x}px, ${cursor.y * scale + translate.y}px)`,
            }}
            >
            <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cursor.color }}
            />
            <div className="ml-2 px-2 py-1 text-xs bg-black text-white rounded">
                {cursor.userName}
            </div>
            </div>
        ))}
        </div>
    )
}

export default MultiCursor;