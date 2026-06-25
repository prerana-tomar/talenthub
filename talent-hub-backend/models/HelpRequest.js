const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  writing: { 
    type: String, 
    required: true 
  },
  context: { 
    type: String, 
    default: '' 
  },
  type: { 
    type: String, 
    required: true 
  },
  language: { 
    type: String, 
    required: true 
  },
  mood: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'resolved'], 
    default: 'pending' 
  },
  response: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
