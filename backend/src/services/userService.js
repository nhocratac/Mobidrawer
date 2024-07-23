import {GET_DB} from '~/config/database';
import {userModel} from '../models/userModel';
const CreateNewUser = async (user) => {
    try {
        return await userModel.CreateNewUser(user)
    } catch (error) {
    }
}

export const userService= { CreateNewUser }