import ApiError from "../utils/ApiError"
import { StatusCodes } from "http-status-codes"

const errorHandling = (err, req, res, next) => {
    if(!err.StatusCode)
        err.StatusCode = StatusCodes.INTERNAL_SERVER_ERROR
    const respondError ={
        status: err.StatusCode,
        message: err.message || StatusCodes[err.StatusCode],
        stack : err.stack
    }
    if(process.env.NODE_ENV === 'production'){
        delete respondError.stack
    }
    res.status(err.StatusCode).json(respondError)
}
export default errorHandling