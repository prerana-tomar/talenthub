const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // User.js mein schema mein add karo:


  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  bio:      { type: String, default: '' },
  category: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  

  // Saved content
  savedVideos:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  savedPerformers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Following / Followers
  following:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  googleId:     { type: String, default: null },
  isGoogleUser: { type: Boolean, default: false }, 
 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);