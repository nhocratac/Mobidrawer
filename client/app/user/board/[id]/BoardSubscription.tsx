"use client";
import { showHistoryToast } from '@/components/Scene/HistoryToast';
import { reloadBoard, subscribeScene } from '@/components/Scene/sceneSocket';
import { useCanvasPathsStore } from '@/lib/Zustand/canvasPathsStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import useUserInBoardStore from '@/lib/Zustand/userInBoardStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client, sessionId, connectCount } = useStompStore();
  const { addCanvasPath, deletePaths, updatePaths } = useCanvasPathsStore()
  const { markOnlineUsers } = useUserInBoardStore()

  // Kết nối lại: các message bị lỡ khi offline không được gửi lại, nên tải lại board
  useEffect(() => {
    if (connectCount > 1) reloadBoard(boardId);
  }, [connectCount, boardId]);
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

    const unsubscribeScene = subscribeScene(client, boardId, sessionId, () => reloadBoard(boardId), showHistoryToast);

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
      unsubscribeScene();
    };
  }, [client, boardId, sessionId,client?.connected]);

  return null;
};

export default BoardSubscription;