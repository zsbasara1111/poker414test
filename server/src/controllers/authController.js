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
      user = await User.create({ openid, nickname: '玩家' + Math.floor(Math.random() * 9999) });
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
