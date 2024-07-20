import  express from 'express'

const  UserRouter= express.Router()

// const { getUsersAPI, postCreateUserAPI,
//     putUpdateUserAPI, deleteUserAPI

// } = require('../controllers/apiController')

 UserRouter.get('/', (req, res) => {
    res.status(200).json({'message': 'get success'})
})  
 UserRouter.get('/status', (req, res) => {
    res.status(200).json({message: 'api are ready to use'})
})
 UserRouter.post('/register', (req, res) => {
    console.log(req.body)
    res.status(200).json({'message': 'register success nè'})
})
export  const UserRoute =  UserRouter