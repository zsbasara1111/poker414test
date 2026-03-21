const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
  roomCode:   { type: String, required: true, unique: true },
  status:     { type: String, enum: ['waiting','playing','finished'], default: 'waiting' },
  // seats[0,2,4] = A队; seats[1,3,5] = B队; 值为 userId / null / "bot"
  seats:      { type: [String], default: [null,null,null,null,null,null] },
  hostId:     { type: String, required: true },
  isMatching: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Room', roomSchema);
