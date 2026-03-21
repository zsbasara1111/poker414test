// 牌面大小顺序（索引越大越大）
const RANK_ORDER = ['4','5','6','7','8','9','10','J','Q','K','A','2','3','小王','大王'];
// 分值牌
const SCORE_MAP = { '5': 5, '10': 10, 'K': 10 };

// 生成3副牌（162张）
function createDeck() {
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['4','5','6','7','8','9','10','J','Q','K','A','2','3'];
  const deck = [];
  for (let d = 0; d < 3; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit, id: `${d}-${rank}${suit}` });
      }
    }
    deck.push({ rank: '小王', suit: 'joker', id: `${d}-小王` });
    deck.push({ rank: '大王', suit: 'joker', id: `${d}-大王` });
  }
  return deck;
}

// Fisher-Yates 洗牌
function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// 牌面大小比较（返回 rank 在 RANK_ORDER 中的索引）
function rankValue(rank) {
  return RANK_ORDER.indexOf(rank);
}

// 计算一组牌的路数
// 返回 { type, lu, value, valid }
// type: 'single'|'pair'|'straight'|'dragon'|'bomb'|'yao'|'joker_bomb'
function analyzePlay(cards) {
  const n = cards.length;
  if (n === 0) return { valid: false };

  const ranks = cards.map(c => c.rank);
  const jokerCount = ranks.filter(r => r === '大王' || r === '小王').length;

  // 王炸
  if (jokerCount === n && n >= 2) {
    const bigCount = ranks.filter(r => r === '大王').length;
    const smallCount = ranks.filter(r => r === '小王').length;
    const lu = bigCount * 2.5 + smallCount * 1.5;
    return { type: 'joker_bomb', lu, value: lu, valid: true };
  }

  // 幺：1张A + n张4（n≥2）
  const aCount = ranks.filter(r => r === 'A').length;
  const fourCount = ranks.filter(r => r === '4').length;
  if (aCount === 1 && fourCount >= 2 && n === aCount + fourCount) {
    const lu = fourCount * 2; // 每张4算2路
    return { type: 'yao', lu, value: lu, valid: true };
  }

  // 炸弹：所有牌同一点数（≥3）
  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length === 1 && n >= 3) {
    return { type: 'bomb', lu: n, value: rankValue(uniqueRanks[0]), valid: true };
  }

  // 单张
  if (n === 1) return { type: 'single', lu: 1, value: rankValue(ranks[0]), valid: true };

  // 对子
  if (n === 2 && uniqueRanks.length === 1) {
    return { type: 'pair', lu: 2, value: rankValue(uniqueRanks[0]), valid: true };
  }

  // 顺子：n张连续不同点数（n≥3）
  if (n >= 3 && uniqueRanks.length === n) {
    const vals = ranks.map(rankValue).sort((a, b) => a - b);
    // 顺子不含王
    if (vals.some(v => v >= rankValue('小王'))) return { valid: false };
    const isConsecutive = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
    if (isConsecutive) {
      return { type: 'straight', lu: n, value: vals[vals.length - 1], valid: true };
    }
  }

  // 双龙：连续对子（≥3对）
  if (n >= 6 && n % 2 === 0) {
    const pairCount = n / 2;
    const sorted = [...ranks].sort((a, b) => rankValue(a) - rankValue(b));
    let valid = true;
    const pairRanks = [];
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i] !== sorted[i+1]) { valid = false; break; }
      pairRanks.push(sorted[i]);
    }
    if (valid && pairRanks.length === pairCount) {
      const uniquePairs = [...new Set(pairRanks)];
      if (uniquePairs.length === pairCount) {
        const vals = pairRanks.map(rankValue).sort((a, b) => a - b);
        const isConseq = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
        if (isConseq) {
          return { type: 'dragon', lu: pairCount * 2, value: vals[vals.length-1], valid: true };
        }
      }
    }
  }

  return { valid: false };
}

// 判断 newPlay 是否能管住 lastPlay
function canBeat(newPlay, lastPlay) {
  if (!newPlay.valid || !lastPlay.valid) return false;
  // 路数更大直接能管
  if (newPlay.lu > lastPlay.lu) return true;
  // 路数相同：比牌面大小
  if (newPlay.lu === lastPlay.lu) {
    // 幺最大，王炸第二
    const priority = { yao: 3, joker_bomb: 2 };
    const np = priority[newPlay.type] || 1;
    const lp = priority[lastPlay.type] || 1;
    if (np !== lp) return np > lp;
    // 顺子/双龙：必须张数相同
    if (newPlay.type === 'straight' || newPlay.type === 'dragon') {
      if (newPlay.lu !== lastPlay.lu) return false;
    }
    return newPlay.value > lastPlay.value;
  }
  return false;
}

// 统计一组牌中的得分
function calcScore(cards) {
  return cards.reduce((sum, c) => sum + (SCORE_MAP[c.rank] || 0), 0);
}

module.exports = { createDeck, shuffle, analyzePlay, canBeat, calcScore, rankValue };
