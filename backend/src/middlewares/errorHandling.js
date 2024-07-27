import { StatusCodes } from "http-status-codes"
import { env } from "../config/environment"

const errorHandling = (err, req, res, next) => {
    if (!err.StatusCode) {
        err.StatusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    const respondError = {
        status: err.StatusCode,
        message: err.message || StatusCodes[err.StatusCode],
        // Chỉ hiển thị stack trong môi trường phát triển
        ...(env.BUILD_MODE === 'dev' && { stack: err.stack })
    }

    res.status(err.StatusCode).json(respondError)
}
export default errorHandling