const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  openid:     { type: String, required: true, unique: true },
  nickname:   { type: String, default: '玩家' },
  avatar:     { type: String, default: '' },
  totalScore: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
