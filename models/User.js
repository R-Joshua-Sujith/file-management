// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    loggedInDevice: [{
        deviceID: { type: String },
        date: { type: Date, default: Date.now }
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
