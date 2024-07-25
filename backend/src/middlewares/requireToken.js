import { webToken } from '~/utils/webToken'

const whiteList = ['/user/login', '/user/register']

const requireToken = (req, res, next) => {
    if (!whiteList.includes(req.path) && !req.headers.authorization) {
        return res.status(401).json({ message: 'Unauthorized' })
    }
    if (!whiteList.includes(req.path)) {
        try {
            const token = req.headers.authorization
            webToken.verifyToken(token)
        } catch (error) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
    }
    next()
}
export default requireToken