const test = require('node:test');
const assert = require('node:assert');
const Calculator = require('../src/calculator.js');

const KEY = { B: 'Backspace' };              // other chars map to themselves
function run(seq, c = new Calculator()) { for (const ch of seq) c.press(KEY[ch] || ch); return c.getDisplay(); }

test('records successful calculations, newest first', () => {
  const c = new Calculator(); run('2+3=', c); run('7*6=', c);
  assert.deepStrictEqual(c.getHistory().map(e => [e.expression, e.result]), [['7×6', '42'], ['2+3', '5']]);
});
test('entry keeps display formatting and full value', () => {
  const c = new Calculator(); run('1234+0.1=', c);
  assert.strictEqual(c.getHistory()[0].expression, '1,234+0.1');
  assert.strictEqual(c.getHistory()[0].result, '1,234.1');
  const d = new Calculator(); run('1/3=', d);
  assert.strictEqual(d.getHistory()[0].value, 1 / 3);
});
test('errors are not recorded', () => {
  const c = new Calculator(); run('8/0=', c);
  assert.strictEqual(c.getHistory().length, 0);
  const d = new Calculator(); run('999999999999', d);
  for (let i = 0; i < 25; i++) run('*999999999999=', d);   // 25th overflows
  assert.strictEqual(d.getHistory().length, 24);
});
test('repeated = records once', () => {
  const c = new Calculator(); run('2+3===', c);
  assert.strictEqual(c.getHistory().length, 1);
});
test('trailing decimal is dropped from the recorded expression', () => {
  const c = new Calculator(); run('5+3.=', c);
  assert.strictEqual(c.getHistory()[0].expression, '5+3');
});
test('C keeps history; clearHistory empties it', () => {
  const c = new Calculator(); run('2+3=C', c);
  assert.strictEqual(c.getHistory().length, 1);
  c.clearHistory();
  assert.deepStrictEqual(c.getHistory(), []);
});
test('getHistory returns a copy', () => {
  const c = new Calculator(); run('2+3=', c);
  c.getHistory().pop();
  assert.strictEqual(c.getHistory().length, 1);
});
