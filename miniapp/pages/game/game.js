const app = getApp();
const { phrases, emojis } = require('../../data/chat-presets');

// 6位玩家的位置样式（横屏667x375基准）
// 自己始终在底部中央（index=0位置固定）
const SEAT_POSITIONS = [
  'bottom:90rpx;left:50%;transform:translateX(-50%)',  // 自己（底部中央）
  'bottom:140rpx;right:60rpx',   // 右下
  'top:110rpx;right:30rpx',      // 右上
  'top:40rpx;left:50%;transform:translateX(-50%)', // 正上方
  'top:110rpx;left:30rpx',       // 左上
  'bottom:140rpx;left:60rpx',    // 左下
];

const RANK_ORDER = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
const TYPE_LABELS = {
  single: '单张', pair: '对子', straight: '顺子', dragon: '双龙',
  bomb: '炸弹', yao: '幺', joker_bomb: '王炸',
};

Page({
  data: {
    roomCode: '',
    hand: [],          // [{id, rank, suit, selected, left}]
    players: [],       // 6人信息数组
    lastPlay: null,    // {userId, cards, analysis, typeLabel, nickname}
    scoreA: 0,
    scoreB: 0,
    isMyTurn: false,
    timerSec: 20,
    selectedCount: 0,
    handAreaWidth: 400,
    showChatPanel: false,
    chatBubbles: {},   // {userId: text}
    phrases,
    emojis,
    gameResult: null,
    myReadyNext: false,
    readyNextCount: 0,
    readyNextTotal: 0,
  },

  onLoad({ code }) {
    this.roomCode = code;
    this.myUserId = app.globalData.userInfo?.id;
    this.seats = [];
    this.timerInterval = null;
    this.bindSocket();
  },

  onUnload() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  bindSocket() {
    const socket = app.globalData.socket;
    if (!socket) return;

    socket.on('game:start', ({ hand, currentTurn, seats, scoreA, scoreB }) => {
      this.seats = seats;
      this.initHand(hand);
      this.updatePlayers(seats, {});
      this.setData({ scoreA, scoreB });
      this.updateTurn(currentTurn);
    });

    socket.on('game:update', (data) => {
      if (data.lastPlay) {
        const typeLabel = TYPE_LABELS[data.lastPlay.analysis?.type] || '';
        // 获取出牌者昵称
        const playerIdx = this.seats.indexOf(data.lastPlay.userId);
        this.setData({
          lastPlay: { ...data.lastPlay, typeLabel },
        });
      }
      if (data.pass) {
        // 有人不要时不要改变 lastPlay，除非全部不要
        if (data.lastPlay === null) {
          this.setData({ lastPlay: null });
        }
      }
      if (data.scoreA !== undefined) this.setData({ scoreA: data.scoreA });
      if (data.scoreB !== undefined) this.setData({ scoreB: data.scoreB });
      if (data.handCount) this.updateHandCounts(data.handCount);
      if (data.currentTurn) this.updateTurn(data.currentTurn);
    });

    socket.on('game:borrow_light', ({ fromUserId, lastCards }) => {
      wx.showToast({ title: '借光！', icon: 'none', duration: 1500 });
    });

    socket.on('game:timeout', ({ userId }) => {
      if (userId === this.myUserId) {
        wx.showToast({ title: '出牌超时，自动不要', icon: 'none' });
        if (this.timerInterval) clearInterval(this.timerInterval);
      }
    });

    socket.on('game:end', ({ winner, scoreA, scoreB, roundScore }) => {
      if (this.timerInterval) clearInterval(this.timerInterval);
      const myTeam = this.getMyTeam();
      const myWin = myTeam === winner;
      const delta = myWin ? roundScore.winner : roundScore.loser;
      this.setData({
        scoreA, scoreB,
        gameResult: { winner, myWin, delta, effect: roundScore.effect },
      });
    });

    socket.on('game:ready_status', ({ readyCount, total }) => {
      this.setData({ readyNextCount: readyCount, readyNextTotal: total });
    });

    socket.on('game:auto_start_next', () => {
      // 自动开始下一局：重新加载
      this.setData({ gameResult: null, lastPlay: null, myReadyNext: false });
      const s = app.globalData.socket;
      if (s) s.emit('game:reconnect', { roomCode: this.roomCode });
    });

    socket.on('game:resume', ({ hand, currentTurn, scoreA, scoreB, lastPlay, seats }) => {
      this.seats = seats;
      this.initHand(hand);
      this.updatePlayers(seats, {});
      this.setData({ scoreA, scoreB, lastPlay });
      this.updateTurn(currentTurn);
    });

    socket.on('chat:message', ({ userId, type, content }) => {
      const text = type === 'emoji' ? content : content;
      const bubbles = { ...this.data.chatBubbles, [userId]: text };
      this.setData({ chatBubbles: bubbles });
      setTimeout(() => {
        const b = { ...this.data.chatBubbles };
        delete b[userId];
        this.setData({ chatBubbles: b });
      }, 3000);
    });

    // 尝试重连恢复（页面刷新或返回时）
    socket.emit('game:reconnect', { roomCode: this.roomCode });
  },

  initHand(hand) {
    const sorted = [...hand].sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
    const cardW = 72; // rpx
    const overlap = 28; // rpx
    const total = sorted.length;
    // 可视宽度约600rpx
    const viewW = 600;
    const step = total > 1 ? Math.min(cardW, (viewW - cardW) / (total - 1)) : cardW;
    const totalW = (total - 1) * step + cardW;
    const startLeft = Math.max(0, (viewW - totalW) / 2);
    const cards = sorted.map((c, i) => ({
      ...c,
      selected: false,
      left: startLeft + i * step,
    }));
    this.setData({
      hand: cards,
      handAreaWidth: Math.max(totalW, viewW),
      selectedCount: 0,
    });
  },

  tapCard(e) {
    const id = e.currentTarget.dataset.id;
    const hand = this.data.hand.map(c =>
      c.id === id ? { ...c, selected: !c.selected } : c
    );
    const selectedCount = hand.filter(c => c.selected).length;
    this.setData({ hand, selectedCount });
  },

  sortHand() {
    const hand = [...this.data.hand].sort((a, b) =>
      RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank)
    );
    const cardW = 72;
    const viewW = 600;
    const total = hand.length;
    const step = total > 1 ? Math.min(cardW, (viewW - cardW) / (total - 1)) : cardW;
    const totalW = (total - 1) * step + cardW;
    const startLeft = Math.max(0, (viewW - totalW) / 2);
    const cards = hand.map((c, i) => ({ ...c, left: startLeft + i * step }));
    this.setData({ hand: cards, handAreaWidth: Math.max(totalW, viewW) });
  },

  playCards() {
    const selected = this.data.hand.filter(c => c.selected);
    if (selected.length === 0) return;
    const socket = app.globalData.socket;
    if (!socket) return;
    socket.emit('game:play', { roomCode: this.roomCode, cards: selected });
    socket.once('error', ({ msg }) => {
      wx.showToast({ title: msg, icon: 'none' });
    });
    // 乐观更新：从手牌中移除（服务端会校验，失败时重新发送手牌）
    const ids = selected.map(c => c.id);
    const newHand = this.data.hand.filter(c => !ids.includes(c.id));
    this.initHand(newHand.map(c => ({ ...c, selected: false })));
  },

  passPlay() {
    const socket = app.globalData.socket;
    if (!socket) return;
    socket.emit('game:pass', { roomCode: this.roomCode });
  },

  updateTurn(currentTurn) {
    const isMyTurn = currentTurn === this.myUserId;
    this.setData({ isMyTurn });
    // 更新头像光圈
    const players = this.data.players.map(p => ({
      ...p,
      isActive: p.userId === currentTurn,
    }));
    this.setData({ players });
    // 重置计时器
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (isMyTurn) {
      let sec = 20;
      this.setData({ timerSec: sec });
      this.timerInterval = setInterval(() => {
        sec -= 1;
        this.setData({ timerSec: sec });
        if (sec <= 0) clearInterval(this.timerInterval);
      }, 1000);
    }
  },

  updatePlayers(seats, handCount) {
    // 重新排列：自己始终在位置0
    const myIdx = seats.indexOf(this.myUserId);
    const reordered = [];
    for (let i = 0; i < 6; i++) {
      const seatIdx = (myIdx + i) % 6;
      const userId = seats[seatIdx];
      const team = seatIdx % 2 === 0 ? 'team-a' : 'team-b';
      reordered.push({
        userId,
        nickname: userId === 'bot' ? '机器人' : (userId === this.myUserId ? '我' : '玩家'),
        avatar: '',
        team,
        isActive: false,
        handCount: handCount[userId] || 27,
        posStyle: SEAT_POSITIONS[i],
      });
    }
    this.setData({ players: reordered });
  },

  updateHandCounts(handCount) {
    const players = this.data.players.map(p => ({
      ...p,
      handCount: handCount[p.userId] !== undefined ? handCount[p.userId] : p.handCount,
    }));
    this.setData({ players });
  },

  getMyTeam() {
    if (!this.seats) return null;
    const idx = this.seats.indexOf(this.myUserId);
    return idx % 2 === 0 ? 'teamA' : 'teamB';
  },

  toggleChat() {
    this.setData({ showChatPanel: !this.data.showChatPanel });
  },

  sendPhrase(e) {
    const text = e.currentTarget.dataset.text;
    this.doSendChat('phrase', text);
  },

  sendEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.doSendChat('emoji', emoji);
  },

  doSendChat(type, content) {
    const socket = app.globalData.socket;
    if (!socket) return;
    socket.emit('chat:send', { roomCode: this.roomCode, type, content });
    this.setData({ showChatPanel: false });
  },

  readyNext() {
    if (this.data.myReadyNext) return;
    this.setData({ myReadyNext: true });
    const socket = app.globalData.socket;
    if (socket) socket.emit('game:ready_next', { roomCode: this.roomCode });
  },
});
