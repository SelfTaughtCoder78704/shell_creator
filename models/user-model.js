const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    googleId: {
        type: String,
        unique: true
    },
    accessToken: {
        type: String,
        unique: true
    },
    refreshToken: {
        type: String,
        unique: true
    }

});

const User = mongoose.model('user', userSchema);

module.exports = User;