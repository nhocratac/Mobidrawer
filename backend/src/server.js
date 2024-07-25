import express from 'express'
import cors from 'cors'
import exitHook from "async-exit-hook"

import { corsOptions } from '~/config/cors'
import { env } from '~/config/environment'
import { CONNECT_DB, CLOSE_DB } from '~/config/database'
import {APIs_V1} from '~/routes'
import errorHandling from './middlewares/errorHandling'

const app = express()
const port = env.APP_PORT
const host = env.APP_HOST
const START_SERVER = () => {
  app.use(cors(corsOptions))
  // enable use of req.body
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  // use APIs_V1 for all routes starting with /api
  app.use('/api', APIs_V1)

  // middleware to handle errors or finish requests
  app.use(errorHandling)

  // bật server
  app.listen(port, host, () => {
    console.log(`http://${host}:${port}`)
  })
  
  exitHook(() => {
    CLOSE_DB();
    console.log("Disconnected from server");
  })
}
(
  () => {
    CONNECT_DB()
      .then((demowebclient) => {
        if (demowebclient)
          console.log('Connect DB success')
      })
      .then(() => {
        START_SERVER()
      })
      .catch((err) => {
        console.log(err)
        process.exit(1)
      })
  }
)()