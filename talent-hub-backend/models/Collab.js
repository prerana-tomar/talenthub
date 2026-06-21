const mongoose = require('mongoose');

const collabSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillNeeded: {
    type: String,
    required: true,
    enum: [
      'Singer',
      'Lyricist',
      'Composer',
      'Rapper',
      'Music Producer',
      'Poet',
      'Voice Artist',
      'Instrumentalist'
    ]
  },
  projectType: {
    type: String,
    required: true,
    enum: [
      'Song',
      'Album',
      'Jingle',
      'Podcast',
      'Short Film',
      'Stage Performance'
    ]
  },
  description: { type: String, required: true, maxlength: 1000 },
  budget: {
    type: String,
    required: true,
    enum: ['Free Collaboration', 'Paid']
  }
}, { timestamps: true });

module.exports = mongoose.model('Collab', collabSchema);
