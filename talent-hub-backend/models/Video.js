const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, maxlength: 300 },
}, { timestamps: true });

const videoSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  category: { type: String, default: 'Other' },
  filename: { type: String, required: true },
  url:      { type: String, required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Array of user IDs who liked — prevents double liking
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Views count — increments each time video is watched
  views: { type: Number, default: 0 },

  comments: [commentSchema],
  thumbnailUrl: { type: String, default: null },
  thumbnailFilename: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);