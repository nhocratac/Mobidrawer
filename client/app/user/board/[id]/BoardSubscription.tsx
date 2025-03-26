"use client";
import { useCanvasPathsStore } from '@/lib/Zustand/canvasPathsStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client, isConnected,sessionId } = useStompStore();
  const { addCanvasPath } = useCanvasPathsStore()
  const { addStickyNote, moveStickyNote } = useStickyNoteStore()

  useEffect(() => {
    if (!client || !client.connected) {
      return;
    }
    // Khi đã kết nối, subscribe và publish
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message: ", message.body);
    });

    const drawSubcription = client.subscribe(`/topic/draw/board/${boardId}`, (message) => {
      const pathCreated = JSON.parse(message.body)
      addCanvasPath(pathCreated)
    });

    const addStickyNoteSubscription = client.subscribe(`/topic/board/addStickyNote/${boardId}`, (message) => {
      const stickyNote = JSON.parse(message.body)
      addStickyNote(stickyNote)
    });

    const moveStickyNoteSubscription = client.subscribe(`/topic/board/moveStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      const stickyNote = payload.stickyNote;

      const senderSessionId = payload.senderSessionId;
      // Bỏ qua nếu tin nhắn đến từ chính mình
      if (senderSessionId === sessionId) {
        return;
      }
      moveStickyNote(stickyNote.id, stickyNote.position);
    });

    client.publish({
      destination: `/app/board/join/${boardId}`,
      body: JSON.stringify({
        userId: '12121112'
      })
    });

    return () => {
      subscription.unsubscribe();
      drawSubcription.unsubscribe()
      addStickyNoteSubscription.unsubscribe()
      moveStickyNoteSubscription.unsubscribe()
    };
  }, [client, boardId,sessionId]);

  return null;
};

export default BoardSubscription;