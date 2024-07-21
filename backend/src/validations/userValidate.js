import Joi from 'joi'
import StatusCode from 'http-status-codes'


const  CreateNewUser = async (req, res, next) => {
    const correctCondition=  Joi.object({
        username: Joi.string().required().min(6).max(50).trim().strict().messages({
            'string.base': 'Username should be a type of text',
            'string.empty': 'Username cannot be an empty field',
            'string.min': 'Username should have a minimum length of 6',
            'string.max': 'Username should have a maximum length of 50',
            'any.required': 'Username is a required field'
            }),
        email: Joi.string().email().required().strict(),
        password: Joi.string().required(),
        name: Joi.string().required(),
    })
    try {
        const a = await correctCondition.validateAsync(req.body)
        //next()
        res.status(StatusCode.CREATED).json({ message: 'Create new user success'})
        
    } catch (error) {
        console.log(error)
        res.status(StatusCode.UNPROCESSABLE_ENTITY).json({ error: new Error(error).message})
    }
}

export { CreateNewUser }