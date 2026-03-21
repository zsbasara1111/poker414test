const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { enqueue, dequeue } = require('../services/matchQueue');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // 从握手中验证 token
    const token = socket.handshake.auth?.token;
    if (!token) { socket.disconnect(); return; }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
    } catch {
      socket.disconnect(); return;
    }

    // 用户加入自己的私有频道（用于单独发手牌）
    socket.join(socket.userId);

    // 加入房间频道
    socket.on('room:join', async ({ roomCode }) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return socket.emit('error', { msg: '房间不存在' });
      socket.join(roomCode);
      io.to(roomCode).emit('room:update', { seats: room.seats, status: room.status });
    });

    // 准备就绪
    socket.on('room:ready', async ({ roomCode }) => {
      socket.to(roomCode).emit('room:player_ready', { userId: socket.userId });
    });

    // 快速匹配
    socket.on('match:join', async () => {
      const result = await enqueue(socket.userId, socket.id);
      if (!result) return;
      if (result.room) {
        result.players.forEach(p => {
          io.to(p.socketId).emit('match:found', { roomCode: result.room.roomCode });
        });
      } else {
        socket.emit('match:waiting', { position: result.position });
      }
    });

    socket.on('match:leave', () => dequeue(socket.userId));

    // 断线处理
    socket.on('disconnect', async () => {
      dequeue(socket.userId);
      console.log(`用户 ${socket.userId} 断线`);
      // 找到该玩家所在的进行中房间，60秒内保留座位
      const rooms = await Room.find({ seats: socket.userId, status: 'playing' });
      rooms.forEach(room => {
        setTimeout(async () => {
          // Socket.io v4：检查是否有同 userId 的新连接
          const stillOffline = ![...io.sockets.sockets.values()].some(s => s.userId === socket.userId);
          if (stillOffline) {
            console.log(`玩家 ${socket.userId} 断线超时，已移出房间 ${room.roomCode}`);
          }
        }, 60000);
      });
    });
  });
};
