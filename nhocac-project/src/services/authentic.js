import HttpRequest from "../utils/HttpRequest"

const login = async (data) => {
    try {
        const {email,password} = data
        const response = await HttpRequest.post('/user/login',{email,password})
        if(response.status === 200){
            return response.data
        }
        throw response.response
    } catch (err) {
        console.log(err)
        throw err
    }
}


const authentic = {
    login,
}

export default authentic