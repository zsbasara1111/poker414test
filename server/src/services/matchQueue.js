const Room = require('../models/Room');
const queue = []; // { userId, socketId }

async function enqueue(userId, socketId) {
  if (queue.find(u => u.userId === userId)) return null;
  queue.push({ userId, socketId });
  if (queue.length >= 6) {
    const players = queue.splice(0, 6);
    // 生成房间码
    let code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = await Room.create({
      roomCode: code,
      hostId: players[0].userId,
      seats: players.map(p => p.userId),
    });
    return { room, players };
  }
  return { position: queue.length };
}

function dequeue(userId) {
  const idx = queue.findIndex(u => u.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

module.exports = { enqueue, dequeue, getLength: () => queue.length };
