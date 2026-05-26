const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation participants (sorted to make unique key)
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

  // Individual message
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true },
  read:      { type: Boolean, default: false },
  readAt:    { type: Date },

}, { timestamps: true });

// Index for fast conversation lookup
messageSchema.index({ participants: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('Message', messageSchema);