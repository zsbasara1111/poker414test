const mongoose = require('mongoose');
const gameSchema = new mongoose.Schema({
  roomId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomCode:       String,
  hands:          { type: Map, of: [Object] },  // {userId: [{rank,suit,id},...]}
  tableCards:     [Object],
  lastPlay:       { type: Object, default: null }, // {userId, cards, analysis}
  currentTurn:    String,
  passCount:      { type: Number, default: 0 },
  scoreA:         { type: Number, default: 0 },
  scoreB:         { type: Number, default: 0 },
  roundScores:    [Object],
  readyForNext:   [String],
  firstFinishTeam:{ type: String, default: null },
  borrowLight:    { type: Object, default: null },
  status:         { type: String, default: 'playing' },
  winner:         String,
}, { timestamps: true });
module.exports = mongoose.model('Game', gameSchema);
