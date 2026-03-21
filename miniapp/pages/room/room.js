const request = require('../../utils/request');
const app = getApp();

Page({
  data: {
    roomCode: '',
    seats: [null,null,null,null,null,null],
    teamASeats: [],
    teamBSeats: [],
    isHost: false,
    myReady: false,
    readySet: {},
    canStart: false,
  },

  onLoad({ code }) {
    this.roomCode = code;
    this.myUserId = app.globalData.userInfo?.id;
    this.setData({ roomCode: code });
    this.loadRoom();
    this.bindSocket();
  },

  onUnload() {
    // 离开等待室取消匹配
    const socket = app.globalData.socket;
    if (socket) socket.emit('match:leave');
  },

  async loadRoom() {
    try {
      const res = await request.get(`/api/room/${this.roomCode}`);
      this.updateSeats(res.seats);
      this.setData({ isHost: res.hostId === this.myUserId });
      // 加入 Socket 房间频道
      const socket = app.globalData.socket;
      if (socket) socket.emit('room:join', { roomCode: this.roomCode });
    } catch {
      wx.showToast({ title: '房间不存在', icon: 'none' });
    }
  },

  bindSocket() {
    const socket = app.globalData.socket;
    if (!socket) return;

    socket.on('room:update', ({ seats }) => {
      this.updateSeats(seats);
    });

    socket.on('room:player_ready', ({ userId }) => {
      const readySet = { ...this.data.readySet, [userId]: true };
      this.setData({ readySet });
      this.refreshSeats(this.data.seats, readySet);
    });

    socket.on('game:start', (data) => {
      wx.redirectTo({ url: `/pages/game/game?code=${this.roomCode}` });
    });
  },

  updateSeats(seats) {
    this.setData({ seats });
    this.refreshSeats(seats, this.data.readySet);
  },

  refreshSeats(seats, readySet) {
    const teamASeats = [0,2,4].map(i => ({
      userId: seats[i],
      nickname: seats[i] === 'bot' ? '机器人' : null,
      ready: readySet[seats[i]] || false,
      idx: i,
    }));
    const teamBSeats = [1,3,5].map(i => ({
      userId: seats[i],
      nickname: seats[i] === 'bot' ? '机器人' : null,
      ready: readySet[seats[i]] || false,
      idx: i,
    }));
    // 是否可以开始（6人全员且全准备）
    const allFilled = !seats.includes(null);
    const realPlayers = seats.filter(u => u && u !== 'bot');
    const allReady = realPlayers.every(u => readySet[u]);
    this.setData({ teamASeats, teamBSeats, canStart: allFilled && allReady });
  },

  toggleReady() {
    const myReady = !this.data.myReady;
    this.setData({ myReady });
    const socket = app.globalData.socket;
    if (socket) socket.emit('room:ready', { roomCode: this.roomCode });
    // 更新本地 readySet
    const readySet = { ...this.data.readySet, [this.myUserId]: myReady };
    this.setData({ readySet });
    this.refreshSeats(this.data.seats, readySet);
  },

  async addBot() {
    try {
      const res = await request.post(`/api/room/${this.roomCode}/bot`, {});
      this.updateSeats(res.seats);
    } catch (e) {
      wx.showToast({ title: e.error || '添加失败', icon: 'none' });
    }
  },

  startGame() {
    if (!this.data.canStart) return wx.showToast({ title: '还有玩家未准备', icon: 'none' });
    const socket = app.globalData.socket;
    if (socket) socket.emit('game:start', { roomCode: this.roomCode });
  },

  copyCode() {
    wx.setClipboardData({ data: this.roomCode });
    wx.showToast({ title: '已复制', icon: 'success' });
  },

  shareRoom() {
    wx.showShareMenu({ withShareTicket: true });
  },

  onShareAppMessage() {
    return {
      title: `邀请你来玩刨幺414，房间码：${this.roomCode}`,
      path: `/pages/room/room?code=${this.roomCode}`,
    };
  },
});
