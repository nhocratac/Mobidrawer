import httpRequest from "@/utils/httpRequest";

export interface Notification {
    id: string;
    title: string;
    body: string;
    updateAt: string;
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
}