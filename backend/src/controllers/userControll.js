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

export { CreateNewUser }