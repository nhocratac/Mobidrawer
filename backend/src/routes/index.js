import  express, { Router } from 'express'

const routerAPI = express.Router()

// const { getUsersAPI, postCreateUserAPI,
//     putUpdateUserAPI, deleteUserAPI

// } = require('../controllers/apiController')

routerAPI.get('/', (req, res) => {
    res.status(200).json({'message': 'get success'})
})  
routerAPI.get('/status', (req, res) => {
    res.status(200).json({message: 'api are ready to use'})
})
routerAPI.get('/users', (req, res) => {
    res.status(200).json({'message': 'get users success'})
})
routerAPI.post('/login', (req, res) => {
    res.status(200).json({'message': 'login success'})
})
routerAPI.post('/register', (req, res) => {
    console.log(req.body)
    res.status(200).json({'message': 'register success nè'})
})
export  const APIs_V1 = routerAPI