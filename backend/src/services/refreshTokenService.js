import refreshTokenModel from "../models/refreshTokenModel"
import {webToken} from "../utils/webToken"
const CreateNew = async (refreshToken) => {
    try {
        return await refreshTokenModel.createNew(refreshToken)
    } catch (error) {
        throw error
    }
}

const refreshToken = async (refreshToken,decodeRefreshToken) => {
    try {
        const [isExist,isDeleted]= await Promise.all([
            refreshTokenModel.checkExist(refreshToken, decodeRefreshToken.userData._id),
            refreshTokenModel.findAndDelete_RefreshToken(refreshToken, decodeRefreshToken.userData._id)
        ])
        if(!isExist){
            throw new Error('RefreshToken not exist')
        }
        if(!isDeleted){
            throw new Error('RefreshToken not deleted')
        }
        const newAccessToken = webToken.generateToken({ decodeRefreshToken })
        const newRefreshToken = webToken.generateRefreshToken({ decodeRefreshToken })
        if(!newAccessToken || !newRefreshToken){
            throw new Error('Failed to generate new token')
        }
        await CreateNew({
            refreshToken:newRefreshToken,
            userId:decodeRefreshToken.userData._id,
            expiredAt:new Date(Date.now() + 24 * 60 * 60 * 1000)
        })
        return { newAccessToken, newRefreshToken }
    } catch (error) {
        throw error
    }
}
const refreshTokenService = {
    CreateNew,
    refreshToken,
}
export default refreshTokenService