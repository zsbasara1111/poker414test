const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// REST 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/room', require('./routes/room'));

// Socket 处理
require('./socket/roomSocket')(io);
require('./socket/gameSocket')(io);

// 连接数据库并启动服务器
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('MongoDB 连接成功');
    httpServer.listen(config.port, () => {
      console.log(`服务器运行在端口 ${config.port}`);
    });
  })
  .catch(err => {
    console.error('MongoDB 连接失败:', err);
    process.exit(1);
  });

module.exports = { app, io };
