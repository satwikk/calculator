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

function withThird() { const c = new Calculator(); run('1/3=', c); return c; } // history[0] = ⅓
test('loading replaces the expression and acts like a fresh result', () => {
  const c = new Calculator(); run('2+3=', c); run('7', c);
  c.useEntry(0);
  assert.deepStrictEqual(c.getDisplay(), { expression: '5', preview: '' });
  run('1', c); assert.strictEqual(c.getDisplay().expression, '1');       // digit starts fresh
  c.useEntry(0); run('+2', c); assert.strictEqual(c.getDisplay().expression, '5+2'); // operator continues
});
test('loading after an operator inserts the result as the next number', () => {
  const c = new Calculator(); run('40+2=', c); run('5+', c);
  c.useEntry(0);
  assert.deepStrictEqual(c.getDisplay(), { expression: '5+42', preview: '47' });
});
test('loading into a lone minus negates the result', () => {
  const c = new Calculator(); run('40+2=', c); run('5*-', c);
  c.useEntry(0);
  assert.deepStrictEqual(c.getDisplay(), { expression: '5×−42', preview: '−210' });
});
test('loaded values keep full precision', () => {
  const c = withThird(); run('3*', c); c.useEntry(0);
  assert.strictEqual(c.getDisplay().preview, '1');
  run('=', c); assert.strictEqual(c.getDisplay().expression, '1');
  const d = withThird(); run('C', d); d.useEntry(0); run('*3=', d);
  assert.strictEqual(d.getDisplay().expression, '1');
});
test('editing a loaded value drops its hidden precision', () => {
  // 10/3 shows as 3.33333333333 (12 digits). B then 3 retypes the identical text,
  // but the preview must use the typed digits, not the hidden exact 10/3.
  // (⅓ can't be used here: the 12-digit input cap counts its leading 0, so the 3 is rejected.)
  const c = new Calculator(); run('10/3=', c); run('3*', c); c.useEntry(0);
  assert.strictEqual(c.getDisplay().preview, '10');
  run('B3', c);
  assert.deepStrictEqual(c.getDisplay(), { expression: '3×3.33333333333', preview: '9.99999999999' });
});
test('loading after an error clears it and keeps history', () => {
  const c = new Calculator(); run('2+3=', c); run('8/0=', c);
  c.useEntry(0);
  assert.strictEqual(c.getDisplay().expression, '5');
  assert.strictEqual(c.getHistory().length, 1);
});
test('loading does not add to history; bad index is ignored', () => {
  const c = new Calculator(); run('2+3=', c); run('9', c);
  c.useEntry(5); c.useEntry(-1);
  assert.strictEqual(c.getDisplay().expression, '9');
  c.useEntry(0); run('=', c);                       // = right after loading does nothing
  assert.strictEqual(c.getHistory().length, 1);
});
test('backspacing away a loaded value forgets its precision', () => {
  // 0.1*3*10 = 3.0000000000000004, shown as 3. Loaded after "3-" its hidden value is visible in the preview.
  const c = new Calculator(); run('0.1*3*10=', c); run('3-', c); c.useEntry(0);
  assert.strictEqual(c.getDisplay().preview, '−4.4408920985e−16');
  run('B3', c);                                      // pop the token, retype the same text
  assert.deepStrictEqual(c.getDisplay(), { expression: '3−3', preview: '0' });
});
