const { analyzePlay, canBeat, calcScore, createDeck } = require('./cardEngine');

test('单张识别', () => {
  const r = analyzePlay([{ rank: 'A', suit: '♠' }]);
  expect(r).toMatchObject({ type: 'single', lu: 1, valid: true });
});

test('炸弹识别（3张K）', () => {
  const r = analyzePlay([{rank:'K',suit:'♠'},{rank:'K',suit:'♥'},{rank:'K',suit:'♦'}]);
  expect(r).toMatchObject({ type: 'bomb', lu: 3, valid: true });
});

test('幺识别（A+2个4）', () => {
  const r = analyzePlay([{rank:'A',suit:'♠'},{rank:'4',suit:'♥'},{rank:'4',suit:'♦'}]);
  expect(r).toMatchObject({ type: 'yao', lu: 4, valid: true });
});

test('王炸识别（大王+小王）', () => {
  const r = analyzePlay([{rank:'大王',suit:'joker'},{rank:'小王',suit:'joker'}]);
  expect(r).toMatchObject({ type: 'joker_bomb', valid: true });
});

test('顺子识别（456）', () => {
  const r = analyzePlay([{rank:'4',suit:'♠'},{rank:'5',suit:'♥'},{rank:'6',suit:'♦'}]);
  expect(r).toMatchObject({ type: 'straight', lu: 3, valid: true });
});

test('双龙识别（445566）', () => {
  const r = analyzePlay([
    {rank:'4',suit:'♠'},{rank:'4',suit:'♥'},
    {rank:'5',suit:'♠'},{rank:'5',suit:'♥'},
    {rank:'6',suit:'♠'},{rank:'6',suit:'♥'},
  ]);
  expect(r).toMatchObject({ type: 'dragon', lu: 6, valid: true });
});

test('canBeat: 炸弹管单张', () => {
  const single = analyzePlay([{rank:'3',suit:'♠'}]);
  const bomb = analyzePlay([{rank:'K',suit:'♠'},{rank:'K',suit:'♥'},{rank:'K',suit:'♦'}]);
  expect(canBeat(bomb, single)).toBe(true);
});

test('canBeat: 大单张管小单张', () => {
  const a = analyzePlay([{rank:'A',suit:'♠'}]);
  const k = analyzePlay([{rank:'K',suit:'♠'}]);
  expect(canBeat(a, k)).toBe(true);
  expect(canBeat(k, a)).toBe(false);
});

test('canBeat: 幺管炸弹（同路数幺最大）', () => {
  const yao = analyzePlay([{rank:'A',suit:'♠'},{rank:'4',suit:'♥'},{rank:'4',suit:'♦'}]); // lu=4
  const bomb = analyzePlay([{rank:'K',suit:'♠'},{rank:'K',suit:'♥'},{rank:'K',suit:'♦'},{rank:'K',suit:'♣'}]); // lu=4
  expect(canBeat(yao, bomb)).toBe(true);
});

test('calcScore: 5+K+10=25分', () => {
  const cards = [{rank:'5',suit:'♠'},{rank:'K',suit:'♥'},{rank:'10',suit:'♦'}];
  expect(calcScore(cards)).toBe(25);
});

test('createDeck 生成162张牌', () => {
  expect(createDeck()).toHaveLength(162);
});
