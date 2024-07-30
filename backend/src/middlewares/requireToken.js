import { webToken } from '~/utils/webToken'
import StatusCodes from 'http-status-codes'

const whiteList = ['/user/login', '/user/register']

const requireToken = (req, res, next) => {
    if (!whiteList.includes(req.path) && !req.headers.authorization) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
    }
    if (!whiteList.includes(req.path)) {
        try {
            const token = req.headers.authorization
            if (!token) {
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'token is Required' })
            }
            const decodedToken = webToken.verifyToken(token)
            if (!decodedToken) {
                return res.status(StatusCodes.FORBIDDEN).json({ message: 'you must be authenticated' })
            }
            req.decodeToken = decodedToken
        } catch (error) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
        }
    }
    next()
}
export default requireToken