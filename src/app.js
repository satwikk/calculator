// DOM and keyboard wiring only. All calculator rules live in calculator.js.
(function () {
  'use strict';

  const FLASH_MS = 150;
  const SHRINK_AFTER = 12; // characters

  const calc = new window.Calculator();
  const expressionEl = document.getElementById('expression');
  const previewEl = document.getElementById('preview');
  const keysEl = document.querySelector('.keys');
  const toggleBtn = document.getElementById('history-toggle');
  const historyEl = document.getElementById('history');
  const historyListEl = document.getElementById('history-list');
  const historyEmptyEl = document.getElementById('history-empty');
  const clearBtn = document.getElementById('history-clear');

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
    renderHistory();
  }

  // Rebuild the history list. textContent only: entries are data, never markup.
  function renderHistory() {
    const entries = calc.getHistory();
    const items = entries.map(function (entry, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-entry';
      btn.tabIndex = -1; // mouse only: never reachable or activatable from the keyboard
      btn.dataset.index = String(i);
      const expr = document.createElement('span');
      expr.className = 'history-expr';
      expr.textContent = entry.expression;
      const result = document.createElement('span');
      result.className = 'history-result';
      result.textContent = '= ' + entry.result;
      btn.append(expr, result);
      const li = document.createElement('li');
      li.append(btn);
      return li;
    });
    historyListEl.replaceChildren.apply(historyListEl, items);
    historyEmptyEl.hidden = entries.length > 0;
  }

  function toggleHistory() {
    const open = historyEl.hidden;
    historyEl.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', String(open));
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

  toggleBtn.addEventListener('click', function () {
    toggleHistory();
    flash(toggleBtn);
    toggleBtn.blur();
  });

  clearBtn.addEventListener('click', function () {
    calc.clearHistory();
    render();
    clearBtn.blur();
  });

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      toggleHistory();
      flash(toggleBtn);
      return;
    }
    const name = KEYMAP[event.key];
    if (name === undefined) return;
    event.preventDefault();
    handleKey(name);
  });

  render();
})();
