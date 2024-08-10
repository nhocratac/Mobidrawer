import httpRequest from "../utils/HttpRequest"
import http from 'http'
import { manageToken } from "../hook"
//import https from 'https'

const setOnline = async (data) => {
    try {
        const response = await httpRequest.post('/user/setOnline',data)
        if(response.status === 200){
            return response.data
        }
        throw response.response
    } catch (err) {
        throw err
    }
}

const setOffline = async (data) => {
    // try {
    //     const response = await httpRequest.post(`/user/setOffline/${data.id}`,{},{
    //         httpAgent : new http.Agent({keepAlive : true}),
    //        // httpsAgent : new https.Agent({keepAlive : true}),
    //     })
    //     if(response.status === 200){
    //         return response.data
    //     }
    //     throw response.response
    // } catch (err) {
    //     throw err
    // }
    // fecth api keep alive
    try {
        const response = await fetch(`/user/setOffline/${data._id}`,{
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json',
                'Authorization' : `Bearer ${manageToken.getToken()}`
            },
            keepalive : true
            ,
            body : JSON.stringify({})
        })
        if(response.status === 200){
            return response.json()
        }
        throw response
    } catch (err) {
        throw err
    }
}

const userServices = { setOnline, setOffline }
export default userServices