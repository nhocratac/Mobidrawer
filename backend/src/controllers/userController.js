import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'
import { userService } from '../services/userService'
import { object } from 'joi'
const CreateNewUser = async (req, res,next) => {
    try {
        const {newUser} = await userService.CreateNewUser(req.body)
        if (!newUser) {
            throw new ApiError(StatusCode.INTERNAL_SERVER_ERROR, 'Failed to create new user')
        }
        res.status(StatusCode.CREATED).json({ message: 'User created successfully', data: newUser })
    } catch (error) {
        next(error)
    }
}

const findUserByEmail = async (req, res,next) => {
    try {
        const email = req.params.email
        const user = await userService.findUserByEmail(email)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'User found', data: user })
    } catch (error) {
        next(error)
    }
}

const findUserByID = async (req, res,next) => {
    try {
        const id = req.params.id
        const user = await userService.findUserByID(id)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'User found', data: user })
    }
    catch (error) {
        next(error)
    }
}

const LoginUser = async (req, res, next ) => {
    const {email , password} = req.body
    try{
        const  {userData,accessToken} = await userService.loginUser(email, password)
        if (!userData) {
            throw new ApiError(StatusCode.UNAUTHORIZED, 'Invalid email or password')
        }
        res.status(StatusCode.OK).json({ message: 'User logged in successfully', data: userData , accessToken})
    } catch (error) {
        next(error)
    }
}

const setUserOnline = async (req, res, next) => {
    const id = req.params.id
    try {
        const user = await userService.setUserOnline(id)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'User is online' })
    } catch (error) {
        next(error)
    }
}

const setUserOffline = async (req, res, next) => {
    const id = req.params.id
    try {
        const user = await userService.setUserOffline(id)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'User is offline' })
    } catch (error) {
        next(error)
    }
}

const sendRequestFriend = async (req, res, next) => {
    const {_id, friendId} = req.body
    try{
        const user = await userService.sendRequestFriend(_id, friendId)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'Request sent successfully' })

    } catch (error) {
        next(error)
    }
}

const  acceptRequestFriend = async (req, res, next) => {
    const {_id, friendId} = req.body
    try{
        const user = await userService.acceptRequestFriend(_id, friendId)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'Request accepted successfully' })

    } catch (error) {
        next(error)
    }

}

const unFriend = async (req,res, next )  => {
    try {
        const {_id , friendId} = req.body
        const user = await userService.unFriend(_id, friendId)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'Unfriend successfully' })
    } catch (error) {
        next(error)    
    }
}

const rejectRequestFriend = async(req, res, next ) => {
    try {
        const {_id, friendId} = req.body
        const user = await userService.rejectRequestFriend(_id, friendId)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'Request rejected successfully'}) 
        
    } catch (error) {
        next(error)
    }

}

const  uploadAvatar = async (req, res, next) => { 
    try {
        const {_id } = req.body
        const user = await userService.uploadAvatar(_id, req.file.path)
        if (!user) {
            throw new ApiError(StatusCode.NOT_FOUND, 'User not found')
        }
        res.status(StatusCode.OK).json({ message: 'Avatar uploaded successfully', data: user })
    } catch (error) {
        next(error)
    }
}

export const userController = { 
    CreateNewUser,
    findUserByEmail,
    findUserByID,
    LoginUser,
    setUserOnline,
    setUserOffline,
    sendRequestFriend,
    acceptRequestFriend,
    unFriend,
    rejectRequestFriend,
    uploadAvatar,
}