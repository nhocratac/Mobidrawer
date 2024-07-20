import  {env} from '~/config/environment'
import  {MongoClient,ServerApiVersion} from 'mongodb'
let demowebclient = null
const mongoClienInstance = new MongoClient(env.MONGODB_URI, {
    serverApi: ServerApiVersion.v1,
    // strict: true,
    // deprecationErrors: true,
}) 

export const CONNECT_DB = async () => {
    try{
            await mongoClienInstance.connect()
              return demowebclient = mongoClienInstance.db(env.DATABASE_NAME)
    } catch {
        throw new Error('Connect DB fail')
    }
}

export  const  GET_DB =  () => {
    if (demowebclient)
        return demowebclient
    throw new Error('DB not connected, must connect first')
}

export const CLOSE_DB = async () => {
    await mongoClienInstance.close()
}