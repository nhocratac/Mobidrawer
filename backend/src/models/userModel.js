import  mongoose  from 'mongoose';
import Joi from 'joi';
import { OBJECT_ID_RULE,OBJECT_ID_RULE_MESSAGE } from '~/utils/validator';

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

export const userModel = {
    USER_COLLECTION_SCHEMA,
    USER_COLLECTION_NAME
}