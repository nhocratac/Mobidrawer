import  express from 'express'
import { StatusCodes } from 'http-status-codes'
import * as userValidate from '../validations/userValidate'
import* as userControll from '../controllers/userControll'
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
UserRouter.route('/register').post(userValidate.CreateNewUser, userControll.CreateNewUser)
export  const UserRoute =  UserRouter