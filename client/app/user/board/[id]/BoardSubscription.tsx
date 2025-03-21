"use client";
import { useCanvasPathsStore } from '@/lib/Zustand/canvasPathsStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client, connect, isConnected } = useStompStore();
  const {addCanvasPath}= useCanvasPathsStore()

  useEffect(() => {
    if (!client || !isConnected || !client.connected ) {
      return;
    }
    // Khi đã kết nối, subscribe và publish
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message: ", message.body);
    });

    const drawSubcription = client.subscribe(`/topic/draw/board/${boardId}`, (message) => {
      const pathCreated = JSON.parse(message.body)
      console.log("Received message draw: ", pathCreated);
      addCanvasPath(pathCreated)
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
    };
  }, [client, boardId, isConnected, connect]);

  return null;
};

export default BoardSubscription;