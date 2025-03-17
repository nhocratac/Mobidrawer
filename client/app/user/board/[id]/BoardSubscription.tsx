import { useStompStore } from '@/lib/Zustand/socketStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId } : { boardId :string}) => {
  const { client } = useStompStore()

  useEffect(() => {
    if (!client || !client.connected) return;
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message: ", message.body);
    });
    client.publish({
      destination: `/app/board/join/${boardId}`,
      body: JSON.stringify({
        userid:'12121112'
      })
    })
    return () => {  
      console.log("Unsubscribing from /topic/board/" + boardId);
      subscription.unsubscribe();
    };
  }, [client, boardId, client?.connected]);

  return null; // Không cần hiển thị gì
};

export default BoardSubscription;
