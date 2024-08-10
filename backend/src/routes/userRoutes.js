import  express from 'express'
import { StatusCodes } from 'http-status-codes'
import  {userValidate} from '../validations/userValidate'
import  userController from '../controllers/userController'
import uploadImage from '../utils/uploadImg'
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
UserRouter.route('/sendRequestFriend').put(userValidate.sendRequestFriend, userController.sendRequestFriend)
UserRouter.route('/acceptRequestFriend').put(userValidate.acceptRequestFriend, userController.acceptRequestFriend)
UserRouter.route('/unFriend').put(userValidate.unFriend, userController.unFriend)
UserRouter.route('/rejectRequestFriend').put(userValidate.rejectRequestFriend, userController.rejectRequestFriend)
UserRouter.route('/uploadAvatar').post(uploadImage.uploadAvatar,userValidate.uploadAvatar  ,userController.uploadAvatar)



export  const UserRoute =  UserRouter