import Joi from 'joi'
import validator from '../utils/validator'
import { GET_DB } from '../config/database'
import { ObjectId } from 'mongodb'

const TYPE_NOTIFICATION = {
    friend : 'friend',
    follow : 'follow',
    message : 'message',
    post : 'post',
    comment : 'comment',
    like : 'like',
    share : 'share',
    report : 'report',
    system: 'system'
}

const NOTIFICATION_COLLECTION_NAME = 'notifications'
const NOTIFICATION_COLLECTION_SCHEMA = Joi.object({
    sender: Joi.string().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE).required(),
    receiver: Joi.string().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE).required(),
    type: Joi.string().required(),
    content: Joi.string().required(),
    read: Joi.boolean().default(false), // read = false => unread
    createdAt: Joi.date().timestamp('javascript').default(Date.now())
})

const CreateNewNotification = async (notification_data) => {
    try {
        notification_data = await NOTIFICATION_COLLECTION_SCHEMA.validateAsync(notification_data)
        const NOTIFICATION_COLLECTION = GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
        const newNotification = await NOTIFICATION_COLLECTION.insertOne({
            ...notification_data,
            createdAt: new Date()
        })
        return newNotification
    } catch (error) {
        throw new Error(error)
    }
}

const findNotificationByID = async (id) => {
    try {
        const NOTIFICATION_COLLECTION = GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
        return await NOTIFICATION_COLLECTION.findOne({_id: new ObjectId(id)})
    } catch (error) {
    }
}

const getNotificationByReceiver = async (receiver) => {
    try {
        const NOTIFICATION_COLLECTION = GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
        return await NOTIFICATION_COLLECTION.find({receiver: new ObjectId(receiver)}).toArray()
    } catch (error) {
        throw new Error(error)
    }
}



const notificationsModel = {
    NOTIFICATION_COLLECTION_NAME,
    NOTIFICATION_COLLECTION_SCHEMA,
    TYPE_NOTIFICATION,
    CreateNewNotification,
    findNotificationByID,
    getNotificationByReceiver,
}

export default notificationsModel