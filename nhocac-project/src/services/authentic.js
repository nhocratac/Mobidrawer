import HttpRequest from "../utils/HttpRequest"
import { manageToken } from "../hook"

const login = async (data) => {
    try {
        const {email,password} = data
        const response = await HttpRequest.post('/user/login',{email,password})
        if(response.status === 200){
            // save token
            manageToken.saveToken(response.data.accessToken)
            return response.data
        }
        throw response.response
    } catch (err) {
        console.log(err)
        throw err
    }
}


const register = async (data) => {
    try {
        const {email,password,name} = data
        const response = await HttpRequest.post('/user/register',{email,password,name})
        if(response.status === 201){
            return response.data
        }
        throw response.response
    } catch (err) {
        throw err
    }
}


const authentic = {
    login,
    register,
}

export default authentic