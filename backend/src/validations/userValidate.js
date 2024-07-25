import Joi from 'joi'
import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'

const  CreateNewUser = async (req, res, next) => {
    const correctCondition=  Joi.object({
        username: Joi.string().required().min(6).max(50).trim().strict().messages({
            'string.base': 'Username should be a type of text',
            'string.empty': 'Username cannot be an empty field',
            'string.min': 'Username should have a minimum length of 6',
            'string.max': 'Username should have a maximum length of 50',
            'any.required': 'Username is a required field'
            }),
        email: Joi.string().email().required().strict(),
        password: Joi.string().required(),
        name: Joi.string().required(),
    })
    try {
        const a = await correctCondition.validateAsync(req.body)
        next()
    } catch (error) {
        console.log(error.message)
        next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, new Error(error.message).message))
    }
}

const LoginUser = async (req, res, next) => {
    const correctCondition=  Joi.object({
        email: Joi.string().email().required().strict(),
        password: Joi.string().required(),
    })
    try {
        const a = await correctCondition.validateAsync(req.body)
        next()        
    } catch (error) {
        res.status(StatusCode.UNPROCESSABLE_ENTITY).json({ error: new Error(error).message})
    }
}

const findUserByEmail = async (req, res, next) => {
    const correctCondition=  Joi.object({
        email: Joi.string().email().required().strict(),
    })
    try {
        const a = await correctCondition.validateAsync(req.params)
        next()
    } catch (error) {
        next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, new Error(error).message))
    }

}
export  const userValidate = 
{
    CreateNewUser,
    LoginUser,
    findUserByEmail
}