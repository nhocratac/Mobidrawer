import instance from "./axios.customize"



const get = async (url,config) => {
    try {
        const response = await instance.instance.get(url,config)
        return response
    } catch (error) {
        return error
    }
}

const  post = async (url, data,config) => {
    try {
        const response = await instance.instance.post(url, data,config)
        return response
    } catch (error) {
        return error
    }
}

const put = async (url, data) => {
    try {
        const response = await instance.instance.put(url, data)
        return response
    } catch (error) {
        return error
    }
}

const remove = async (url,config) => {
    try {
        const response = await instance.instance.delete(url,config)
        return response
    } catch (error) {
        return error
    }
}


const   httpRequest={ get, post, put, remove }

export default httpRequest