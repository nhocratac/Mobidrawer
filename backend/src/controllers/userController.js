import StatusCode from 'http-status-codes'
import ApiError from '../utils/ApiError'
import { userService } from '../services/userService'
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
        res.setHeader('Authorization', `Bearer ${accessToken}`)
        res.status(StatusCode.OK).json({ message: 'User logged in successfully', data: userData })
    } catch (error) {
        next(error)
    }
}
export const userController = { 
    CreateNewUser,
    findUserByEmail,
    findUserByID,
    LoginUser,
}