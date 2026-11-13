const test = require('node:test');
const assert = require('node:assert');
const Calculator = require('../src/calculator.js');

test('evaluate: BODMAS and left-to-right', () => {
  assert.strictEqual(Calculator.evaluate(['10','-','2','+','3']), 11);
  assert.strictEqual(Calculator.evaluate(['8','/','2','*','4']), 16);
  assert.strictEqual(Calculator.evaluate(['2','+','3','*','4']), 14);
  assert.strictEqual(Calculator.evaluate(['5','*','-3']), -15);
  assert.strictEqual(Calculator.evaluate(['3.','+','1']), 4);
});
test('evaluate: divide by zero returns null', () => {
  assert.strictEqual(Calculator.evaluate(['8','/','0']), null);
  assert.strictEqual(Calculator.evaluate(['1','+','8','/','0','*','2']), null);
});
test('format: floating point fixed at display', () => {
  assert.strictEqual(Calculator.format(0.1 + 0.2), '0.3');
  assert.strictEqual(Calculator.format(-0), '0');
  assert.strictEqual(Calculator.format(1e21), '1e+21');
});
test('group: thousands separators and symbols', () => {
  assert.strictEqual(Calculator.group('1234567.891'), '1,234,567.891');
  assert.strictEqual(Calculator.group('-12345'), '−12,345');
  assert.strictEqual(Calculator.group('999'), '999');
  assert.strictEqual(Calculator.group('1234.'), '1,234.');
  assert.strictEqual(Calculator.group('0.'), '0.');
  assert.strictEqual(Calculator.group('-'), '−');
  assert.strictEqual(Calculator.group('1e+21'), '1e21');
  assert.strictEqual(Calculator.group('1e-7'), '1e−7');
});
