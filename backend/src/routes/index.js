import  express from 'express'

const routerAPI = express.Router()

// const { getUsersAPI, postCreateUserAPI,
//     putUpdateUserAPI, deleteUserAPI

// } = require('../controllers/apiController')

routerAPI.get('/users', (req, res) => {
    res.status(200).json({'message': 'get users success'})
})
routerAPI.post('/login', (req, res) => {
    res.status(200).json({'message': 'login success'})
})

module.exports = routerAPI //export default