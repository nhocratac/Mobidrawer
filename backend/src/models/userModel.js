import Joi from 'joi'
import validator from '../utils/validator'
import { GET_DB } from '../config/database'
import { ObjectId } from 'mongodb'
import { notificationModel } from '.'

const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
    name: Joi.string().required().strict().max(50),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).max(50).trim().strict(),
    username: Joi.string().required().min(6).max(50).trim().strict(),
    role: Joi.string().required(),
    isVerifverificationTokenied: Joi.boolean().required(),
    avatar: Joi.string().uri().required(),
    friend: Joi.array().items(Joi.string().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE)).default([]),
    follower: Joi.array().items(Joi.string().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE)).default([]),
    following: Joi.array().items(Joi.string().pattern(validator.OBJECT_ID_RULE).message(validator.OBJECT_ID_RULE_MESSAGE)).default([]),
    createdAt: Joi.date().timestamp('javascript').default(Date.now()),
    updatedAt: Joi.date().timestamp('javascript').default(null),
    destroy: Joi.boolean().default(false),
    online: Joi.boolean().default(false)
})



const CreateNewUser = async (user_data) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        user_data.createdAt = new Date()
        const newUSer = await USER_COLLECTION.insertOne(user_data)
        return USER_COLLECTION.findOne({ _id: newUSer.insertedId })
    } catch (error) {
        throw new Error(error)
    }
}

const findUserByID = async (id) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        return USER_COLLECTION.findOne({ _id: id })
    } catch (error) {
        throw new Error(error)
    }
}

const findUserByEmail = async (emailUser) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        return USER_COLLECTION.findOne({ email: emailUser })
    } catch (error) {
        throw new Error(error)
    }
}

const setUserOnline = async (id) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        return USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { online: true } })
    } catch (error) {
        throw new Error(error)
    }
}

const setUserOffline = async (id) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        return USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { online: false } })
    } catch (error) {
        throw new Error(error)
    }
}

const sendRequestFriend = async (id, idFriend) => {
    const db = GET_DB()
    const USER_COLLECTION = db.collection(USER_COLLECTION_NAME)
    const session = db.client.startSession()
    try {
        session.startTransaction()
        const [user, friend] = await Promise.all([
            USER_COLLECTION.findOne({ _id: new ObjectId(id) }, {
                $or: [{
                    friend: { $in: [idFriend] },
                    follower: { $in: [idFriend] },
                    following: { $in: [idFriend] }
                }]
            },{ session , returnDocument: 'after' }),
            USER_COLLECTION.findOne({ _id: new ObjectId(idFriend) }, {
                $or: [{
                    friend: { $in: [id] },
                    follower: { $in: [id] },
                    following: { $in: [id] }
                }]
            }, { session , returnDocument: 'after' }),
        ])
        if (!user) {
            throw new Error('You are already following this user.')
        }
        if (!friend) {
            throw new Error('This user is already your follower.')
        }
        // Check if the follow relationship already exists
        const updateMe = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(id) }, { $push: { following: idFriend } }, { session })
        const updateFriend = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(idFriend) }, { $push: { follower: id } }, { session })

        const [Me, Friend] = await Promise.all([updateMe, updateFriend])
        if (!Me || !Friend) {
            throw new Error('User not found or already friends.')
        }
        const noti = await notificationModel.CreateNewNotification({
            sender: id,
            receiver: idFriend,
            type: notificationModel.TYPE_NOTIFICATION.friend,
            content: `${user.name} send you a friend request.`
        })
        if (!noti)
            throw new Error('Error in create notification')
        await session.commitTransaction()
        return Me
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}

const acceptRequestFriend = async (id, idFriend) => { // đồng ý kết bạn người khác
    const db = GET_DB()
    const USER_COLLECTION = db.collection(USER_COLLECTION_NAME)
    const session = db.client.startSession()
    try {
        session.startTransaction()
        const [user, friend] = await Promise.all([
            USER_COLLECTION.findOne({
                _id: new ObjectId(id),
                $and: [
                    { friend: { $ne: idFriend } },
                    { follower: { $in: [idFriend] } },
                    { following: { $ne: idFriend } }
                ]
            }),
            USER_COLLECTION.findOne({
                _id: new ObjectId(idFriend),
                $and: [
                    { friend: { $ne: id } },
                    { follower: { $ne: id } },
                    { following: { $in: [id] } }
                ]
            })
        ])

        // Check if users are already friends or the friend request status
        if (!user) {
            throw new Error('User not found, already friends, or no friend request found.')
        }
        if (!friend) {
            throw new Error('Friend not found, already friends, or no friend request found.')
        }

        const updateMe = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(id) }, { $push: { friend: idFriend, following: idFriend }, $pull: { follower: idFriend } }, { session, returnDocument: 'after' })
        const updateFriend = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(idFriend) }, { $push: { friend: id } }, { session, returnDocument: 'after' })
        const [newMe, newFriend] = await Promise.all([updateMe, updateFriend])
        if (!newMe || !newFriend) {
            throw new Error('User not found or already friends.')
        }
        await session.commitTransaction()
        const noti = await notificationModel.CreateNewNotification({
            sender: id,
            receiver: idFriend,
            type: notificationModel.TYPE_NOTIFICATION.friend,
            content: `${user.name} accepted your friend request.`
        })
        if (!noti) {
            return true
        }
        return noti
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}
const rejectRequestFriend = async (id, idFriend) => { // từ chối kết bạn của một người
    const db = GET_DB()
    const USER_COLLECTION = db.collection(USER_COLLECTION_NAME)
    const session = db.client.startSession()
    try {
        session.startTransaction()
        const [user, friend] = await Promise.all([
            USER_COLLECTION.findOne({
                _id: new ObjectId(id),
                $and: [
                    { friend: { $ne: idFriend } },
                    { follower: { $in: [idFriend] } },
                    { following: { $ne: idFriend } }
                ]
            }),
            USER_COLLECTION.findOne({
                _id: new ObjectId(idFriend),
                $and: [
                    { friend: { $ne: id } },
                    { follower: { $ne: id } },
                    { following: { $in: [id] } }
                ]
            })
        ])
        if (!user) {
            throw new Error('You are already following this user.')
        }
        if (!friend) {
            throw new Error('This user is already your follower.')
        }
        const updateMe = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(id) }, { $pull: { follower: idFriend } }, { session ,returnDocument: 'after' })
        const updateFriend = USER_COLLECTION.findOneAndUpdate({ _id: new ObjectId(idFriend) }, { $pull: { following: id } }, { session, returnDocument: 'after' })
        await Promise.all([updateMe, updateFriend])
        await session.commitTransaction()
        return true
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}

const unFriend = async (id, idFriend) => { // hủy kết bạn
    const db = GET_DB()
    const USER_COLLECTION = db.collection(USER_COLLECTION_NAME)
    const session = db.client.startSession()
    try {
        session.startTransaction()
        // kiem tra phải là bạn mới unfriend đc ( chỉ cần là bạn)
        const [me, friend] = await Promise.all([
            USER_COLLECTION.findOne({
                _id: new ObjectId(id),
                $and: [
                    { friend: { $in: [idFriend] } },
                ]
            }),
            USER_COLLECTION.findOne({
                _id: new ObjectId(idFriend),
                $and: [
                    { friend: { $in: [id] } },
                ]
            })
        ])
        if (!me) {
            throw new Error('You are not friend with this user.')
        }
        if (!friend) {
            throw new Error('This user is not your friend.')
        }
        const [newMe, newFriend] = await Promise.all([
            USER_COLLECTION.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $pull: { friend: idFriend, following: idFriend } },
                { session, returnDocument: 'after' }
            ),
            USER_COLLECTION.findOneAndUpdate(
                { _id: new ObjectId(idFriend) },
                { $pull: { friend: id, following: id } },
                { session, returnDocument: 'after' }
            ),
        ])
        if (!newMe || !newFriend) {
            throw new Error('User not found or not friends or can process unfriend.')
        }
         await session.commitTransaction()
        session.endSession()
        return newMe
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        throw error
    }
}


const userModel = {
    CreateNewUser,
    findUserByEmail,
    findUserByID,
    setUserOnline,
    setUserOffline,
    sendRequestFriend,
    acceptRequestFriend,
    rejectRequestFriend,
    unFriend,
    USER_COLLECTION_SCHEMA,
    USER_COLLECTION_NAME
}

export default userModel
