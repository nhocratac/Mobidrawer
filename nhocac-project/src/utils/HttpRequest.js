import axios from 'axios';

const HttpRequest = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

const get = async (url) => {
    try {
        const response = await HttpRequest.get(url);
        return response.data;
    } catch (error) {
        return error;
    }
}

const  post = async (url, data) => {
    try {
        const response = await HttpRequest.post(url, data);
        return response.data;
    } catch (error) {
        return error;
    }
}

const put = async (url, data) => {
    try {
        const response = await HttpRequest.put(url, data);
        return response.data;
    } catch (error) {
        return error;
    }
}

const remove = async (url) => {
    try {
        const response = await HttpRequest.delete(url);
        return response.data;
    } catch (error) {
        return error;
    }
}

export { get, post, put, remove };