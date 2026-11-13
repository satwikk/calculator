// Pure calculator logic. No DOM access.
// Works in the browser (window.Calculator) and in Node tests (require).

class Calculator {
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
