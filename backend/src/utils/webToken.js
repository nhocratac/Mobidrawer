import jwt from 'jsonwebtoken'
import 'dotenv/config'
import { env } from '../config/environment';
const generateToken = (payload) => {
    return jwt.sign(payload, env.SECRECT_KEY, { expiresIn: env.EXPIRED_API_KEY })
}

const verifyToken = (token) => {
    token = token.split(' ')[1]
    return jwt.verify(token, env.SECRECT_KEY,{ expiresIn: env.EXPIRED_API_KEY })
}

export const webToken = {generateToken,verifyToken}