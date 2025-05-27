import httpRequest from "@/utils/httpRequest";

export interface Notification {
  id: string;
  title: string;
  body: string;
  receivers: Receiver[];
  createdAt: string;
  updateAt: string;
}

interface Receiver {
  id: string;
  read: boolean;
}

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    console.log("get notifications");
    const response = await httpRequest.get("/notification/");
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications: ", error);
    throw error;
  }
};

export const markNotificationAsRead = async (
  userId: string,
  notificationIds: string[]
): Promise<Notification[]> => {
  const response = await httpRequest.post("/notification/mark-as-read", {
    userId,
    notificationIds,
  });
  return response.data;
};
