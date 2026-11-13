// Pure calculator logic. No DOM access.
// Works in the browser (window.Calculator) and in Node tests (require).

const OPERATORS = ['+', '-', '*', '/'];
const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const MAX_DIGITS = 15;

class Calculator {
  constructor() {
    this._clear();
  }

  // key ∈ '0'..'9', '.', '+', '-', '*', '/', '=', 'C', 'Backspace'. Unknown keys are ignored.
  press(key) {
    const isDigit = key.length === 1 && key >= '0' && key <= '9';
    const known = isDigit || key === '.' || key === '=' || key === 'C' ||
      key === 'Backspace' || OPERATORS.includes(key);
    if (!known) return;

    // Any key in an error state clears first, then applies to an empty calculator.
    if (this.error) this._clear();

    if (isDigit) this._digit(key);
    else if (key === '.') this._dot();
    else if (key === '=') this._equals();
    else if (key === 'C') this._clear();
    else if (key === 'Backspace') this._backspace();
    else this._operator(key);
  }

  getDisplay() {
    if (this.error) return { expression: this.error, preview: '' };
    const expression = this.tokens
      .map((t, i) => (i % 2 === 0 ? Calculator.group(t) : OP_SYMBOL[t]))
      .join('');
    return { expression, preview: this._preview() };
  }

  // --- private helpers -------------------------------------------------

  _last() {
    return this.tokens[this.tokens.length - 1];
  }

  // True when the last token is a number (tokens alternate number, operator, ...).
  _endsInNumber() {
    return this.tokens.length % 2 === 1;
  }

  // A complete expression: at least one operator and ends in a real number.
  _isComplete() {
    return this.tokens.length >= 3 && this._endsInNumber() && this._last() !== '-';
  }

  _preview() {
    if (this.justEvaluated || !this._isComplete()) return '';
    const value = Calculator.evaluate(this.tokens);
    if (value === null || !isFinite(value)) return '';
    return Calculator.group(Calculator.format(value));
  }

  _clear() {
    this.tokens = [];
    this.justEvaluated = false;
    this.error = null;
  }

  _startFreshIfEvaluated() {
    if (this.justEvaluated) {
      this.tokens = [];
      this.justEvaluated = false;
    }
  }

  _digit(d) {
    this._startFreshIfEvaluated();
    if (!this._endsInNumber()) {
      this.tokens.push(d);
      return;
    }
    const last = this._last();
    if (last.includes('e')) return; // exponent-form numbers can't be typed into
    if (last === '0' || last === '-0') {
      this.tokens[this.tokens.length - 1] = last.slice(0, -1) + d;
      return;
    }
    if (last.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
    this.tokens[this.tokens.length - 1] = last + d;
  }

  _dot() {
    this._startFreshIfEvaluated();
    if (!this._endsInNumber()) {
      this.tokens.push('0.');
      return;
    }
    const last = this._last();
    if (last.includes('.') || last.includes('e')) return;
    this.tokens[this.tokens.length - 1] = last === '-' ? '-0.' : last + '.';
  }

  _operator(op) {
    this.justEvaluated = false;
    const t = this.tokens;

    if (t.length === 0) {
      if (op === '-') t.push('-');
      return;
    }

    if (this._endsInNumber()) {
      const last = this._last();
      if (last === '-') {
        if (t.length === 1) return; // lone minus at the start: ignore
        t.pop(); // lone minus after × or ÷: drop it, then replace that operator
        t[t.length - 1] = op;
        return;
      }
      if (last.endsWith('.')) t[t.length - 1] = last.slice(0, -1);
      t.push(op);
      return;
    }

    // Last token is an operator.
    const prevOp = this._last();
    if (op === '-' && (prevOp === '*' || prevOp === '/')) {
      t.push('-'); // start a negative number
      return;
    }
    t[t.length - 1] = op;
  }

  _equals() {
    if (this.justEvaluated || !this._isComplete()) return;
    const value = Calculator.evaluate(this.tokens);
    if (value === null) {
      this.error = Calculator.ERROR_DIV_ZERO;
      return;
    }
    if (!isFinite(value)) {
      this.error = Calculator.ERROR_TOO_LARGE;
      return;
    }
    this.tokens = [Calculator.format(value)];
    this.justEvaluated = true;
  }

  _backspace() {
    this.justEvaluated = false;
    const t = this.tokens;
    if (t.length === 0) return;
    const last = this._last();
    // Exponent-form numbers are cleared whole, never trimmed.
    const trimmed = this._endsInNumber() && last.includes('e') ? '' : last.slice(0, -1);
    if (trimmed === '') t.pop();
    else t[t.length - 1] = trimmed;
  }

  // Evaluate a complete token list (number, op, number, ...) with BODMAS.
  // Returns null if any division has a zero divisor.
  static evaluate(tokens) {
    // Pass 1: fold * and / left to right.
    const terms = [parseFloat(tokens[0])];
    const ops = [];
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const n = parseFloat(tokens[i + 1]);
      if (op === '*') {
        terms[terms.length - 1] *= n;
      } else if (op === '/') {
        if (n === 0) return null;
        terms[terms.length - 1] /= n;
      } else {
        ops.push(op);
        terms.push(n);
      }
    }
    // Pass 2: fold + and - left to right.
    let result = terms[0];
    for (let i = 0; i < ops.length; i++) {
      result = ops[i] === '+' ? result + terms[i + 1] : result - terms[i + 1];
    }
    return result;
  }

  // Raw result text, with floating-point noise removed at display time.
  static format(n) {
    const s = String(parseFloat(n.toPrecision(12)));
    return s === '-0' ? '0' : s;
  }

  // Display form of one raw number token: commas, − sign, compact exponent.
  static group(raw) {
    let sign = '';
    let body = raw;
    if (body.startsWith('-')) {
      sign = '−';
      body = body.slice(1);
    }
    if (body.includes('e')) {
      return sign + body.replace('e+', 'e').replace('e-', 'e−');
    }
    const dot = body.indexOf('.');
    const intPart = dot === -1 ? body : body.slice(0, dot);
    const rest = dot === -1 ? '' : body.slice(dot);
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + grouped + rest;
  }
}

Calculator.ERROR_DIV_ZERO = 'Error: Cannot divide by zero';
Calculator.ERROR_TOO_LARGE = 'Error: Result too large';

if (typeof module !== 'undefined' && module.exports) module.exports = Calculator;
else window.Calculator = Calculator;
