import  express from 'express'
import { StatusCodes } from 'http-status-codes'
import  {userValidate} from '../validations/userValidate'
import  {userController} from '../controllers/userController'
const  UserRouter= express.Router()



 UserRouter.get('/', (req, res) => {
    res.status(StatusCodes.OK).json({'message': 'get success user'})
})  
 UserRouter.get('/status', (req, res) => {
    res.status(StatusCodes.OK).json({message: 'api are ready to use'})
})
UserRouter.route('/register').post(userValidate.CreateNewUser, userController.CreateNewUser)
UserRouter.route('/findUserByEmail/:email').get(userValidate.findUserByEmail, userController.findUserByEmail)
UserRouter.route('/login').post(userValidate.LoginUser, userController.LoginUser)
UserRouter.route('/setUserOnline/:id').put(userValidate.setUserOnline, userController.setUserOnline)
UserRouter.route('/setUserOffline/:id').put(userValidate.setUserOffline, userController.setUserOffline)

export  const UserRoute =  UserRouter