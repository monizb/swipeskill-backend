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
    },
    budget: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["open", "closed", "in-progress"],
      default: "open",
    },
    assignedTo: {
      type: String,
      default: null,
    },
    activity: {
      type: Array,
      default: [],
    },
    shortListed: {
      type: Array,
      default: [],
    },
  });


const Task = mongoose.model('Project', projectSchema);

module.exports = Task;