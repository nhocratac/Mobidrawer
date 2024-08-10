import { webToken } from '~/utils/webToken'
import StatusCodes from 'http-status-codes'
import { env } from '../config/environment'

const whiteList = ['/user/login', '/user/register','/auth/refreshToken']

const requireToken = (req, res, next) => {
    const BearerToken = req.headers.authorization
    if (!whiteList.includes(req.path)) {
        if (!BearerToken)
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token is required' })
        webToken.verifyToken(BearerToken, (err, decode) => {
            if (err) {
                return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token is invalid' })
            }
            req.decodeToken = decode
        })
    }
    next()
}
const refreshToken = async (req, res, next) => {
    try {
        const refreshToken = `Bearer ${req.cookies[`${env.APP_NAME}_refreshToken`]}`
        if (!refreshToken) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token is required' })
        }
        webToken.verifyRefreshToken(refreshToken, (err, decode) => {
            if (err||!decode) {
                return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token is invalid' })
            }
            if(decode)
                req.decodeRefreshToken = decode
            next()
        })
    } catch (error) {
        next(error)
    }
}
export {refreshToken}
export default requireToken