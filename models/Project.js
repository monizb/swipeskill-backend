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
    size: {
      type: String,
      default: null,
      required: true,
      enum: ['individual', 'team']
    },
    skills: {
      type: Array,
      required: true,
      default: []
    },
    owner: {
      type: String,
      required: true
    }
  });


const Task = mongoose.model('Project', projectSchema);

module.exports = Task;