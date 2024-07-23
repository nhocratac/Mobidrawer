import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'

const CreateNewUser = async (req, res,next) => {
    try {
        // gọi kiểm soát dữ liệu
        // console.log('CreateNewUser')
        // console.log('request body',req.body)
        // console.log('request cookies',req.cookies)
        // console.log('request header',req.headers)
        // console.log('request params',req.params)
        // console.log('request query',req.query)
        // console.log('request url',req.url)
        // console.log('request originalUrl',req.originalUrl)
        // console.log('request method',req.method)
        // console.log('request path',req.path)
        // console.log('request protocol',req.protocol)
        // console.log('request secure',req.secure)
        // console.log('request ip',req.ip)
        // console.log('request ips',req.ips)
        // console.log('request hostname',req.hostname)
        // console.log('request subdomains',req.subdomains)
        res.status(StatusCode.CREATED).json({message: 'CreateNewUser'})
    } catch (error) {
        next(error)
    }
}

export { CreateNewUser }