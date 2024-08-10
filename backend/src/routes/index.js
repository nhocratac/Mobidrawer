import  express from 'express'
import { UserRoute } from './userRoutes'
import { AuthRoute } from './authenticRoutes'
import requireToken from '~/middlewares/requireToken'

const routerAPI = express.Router()

routerAPI.all('*', requireToken)

routerAPI.get('/', (req, res) => {
    res.status(200).json({'message': 'get success'})
})  
routerAPI.get('/status', (req, res) => {
    res.status(200).json({message: 'api are ready to use'})
})
routerAPI.use('/user', UserRoute)
routerAPI.use('/auth', AuthRoute)
export  const APIs_V1 = routerAPI