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
