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
