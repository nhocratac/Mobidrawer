import  express from 'express'
import  userValidate from '../validations/userValidate'
import  userController from '../controllers/userController'
import  authenticController  from '../controllers/authenticController'
import { refreshToken } from '../middlewares/requireToken'
const  AuthRouter= express.Router()
AuthRouter.route('/register').post(userValidate.CreateNewUser, userController.CreateNewUser)
AuthRouter.route('/login').post(userValidate.LoginUser, userController.LoginUser)
AuthRouter.route('/refreshToken').post(refreshToken,authenticController.refreshToken)
AuthRouter.route('/logout').post(userValidate.logout,authenticController.logout)

export  const AuthRoute =  AuthRouter
