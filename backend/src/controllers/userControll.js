import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'
import { userService } from '../services/userService'

const CreateNewUser = async (req, res,next) => {
    try {
        const user = req.body
        const newUser = await userService.CreateNewUser(user)
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
export const userController = { 
    CreateNewUser,
    findUserByEmail,
    findUserByID,
}