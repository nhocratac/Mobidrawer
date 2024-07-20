import  mongoose  from 'mongoose';

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
});

const User = mongoose.model('user', userSchema)

module.exports = User;
