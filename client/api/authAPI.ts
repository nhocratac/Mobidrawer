import httpRequest from "@/utils/httpRequest";

const register = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}) => {
  try {
    const res = await httpRequest.post("/auth/register", data);
    if (res.status === 200) {
      return res.json();
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

const verifyRegister = async (data: { code: string; email: string }) => {
  try {
    const res = await httpRequest.post("/auth/verify-register", data);
    if (res.status === 200) {
      return res.json();
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

const login = async (data: { email: string; password: string }) => {
  try {
    const res = await httpRequest.post("/auth/login", data);
    console.log(res);
    if (res.status === 200) {
      return res.json();
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

export { register, login, verifyRegister };
