const router = require('express').Router();
const auth = require('../middleware/auth');
const { wxLogin, updateProfile } = require('../controllers/authController');
router.post('/login', wxLogin);
router.put('/profile', auth, updateProfile);
module.exports = router;
