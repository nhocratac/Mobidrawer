import jwt from 'jsonwebtoken'
import 'dotenv/config'
import { env } from '../config/environment';
const generateToken = (payload) => {
    return jwt.sign(payload, env.SECRECT_KEY, { expiresIn: env.EXPIRED_API_KEY })
}

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, env.SECRECT_KEY_REFRESH, { expiresIn: env.EXPIRED_REFRESH_TOKEN })
}

const verifyToken = (token,callback) => {
    token = token.split(' ')[1]
    return jwt.verify(token, env.SECRECT_KEY,{ expiresIn: env.EXPIRED_API_KEY }, callback)
}

const verifyRefreshToken = (token,callback) => {
    token = token.split(' ')[1]
    return jwt.verify(token, env.SECRECT_KEY_REFRESH,{ expiresIn: env.EXPIRED_REFRESH_TOKEN }, callback)
}
export const webToken = {generateToken,verifyToken,generateRefreshToken,verifyRefreshToken}