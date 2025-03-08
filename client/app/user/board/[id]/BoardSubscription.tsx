import { useStompStore } from '@/lib/Zustand/socketStore';
import { useEffect } from 'react';

const BoardSubscription = ({ boardId } : { boardId :string}) => {
  const { client } = useStompStore()

  useEffect(() => {
    console.log("Client: ", client);
    if(client) {
      console.log("Connected: ", client.connected);
    }
    if (!client || !client.connected) return;

    console.log("Subscribing to /topic/board/" + boardId);
    const subscription = client.subscribe(`/topic/board/${boardId}`, (message) => {
      console.log("Received message: ", message.body);
    });

    return () => {
      console.log("Unsubscribing from /topic/board/" + boardId);
      subscription.unsubscribe();
    };
  }, [client, boardId, client?.connected]);

  return null; // Không cần hiển thị gì
};

export default BoardSubscription;
