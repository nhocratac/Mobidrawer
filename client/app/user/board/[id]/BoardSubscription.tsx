"use client";
import { useStompStore } from '@/lib/Zustand/socketStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId }: { boardId: string }) => {
  const { client, connect, isConnected } = useStompStore();

  useEffect(() => {
    if (!client || !isConnected || !client.connected ) {
      return;
    }
    // Khi đã kết nối, subscribe và publish
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message: ", message.body);
    });
    client.publish({
      destination: `/app/board/join/${boardId}`,
      body: JSON.stringify({
        userId: '12121112'
      })
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, boardId, isConnected, connect]);

  return null;
};

export default BoardSubscription;