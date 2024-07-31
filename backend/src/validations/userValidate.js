import Joi from 'joi'
import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'
import { webToken } from '../utils/webToken'

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

const setUserOnline = async (req, res, next) => {
    const decodeToken = req.decodeToken
    const id = req.params.id
    const correctCondition = Joi.object({
        id: Joi.string().required(),
    })
    try {
        if (id !== decodeToken.userData._id) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'You are not authorized to perform this action')
        }
        await correctCondition.validateAsync(req.params)
        next()
    } catch (error) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}

const setUserOffline = async (req, res, next) => {
    const decodeToken = req.decodeToken
    const id = req.params.id
    const correctCondition = Joi.object({
        id: Joi.string().required(),
    })
    try {
        if (id !== decodeToken.userData._id) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'You are not authorized to perform this action')
        }
        await correctCondition.validateAsync(req.params)
        next()
    } catch (error) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}

const sendRequestFriend = async (req, res, next) => {
    const decodeToken = req.decodeToken
    if( decodeToken.userData._id === req.body.friendId){
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, 'You cannot send a friend request to yourself'))
    }
    const correctCondition = Joi.object({
        _id: Joi.string().required(),
        friendId: Joi.string().required(),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch (error) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}
const acceptRequestFriend = async (req, res, next) => {
    const decodeToken = req.decodeToken
    console.log(decodeToken.userData)
    if( decodeToken.userData?._id === req.body._id){
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, 'You cannot accept a friend request to yourself'))
    }
    const correctCondition = Joi.object({
        _id: Joi.string().required(),
        friendId: Joi.string().required(),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch (error) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}
// unFriend
// rejectRequestFriend


export  const userValidate = 
{
    CreateNewUser,
    LoginUser,
    findUserByEmail,
    setUserOnline,
    setUserOffline,
    sendRequestFriend,
    acceptRequestFriend,
}