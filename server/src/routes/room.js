const router = require('express').Router();
const auth = require('../middleware/auth');
const { createRoom, joinRoom, getRoom, addBot } = require('../controllers/roomController');
router.post('/create', auth, createRoom);
router.post('/join', auth, joinRoom);
router.get('/:code', auth, getRoom);
router.post('/:code/bot', auth, addBot);
module.exports = router;
