const { analyzePlay, canBeat } = require('./cardEngine');

// 机器人出牌策略：尝试出能管住的最小牌，否则不要
function botDecide(hand, lastPlay) {
  if (!lastPlay) {
    // 无上家，出最小单张
    const order = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
    const sorted = [...hand].sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
    return [sorted[0]];
  }
  // 尝试找能管上的单张（简单策略）
  const order = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
  const sorted = [...hand].sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
  for (const card of sorted) {
    const analysis = analyzePlay([card]);
    if (analysis.valid && canBeat(analysis, lastPlay.analysis)) return [card];
  }
  return null; // 不要
}

module.exports = { botDecide };
