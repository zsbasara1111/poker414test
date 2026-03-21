const Room = require('../models/Room');
const Game = require('../models/Game');
const { createDeck, shuffle, analyzePlay, canBeat, calcScore } = require('../services/cardEngine');
const { botDecide } = require('../services/botAI');

// 发牌：162张，6人每人27张
function dealCards(seats) {
  const deck = shuffle(createDeck());
  const hands = {};
  seats.forEach((userId, i) => {
    if (userId) hands[userId] = deck.slice(i * 27, (i + 1) * 27);
  });
  return hands;
}

// 检查胜负（三种胜利条件）
// firstFinishTeam: 第一个走完牌的队伍 ('teamA'|'teamB'|null)
function checkWinner(game, seats, firstFinishTeam) {
  const teamAUsers = [seats[0], seats[2], seats[4]].filter(u => u && u !== 'bot');
  const teamBUsers = [seats[1], seats[3], seats[5]].filter(u => u && u !== 'bot');
  const aEmpty = teamAUsers.every(u => (game.hands.get(u) || []).length === 0);
  const bEmpty = teamBUsers.every(u => (game.hands.get(u) || []).length === 0);

  if (firstFinishTeam) {
    // 条件1：第一个走完牌的阵营积分 ≥ 135
    if (firstFinishTeam === 'teamA' && game.scoreA >= 135) return 'teamA';
    if (firstFinishTeam === 'teamB' && game.scoreB >= 135) return 'teamB';
    // 条件2：非第一个走完牌的阵营积分 ≥ 210
    if (firstFinishTeam === 'teamA' && game.scoreB >= 210) return 'teamB';
    if (firstFinishTeam === 'teamB' && game.scoreA >= 210) return 'teamA';
  }
  // 条件3：全队手牌都走完
  if (aEmpty) return 'teamA';
  if (bEmpty) return 'teamB';
  return null;
}

// 结算积分（输赢加减分）
function calcRoundScore(game) {
  const loserScore = game.winner === 'teamA' ? game.scoreB : game.scoreA;
  if (loserScore <= 10) return { winner: 50, loser: -50, effect: 'bigBlood' };
  if (loserScore <= 40) return { winner: 20, loser: -20, effect: 'smallBlood' };
  return { winner: 5, loser: -5, effect: 'normal' };
}

module.exports = (io) => {
  // 并发锁：防止同一局同时出牌
  const playLocks = new Map();

  io.on('connection', (socket) => {
    if (!socket.userId) return;

    // ── 开始游戏（房主触发，6人全准备） ──
    socket.on('game:start', async ({ roomCode }) => {
      const room = await Room.findOne({ roomCode });
      if (!room || room.hostId !== socket.userId) return;
      if (room.seats.includes(null)) return socket.emit('error', { msg: '人数不足，请补充玩家或机器人' });

      const hands = dealCards(room.seats);
      const game = await Game.create({
        roomCode,
        hands,
        currentTurn: room.seats[0],
        scoreA: 0, scoreB: 0,
        readyForNext: [],
      });

      room.status = 'playing';
      await room.save();

      // 向每位真人玩家单独发手牌
      room.seats.forEach((userId) => {
        if (!userId || userId === 'bot') return;
        io.to(userId).emit('game:start', {
          hand: hands[userId],
          currentTurn: game.currentTurn,
          seats: room.seats,
          scoreA: 0, scoreB: 0,
        });
      });

      // 如果第一个出牌是机器人，自动触发
      if (game.currentTurn === 'bot') {
        triggerBot(io, roomCode, null);
      }
    });

    // ── 出牌 ──
    socket.on('game:play', async ({ roomCode, cards }) => {
      if (playLocks.get(roomCode)) return socket.emit('error', { msg: '操作进行中' });
      playLocks.set(roomCode, true);
      try {
        const game = await Game.findOne({ roomCode, status: 'playing' });
        if (!game || game.currentTurn !== socket.userId) {
          return socket.emit('error', { msg: '还没轮到你' });
        }

        const analysis = analyzePlay(cards);
        if (!analysis.valid) return socket.emit('error', { msg: '牌型不合法' });
        if (game.lastPlay && !canBeat(analysis, game.lastPlay.analysis)) {
          return socket.emit('error', { msg: '管不上' });
        }

        // 从手牌中移除出出的牌
        const hand = game.hands.get(socket.userId);
        const cardIds = cards.map(c => c.id);
        const newHand = hand.filter(c => !cardIds.includes(c.id));
        game.hands.set(socket.userId, newHand);

        // 积分统计
        const score = calcScore(cards);
        const room = await Room.findOne({ roomCode });
        const seatIdx = room.seats.indexOf(socket.userId);
        if (seatIdx % 2 === 0) game.scoreA += score;
        else game.scoreB += score;

        game.lastPlay = { userId: socket.userId, cards, analysis };
        game.passCount = 0;

        // ── 借光检测 ──
        if (newHand.length === 0) {
          const teamType = seatIdx % 2 === 0 ? 'teamA' : 'teamB';
          if (!game.firstFinishTeam) {
            game.firstFinishTeam = teamType;
            const winner = checkWinner(game, room.seats, teamType);
            if (winner) {
              game.status = 'finished';
              game.winner = winner;
              await game.save();
              const roundScore = calcRoundScore(game);
              io.to(roomCode).emit('game:end', {
                winner, scoreA: game.scoreA, scoreB: game.scoreB, roundScore,
              });
              return;
            }
          }
          // 触发借光
          game.borrowLight = {
            fromUserId: socket.userId,
            nextTeammate: room.seats[(seatIdx + 2) % 6],
          };
          // 出牌权保持在下一位，等待对方应对
          const nextIdx = (seatIdx + 1) % 6;
          game.currentTurn = room.seats[nextIdx];
          await game.save();
          io.to(roomCode).emit('game:borrow_light', {
            fromUserId: socket.userId, lastCards: cards,
          });
          io.to(roomCode).emit('game:update', {
            lastPlay: game.lastPlay,
            currentTurn: game.currentTurn,
            scoreA: game.scoreA, scoreB: game.scoreB,
            handCount: Object.fromEntries([...game.hands].map(([k,v]) => [k, v.length])),
          });
          if (game.currentTurn === 'bot') triggerBot(io, roomCode, game.lastPlay);
          return;
        }

        // 移动出牌权到下一位玩家
        const nextIdx = (seatIdx + 1) % 6;
        game.currentTurn = room.seats[nextIdx];
        await game.save();

        io.to(roomCode).emit('game:update', {
          lastPlay: game.lastPlay,
          currentTurn: game.currentTurn,
          scoreA: game.scoreA, scoreB: game.scoreB,
          handCount: Object.fromEntries([...game.hands].map(([k,v]) => [k, v.length])),
        });

        // 检查胜负（条件3：全队走完）
        const winner = checkWinner(game, room.seats, game.firstFinishTeam);
        if (winner) {
          game.status = 'finished'; game.winner = winner;
          await game.save();
          const roundScore = calcRoundScore(game);
          io.to(roomCode).emit('game:end', { winner, scoreA: game.scoreA, scoreB: game.scoreB, roundScore });
          return;
        }

        // 如果下一位是机器人
        if (game.currentTurn === 'bot') triggerBot(io, roomCode, game.lastPlay);

        // 20秒超时自动不要
        startTurnTimer(io, roomCode, game.currentTurn);

      } finally {
        playLocks.delete(roomCode);
      }
    });

    // ── 不要 ──
    socket.on('game:pass', async ({ roomCode }) => {
      const game = await Game.findOne({ roomCode, status: 'playing' });
      if (!game || game.currentTurn !== socket.userId) return;

      game.passCount += 1;
      const room = await Room.findOne({ roomCode });

      // 借光状态：对方阵营全不要 → 出牌权给队友
      if (game.borrowLight) {
        const fromSeat = room.seats.indexOf(game.borrowLight.fromUserId);
        const oppositeTeam = fromSeat % 2 === 0
          ? [room.seats[1], room.seats[3], room.seats[5]]
          : [room.seats[0], room.seats[2], room.seats[4]];
        const activeOpponents = oppositeTeam.filter(u => u && (game.hands.get(u) || []).length > 0);

        if (game.passCount >= activeOpponents.length) {
          game.currentTurn = game.borrowLight.nextTeammate;
          game.borrowLight = null;
          game.lastPlay = null;
          game.passCount = 0;
          await game.save();
          io.to(roomCode).emit('game:update', { currentTurn: game.currentTurn, borrowLightEnd: true });
          if (game.currentTurn === 'bot') triggerBot(io, roomCode, null);
          return;
        }
      }

      // 5人都不要 → 重置出牌权给最后出牌者
      if (game.passCount >= 5) {
        const lastUserId = game.lastPlay?.userId;
        game.lastPlay = null;
        game.passCount = 0;
        game.currentTurn = lastUserId || game.currentTurn;
      } else {
        const nextIdx = (room.seats.indexOf(socket.userId) + 1) % 6;
        game.currentTurn = room.seats[nextIdx];
      }

      await game.save();
      io.to(roomCode).emit('game:update', {
        pass: { userId: socket.userId },
        currentTurn: game.currentTurn,
        lastPlay: game.lastPlay,
      });

      if (game.currentTurn === 'bot') triggerBot(io, roomCode, game.lastPlay);
    });

    // ── 断线后重连恢复游戏状态 ──
    socket.on('game:reconnect', async ({ roomCode }) => {
      const game = await Game.findOne({ roomCode, status: 'playing' });
      const room = await Room.findOne({ roomCode });
      if (!game || !room) return;
      socket.join(roomCode);
      socket.join(socket.userId);
      socket.emit('game:resume', {
        hand: game.hands.get(socket.userId),
        currentTurn: game.currentTurn,
        scoreA: game.scoreA, scoreB: game.scoreB,
        lastPlay: game.lastPlay,
        seats: room.seats,
      });
    });

    // ── 下一局准备 ──
    socket.on('game:ready_next', async ({ roomCode }) => {
      const game = await Game.findOne({ roomCode });
      if (!game) return;
      if (!game.readyForNext.includes(socket.userId)) {
        game.readyForNext.push(socket.userId);
        await game.save();
      }
      const room = await Room.findOne({ roomCode });
      const realPlayers = room.seats.filter(u => u && u !== 'bot');
      io.to(roomCode).emit('game:ready_status', {
        readyCount: game.readyForNext.length,
        total: realPlayers.length,
      });
      if (game.readyForNext.length >= realPlayers.length) {
        io.to(roomCode).emit('game:auto_start_next');
      }
    });

    // ── 聊天 ──
    socket.on('chat:send', ({ roomCode, type, content }) => {
      io.to(roomCode).emit('chat:message', {
        userId: socket.userId,
        type,
        content,
        ts: Date.now(),
      });
    });
  });

  // ── 机器人出牌（服务端触发，延迟800ms） ──
  async function triggerBot(io, roomCode, lastPlay) {
    setTimeout(async () => {
      const freshGame = await Game.findOne({ roomCode, status: 'playing' });
      if (!freshGame || freshGame.currentTurn !== 'bot') return;
      const room = await Room.findOne({ roomCode });
      const botHand = freshGame.hands.get('bot') || [];
      const botCards = botDecide(botHand, lastPlay);

      if (botCards) {
        // 模拟出牌
        const analysis = analyzePlay(botCards);
        const cardIds = botCards.map(c => c.id);
        freshGame.hands.set('bot', botHand.filter(c => !cardIds.includes(c.id)));
        const score = calcScore(botCards);
        const seatIdx = room.seats.indexOf('bot');
        if (seatIdx % 2 === 0) freshGame.scoreA += score;
        else freshGame.scoreB += score;
        freshGame.lastPlay = { userId: 'bot', cards: botCards, analysis };
        freshGame.passCount = 0;
        const nextIdx = (seatIdx + 1) % 6;
        freshGame.currentTurn = room.seats[nextIdx];
        await freshGame.save();
        io.to(roomCode).emit('game:update', {
          lastPlay: freshGame.lastPlay,
          currentTurn: freshGame.currentTurn,
          scoreA: freshGame.scoreA, scoreB: freshGame.scoreB,
          handCount: Object.fromEntries([...freshGame.hands].map(([k,v]) => [k, v.length])),
          botPlay: true,
        });
        if (freshGame.currentTurn === 'bot') triggerBot(io, roomCode, freshGame.lastPlay);
        else startTurnTimer(io, roomCode, freshGame.currentTurn);
      } else {
        // 机器人不要
        freshGame.passCount += 1;
        const nextIdx = (room.seats.indexOf('bot') + 1) % 6;
        if (freshGame.passCount >= 5) {
          const lastUserId = freshGame.lastPlay?.userId;
          freshGame.lastPlay = null;
          freshGame.passCount = 0;
          freshGame.currentTurn = lastUserId || freshGame.currentTurn;
        } else {
          freshGame.currentTurn = room.seats[nextIdx];
        }
        await freshGame.save();
        io.to(roomCode).emit('game:update', {
          pass: { userId: 'bot' },
          currentTurn: freshGame.currentTurn,
          lastPlay: freshGame.lastPlay,
        });
        if (freshGame.currentTurn === 'bot') triggerBot(io, roomCode, freshGame.lastPlay);
        else startTurnTimer(io, roomCode, freshGame.currentTurn);
      }
    }, 800);
  }

  // ── 20秒出牌超时 ──
  function startTurnTimer(io, roomCode, turnUserId) {
    if (!turnUserId || turnUserId === 'bot') return;
    setTimeout(async () => {
      const freshGame = await Game.findOne({ roomCode, status: 'playing' });
      if (!freshGame || freshGame.currentTurn !== turnUserId) return; // 已经换人了
      io.to(roomCode).emit('game:timeout', { userId: turnUserId });
      freshGame.passCount += 1;
      const room = await Room.findOne({ roomCode });
      const nextIdx = (room.seats.indexOf(turnUserId) + 1) % 6;
      freshGame.currentTurn = room.seats[nextIdx];
      await freshGame.save();
      io.to(roomCode).emit('game:update', {
        pass: { userId: turnUserId },
        currentTurn: freshGame.currentTurn,
        auto: true,
      });
      if (freshGame.currentTurn === 'bot') triggerBot(io, roomCode, freshGame.lastPlay);
    }, 20000);
  }
};
