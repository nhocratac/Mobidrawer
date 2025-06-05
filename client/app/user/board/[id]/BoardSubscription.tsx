"use client";
import { useImageNoteStore } from '@/lib/Zustand/ImageNoteStore';
import { useCanvasPathsStore } from '@/lib/Zustand/canvasPathsStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore';
import useUserInBoardStore from '@/lib/Zustand/userInBoardStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client, sessionId } = useStompStore();
  const { addCanvasPath, deletePaths, updatePaths } = useCanvasPathsStore()
  const { addStickyNote, addStickyNotes, moveStickyNote, resizeStickyNote, changTextStickNote, selectStickyNote, deselectStickyNote, deleteStickyNote } = useStickyNoteStore()
  const { markOnlineUsers } = useUserInBoardStore()
  useEffect(() => {
    if (!client || !client.connected || !boardId || !sessionId) {
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
      const payload = JSON.parse(message.body);
      if (payload.senderSessionId === sessionId) return;

      const pathIdsToDelete = payload.deletePaths;
      // const newPaths = canvasPaths.filter(path => !pathIdsToDelete.includes(path.id));

      // setCanvasPaths(newPaths);
      deletePaths(pathIdsToDelete);
    })

    const updatePathsSubscription = client.subscribe(`/topic/board/update-paths/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      if (payload.senderSessionId === sessionId) return;

      const pathUpdated = payload.updatedPaths;

      updatePaths(pathUpdated);
    });

    const movePathsSubscription = client.subscribe(`/topic/board/move-paths/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      if (payload.senderSessionId === sessionId) return;

      const pathUpdated = payload.updatedPaths;

      updatePaths(pathUpdated);
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

    const reSizeStickyNoteSubcription = client.subscribe(`/topic/board/reSizeStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      const stickyNote = payload.stickyNote;
      const senderSessionId = payload.senderSessionId;
      if (senderSessionId === sessionId) {
        return;
      }
      resizeStickyNote(stickyNote.id, stickyNote.size)
    })

    const changeTextSubcription = client.subscribe(`/topic/board/ChangeTextStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      const stickyNote = payload.stickyNote;
      const senderSessionId = payload.senderSessionId;
      if (senderSessionId === sessionId) {
        return;
      }
      changTextStickNote(stickyNote.id, stickyNote.text)
    })

    const lockStickNoteSubscription = client.subscribe(`/topic/board/lockStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      selectStickyNote(payload.id, payload.userId)
    })

    const unLockStickNoteSubscription = client.subscribe(`/topic/board/unLockStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      deselectStickyNote(payload.id)
    })

    const deleteStickyNoteSubcription = client.subscribe(`/topic/board/deleteStickyNote/${boardId}`, (message) => {
      const payload = JSON.parse(message.body)
      deleteStickyNote(payload.id)
    })


    const moveImageNoteSubscription = client.subscribe(`/topic/board/moveImage/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      const imageNote = payload.image;
      const senderSessionId = payload.senderSessionId;
      // Bỏ qua nếu tin nhắn đến từ chính mình
      if (senderSessionId === sessionId) {
        return;
      }
      useImageNoteStore.getState().updateImageNote(imageNote.id, { position: imageNote.position });
    })
    const resizeImageNoteSubscription = client.subscribe(`/topic/board/resizeImage/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      const imageNote = payload.image;
      const senderSessionId = payload.senderSessionId;
      // Bỏ qua nếu tin nhắn đến từ chính mình
      if (senderSessionId === sessionId) {
        return;
      }
      useImageNoteStore.getState().updateImageNote(imageNote.id, { size: imageNote.size });
    });
    
    const addImageNoteSubscription = client.subscribe(`/topic/board/image/${boardId}`, (message) => {
      const imageNote = JSON.parse(message.body);
      // Xử lý thêm hình ảnh vào store hoặc state
      useImageNoteStore.getState().addImageNote(imageNote.image);
    });

    const deleteImageNoteSubscription = client.subscribe(`/topic/board/deleteImage/${boardId}`, (message) => {
      const payload = JSON.parse(message.body);
      useImageNoteStore.getState().deleteImageNote(payload.id);
    });


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
      addImageNoteSubscription.unsubscribe();
      moveImageNoteSubscription.unsubscribe();
      resizeImageNoteSubscription.unsubscribe();
      deleteImageNoteSubscription.unsubscribe();
    };
  }, [client, boardId, sessionId,client?.connected]);

  return null;
};

export default BoardSubscription;