import axios from 'axios';
import env from './environment';
import storeRedux from '../redux/store';
import { manageToken } from '../hook';
import { setToken } from '../redux/authSlice';

const instance = axios.create({
    baseURL: env.baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    // GUI cookies
    withCredentials: true,
});

const refreshToken = axios.create({
    baseURL: env.baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    // GUI cookies
    withCredentials: true,
});

instance.interceptors.request.use(
    async function (config) {
        const token = storeRedux.getState().auth.token;
        if (!token) {
            return config;
        }

        if (manageToken.isTokenExpired(token)) {
            try {
                const newTokenResponse = await refreshToken.post('/auth/refreshToken');
                if(newTokenResponse.status !== 200){
                    return Promise.reject(newTokenResponse);
                }
                const newToken = newTokenResponse.data.newAccessToken;
                storeRedux.dispatch(setToken(newToken));
                config.headers.Authorization = `Bearer ${newToken}`;
            } catch (error) {
                console.error('Token refresh failed', error);
                return Promise.reject(error);
            }
        } else {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);

export default {
    instance,
};
