import { userModel } from '../models/';
import { StatusCodes } from 'http-status-codes';
import ApiError from '~/utils/ApiError';
import { webToken } from '../utils/webToken';
import { hashPassword, comparePassword } from '../utils/hashPassword'

const CreateNewUser = async (user) => {
    try {
        const checkuser = await userModel.findUserByEmail(user.email)
        if (checkuser) {
            throw new ApiError(StatusCodes.CONFLICT, 'User already exists')
        }
        user.password = await hashPassword(user.password)
        const newUser = await userModel.CreateNewUser(user)
        if (!newUser) {
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error in creating user')
        }
        return { newUser }
    } catch (error) {
        throw error
    }
}

const findUserByEmail = async (email) => {
    try {
        const user = await userModel.findUserByEmail(email)
        return user
    } catch (error) {
        throw error
    }
}

const findUserByID = async (id) => {
    try {
        return await userModel.findUserByID(id)
    } catch (error) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'error in findUserByID')
    }
}

const loginUser = async (email, password) => {
    try {
        const user = await userModel.findUserByEmail(email)
        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
        }
        const isMatch = await comparePassword(password, user.password)
        if (!isMatch) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password')
        }
        await userModel.setUserOnline(user._id)
        const { password: userPassword, ...userData } = user
        const accessToken = webToken.generateToken({ userData })
        return { accessToken, userData }
    } catch (error) {
        throw error
    }
}

const setUserOnline = async (id) => {
    try {
        return await userModel.setUserOnline(id)
    } catch (error) {
        throw error
    }
}

const setUserOffline = async (id) => {
    try {
        return await userModel.setUserOffline(id)
    } catch (error) {
        throw error
    }
}
const sendRequestFriend = async (id, idFriend) => {
    try {
        return await userModel.sendRequestFriend(id, idFriend)
    } catch (error) {
        throw error
    }
}

const acceptRequestFriend = async (id, idFriend) => {
    try {
        return await userModel.acceptRequestFriend(id, idFriend)
    } catch (error) {
        throw error
    }
}

const unFriend = async (id, idFriend) => {
    try {
        return await userModel.unFriend(id, idFriend)
    } catch ( error) {
        throw error
    }
}

const rejectRequestFriend = async (id, idFriend) => {
    try {
        return await userModel.rejectRequestFriend(id, idFriend)
    } catch (error) {
        throw error
    }
}
export const userService = {
    CreateNewUser,
    findUserByEmail,
    findUserByID,
    loginUser,
    setUserOnline,
    setUserOffline,
    sendRequestFriend,
    acceptRequestFriend,
    unFriend,
    rejectRequestFriend,
}