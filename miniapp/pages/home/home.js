const request = require('../../utils/request');
const app = getApp();

Page({
  data: { userInfo: null },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  onShow() {
    // 刷新用户信息（修改昵称后）
    this.setData({ userInfo: wx.getStorageSync('userInfo') || app.globalData.userInfo });
  },

  async createRoom() {
    wx.showLoading({ title: '创建中...' });
    try {
      const res = await request.post('/api/room/create', {});
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?code=${res.roomCode}` });
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
    }
  },

  joinRoom() {
    wx.showModal({
      title: '加入房间',
      placeholderText: '输入6位房间码',
      editable: true,
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        const code = res.content.trim().toUpperCase();
        wx.showLoading({ title: '加入中...' });
        try {
          const r = await request.post('/api/room/join', { roomCode: code });
          wx.hideLoading();
          wx.navigateTo({ url: `/pages/room/room?code=${r.roomCode}` });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: e.error || '加入失败', icon: 'none' });
        }
      },
    });
  },

  quickMatch() {
    const socket = app.globalData.socket;
    if (!socket) return wx.showToast({ title: '请先登录', icon: 'none' });
    wx.showLoading({ title: '匹配中...' });
    socket.emit('match:join');
    socket.once('match:found', ({ roomCode }) => {
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?code=${roomCode}` });
    });
    socket.once('match:waiting', ({ position }) => {
      wx.hideLoading();
      wx.showToast({ title: `排队中 第${position}位`, icon: 'loading', duration: 3000 });
    });
  },

  editProfile() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入新昵称（最多12字）',
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        const nickname = res.content.trim().slice(0, 12);
        try {
          const r = await request.put('/api/auth/profile', { nickname });
          const userInfo = { ...app.globalData.userInfo, ...r.user };
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.userInfo = userInfo;
          this.setData({ userInfo });
          wx.showToast({ title: '修改成功', icon: 'success' });
        } catch {
          wx.showToast({ title: '修改失败', icon: 'none' });
        }
      },
    });
  },
});
