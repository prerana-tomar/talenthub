// models/Thought.js — apne existing model mein sirf yeh fields add karo
// (Agar already hai toh skip karo)

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, maxlength: 300 },
}, { timestamps: true });

const thoughtSchema = new mongoose.Schema({
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, maxlength: 500, default: '' },
  category: { type: String, default: 'General',
               enum: ['General','Music','Dance','Poetry','Comedy','Art'] },

  // ✅ YAHI ADD KARO — multiple images support
  images:   [{ type: String }],           // array of URL strings
  image:    { type: String, default: null }, // legacy single image

  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Thought', thoughtSchema);