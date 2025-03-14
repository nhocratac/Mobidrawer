import { refreshAccessToken } from "@/api/authAPI";

const configDefault = {
  baseUrl: "http://localhost:8080/api/v1",
};

async function fetchInstance(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
) {
  // Lấy accessToken từ storage (ví dụ từ Context, Redux, hoặc localStorage)
  let accessToken = localStorage.getItem("accessToken");

  // Cấu hình mặc định cho request
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(
      `${configDefault.baseUrl}/${endpoint}`,
      config
    );

    // Nếu token hết hạn, tự động gọi refresh token và thử lại request
    if (response.status === 401 && !isRetry) {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        return fetchInstance(endpoint, options, true);
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

const get = (url: string, options?: RequestInit): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  if (!options) return fetch(url);
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });
};

const post = (
  url: string,
  data: any,
  options?: RequestInit
): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  if (!options)
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  return fetch(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
};

const put = (
  url: string,
  data: any,
  options?: RequestInit
): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  if (!options)
    return fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  return fetch(url, {
    ...options,
    method: "PUT",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
};

const remove = (url: string, options?: RequestInit): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  if (!options)
    return fetch(url, {
      method: "DELETE",
    });
  return fetch(url, {
    method: "DELETE",
    ...options,
    headers: {
      ...options.headers,
    },
  });
};

const httpRequest = {
  get,
  post,
  put,
  remove,
  fetchInstance,
};

export default httpRequest;
