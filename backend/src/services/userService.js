import {userModel} from '../models/userModel';
const CreateNewUser = async (user) => {
    try {
        return await userModel.CreateNewUser(user)
    } catch (error) {
    }
}

const findUserByEmail = async (email) => {
    try {
        return await userModel.findUserByEmail(email)
    } catch (error) {
        throw new Error('error in findUserByEmail')
    }
}

const findUserByID = async (id) => {
    try {
        return await userModel.findUserByID(id)
    } catch (error) {
        throw new Error('error in findUserByEmail')
    }
}

export const userService= { CreateNewUser, findUserByEmail, findUserByID }