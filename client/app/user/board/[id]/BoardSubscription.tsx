"use client";
import { useCanvasPathsStore } from '@/lib/Zustand/canvasPathsStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore';
import useUserInBoardStore from '@/lib/Zustand/userInBoardStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client,sessionId } = useStompStore();
  const { canvasPaths, setCanvasPaths, addCanvasPath} = useCanvasPathsStore()
  const { addStickyNote,addStickyNotes, moveStickyNote ,resizeStickyNote,changTextStickNote,selectStickyNote,deselectStickyNote,deleteStickyNote} = useStickyNoteStore()
  const {markOnlineUsers} = useUserInBoardStore()
  useEffect(() => {
    if (!client || !client.connected || !boardId || !sessionId ) {
      return;
    }
    // Khi đã kết nối, subscribe và publish
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message:", message.body);
      const payload = JSON.parse(message.body);
      markOnlineUsers(payload)
    });

    const drawSubcription = client.subscribe(`/topic/draw/board/${boardId}`, (message) => {
      const pathCreated = JSON.parse(message.body)
      addCanvasPath(pathCreated)
    });

    const deletePathsSubscription = client.subscribe(`/topic/board/delete-paths/${boardId}`, (message) => {
      const pathDeleted = JSON.parse(message.body);
      if(pathDeleted.senderSessionId === sessionId) return;
      setCanvasPaths(canvasPaths.filter(path => !path.isSelected))
    })

    const updatePathsSubscription = client.subscribe(`/topic/board/update-paths/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      if(payload.senderSessionId === sessionId) return;

      const pathUpdated = payload.updatedPaths;
      console.log(pathUpdated);

      setCanvasPaths(pathUpdated);
    });

    const movePathsSubscription = client.subscribe(`/topic/board/move-paths/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      if(payload.senderSessionId === sessionId) return;

      const pathUpdated = payload.updatedPaths;
      console.log(pathUpdated);

      setCanvasPaths(pathUpdated);
    });

    const addStickyNoteSubscription = client.subscribe(`/topic/board/addStickyNote/${boardId}`, (message) => {
      const stickyNote = JSON.parse(message.body)
      addStickyNote(stickyNote)
    });

    const addStickyNotesSubscription = client.subscribe(`/topic/board/addStickyNotes/${boardId}`, (message) => {
      const stickyNotes = JSON.parse(message.body)
      addStickyNotes(stickyNotes)
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

    const reSizeStickyNoteSubcription = client.subscribe(`/topic/board/reSizeStickyNote/${boardId}`,(message) => {
      const payload = JSON.parse(message.body);
      const stickyNote = payload.stickyNote;
      const senderSessionId = payload.senderSessionId;
      if (senderSessionId === sessionId) {
        return;
      }
      resizeStickyNote(stickyNote.id, stickyNote.size)
    })

    const changeTextSubcription = client.subscribe(`/topic/board/ChangeTextStickyNote/${boardId}`,(message) => {
      const payload = JSON.parse(message.body);
      const stickyNote = payload.stickyNote;
      const senderSessionId = payload.senderSessionId;
      if (senderSessionId === sessionId) {
        return;
      }
      changTextStickNote(stickyNote.id,stickyNote.text)
    })  

    const lockStickNoteSubscription = client.subscribe(`/topic/board/lockStickyNote/${boardId}`,(message) => {
      const payload = JSON.parse(message.body);
      selectStickyNote(payload.id,payload.userId)
    })

    const unLockStickNoteSubscription = client.subscribe(`/topic/board/unLockStickyNote/${boardId}`,(message) => {
      const payload = JSON.parse(message.body);
      deselectStickyNote(payload.id)
    })

    const deleteStickyNoteSubcription = client.subscribe(`/topic/board/deleteStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body)
      deleteStickyNote(payload.id)
    })

    client.publish({
      destination: `/app/board/join/${boardId}`
    });
  
    return () => {
      client.publish({
        destination: `/app/board/leave/${boardId}`
      });
      subscription.unsubscribe();
      drawSubcription.unsubscribe()
      deletePathsSubscription.unsubscribe()
      updatePathsSubscription.unsubscribe()
      movePathsSubscription.unsubscribe()
      addStickyNoteSubscription.unsubscribe()
      moveStickyNoteSubscription.unsubscribe()
      reSizeStickyNoteSubcription.unsubscribe()
      changeTextSubcription.unsubscribe()
      lockStickNoteSubscription.unsubscribe()
      unLockStickNoteSubscription.unsubscribe()
      deleteStickyNoteSubcription.unsubscribe()
      addStickyNotesSubscription.unsubscribe()
    };
  }, [client, boardId,sessionId]);

  return null;
};

export default BoardSubscription;