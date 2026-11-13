// DOM and keyboard wiring only. All calculator rules live in calculator.js.
(function () {
  'use strict';

  const FLASH_MS = 150;
  const SHRINK_AFTER = 12; // characters

  const calc = new window.Calculator();
  const expressionEl = document.getElementById('expression');
  const previewEl = document.getElementById('preview');
  const keysEl = document.querySelector('.keys');

  // event.key → calculator key name. Numpad keys produce the same event.key values.
  const KEYMAP = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': '.', '+': '+', '-': '-', '*': '*', '/': '/',
    'x': '*', 'X': '*',
    'Enter': '=', '=': '=',
    'Escape': 'C',
    'Backspace': 'Backspace',
  };

  const flashTimers = new Map();

  function buttonFor(name) {
    return keysEl.querySelector('button[data-key="' + CSS.escape(name) + '"]');
  }

  function render() {
    const { expression, preview } = calc.getDisplay();
    expressionEl.textContent = expression;
    previewEl.textContent = preview;
    // Error messages get their own smaller, wrapping style so the whole message is readable.
    const isError = expression.startsWith('Error');
    expressionEl.classList.toggle('error', isError);
    expressionEl.classList.toggle('shrink', !isError && expression.length > SHRINK_AFTER);
    expressionEl.scrollLeft = expressionEl.scrollWidth;
  }

  // Restart the highlight on every press, never stacking timers.
  function flash(btn) {
    if (!btn) return;
    clearTimeout(flashTimers.get(btn));
    btn.classList.remove('pressed');
    void btn.offsetWidth; // force reflow so the transition restarts
    btn.classList.add('pressed');
    flashTimers.set(btn, setTimeout(function () {
      btn.classList.remove('pressed');
      flashTimers.delete(btn);
    }, FLASH_MS));
  }

  // The single shared path for mouse and keyboard input.
  function handleKey(name) {
    calc.press(name);
    render();
    flash(buttonFor(name));
  }

  keysEl.addEventListener('click', function (event) {
    const btn = event.target.closest('button');
    if (!btn || !keysEl.contains(btn)) return;
    handleKey(btn.dataset.key);
    btn.blur();
  });

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const name = KEYMAP[event.key];
    if (name === undefined) return;
    event.preventDefault();
    handleKey(name);
  });

  render();
})();
