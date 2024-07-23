import  mongoose  from 'mongoose';
import Joi from 'joi';
import { OBJECT_ID_RULE,OBJECT_ID_RULE_MESSAGE } from '~/utils/validator';
import {GET_DB} from '~/config/database';

const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
    name: Joi.string().required().strict().max(50),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).max(50).trim().strict(),
    username: Joi.string().required().min(6).max(50).trim().strict(),
    // role: Joi.string().required(),
    // isVerified: Joi.boolean().required(),
    // verificationToken: Joi.string().required(),
    // passwordResetToken: Joi.string().required(),
    // passwordResetExpires: Joi.date().required(),
    avatar: Joi.string().uri().required(),
    friend: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),
    createdAt: Joi.date().timestamp('javascript').default(Date.now()),
    updatedAt: Joi.date().timestamp('javascript').default(null),
    destroy: Joi.boolean().default(false)
})



const CreateNewUser = async (user_data) => {
    try {
        const USER_COLLECTION = GET_DB().collection(USER_COLLECTION_NAME)
        const newUSer = await  USER_COLLECTION.insertOne(user_data)
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

export const userModel = {
    CreateNewUser,
    findUserByEmail,
    findUserByID,
    USER_COLLECTION_SCHEMA,
    USER_COLLECTION_NAME
}