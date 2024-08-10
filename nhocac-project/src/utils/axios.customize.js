import axios from 'axios'
import env from './environment'
const instance = axios.create({
    baseURL: env.baseURL,
    timeout: 10000,
    headers:{
        'Content-Type': 'application/json'
    }
})

instance.interceptors.request.use(
    config => {
        const token= localStorage.getItem(env.APP_NAME)
        if(token){
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

export default instance