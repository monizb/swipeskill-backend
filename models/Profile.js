const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: null,
    },
  });

const profileSchema = new mongoose.Schema({
    skills: {
        type: Array,
        required: true,
        default: []
    },
    oneLiner: {
        type: String,
        required: true
    },
    projects: {
        type: [projectSchema],
        default: undefined,
    },
    uid: {
        type: String,
        required: true
    },
}, { timestamps: true });


const Task = mongoose.model('Profile', profileSchema);

module.exports = Task;