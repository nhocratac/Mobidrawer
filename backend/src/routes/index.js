import  express from 'express'
import { UserRoute } from './userRoutes'

const routerAPI = express.Router()

routerAPI.get('/', (req, res) => {
    res.status(200).json({'message': 'get success'})
})  
routerAPI.get('/status', (req, res) => {
    res.status(200).json({message: 'api are ready to use'})
})
routerAPI.use('/user', UserRoute)
export  const APIs_V1 = routerAPI