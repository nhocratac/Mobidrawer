import Joi from 'joi'
import { GET_DB } from '../config/database'
const REFRESHTOKEN_SCHEMA = Joi.object({
    refreshToken: Joi.string().required(),
    userId: Joi.string().required(),
    expiredAt: Joi.date().required(),
})

const REFRESHTOKEN_NAME_COLLECTION = 'refreshToken'

const createNew = async (data) => {
    const db = GET_DB()
    const { refreshToken, userId, expiredAt } = data
    try {
        const findToken = await db.collection(REFRESHTOKEN_NAME_COLLECTION).
            findOneAndUpdate(
                { userId: userId },
                { $set: { refreshToken, expiredAt } },
                { returnOriginal: false },
            )
        if (findToken) {
            return findToken
        }
        const refreshTokenValidated = await REFRESHTOKEN_SCHEMA.validateAsync({ refreshToken, userId, expiredAt })
        return await db.collection(REFRESHTOKEN_NAME_COLLECTION).insertOne(refreshTokenValidated)
    } catch (error) {
        throw error
    }
}

const checkExist = async (refreshToken, userID) => {
    const db = GET_DB()
    try {
        const findToken = await db.collection(REFRESHTOKEN_NAME_COLLECTION).findOne({ userId: userID })
        if (findToken?.refreshToken !== refreshToken) {
            return false
        }
        return true

    } catch (error) {
        throw error
    }
}
const findAndDelete_RefreshToken = async (refreshToken, userId) => {
    const db = GET_DB()
    try {
        const updateRefreshToken = await db.collection(REFRESHTOKEN_NAME_COLLECTION)
            .findOneAndUpdate({ userId: userId, refreshToken: refreshToken }, { $set: { refreshToken: null } }
            )
        // update xong thi set null
        return true
    } catch (error) {
        throw error
    }
}
const refreshTokenModel = {
    REFRESHTOKEN_SCHEMA,
    REFRESHTOKEN_NAME_COLLECTION,
    createNew,
    findAndDelete_RefreshToken,
    checkExist
}

export default refreshTokenModel 