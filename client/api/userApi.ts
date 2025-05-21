import httpRequest from "@/utils/httpRequest";

const uploadAvatar = async (avatarUrl: string) => {
  try {
    const res = await httpRequest.post("users/uploadAvatar", {
      avatarUrl,
    });
    console.log(res);
    return res.data;
  } catch (error) {
    throw error;
  }
};

const getUserDetailById = async (id: string) => {
  try {
    const res = await httpRequest.get("users/" + id);
    return res.data
  } catch (error) {
    throw error
  }
};

const userApi = {
  uploadAvatar,
  getUserDetailById
};
export default userApi;
