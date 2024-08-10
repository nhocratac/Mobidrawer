import Joi from 'joi'
import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'
import validator from '../utils/validator'

const  CreateNewUser = async (req, res, next) => {
    const correctCondition=  Joi.object({
        email: Joi.string().email().required().strict(),
        password: Joi.string().required(),
        name: Joi.string().required(),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch (error) {
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

const logout = async (req, res, next) => {
    const decodeToken = req.decodeToken
    try {
        if (decodeToken.userData._id !== req.body._id) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'You are not authorized to perform this action')
        }
    } catch (error) {
      next(error)  
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
    console.log('say hello set offline')
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
    if( decodeToken.userData._id === req.body.friendId || decodeToken.userData._id !== req.body._id) {
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
    if( decodeToken.userData?._id !== req.body._id || decodeToken.userData?._id === req.body.friendId){
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
const unFriend = async (req, res, next) => {
    const decodeToken = req.decodeToken
    if(decodeToken.userData._id === req.body.friendId || decodeToken.userData._id !== req.body._id) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, 'You cannot unfriend yourself'))
    }
    const correctCondition = Joi.object({
        _id: Joi.string().required().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE),
        friendId: Joi.string().required().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch(err) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}


const  rejectRequestFriend = async (req, res, next) => {
    const decodeToken = req.decodeToken
    if(decodeToken.userData._id === req.body.friendId || decodeToken.userData._id !== req.body._id) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, 'You cannot reject yourself'))
    }
    const correctCondition = Joi.object({
        _id: Joi.string().required().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE),
        friendId: Joi.string().required().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch(err) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}

const uploadAvatar = async (req, res, next) => {
    const decodeToken = req.decodeToken
    if(decodeToken.userData._id !== req.body._id) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, 'You cannot upload avatar for another user'))
    }
    const correctCondition = Joi.object({
        _id: Joi.string().required().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE),
    })
    try {
        await correctCondition.validateAsync(req.body)
        next()
    } catch(err) {
        return next(new ApiError(StatusCode.UNPROCESSABLE_ENTITY, error.message))
    }
}

 const userValidate = 
{
    CreateNewUser,
    LoginUser,
    findUserByEmail,
    setUserOnline,
    setUserOffline,
    sendRequestFriend,
    acceptRequestFriend,
    unFriend,
    rejectRequestFriend,
    uploadAvatar,
}

export default userValidate