const request = require('../../utils/request');
const { connect } = require('../../utils/socket');
const app = getApp();

Page({
  data: { loading: false },

  onLoad() {
    // 已登录直接跳转
    if (wx.getStorageSync('token')) {
      wx.redirectTo({ url: '/pages/home/home' });
    }
  },

  async onLogin() {
    this.setData({ loading: true });
    try {
      const { code } = await wx.login();
      const res = await request.post('/api/auth/login', { code });
      wx.setStorageSync('token', res.token);
      wx.setStorageSync('userInfo', res.user);
      app.globalData.token = res.token;
      app.globalData.userInfo = res.user;
      app.globalData.socket = connect(res.token);
      wx.redirectTo({ url: '/pages/home/home' });
    } catch (e) {
      console.error('登录失败', e);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
