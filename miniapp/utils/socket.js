// 注意：部署前需要在微信开发者工具中执行"构建 npm"
// 在 miniapp 目录下先运行：npm init -y && npm install socket.io-client@4
const { io } = require('socket.io-client');

// 填入你的后端域名
const BASE_WS = 'https://api.你的域名.com';

let socket = null;

function connect(token) {
  if (socket && socket.connected) return socket;
  socket = io(BASE_WS, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: 10,
  });
  socket.on('connect', () => console.log('Socket 已连接'));
  socket.on('disconnect', () => console.log('Socket 断线，自动重连中...'));
  socket.on('connect_error', (e) => console.error('Socket 连接错误:', e.message));
  return socket;
}

function getSocket() {
  return socket;
}

module.exports = { connect, getSocket };
