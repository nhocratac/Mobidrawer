import  express from 'express'
import { StatusCodes } from 'http-status-codes'
import  {userValidate} from '../validations/userValidate'
import  {userController} from '../controllers/userControll'
const  UserRouter= express.Router()

// const { getUsersAPI, postCreateUserAPI,
//     putUpdateUserAPI, deleteUserAPI

// } = require('../controllers/apiController')

 UserRouter.get('/', (req, res) => {
    res.status(StatusCodes.OK).json({'message': 'get success user'})
})  
 UserRouter.get('/status', (req, res) => {
    res.status(StatusCodes.OK).json({message: 'api are ready to use'})
})
UserRouter.route('/register').post(userValidate.CreateNewUser, userController.CreateNewUser)
UserRouter.route('/findUserByEmail/:email').get(userValidate.findUserByEmail, userController.findUserByEmail)
//UserRouter.route('/login'.post(userValidate.LoginUser, userControll.LoginUser))
export  const UserRoute =  UserRouter