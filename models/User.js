const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    company: {
        type: String,
        default: null
    },
    role: {
        type: String,
        required: true,
        enum: ['freelancer', 'client']
    },
    uid: {
        type: String,
        required: true
    },
}, { timestamps: true });


const Task = mongoose.model('User', userSchema);

module.exports = Task;