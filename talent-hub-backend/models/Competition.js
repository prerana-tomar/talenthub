const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  category:        { type: String, required: true,
    enum: ['Singing','Dance','Rap','Comedy','Acting','Instrumental','Poetry','Other'] },
  description:     { type: String, required: true },
  prize:           { type: String, required: true },
  prizeAmount:     { type: Number, default: 0 },
  maxParticipants: { type: Number, default: 100 },
  participants:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status:          { type: String, enum: ['active','upcoming','ended'], default: 'upcoming' },
  difficulty:      { type: String, enum: ['Beginner','Intermediate','Advanced','Open'], default: 'Open' },
  deadline:        { type: Date, required: true },
  startDate:       { type: Date, required: true },
  icon:            { type: String, default: '🏆' },
  color:           { type: String, default: '#7c3aed' },
  gradient:        { type: String, default: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  tags:            [String],
  rules:           [String],
  winners: [{
    rank:   Number,
    name:   String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prize:  String,
    avatar: String,
  }],
}, { timestamps: true });

// Virtual for participant count
competitionSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

competitionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Competition', competitionSchema);