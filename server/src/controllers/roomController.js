const Room = require('../models/Room');

// 生成随机6位房间码
function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 创建房间
exports.createRoom = async (req, res) => {
  try {
    let code, exists;
    do {
      code = genCode();
      exists = await Room.findOne({ roomCode: code });
    } while (exists);

    const room = await Room.create({
      roomCode: code,
      hostId: req.userId,
      seats: [req.userId, null, null, null, null, null],
    });
    res.json({ roomCode: room.roomCode, seats: room.seats });
  } catch (err) {
    res.status(500).json({ error: '创建房间失败' });
  }
};

// 加入房间
exports.joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;
    const room = await Room.findOne({ roomCode, status: 'waiting' });
    if (!room) return res.status(404).json({ error: '房间不存在或已开始' });

    // 检查是否已在房间
    if (room.seats.includes(req.userId)) return res.status(400).json({ error: '已在此房间' });

    // 找第一个空位
    const idx = room.seats.findIndex(s => s === null);
    if (idx === -1) return res.status(400).json({ error: '房间已满' });

    room.seats[idx] = req.userId;
    await room.save();
    res.json({ roomCode: room.roomCode, seats: room.seats, seatIndex: idx });
  } catch (err) {
    res.status(500).json({ error: '加入房间失败' });
  }
};

// 获取房间信息
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: '房间不存在' });
    res.json({ roomCode: room.roomCode, seats: room.seats, status: room.status, hostId: room.hostId });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
};

// 添加机器人
exports.addBot = async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.code, hostId: req.userId });
    if (!room) return res.status(403).json({ error: '无权限或房间不存在' });
    const idx = room.seats.findIndex(s => s === null);
    if (idx === -1) return res.status(400).json({ error: '房间已满' });
    room.seats[idx] = 'bot';
    await room.save();
    res.json({ seats: room.seats });
  } catch (err) {
    res.status(500).json({ error: '添加机器人失败' });
  }
};
