const { connect } = require('./utils/socket');

App({
  globalData: {
    token: '',
    userInfo: null,
    socket: null,
  },
  onLaunch() {
    this.globalData.token = wx.getStorageSync('token') || '';
    this.globalData.userInfo = wx.getStorageSync('userInfo') || null;
    // 已登录则自动连接 Socket
    if (this.globalData.token) {
      this.globalData.socket = connect(this.globalData.token);
    }
  },
});
