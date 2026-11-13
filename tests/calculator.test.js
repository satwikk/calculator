const test = require('node:test');
const assert = require('node:assert');
const Calculator = require('../src/calculator.js');

const KEY = { B: 'Backspace' };              // other chars map to themselves
function run(seq, c = new Calculator()) { for (const ch of seq) c.press(KEY[ch] || ch); return c.getDisplay(); }
const expr = s => run(s).expression, prev = s => run(s).preview;

const BIG = '999999999999'; // 12 digits, the input limit

test('BODMAS', () => {
  assert.strictEqual(expr('10-2+3='), '11');
  assert.strictEqual(expr('8/2*4='), '16');
  assert.strictEqual(expr('2+3*4='), '14');
});
test('floating point', () => {
  assert.strictEqual(expr('0.1+0.2='), '0.3');
});
test('repeated equals does nothing', () => {
  assert.strictEqual(expr('2+3=='), '5');
  assert.strictEqual(expr('2+3==='), '5');
});
test('divide by zero on =', () => {
  assert.strictEqual(expr('8/0='), 'Error: Cannot divide by zero');
  assert.strictEqual(prev('8/0'), '');
  assert.strictEqual(expr('8/0'), '8÷0');
});
test('divide by 0.5 is fine', () => {
  assert.strictEqual(prev('8/0.5'), '16');
});
test('live preview', () => {
  assert.deepStrictEqual(run('2+3*4'), { expression: '2+3×4', preview: '14' });
  assert.strictEqual(prev('5'), '');
  assert.strictEqual(prev('5+'), '');
});
test('digit after = starts fresh', () => {
  assert.strictEqual(expr('2+3=7'), '7');
});
test('operator after = continues', () => {
  assert.strictEqual(expr('2+3=+2'), '5+2');
});
test('operator replaces operator', () => {
  assert.strictEqual(expr('5+*'), '5×');
});
test('negative start', () => {
  assert.strictEqual(expr('-5+2='), '−3');
  assert.strictEqual(expr('+'), '');
  assert.strictEqual(expr('*'), '');
});
test('negative after × ÷', () => {
  assert.strictEqual(expr('5*-3'), '5×−3');
  assert.strictEqual(expr('5*-3='), '−15');
  assert.strictEqual(expr('5*-+'), '5+');
  assert.strictEqual(expr('5+-'), '5−');
});
test('lone minus', () => {
  assert.strictEqual(prev('5*-'), '');
  assert.strictEqual(expr('5*-='), '5×−');
  assert.strictEqual(expr('-+'), '−');
});
test('decimals', () => {
  assert.strictEqual(expr('.5'), '0.5');
  assert.strictEqual(expr('1.2.3'), '1.23');
  assert.strictEqual(expr('2+3=.'), '0.');
  assert.strictEqual(expr('3.+1='), '4');
});
test('leading zeros', () => {
  assert.strictEqual(expr('005'), '5');
  assert.strictEqual(expr('-05'), '−5');
});
test('= with incomplete input does nothing', () => {
  assert.strictEqual(expr('5+='), '5+');
  assert.strictEqual(expr('5='), '5');
  assert.strictEqual(expr('='), '');
  assert.strictEqual(expr('5=7'), '57');
});
test('C clears', () => {
  assert.deepStrictEqual(run('2+3C'), { expression: '', preview: '' });
});
test('backspace', () => {
  assert.strictEqual(expr('123B'), '12');
  assert.strictEqual(expr('5+B'), '5');
  assert.strictEqual(expr('2+3=B'), '');
  assert.strictEqual(expr('12+34=B'), '4');
});
test('backspace on grouped number', () => {
  assert.strictEqual(expr('12345B'), '1,234');
});
test('thousands separators', () => {
  assert.strictEqual(expr('1234567'), '1,234,567');
  assert.strictEqual(prev('1000*1000'), '1,000,000');
});
test('error then any key', () => {
  assert.strictEqual(expr('8/0=7'), '7');
  assert.strictEqual(expr('8/0=+'), '');
  assert.strictEqual(expr('8/0=-'), '−');
  assert.strictEqual(expr('8/0=B'), '');
});
test('digit limit', () => {
  assert.strictEqual(expr('1234567890123'), '123,456,789,012');
});
test('exponent results', () => {
  const seq = '100000000000*10000000000='; // 1e11 × 1e10 = 1e21
  assert.strictEqual(expr(seq), '1e21');
  assert.strictEqual(expr(seq + 'B'), '');
  assert.strictEqual(expr(seq + '+2='), '1e21');
});
test('exponent number: backspace clears it and digits are ignored', () => {
  const seq = '100000000000*10000000000='; // 1e11 × 1e10 = 1e21
  assert.strictEqual(expr(seq + '+B'), '1e21');
  assert.strictEqual(expr(seq + '+BB'), '');
  assert.strictEqual(expr(seq + '+B5'), '1e21');
  assert.strictEqual(expr(seq + '+B.'), '1e21');
});
test('overflow', () => {
  const c = new Calculator();
  run(BIG, c);
  for (let i = 0; i < 25; i++) run('*' + BIG + '=', c);
  assert.strictEqual(c.getDisplay().expression, 'Error: Result too large');
  assert.strictEqual(c.getDisplay().preview, '');

  const d = new Calculator();
  run(BIG, d);
  for (let i = 0; i < 24; i++) run('*' + BIG + '=', d);
  run('*' + BIG, d);
  assert.strictEqual(d.getDisplay().preview, '');
});
test('unknown keys are ignored', () => {
  assert.strictEqual(expr('2a+3'), '2+3');
});
test('continuing from a result keeps full precision', () => {
  assert.strictEqual(expr('1/3=*3='), '1');
  assert.strictEqual(expr('1/7=*7='), '1');
  assert.strictEqual(prev('1/3=*3'), '1');
});
test('every typed digit survives display rounding', () => {
  assert.strictEqual(expr('123456789012+0='), '123,456,789,012');
  assert.strictEqual(expr('1.15-1.1='), '0.05');
});
