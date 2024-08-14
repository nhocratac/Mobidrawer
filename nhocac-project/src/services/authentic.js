import HttpRequest from "../utils/HttpRequest"
import { manageToken } from "../hook"
import { login ,setError,clearError,setToken} from "../redux/authSlice"

const loginAuth = async (data,dispatch,navigate) => {
    try {
        dispatch(clearError())
        const { email, password } = data
        const response = await HttpRequest.post('/auth/login', { email, password })
        if (response.status === 200) {
            manageToken.saveToken(response.data.accessToken)
            dispatch(login(response.data.data))
            dispatch(setToken(response.data.accessToken))
            navigate('/')
            return response.data
        }
        throw response
    } catch (err) {
        // console.log(err)
        // dispatch(setError(err.message))
        // throw err
    }
}


const registerAuth = async (data) => {
    try {
        const { email, password, name } = data
        const response = await HttpRequest.post('/auth/register', { email, password, name })
        if (response.status === 201) {
            return response.data
        }
        throw response.response
    } catch (err) {
        throw err
    }
}

const refreshToken = async () => {
    try {
        console.log('refreshToken')
        const response = await HttpRequest.get('/auth/refreshToken')
        if (response.status === 200) {
            manageToken.updateToken(response.data.accessToken)
            return response.data
        }
        throw response.response
    } catch (err) {
        throw err
    }
}


const authentic = {
    loginAuth,
    registerAuth,
    refreshToken,
}

export default authentic