const configDefault = {
  baseUrl: "http://localhost:8080/api/v1",
};
const get =  (url: string): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  return fetch(url);
};

const post =  (url: string, data: any): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
};

const put =  (url: string, data: any): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
};

const remove =  (url: string): Promise<Response> => {
  url = `${configDefault.baseUrl}${url}`;
  return fetch(url, {
    method: "DELETE",
  });
};

const httpRequest = {
  get,
  post,
  put,
  remove,
};

export default httpRequest;
