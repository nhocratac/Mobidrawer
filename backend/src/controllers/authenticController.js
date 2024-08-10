import StatusCode from 'http-status-codes'
import { env } from '../config/environment'
import ApiError from '../utils/ApiError'
import refreshTokenService from '../services/refreshTokenService'

const refreshToken = async (req, res, next) => {
    try {
        const decodeRefreshToken = req.decodeRefreshToken
        if (!decodeRefreshToken) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'Token is invalid')
        }
        const { newAccessToken, newRefreshToken }
            = await refreshTokenService.refreshToken(req.cookies[`${env.APP_NAME}_refreshToken`], decodeRefreshToken)
        if (!newAccessToken || !newRefreshToken) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'Token can not be refreshed')
        }
        res.cookie(`${env.APP_NAME}_refreshToken`, refreshToken,
            {
                httpOnly: true,
                secure: env.BUILD_MODE === 'production',
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000,
            })
        res.status(StatusCode.OK).json({ message: 'Token refreshed', newAccessToken })
    } catch (error) {
        next(error)

    }
}

const logout = async (req, res, next) => {
    try {

    } catch (error) {

    }
}

const authenticController = {
    refreshToken,
    logout
}

export default authenticController