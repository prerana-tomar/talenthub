const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
}, { timestamps: true });

// One user can only like one video once
likeSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);