# 东北刨幺414 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建东北刨幺414微信小程序，包含6人3v3联机对战、完整游戏规则、AI机器人补位、横屏UI。

**Architecture:** 阿里云轻量服务器运行 Node.js + Socket.io 后端处理实时对战逻辑；微信原生小程序作为前端；MongoDB 持久化用户和房间数据。游戏规则校验全部在服务端执行，防止作弊。

**Tech Stack:** 微信小程序（WXML/WXSS/JS）、Node.js 18、Express 4、Socket.io 4、MongoDB 6（Mongoose）、PM2、Nginx、Let's Encrypt

**Spec:** `docs/superpowers/specs/2026-03-21-poker414-design.md`

---

## 阶段一：环境搭建

### Task 1：注册账号与安装开发工具

**Files:** 无（纯配置操作）

- [ ] **Step 1：注册微信小程序开发者账号**

  访问 https://mp.weixin.qq.com → 点击"立即注册" → 选择"小程序" → 填写邮箱注册
  注册完成后记录 **AppID**（在"开发 → 开发管理 → 开发设置"中查看）

- [ ] **Step 2：下载安装微信开发者工具**

  访问 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
  下载 Windows 稳定版，安装后用微信扫码登录

- [ ] **Step 3：安装 Node.js**

  访问 https://nodejs.org → 下载 LTS 版本（18.x）→ 安装
  验证安装：
  ```bash
  node -v   # 应输出 v18.x.x
  npm -v    # 应输出 9.x.x 或更高
  ```

- [ ] **Step 4：安装 VS Code（代码编辑器）**

  访问 https://code.visualstudio.com → 下载并安装
  安装插件：Chinese Language Pack、ESLint

- [ ] **Step 5：安装 Git**

  访问 https://git-scm.com → 下载安装
  ```bash
  git --version   # 应输出 git version 2.x.x
  ```

- [ ] **Step 6：初始化项目 Git 仓库**

  ```bash
  cd "h:/Claude Code/poker414"
  git init
  git add .
  git commit -m "chore: 项目初始化"
  ```

---

### Task 2：阿里云服务器配置

**Files:** 无（服务器操作）

- [ ] **Step 1：购买阿里云轻量应用服务器**

  访问 https://www.aliyun.com/product/swas
  推荐配置：2核2GB内存、40GB SSD、3Mbps带宽、Ubuntu 22.04
  购买后记录服务器**公网IP地址**

- [ ] **Step 2：连接服务器（Windows 使用 PowerShell）**

  ```bash
  ssh root@你的服务器IP
  # 输入购买时设置的密码
  ```

- [ ] **Step 3：更新系统并安装基础软件**

  ```bash
  apt update && apt upgrade -y
  apt install -y curl wget git vim ufw
  ```

- [ ] **Step 4：安装 Node.js 18**

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  node -v   # 应输出 v18.x.x
  ```

- [ ] **Step 5：安装 MongoDB 6**

  ```bash
  curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
  apt update && apt install -y mongodb-org
  systemctl start mongod
  systemctl enable mongod
  mongod --version   # 应输出 db version v6.x.x
  ```

- [ ] **Step 6：安装 PM2 和 Nginx**

  ```bash
  npm install -g pm2
  apt install -y nginx
  systemctl start nginx
  systemctl enable nginx
  ```

- [ ] **Step 7：配置防火墙**

  ```bash
  ufw allow ssh
  ufw allow 80
  ufw allow 443
  ufw allow 3000   # Node.js 临时开发端口
  ufw enable
  ufw status
  ```

---

### Task 3：域名与 HTTPS 配置

**Files:** `/etc/nginx/sites-available/poker414`

> 微信小程序强制要求后端使用 HTTPS，必须完成此步骤才能上线。

- [ ] **Step 1：购买域名**

  在阿里云控制台购买一个域名（如 `poker414.com`），完成实名认证
  在域名解析中添加 A 记录：`@` → 你的服务器IP，`api` → 你的服务器IP

- [ ] **Step 2：安装 Certbot 申请 HTTPS 证书**

  ```bash
  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d api.你的域名.com
  # 按提示输入邮箱，同意条款，选择自动重定向
  ```

- [ ] **Step 3：配置 Nginx 反向代理**

  ```bash
  cat > /etc/nginx/sites-available/poker414 << 'EOF'
  server {
      listen 443 ssl;
      server_name api.你的域名.com;

      ssl_certificate /etc/letsencrypt/live/api.你的域名.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/api.你的域名.com/privkey.pem;

      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }
  }
  EOF
  ln -s /etc/nginx/sites-available/poker414 /etc/nginx/sites-enabled/
  nginx -t   # 检查配置无误
  systemctl reload nginx
  ```

- [ ] **Step 4：在微信后台配置服务器域名**

  登录 https://mp.weixin.qq.com → 开发 → 开发管理 → 开发设置 → 服务器域名
  添加：`request合法域名` 和 `socket合法域名` 均填写 `https://api.你的域名.com`

- [ ] **Step 5：提交 git**

  ```bash
  git add .
  git commit -m "chore: 服务器与域名配置完成"
  ```

---

## 阶段二：后端基础框架

### Task 4：初始化后端项目

**Files:**
- 创建：`server/package.json`
- 创建：`server/src/index.js`
- 创建：`server/src/config.js`
- 创建：`server/.env`
- 创建：`server/.env.example`

- [ ] **Step 1：创建后端目录结构**

  ```bash
  cd "h:/Claude Code/poker414"
  mkdir -p server/src/{routes,models,controllers,services,socket,middleware}
  cd server
  npm init -y
  ```

- [ ] **Step 2：安装后端依赖**

  ```bash
  npm install express mongoose socket.io jsonwebtoken axios dotenv cors
  npm install --save-dev nodemon jest supertest
  ```

- [ ] **Step 3：创建 `server/.env`（本地开发用，不提交 git）**

  ```
  PORT=3000
  MONGODB_URI=mongodb://localhost:27017/poker414
  JWT_SECRET=你自己随便输入一串复杂字符串
  WX_APPID=你的微信小程序AppID
  WX_SECRET=你的微信小程序AppSecret
  ```

- [ ] **Step 4：创建 `server/.env.example`（提交 git，供参考）**

  ```
  PORT=3000
  MONGODB_URI=mongodb://localhost:27017/poker414
  JWT_SECRET=your_jwt_secret_here
  WX_APPID=your_wx_appid
  WX_SECRET=your_wx_secret
  ```

- [ ] **Step 5：创建 `server/src/config.js`**

  ```js
  require('dotenv').config();
  module.exports = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    wx: {
      appid: process.env.WX_APPID,
      secret: process.env.WX_SECRET,
    },
  };
  ```

- [ ] **Step 6：创建 `server/src/index.js`（主入口）**

  ```js
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

  // 路由占位
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // 连接数据库
  mongoose.connect(config.mongoUri)
    .then(() => console.log('MongoDB 连接成功'))
    .catch(err => { console.error('MongoDB 连接失败:', err); process.exit(1); });

  // 启动服务器
  httpServer.listen(config.port, () => {
    console.log(`服务器运行在端口 ${config.port}`);
  });

  module.exports = { app, io };
  ```

- [ ] **Step 7：在 `server/package.json` 添加启动脚本**

  ```json
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  }
  ```

- [ ] **Step 8：验证后端启动**

  ```bash
  cd server
  npm run dev
  # 打开浏览器访问 http://localhost:3000/health
  # 应看到 {"status":"ok"}
  ```

- [ ] **Step 9：提交 git**

  ```bash
  echo "node_modules/\n.env" >> .gitignore
  git add .
  git commit -m "feat: 后端基础框架初始化"
  ```

---

### Task 5：用户模型与微信登录接口

**Files:**
- 创建：`server/src/models/User.js`
- 创建：`server/src/controllers/authController.js`
- 创建：`server/src/routes/auth.js`
- 修改：`server/src/index.js`

- [ ] **Step 1：创建 `server/src/models/User.js`**

  ```js
  const mongoose = require('mongoose');
  const userSchema = new mongoose.Schema({
    openid:     { type: String, required: true, unique: true },
    nickname:   { type: String, default: '玩家' + Math.floor(Math.random()*9999) },
    avatar:     { type: String, default: '' },
    totalScore: { type: Number, default: 0 },
  }, { timestamps: true });
  module.exports = mongoose.model('User', userSchema);
  ```

- [ ] **Step 2：创建 `server/src/controllers/authController.js`**

  ```js
  const axios = require('axios');
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const config = require('../config');

  // 微信登录：用 code 换取 openid
  exports.wxLogin = async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'code 不能为空' });

      // 调微信接口换取 openid
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wx.appid}&secret=${config.wx.secret}&js_code=${code}&grant_type=authorization_code`;
      const { data } = await axios.get(url);
      if (data.errcode) return res.status(401).json({ error: '微信登录失败', detail: data.errmsg });

      const { openid } = data;

      // 查找或创建用户
      let user = await User.findOne({ openid });
      if (!user) {
        user = await User.create({ openid });
      }

      // 生成 JWT
      const token = jwt.sign({ userId: user._id, openid }, config.jwtSecret, { expiresIn: '30d' });

      res.json({ token, user: { id: user._id, nickname: user.nickname, avatar: user.avatar, totalScore: user.totalScore } });
    } catch (err) {
      console.error('wxLogin error:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  };

  // 更新昵称/头像
  exports.updateProfile = async (req, res) => {
    try {
      const { nickname, avatar } = req.body;
      const user = await User.findByIdAndUpdate(
        req.userId,
        { ...(nickname && { nickname }), ...(avatar && { avatar }) },
        { new: true }
      );
      res.json({ user: { id: user._id, nickname: user.nickname, avatar: user.avatar } });
    } catch (err) {
      res.status(500).json({ error: '服务器错误' });
    }
  };
  ```

- [ ] **Step 3：创建 `server/src/middleware/auth.js`（JWT 验证中间件）**

  ```js
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未授权' });
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.userId = decoded.userId;
      next();
    } catch {
      res.status(401).json({ error: 'token 无效或已过期' });
    }
  };
  ```

- [ ] **Step 4：创建 `server/src/routes/auth.js`**

  ```js
  const router = require('express').Router();
  const auth = require('../middleware/auth');
  const { wxLogin, updateProfile } = require('../controllers/authController');
  router.post('/login', wxLogin);
  router.put('/profile', auth, updateProfile);
  module.exports = router;
  ```

- [ ] **Step 5：在 `server/src/index.js` 注册路由**

  在 `app.get('/health'...` 后添加：
  ```js
  app.use('/api/auth', require('./routes/auth'));
  ```

- [ ] **Step 6：测试登录接口（用 Postman 或 curl）**

  ```bash
  # 注意：微信登录在真机才有真实 code，开发阶段可先 mock openid
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"code":"test_code"}'
  ```

- [ ] **Step 7：提交 git**

  ```bash
  git add .
  git commit -m "feat: 微信登录与用户模型"
  ```

---

## 阶段三：房间系统

### Task 6：房间模型与 REST 接口

**Files:**
- 创建：`server/src/models/Room.js`
- 创建：`server/src/controllers/roomController.js`
- 创建：`server/src/routes/room.js`

- [ ] **Step 1：创建 `server/src/models/Room.js`**

  ```js
  const mongoose = require('mongoose');
  const roomSchema = new mongoose.Schema({
    roomCode:  { type: String, required: true, unique: true },
    status:    { type: String, enum: ['waiting','playing','finished'], default: 'waiting' },
    // seats[0,2,4] = A队; seats[1,3,5] = B队; 值为 userId 字符串或 null 或 "bot"
    seats:     { type: [String], default: [null,null,null,null,null,null] },
    hostId:    { type: String, required: true },
    // 用于匹配队列
    isMatching:{ type: Boolean, default: false },
  }, { timestamps: true });
  module.exports = mongoose.model('Room', roomSchema);
  ```

- [ ] **Step 2：创建 `server/src/controllers/roomController.js`**

  ```js
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

      // 找第一个空位
      const idx = room.seats.findIndex(s => s === null);
      if (idx === -1) return res.status(400).json({ error: '房间已满' });

      // 检查是否已在房间
      if (room.seats.includes(req.userId)) return res.status(400).json({ error: '已在此房间' });

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
  ```

- [ ] **Step 3：创建 `server/src/routes/room.js`**

  ```js
  const router = require('express').Router();
  const auth = require('../middleware/auth');
  const { createRoom, joinRoom, getRoom, addBot } = require('../controllers/roomController');
  router.post('/create', auth, createRoom);
  router.post('/join', auth, joinRoom);
  router.get('/:code', auth, getRoom);
  router.post('/:code/bot', auth, addBot);
  module.exports = router;
  ```

- [ ] **Step 4：在 `server/src/index.js` 注册路由**

  ```js
  app.use('/api/room', require('./routes/room'));
  ```

- [ ] **Step 5：提交 git**

  ```bash
  git add .
  git commit -m "feat: 房间模型与REST接口"
  ```

---

### Task 7：Socket.io 房间实时同步

**Files:**
- 创建：`server/src/socket/roomSocket.js`
- 修改：`server/src/index.js`

- [ ] **Step 1：创建 `server/src/socket/roomSocket.js`**

  ```js
  const Room = require('../models/Room');
  const jwt = require('jsonwebtoken');
  const config = require('../config');

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
        // 检查是否全员准备（简化：前端自行统计，服务端后续完善）
      });

      // 断线处理
      socket.on('disconnect', () => {
        console.log(`用户 ${socket.userId} 断线`);
      });
    });
  };
  ```

- [ ] **Step 2：在 `server/src/index.js` 挂载 Socket 处理**

  在 `mongoose.connect(...)` 前添加：
  ```js
  require('./socket/roomSocket')(io);
  ```

- [ ] **Step 3：提交 git**

  ```bash
  git add .
  git commit -m "feat: Socket.io 房间实时同步"
  ```

---

## 阶段四：游戏引擎

### Task 8：牌型定义与合法性校验模块

**Files:**
- 创建：`server/src/services/cardEngine.js`
- 创建：`server/src/services/cardEngine.test.js`

- [ ] **Step 1：创建 `server/src/services/cardEngine.js`**

  ```js
  // 牌面大小顺序（索引越大越大）
  const RANK_ORDER = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
  // 分值牌
  const SCORE_MAP = { '5': 5, '10': 10, 'K': 10 };

  // 生成3副牌（162张）
  function createDeck() {
    const suits = ['♠','♥','♦','♣'];
    const ranks = ['4','5','6','7','8','9','10','J','Q','K','A','2','3'];
    const deck = [];
    for (let d = 0; d < 3; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          deck.push({ rank, suit, id: `${d}-${rank}${suit}` });
        }
      }
      deck.push({ rank: '小王', suit: 'joker', id: `${d}-小王` });
      deck.push({ rank: '大王', suit: 'joker', id: `${d}-大王` });
    }
    return deck;
  }

  // Fisher-Yates 洗牌
  function shuffle(deck) {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  // 牌面大小比较（返回 rank 在 RANK_ORDER 中的索引）
  function rankValue(rank) {
    return RANK_ORDER.indexOf(rank);
  }

  // 计算一组牌的路数
  // 返回 { type, lu, value, valid }
  // type: 'single'|'pair'|'straight'|'dragon'|'bomb'|'yao'|'joker_bomb'
  function analyzePlay(cards) {
    const n = cards.length;
    if (n === 0) return { valid: false };

    const ranks = cards.map(c => c.rank);
    const jokerCount = ranks.filter(r => r === '大王' || r === '小王').length;

    // 王炸
    if (jokerCount === n && n >= 2) {
      const bigCount = ranks.filter(r => r === '大王').length;
      const smallCount = ranks.filter(r => r === '小王').length;
      const lu = bigCount * 2.5 + smallCount * 1.5;
      return { type: 'joker_bomb', lu, value: lu, valid: true };
    }

    // 幺：1张A + n张4（n≥2）
    const aCount = ranks.filter(r => r === 'A').length;
    const fourCount = ranks.filter(r => r === '4').length;
    if (aCount === 1 && fourCount >= 2 && n === aCount + fourCount) {
      const lu = fourCount * 2; // 每张4算2路
      return { type: 'yao', lu, value: lu, valid: true };
    }

    // 炸弹：所有牌同一点数（≥3）
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length === 1 && n >= 3) {
      return { type: 'bomb', lu: n, value: rankValue(uniqueRanks[0]), valid: true };
    }

    // 单张
    if (n === 1) return { type: 'single', lu: 1, value: rankValue(ranks[0]), valid: true };

    // 对子
    if (n === 2 && uniqueRanks.length === 1) {
      return { type: 'pair', lu: 2, value: rankValue(uniqueRanks[0]), valid: true };
    }

    // 顺子：n张连续不同点数（n≥3）
    if (n >= 3 && uniqueRanks.length === n) {
      const vals = ranks.map(rankValue).sort((a, b) => a - b);
      // 过滤掉王
      if (vals.some(v => v >= rankValue('小王'))) return { valid: false };
      const isConsecutive = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
      if (isConsecutive) {
        return { type: 'straight', lu: n, value: vals[vals.length - 1], valid: true };
      }
    }

    // 双龙：连续对子（≥3对）
    if (n >= 6 && n % 2 === 0) {
      const pairCount = n / 2;
      const pairRanks = [];
      const sorted = [...ranks].sort((a,b) => rankValue(a) - rankValue(b));
      let valid = true;
      for (let i = 0; i < sorted.length; i += 2) {
        if (sorted[i] !== sorted[i+1]) { valid = false; break; }
        pairRanks.push(sorted[i]);
      }
      if (valid && pairRanks.length === pairCount) {
        const uniquePairs = [...new Set(pairRanks)];
        if (uniquePairs.length === pairCount) {
          const vals = pairRanks.map(rankValue).sort((a,b) => a-b);
          const isConseq = vals.every((v,i) => i === 0 || v === vals[i-1]+1);
          if (isConseq) {
            return { type: 'dragon', lu: pairCount * 2, value: vals[vals.length-1], valid: true };
          }
        }
      }
    }

    return { valid: false };
  }

  // 判断 newPlay 是否能管住 lastPlay（两者均已经过 analyzePlay）
  function canBeat(newPlay, lastPlay) {
    if (!newPlay.valid || !lastPlay.valid) return false;
    // 路数更大直接能管
    if (newPlay.lu > lastPlay.lu) return true;
    // 路数相同：比牌面大小
    if (newPlay.lu === lastPlay.lu) {
      // 幺最大，王炸第二
      const priority = { yao: 3, joker_bomb: 2 };
      const np = priority[newPlay.type] || 1;
      const lp = priority[lastPlay.type] || 1;
      if (np !== lp) return np > lp;
      // 顺子/双龙：必须张数相同
      if (newPlay.type === 'straight' || newPlay.type === 'dragon') {
        if (newPlay.lu !== lastPlay.lu) return false;
      }
      return newPlay.value > lastPlay.value;
    }
    return false;
  }

  // 统计一组牌中的得分
  function calcScore(cards) {
    return cards.reduce((sum, c) => sum + (SCORE_MAP[c.rank] || 0), 0);
  }

  module.exports = { createDeck, shuffle, analyzePlay, canBeat, calcScore, rankValue };
  ```

- [ ] **Step 2：创建测试文件 `server/src/services/cardEngine.test.js`**

  ```js
  const { analyzePlay, canBeat, calcScore, createDeck, shuffle } = require('./cardEngine');

  test('单张识别', () => {
    const r = analyzePlay([{ rank: 'A', suit: '♠' }]);
    expect(r).toMatchObject({ type: 'single', lu: 1, valid: true });
  });

  test('炸弹识别（3张K）', () => {
    const r = analyzePlay([{rank:'K',suit:'♠'},{rank:'K',suit:'♥'},{rank:'K',suit:'♦'}]);
    expect(r).toMatchObject({ type: 'bomb', lu: 3, valid: true });
  });

  test('幺识别（A+2个4）', () => {
    const r = analyzePlay([{rank:'A',suit:'♠'},{rank:'4',suit:'♥'},{rank:'4',suit:'♦'}]);
    expect(r).toMatchObject({ type: 'yao', lu: 4, valid: true });
  });

  test('王炸识别（大王+小王）', () => {
    const r = analyzePlay([{rank:'大王',suit:'joker'},{rank:'小王',suit:'joker'}]);
    expect(r).toMatchObject({ type: 'joker_bomb', valid: true });
  });

  test('顺子识别（456）', () => {
    const r = analyzePlay([{rank:'4',suit:'♠'},{rank:'5',suit:'♥'},{rank:'6',suit:'♦'}]);
    expect(r).toMatchObject({ type: 'straight', lu: 3, valid: true });
  });

  test('canBeat: 炸弹管单张', () => {
    const single = analyzePlay([{rank:'3',suit:'♠'}]);
    const bomb = analyzePlay([{rank:'K',suit:'♠'},{rank:'K',suit:'♥'},{rank:'K',suit:'♦'}]);
    expect(canBeat(bomb, single)).toBe(true);
  });

  test('canBeat: 大单张管小单张', () => {
    const a = analyzePlay([{rank:'A',suit:'♠'}]);
    const k = analyzePlay([{rank:'K',suit:'♠'}]);
    expect(canBeat(a, k)).toBe(true);
    expect(canBeat(k, a)).toBe(false);
  });

  test('calcScore: 5+K+10=25分', () => {
    const cards = [{rank:'5',suit:'♠'},{rank:'K',suit:'♥'},{rank:'10',suit:'♦'}];
    expect(calcScore(cards)).toBe(25);
  });

  test('createDeck 生成162张牌', () => {
    expect(createDeck()).toHaveLength(162);
  });
  ```

- [ ] **Step 3：运行测试**

  ```bash
  cd server
  npx jest src/services/cardEngine.test.js --verbose
  # 应全部通过（8个测试）
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 牌型校验引擎 + 单元测试"
  ```

---

### Task 9：游戏模型与对局管理 Socket

**Files:**
- 创建：`server/src/models/Game.js`
- 创建：`server/src/socket/gameSocket.js`
- 修改：`server/src/index.js`

- [ ] **Step 1：创建 `server/src/models/Game.js`**

  ```js
  const mongoose = require('mongoose');
  const gameSchema = new mongoose.Schema({
    roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    roomCode:     String,
    hands:        { type: Map, of: [Object] },  // {userId: [{rank,suit,id},...]}
    tableCards:   [Object],   // 当前桌面上的牌
    lastPlay:     { type: Object, default: null }, // {userId, cards, analysis}
    currentTurn:  String,     // 当前出牌玩家 userId
    passCount:    { type: Number, default: 0 },   // 连续不要次数
    scoreA:       { type: Number, default: 0 },
    scoreB:       { type: Number, default: 0 },
    roundScores:  [Object],   // 历史积分记录
    readyForNext: [String],   // 已点下一局准备的玩家
    status:       { type: String, default: 'playing' },
    winner:       String,
  }, { timestamps: true });
  module.exports = mongoose.model('Game', gameSchema);
  ```

- [ ] **Step 2：创建 `server/src/socket/gameSocket.js`**

  ```js
  const Room = require('../models/Room');
  const Game = require('../models/Game');
  const { createDeck, shuffle, analyzePlay, canBeat, calcScore } = require('../services/cardEngine');

  // 发牌：162张，6人每人27张
  function dealCards(seats) {
    const deck = shuffle(createDeck());
    const hands = {};
    seats.forEach((userId, i) => {
      if (userId) hands[userId] = deck.slice(i * 27, (i + 1) * 27);
    });
    return hands;
  }

  // 检查胜负（实现规则中的三种胜利条件）
  // firstFinisher: 第一个走完牌的玩家所属队伍 ('teamA'|'teamB'|null)
  function checkWinner(game, seats, firstFinisher) {
    const teamA = [seats[0], seats[2], seats[4]].filter(u => u && u !== 'bot');
    const teamB = [seats[1], seats[3], seats[5]].filter(u => u && u !== 'bot');
    const aEmpty = teamA.every(u => (game.hands.get(u) || []).length === 0);
    const bEmpty = teamB.every(u => (game.hands.get(u) || []).length === 0);

    if (firstFinisher) {
      // 条件1：第一个走完牌的阵营积分 ≥ 135
      if (firstFinisher === 'teamA' && game.scoreA >= 135) return 'teamA';
      if (firstFinisher === 'teamB' && game.scoreB >= 135) return 'teamB';
      // 条件2：非第一个走完牌的阵营积分 ≥ 210
      if (firstFinisher === 'teamA' && game.scoreB >= 210) return 'teamB';
      if (firstFinisher === 'teamB' && game.scoreA >= 210) return 'teamA';
    }
    // 条件3：全队手牌都走完
    if (aEmpty) return 'teamA';
    if (bEmpty) return 'teamB';
    return null;
  }

  module.exports = (io) => {
    io.on('connection', (socket) => {
      if (!socket.userId) return;

      // 开始游戏（房主触发，6人全准备）
      socket.on('game:start', async ({ roomCode }) => {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== socket.userId) return;
        if (room.seats.includes(null)) return socket.emit('error', { msg: '人数不足' });

        const hands = dealCards(room.seats);
        const game = await Game.create({
          roomCode,
          hands,
          currentTurn: room.seats[0],
          scoreA: 0, scoreB: 0,
        });

        room.status = 'playing';
        await room.save();

        // 向每位玩家单独发手牌
        room.seats.forEach((userId) => {
          if (!userId || userId === 'bot') return;
          io.to(userId).emit('game:start', {
            hand: hands[userId],
            currentTurn: game.currentTurn,
            seats: room.seats,
          });
        });
      });

      // 出牌（用 Map 做简单并发锁，防止同一轮次多次出牌；try/finally 确保锁释放）
      const playLocks = new Map();
      socket.on('game:play', async ({ roomCode, cards }) => {
        if (playLocks.get(roomCode)) return socket.emit('error', { msg: '操作进行中' });
        playLocks.set(roomCode, true);
        try {
        const game = await Game.findOne({ roomCode, status: 'playing' });
        if (!game || game.currentTurn !== socket.userId) {
          return socket.emit('error', { msg: '还没轮到你' });
        }

        const analysis = analyzePlay(cards);
        if (!analysis.valid) return socket.emit('error', { msg: '牌型不合法' });
        if (game.lastPlay && !canBeat(analysis, game.lastPlay.analysis)) {
          return socket.emit('error', { msg: '管不上' });
        }

        // 从手牌中移除出出的牌
        const hand = game.hands.get(socket.userId);
        const cardIds = cards.map(c => c.id);
        game.hands.set(socket.userId, hand.filter(c => !cardIds.includes(c.id)));

        // 积分统计
        const score = calcScore(cards);
        const room = await Room.findOne({ roomCode });
        const seatIdx = room.seats.indexOf(socket.userId);
        if (seatIdx % 2 === 0) game.scoreA += score;
        else game.scoreB += score;

        game.lastPlay = { userId: socket.userId, cards, analysis };
        game.passCount = 0;

        // 移动出牌权到下一个玩家
        const nextIdx = (room.seats.indexOf(socket.userId) + 1) % 6;
        game.currentTurn = room.seats[nextIdx];

        await game.save();

        io.to(roomCode).emit('game:update', {
          lastPlay: { userId: socket.userId, cards, analysis },
          currentTurn: game.currentTurn,
          scoreA: game.scoreA,
          scoreB: game.scoreB,
          handCount: Object.fromEntries([...game.hands].map(([k,v]) => [k, v.length])),
        });

        // 检查胜负
        const winner = checkWinner(game, room.seats);
        if (winner) {
          game.status = 'finished';
          game.winner = winner;
          await game.save();
          io.to(roomCode).emit('game:end', { winner, scoreA: game.scoreA, scoreB: game.scoreB });
        }
      });

      // 不要
      socket.on('game:pass', async ({ roomCode }) => {
        const game = await Game.findOne({ roomCode, status: 'playing' });
        if (!game || game.currentTurn !== socket.userId) return;

        game.passCount += 1;
        const room = await Room.findOne({ roomCode });

        // 5人都不要（即除出牌者外所有人），重置出牌权给最后出牌者
        if (game.passCount >= 5) {
          game.lastPlay = null;
          game.passCount = 0;
          // 出牌权给上一个出牌者
          game.currentTurn = game.lastPlay?.userId || game.currentTurn;
        } else {
          const nextIdx = (room.seats.indexOf(socket.userId) + 1) % 6;
          game.currentTurn = room.seats[nextIdx];
        }

        await game.save();
        io.to(roomCode).emit('game:update', {
          pass: { userId: socket.userId },
          currentTurn: game.currentTurn,
        });
      });

      // 下一局准备
      socket.on('game:ready_next', async ({ roomCode }) => {
        const game = await Game.findOne({ roomCode });
        if (!game) return;
        if (!game.readyForNext.includes(socket.userId)) {
          game.readyForNext.push(socket.userId);
          await game.save();
        }
        const room = await Room.findOne({ roomCode });
        const realPlayers = room.seats.filter(u => u && u !== 'bot');
        io.to(roomCode).emit('game:ready_status', { readyCount: game.readyForNext.length, total: realPlayers.length });
        if (game.readyForNext.length >= realPlayers.length) {
          // 全员准备，自动开始下一局
          io.to(roomCode).emit('game:auto_start_next');
        }
      });
    });
  };
  ```

- [ ] **Step 3：在 `server/src/index.js` 引入 gameSocket**

  在 `require('./socket/roomSocket')(io);` 后添加：
  ```js
  require('./socket/gameSocket')(io);
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 游戏引擎Socket — 发牌/出牌/不要/结算"
  ```

---

### Task 10：出牌超时与 AI 机器人

**Files:**
- 修改：`server/src/socket/gameSocket.js`
- 创建：`server/src/services/botAI.js`

- [ ] **Step 1：创建 `server/src/services/botAI.js`**

  ```js
  const { analyzePlay, canBeat } = require('./cardEngine');

  // 机器人出牌策略：尝试出能管住的最小牌，否则不要
  function botDecide(hand, lastPlay) {
    if (!lastPlay) {
      // 无上家，出最小单张
      const sorted = [...hand].sort((a, b) => {
        const order = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
        return order.indexOf(a.rank) - order.indexOf(b.rank);
      });
      return [sorted[0]];
    }
    // 尝试找能管上的单张
    for (const card of hand) {
      const analysis = analyzePlay([card]);
      if (analysis.valid && canBeat(analysis, lastPlay.analysis)) return [card];
    }
    return null; // 不要
  }

  module.exports = { botDecide };
  ```

- [ ] **Step 2：在 `gameSocket.js` 的出牌逻辑后添加超时处理**

  在 `game:update` emit 之后添加：
  ```js
  // 如果下一位是机器人，延迟800ms自动出牌
  if (game.currentTurn === 'bot') {
    setTimeout(async () => {
      const { botDecide } = require('../services/botAI');
      const freshGame = await Game.findOne({ roomCode, status: 'playing' });
      if (!freshGame || freshGame.currentTurn !== 'bot') return;
      // 取机器人对应 seat 的手牌（dealCards 中 bot 用 'bot' 作为 key）
      const room = await Room.findOne({ roomCode });
      const botHand = freshGame.hands.get('bot') || [];
      const botCards = botDecide(botHand, freshGame.lastPlay);
      if (botCards) {
        // 模拟出牌，触发相同的 game:play 逻辑
        io.to(roomCode).emit('game:bot_play', { cards: botCards });
      } else {
        io.to(roomCode).emit('game:bot_pass', {});
      }
    }, 800);
  }

  // 20秒超时自动不要
  const turnUserId = game.currentTurn;
  setTimeout(async () => {
    const freshGame = await Game.findOne({ roomCode, status: 'playing' });
    if (freshGame && freshGame.currentTurn === turnUserId) {
      // 触发自动不要
      io.to(roomCode).emit('game:timeout', { userId: turnUserId });
      freshGame.passCount += 1;
      const r = await Room.findOne({ roomCode });
      const nextIdx = (r.seats.indexOf(turnUserId) + 1) % 6;
      freshGame.currentTurn = r.seats[nextIdx];
      await freshGame.save();
      io.to(roomCode).emit('game:update', { pass: { userId: turnUserId }, currentTurn: freshGame.currentTurn, auto: true });
    }
  }, 20000);
  ```

- [ ] **Step 3：提交 git**

  ```bash
  git add .
  git commit -m "feat: 超时自动不要 + AI机器人基础框架"
  ```

---

## 阶段五：小程序前端

### Task 11：小程序项目初始化

**Files:**
- 创建：`miniapp/app.json`
- 创建：`miniapp/app.js`
- 创建：`miniapp/app.wxss`
- 创建：`miniapp/utils/request.js`
- 创建：`miniapp/utils/socket.js`

- [ ] **Step 1：用微信开发者工具创建项目**

  打开微信开发者工具 → 新建项目
  - 项目目录：`h:/Claude Code/poker414/miniapp`
  - AppID：填写你的 AppID
  - 模板：选"不使用模板"（空白）
  - 点击确定

- [ ] **Step 2：配置 `miniapp/app.json`（全局横屏）**

  ```json
  {
    "pages": [
      "pages/login/login",
      "pages/home/home",
      "pages/room/room",
      "pages/game/game"
    ],
    "window": {
      "navigationBarTitleText": "刨幺414",
      "navigationBarBackgroundColor": "#050D14",
      "navigationBarTextStyle": "white",
      "backgroundTextStyle": "dark"
    },
    "pageOrientation": "landscape",
    "style": "v2",
    "sitemapLocation": "sitemap.json"
  }
  ```

- [ ] **Step 3：创建 `miniapp/utils/request.js`（封装 HTTP 请求）**

  ```js
  const BASE_URL = 'https://api.你的域名.com';

  function request(method, url, data = {}) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      wx.request({
        url: BASE_URL + url,
        method,
        data,
        header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(res.data);
        },
        fail: reject,
      });
    });
  }

  module.exports = {
    get: (url) => request('GET', url),
    post: (url, data) => request('POST', url, data),
    put: (url, data) => request('PUT', url, data),
  };
  ```

- [ ] **Step 4：创建 `miniapp/utils/socket.js`（封装 Socket.io）**

  ```js
  // 微信小程序使用原生 WebSocket，自行实现 socket.io 协议
  // 使用 socket.io-client 的 miniprogram 版本
  // 在 miniapp 目录下执行：npm install socket.io-client

  let socket = null;

  function connect(token) {
    if (socket) return;
    // 注意：微信小程序需要使用 socket.io 的 websocket 适配
    socket = wx.connectSocket({
      url: `wss://api.你的域名.com/socket.io/?transport=websocket&token=${token}`,
      fail: console.error,
    });
    return socket;
  }

  function emit(event, data) {
    if (!socket) return;
    // 将事件以 socket.io 格式发送
    socket.send({ data: JSON.stringify([event, data]) });
  }

  function on(event, callback) {
    if (!socket) return;
    socket.onMessage((res) => {
      try {
        const [evName, evData] = JSON.parse(res.data);
        if (evName === event) callback(evData);
      } catch {}
    });
  }

  module.exports = { connect, emit, on };
  ```

  > **提示：** 微信小程序与 Socket.io 的连接实际需要特殊适配，后续会用 `socket.io-client` 的 miniprogram build 替换此文件。

- [ ] **Step 5：创建 `miniapp/app.js`**

  ```js
  App({
    globalData: {
      token: '',
      userInfo: null,
    },
    onLaunch() {
      this.globalData.token = wx.getStorageSync('token') || '';
      this.globalData.userInfo = wx.getStorageSync('userInfo') || null;
    },
  });
  ```

- [ ] **Step 6：提交 git**

  ```bash
  git add .
  git commit -m "feat: 小程序项目初始化"
  ```

---

### Task 12：登录页 + 主页

**Files:**
- 创建：`miniapp/pages/login/login.wxml/wxss/js`
- 创建：`miniapp/pages/home/home.wxml/wxss/js`

- [ ] **Step 1：创建登录页 `miniapp/pages/login/login.wxml`**

  ```xml
  <view class="container">
    <view class="logo-area">
      <text class="logo-sub">东北扑克</text>
      <text class="logo-title">刨幺414</text>
    </view>
    <button class="login-btn" bindtap="onLogin" loading="{{loading}}">
      微信一键登录
    </button>
  </view>
  ```

- [ ] **Step 2：创建 `miniapp/pages/login/login.js`**

  ```js
  const request = require('../../utils/request');
  const app = getApp();
  Page({
    data: { loading: false },
    async onLogin() {
      this.setData({ loading: true });
      try {
        const { code } = await wx.login();
        const res = await request.post('/api/auth/login', { code });
        wx.setStorageSync('token', res.token);
        wx.setStorageSync('userInfo', res.user);
        app.globalData.token = res.token;
        app.globalData.userInfo = res.user;
        wx.redirectTo({ url: '/pages/home/home' });
      } catch (e) {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      } finally {
        this.setData({ loading: false });
      }
    },
    onLoad() {
      // 已登录直接跳转
      if (wx.getStorageSync('token')) {
        wx.redirectTo({ url: '/pages/home/home' });
      }
    },
  });
  ```

- [ ] **Step 3：创建主页 `miniapp/pages/home/home.wxml`**

  ```xml
  <view class="container">
    <!-- 背景场景 -->
    <view class="bg-scene">
      <view class="sky"/>
      <view class="ground"/>
    </view>
    <!-- 用户信息 -->
    <view class="user-chip">
      <image class="user-av" src="{{userInfo.avatar || '/images/default-avatar.png'}}"/>
      <view>
        <text class="user-name">{{userInfo.nickname}}</text>
        <text class="user-id">ID · {{userInfo.id}}</text>
      </view>
    </view>
    <!-- Logo -->
    <view class="logo-area">
      <text class="logo-sub">东 北 扑 克</text>
      <text class="logo-main">刨幺414</text>
    </view>
    <!-- 菜单 -->
    <view class="menu-row">
      <button class="menu-btn btn-create" bindtap="createRoom">🏮 创建房间</button>
      <button class="menu-btn btn-join" bindtap="joinRoom">🔑 加入房间</button>
      <button class="menu-btn btn-match" bindtap="quickMatch">⚡ 快速匹配</button>
    </view>
  </view>
  ```

- [ ] **Step 4：创建 `miniapp/pages/home/home.js`**

  ```js
  const request = require('../../utils/request');
  const app = getApp();
  Page({
    data: { userInfo: null },
    onLoad() {
      this.setData({ userInfo: app.globalData.userInfo });
    },
    async createRoom() {
      try {
        const res = await request.post('/api/room/create', {});
        wx.navigateTo({ url: `/pages/room/room?code=${res.roomCode}` });
      } catch { wx.showToast({ title: '创建失败', icon: 'none' }); }
    },
    joinRoom() {
      wx.showModal({
        title: '加入房间', placeholderText: '输入6位房间码', editable: true,
        success: async (res) => {
          if (!res.confirm || !res.content) return;
          try {
            const r = await request.post('/api/room/join', { roomCode: res.content.trim().toUpperCase() });
            wx.navigateTo({ url: `/pages/room/room?code=${r.roomCode}` });
          } catch (e) { wx.showToast({ title: e.error || '加入失败', icon: 'none' }); }
        },
      });
    },
    quickMatch() {
      wx.showToast({ title: '快速匹配开发中...', icon: 'none' });
    },
  });
  ```

- [ ] **Step 5：提交 git**

  ```bash
  git add .
  git commit -m "feat: 登录页与主页"
  ```

---

### Task 13：等待室与游戏页（核心交互）

> 这是最复杂的部分，具体代码将在实施阶段由 AI 辅助逐步完成。以下为关键文件清单和要点。

**Files:**
- 创建：`miniapp/pages/room/room.wxml/wxss/js`
- 创建：`miniapp/pages/game/game.wxml/wxss/js`

- [ ] **Step 1：等待室核心逻辑要点**
  - 进入页面后通过 Socket.io 的 `room:join` 加入房间频道
  - 监听 `room:update` 事件更新座位显示
  - 准备按钮触发 `room:ready` 事件
  - 分享按钮调用 `wx.shareAppMessage` 传递房间码
  - 房主可见"添加机器人"和"开始游戏"按钮

- [ ] **Step 2：游戏页核心逻辑要点**
  - 监听 `game:start` 获取手牌，初始化界面
  - 手牌渲染：按 RANK_ORDER 排序显示，支持点击上半区选中、滑动连续选中、拖拽下半区换位
  - 监听 `game:update` 更新出牌区、积分、当前出牌者（金色闪烁头像）
  - 点击"出牌"时发送 `game:play`，失败时 Toast 提示原因
  - 点击"不要"发送 `game:pass`
  - 监听 `game:timeout` 显示超时提示
  - 监听 `game:end` 跳转结算界面
  - 横屏强制：在 `page.json` 中设置 `"pageOrientation": "landscape"`

- [ ] **Step 3：WXSS 样式**
  - 游戏页样式对照 `ui-v4.html` 设计稿实现
  - 使用 `rpx` 单位（667rpx = 100%宽度）
  - 背景层：渐变天空 + 城市 SVG（用 `<image>` 引用 SVG 文件）
  - 牌桌：CSS 椭圆 + 径向渐变
  - 手牌：`translateY` 实现选中上浮动画

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 等待室与游戏页"
  ```

---

---

### Task 16：借光规则实现

**Files:**
- 修改：`server/src/socket/gameSocket.js`

> 借光：玩家A走完最后一手牌 → 若对方阵营不接 → 下一位队友继续出牌。

- [ ] **Step 1：在 `game:play` 的手牌移除后添加借光检测**

  ```js
  // 玩家手牌清空 → 触发借光
  if (game.hands.get(socket.userId).length === 0) {
    const room = await Room.findOne({ roomCode });
    const seatIdx = room.seats.indexOf(socket.userId);
    const teamType = seatIdx % 2 === 0 ? 'teamA' : 'teamB';

    // 记录第一个走完牌的队伍（如未记录）
    if (!game.firstFinishTeam) {
      game.firstFinishTeam = teamType;
      // 检查积分胜负条件
      const winner = checkWinner(game, room.seats, teamType);
      if (winner) {
        game.status = 'finished'; game.winner = winner;
        await game.save();
        io.to(roomCode).emit('game:end', { winner, scoreA: game.scoreA, scoreB: game.scoreB });
        return;
      }
    }

    // 借光：出牌权留给 lastPlay，等待对方阵营应对
    // passCount 会在不要逻辑中推进，直到对方全不要后跳给队友
    game.borrowLight = { fromUserId: socket.userId, nextTeammate: room.seats[(seatIdx + 2) % 6] };
    io.to(roomCode).emit('game:borrow_light', {
      fromUserId: socket.userId,
      lastCards: cards,
    });
  }
  ```

- [ ] **Step 2：修改 `game:pass` 中借光处理**

  在检查 passCount 时，若 `game.borrowLight` 存在且对方阵营全部不要，则出牌权给 `borrowLight.nextTeammate`。

  ```js
  if (game.borrowLight && game.passCount >= /* 对方阵营人数 */ 3) {
    game.currentTurn = game.borrowLight.nextTeammate;
    game.borrowLight = null;
    game.lastPlay = null;
    game.passCount = 0;
    await game.save();
    io.to(roomCode).emit('game:update', { currentTurn: game.currentTurn, borrowLightEnd: true });
    return;
  }
  ```

- [ ] **Step 3：在 Game 模型中添加字段**

  ```js
  firstFinishTeam: { type: String, default: null },
  borrowLight: { type: Object, default: null },
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 借光规则实现"
  ```

---

### Task 17：聊天与表情功能

**Files:**
- 修改：`server/src/socket/gameSocket.js`（添加 chat 事件）
- 创建：`miniapp/data/chat-presets.js`
- 修改：`miniapp/pages/game/game.wxml` 和 `game.js`

- [ ] **Step 1：后端添加聊天 Socket 事件**

  ```js
  socket.on('chat:send', ({ roomCode, type, content }) => {
    // type: 'phrase'（快捷语）| 'emoji'（表情）
    io.to(roomCode).emit('chat:message', {
      userId: socket.userId,
      type,
      content,
      ts: Date.now(),
    });
  });
  ```

- [ ] **Step 2：创建 `miniapp/data/chat-presets.js`**

  ```js
  module.exports = {
    phrases: [
      '哎呀妈，整个大活儿！',
      '你这玩意儿行不行啊？',
      '没事，下局整回来！',
      '这把我稳了，别急！',
      '嗯哼，管上了！',
      '走你，整炸弹！',
      '老铁，配合我！',
      '这手牌是咋发的？',
      '服了你了，行吧！',
      '稳住，我有！',
      '哎，跑了跑了！',
      '这局算你狠！',
      '再来一局，这次整赢！',
      '我滴妈，这运气！',
      '我就说嘛，能赢！',
      '借你光了哈！',
      '被炸了，认了！',
      '下局再报仇！',
      '没整明白，重来！',
      '666，完美！',
    ],
    emojis: ['😄','😎','🤣','😤','😭','🤔','🎉','💥','👍','🙏','😏','🫡'],
  };
  ```

- [ ] **Step 3：游戏页添加聊天面板（WXML）**

  ```xml
  <!-- 聊天气泡（在各玩家头像旁显示） -->
  <view wx:if="{{chatBubbles[userId]}}" class="chat-bubble">
    {{chatBubbles[userId]}}
  </view>

  <!-- 表情弹窗 -->
  <view class="chat-panel" wx:if="{{showChatPanel}}">
    <view class="phrases">
      <view wx:for="{{phrases}}" bindtap="sendPhrase" data-text="{{item}}">{{item}}</view>
    </view>
    <view class="emojis">
      <view wx:for="{{emojis}}" bindtap="sendEmoji" data-emoji="{{item}}">{{item}}</view>
    </view>
  </view>
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 聊天与东北特色表情功能"
  ```

---

### Task 18：快速匹配队列

**Files:**
- 创建：`server/src/services/matchQueue.js`
- 修改：`server/src/socket/roomSocket.js`

- [ ] **Step 1：创建 `server/src/services/matchQueue.js`**

  ```js
  const Room = require('../models/Room');
  const queue = []; // { userId, socketId }

  async function enqueue(userId, socketId) {
    if (queue.find(u => u.userId === userId)) return null;
    queue.push({ userId, socketId });
    if (queue.length >= 6) {
      const players = queue.splice(0, 6);
      // 创建房间
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
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
  ```

- [ ] **Step 2：在 roomSocket.js 添加匹配事件**

  ```js
  const { enqueue, dequeue } = require('../services/matchQueue');

  socket.on('match:join', async () => {
    const result = await enqueue(socket.userId, socket.id);
    if (!result) return;
    if (result.room) {
      // 通知所有匹配到的玩家
      result.players.forEach(p => {
        io.to(p.socketId).emit('match:found', { roomCode: result.room.roomCode });
      });
    } else {
      socket.emit('match:waiting', { position: result.position });
    }
  });

  socket.on('match:leave', () => dequeue(socket.userId));
  socket.on('disconnect', () => dequeue(socket.userId));
  ```

- [ ] **Step 3：前端 home.js 更新 quickMatch**

  ```js
  quickMatch() {
    const socket = getApp().socket;
    socket.emit('match:join', {});
    socket.on('match:found', ({ roomCode }) => {
      wx.navigateTo({ url: `/pages/room/room?code=${roomCode}` });
    });
    socket.on('match:waiting', ({ position }) => {
      wx.showToast({ title: `匹配中...第${position}位`, icon: 'loading' });
    });
  },
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 快速匹配队列"
  ```

---

### Task 19：断线重连

**Files:**
- 修改：`server/src/socket/roomSocket.js`
- 修改：`miniapp/utils/socket.js`

- [ ] **Step 1：服务端记录在线状态，断线60秒内保留座位**

  在 `server/src/socket/roomSocket.js` 的 `disconnect` 中：
  ```js
  socket.on('disconnect', async () => {
    // 找到该玩家所在的进行中房间，记录断线时间
    const rooms = await Room.find({ seats: socket.userId, status: 'playing' });
    rooms.forEach(room => {
      // 标记断线，60秒后若未重连则踢出
      setTimeout(async () => {
        const stillDisconnected = !io.sockets.sockets.has(socket.id); // Socket.io v4
        if (stillDisconnected) {
          // 将座位替换为机器人或标记空位（根据需求决定）
          console.log(`玩家 ${socket.userId} 断线超时，已移出房间`);
        }
      }, 60000);
    });
  });
  ```

- [ ] **Step 2：重连时恢复游戏状态**

  ```js
  socket.on('game:reconnect', async ({ roomCode }) => {
    const game = await Game.findOne({ roomCode, status: 'playing' });
    const room = await Room.findOne({ roomCode });
    if (!game || !room) return;
    socket.join(roomCode);
    // 只发送该玩家自己的手牌
    socket.emit('game:resume', {
      hand: game.hands.get(socket.userId),
      currentTurn: game.currentTurn,
      scoreA: game.scoreA,
      scoreB: game.scoreB,
      lastPlay: game.lastPlay,
      seats: room.seats,
    });
  });
  ```

- [ ] **Step 3：前端 socket.js 添加自动重连**

  ```js
  // 在 app.js 的 onLaunch 中启动 Socket 后，监听断线并重连
  socket.onClose(() => {
    console.log('Socket 断线，3秒后重连...');
    setTimeout(() => {
      connect(wx.getStorageSync('token'));
    }, 3000);
  });
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "feat: 断线重连与状态恢复"
  ```

---

### Task 20：Socket.io 小程序适配（修正连接方式）

**Files:**
- 修改：`miniapp/utils/socket.js`

> 微信小程序不支持原生 Socket.io 协议，需使用官方适配方案。

- [ ] **Step 1：在 miniapp 目录安装 socket.io-client**

  ```bash
  cd miniapp
  npm init -y
  npm install socket.io-client@4
  ```

  在微信开发者工具中：工具 → 构建 npm（每次安装新包后执行）

- [ ] **Step 2：重写 `miniapp/utils/socket.js`**

  ```js
  const { io } = require('socket.io-client');
  const BASE_WS = 'https://api.你的域名.com';

  let socket = null;

  function connect(token) {
    if (socket?.connected) return socket;
    socket = io(BASE_WS, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 3000,
    });
    socket.on('connect', () => console.log('Socket 已连接'));
    socket.on('disconnect', () => console.log('Socket 断线'));
    socket.on('error', (e) => console.error('Socket 错误:', e));
    return socket;
  }

  function getSocket() { return socket; }

  module.exports = { connect, getSocket };
  ```

- [ ] **Step 3：更新 `miniapp/app.js` 在登录后初始化 Socket**

  ```js
  // 登录成功后调用
  const { connect } = require('./utils/socket');
  connect(token);
  ```

- [ ] **Step 4：提交 git**

  ```bash
  git add .
  git commit -m "fix: Socket.io 小程序适配"
  ```

---

## 阶段六：联调与部署

### Task 14：服务端部署到阿里云

**Files:** 无（命令行操作）

- [ ] **Step 1：将后端代码上传到服务器**

  ```bash
  # 本地执行（在 server 目录下）
  scp -r . root@你的服务器IP:/home/poker414/server/
  ```

  或使用 Git：
  ```bash
  # 服务器上执行
  cd /home
  git clone 你的git仓库地址 poker414
  cd poker414/server
  npm install
  ```

- [ ] **Step 2：在服务器上创建 .env 文件**

  ```bash
  # 服务器上执行
  cd /home/poker414/server
  cp .env.example .env
  vim .env   # 填入真实的 AppID、AppSecret、JWT_SECRET
  ```

- [ ] **Step 3：用 PM2 启动后端**

  ```bash
  cd /home/poker414/server
  pm2 start src/index.js --name poker414-server
  pm2 save
  pm2 startup   # 设置开机自启
  pm2 status    # 查看运行状态
  ```

- [ ] **Step 4：测试 HTTPS 接口**

  ```bash
  curl https://api.你的域名.com/health
  # 应返回 {"status":"ok"}
  ```

- [ ] **Step 5：提交 git**

  ```bash
  git add .
  git commit -m "chore: 服务器部署配置"
  ```

---

### Task 15：真机联调与上线

**Files:** 无

- [ ] **Step 1：微信开发者工具真机预览**

  点击"预览"→ 用手机微信扫码，在真机上测试登录流程

- [ ] **Step 2：多人联调测试清单**
  - [ ] 6人同时在线，房间码加入
  - [ ] 发牌正确（每人27张）
  - [ ] 出牌校验（非法牌型拒绝）
  - [ ] 路数大小比较（炸弹管单张等）
  - [ ] 20秒超时自动不要
  - [ ] 积分统计（5/10/K）
  - [ ] 胜负判定三种情况
  - [ ] 下一局准备流程
  - [ ] 机器人补位出牌
  - [ ] 断线重连

- [ ] **Step 3：提交小程序审核**

  微信开发者工具 → 上传代码 → 登录 mp.weixin.qq.com → 提交审核
  填写功能介绍：在线多人扑克游戏，6人3v3对战

- [ ] **Step 4：审核通过后发布**

  mp.weixin.qq.com → 版本管理 → 审核版本 → 发布

---

## 附录：常用命令速查

```bash
# 后端开发
cd server && npm run dev          # 本地启动（热重载）
cd server && npx jest              # 运行所有测试

# 服务器管理
pm2 status                         # 查看服务状态
pm2 logs poker414-server           # 查看日志
pm2 restart poker414-server        # 重启服务
systemctl status mongod            # 查看数据库状态

# 数据库
mongosh                            # 进入数据库命令行
use poker414                       # 切换到项目数据库
db.users.find()                    # 查看所有用户
db.rooms.find()                    # 查看所有房间
```
