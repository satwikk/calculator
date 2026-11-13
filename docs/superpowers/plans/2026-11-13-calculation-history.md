# Calculation History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-only calculation history in a side panel. A subtle clock toggle (mouse or **H**) shows and hides it, and clicking an entry loads its result into the calculator.

**Architecture:** `Calculator` (pure, in `src/calculator.js`) records an entry on each successful `=`. It exposes `getHistory()`, `clearHistory()` and `useEntry(index)`. v1's single-slot `carry` becomes a per-token full-precision map, so a loaded value stays exact wherever it sits in the expression. `src/app.js` renders the panel and wires the toggle, H, entry clicks and Clear. Every highlight goes through the existing `flash()`.

**Tech Stack:** Plain HTML/CSS/JS with classic `<script>` tags, and `node:test` + `node:assert`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-calculation-history-design.md` (read it first; it is the source of truth for behaviour).

## Global Constraints

- No frameworks, npm packages, CDNs, web fonts, or `type="module"` / `import` / `export` in browser code. The app must work from `file://`.
- `calculator.js` stays DOM-free and keeps its existing `module.exports` / `window.Calculator` footer.
- No new files. Only `index.html`, `src/*.js`, `src/styles.css`, `tests/*.test.js`, `README.md` and `docs/` change.
- With the panel closed, the v1 calculator looks and behaves exactly as before. Enter = `=`, Esc = C, and Backspace are unchanged.
- **H** / **h** (with no Ctrl/Alt/Meta) only toggles the panel. Loading an entry and Clear are mouse-only.
- Only successful `=` presses are recorded. Errors and repeated `=` presses are never recorded. C does not clear history.
- Empty-state copy, exactly: `No history yet`. Clear button copy: `Clear`. Toggle: `aria-label="History"` and `aria-expanded`.
- Work on branch `feature/calculator-v2`. Write the failing test before logic changes. Run `node --test tests/` (31 tests pass today) before claiming anything passes. End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Trailing decimal at `=`:** `5+3.=` must record the expression `5+3`, not `5+3.`. *(Test in Task 1.)*
2. **Loading into a lone minus:** after `5*-` (display `5×−`), loading `42` must give `5×−42`, with value −42. *(Planner's call. Test in Task 2.)*
3. **Loading after an error:** `8/0=` then loading an entry clears the error, loads the result, and keeps the history. *(Test in Task 2.)*
4. **Editing a loaded value drops its hidden precision:** with ⅓ loaded after `3*`, the preview is `1`. After Backspace and typing `3`, the preview must be `0.999999999999` (the typed digits), as v1 does after `=`. *(Test in Task 2.)*
5. **Focus after a mouse click:** after clicking an entry, the toggle or Clear, pressing Space or Enter must not activate that control again. Enter must still mean `=`. *(Manual check in Task 4.)*

---

### Task 1: Record successful calculations

**Files:**
- Modify: `src/calculator.js` (constructor, `_equals`, new public methods)
- Test: `tests/history.test.js` (new test file; allowed by the `tests/*.test.js` layout)

**Interfaces:**
- Produces:
  - `HistoryEntry = { expression: string, result: string, value: number }`. `expression` is the display form before `=` (e.g. `'1,234+0.1'`, `'7×6'`, no spaces) with any trailing `.` removed from the last number. `result` is the display form of the result (`Calculator.group(Calculator.format(value))`). `value` is the full-precision number.
  - `getHistory(): HistoryEntry[]` returns a new array, newest first.
  - `clearHistory(): void`
  - `this.history` is set up in the constructor **before** `_clear()`, and `_clear()` never touches it.

- [ ] **Step 1: Write the failing tests** in `tests/history.test.js`, copying the `KEY` / `run` helpers from `tests/calculator.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/history.test.js`
Expected: FAIL with `c.getHistory is not a function`

- [ ] **Step 3: Implement it.** Add `this.history = []` to the constructor before `this._clear()`. In `_equals`, on the success path only, build the expression from the tokens (same mapping as `getDisplay`, with the trailing `.` stripped from the last number token) and `unshift` the entry. Then add `getHistory()` (returns `slice()`) and `clearHistory()`.

- [ ] **Step 4: Run all tests**

Run: `node --test tests/`
Expected: all pass (31 existing + 7 new)

- [ ] **Step 5: Commit**

```bash
git add src/calculator.js tests/history.test.js
git commit -m "Record successful calculations in history"
```

---

### Task 2: Load an entry into the calculator

**Files:**
- Modify: `src/calculator.js` (replace `carry` with a per-token map; add `useEntry`)
- Test: `tests/history.test.js`

**Interfaces:**
- Consumes: `getHistory()`, `HistoryEntry` (Task 1).
- Produces: `useEntry(index: number): void`. `index` is a position in `getHistory()` (0 = newest). An index that isn't an integer in range does nothing.

**Behaviour (from the spec):**
- If an error is showing, clear it first (the history stays).
- **Waiting for a number:** tokens are non-empty and the last token is an operator. Push the raw result text (`Calculator.format(entry.value)`). `justEvaluated = false`.
- **Lone minus:** the last token is `'-'` after `×`/`÷`. Replace it with `Calculator.format(-entry.value)` and use exact value `-entry.value`. *(Planner's call.)*
- **Otherwise** (empty, result showing, or mid-number): `tokens = [raw result]`, `justEvaluated = true`. This is identical to the state just after a `=`.
- In all cases the inserted token keeps its full precision.

- [ ] **Step 1: Write the failing tests** in `tests/history.test.js`:

```js
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
  const c = withThird(); run('3*', c); c.useEntry(0); run('B3', c);
  assert.strictEqual(c.getDisplay().preview, '0.999999999999');
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/history.test.js`
Expected: FAIL with `c.useEntry is not a function`

- [ ] **Step 3: Generalise full precision.** Replace `this.carry` with `this.exact`, a `Map` from token index to `{ text, value }`. `_exactTokens()` substitutes `String(value)` for every index whose token still equals `text`. Reset the map in `_clear()` and `_startFreshIfEvaluated()`. `_equals` sets index 0. `_digit`, `_dot` and `_backspace` delete the entry for the token they edit or pop, which replaces v1's `if (t.length === 1) this.carry = null`. Any branch of `_operator` that pops or overwrites a number token deletes that index too. The existing test `continuing from a result keeps full precision` must still pass.

- [ ] **Step 4: Implement `useEntry(index)`** in `src/calculator.js` following the behaviour above.

- [ ] **Step 5: Run all tests**

Run: `node --test tests/`
Expected: all pass (31 + 7 + 7)

- [ ] **Step 6: Commit**

```bash
git add src/calculator.js tests/history.test.js
git commit -m "Load a history entry into the calculator at full precision"
```

---

### Task 3: History panel and subtle toggle

**Files:**
- Modify: `index.html`, `src/styles.css`, `src/app.js`

**Interfaces:**
- Consumes: `getHistory()`, `clearHistory()` (Task 1).
- Produces (DOM, used by Task 4): `#history-toggle` (button), `#history` (`<aside>`, has `hidden` when closed), `#history-list` (`<ol>`), `#history-empty` (`<p>`), `#history-clear` (button). Each entry is `<li><button type="button" class="history-entry" tabindex="-1" data-index="i">` holding `<span class="history-expr">` and `<span class="history-result">= …</span>`. In `app.js`: `renderHistory()`, called from `render()`, and `toggleHistory()`.

**Layout decisions:**
- Wrap `main.calc` and the aside in `<div class="app">` (`position: relative`). The panel is `position: absolute; left: 100%; top: 0; height: 100%`, with a 16px gap, about 280px wide, and the same surface, radius and shadow as `.calc`. The list scrolls inside the panel. This keeps the calculator centred in exactly its v1 position when the panel opens.
- At `max-width: 979px` the panel becomes static and sits under the calculator at full calculator width (`.app` becomes a column). *(Planner's call for "narrow window".)*
- The toggle goes absolutely in the display's top-left corner (`.display` gets `position: relative`). It uses an inline SVG clock (about 20px), `color: var(--on-surface-variant)`, `opacity: .45`, a transparent background and no border. On hover it goes to `opacity: 1`. With `[aria-expanded="true"]` it gets `opacity: 1` and `color: var(--eq-bg)`. With `.pressed` it gets a brief round tint, so `flash()` works on it. It must not shift the expression text.
- Entry text is right-aligned and matches the display: the expression in `--on-surface-variant` and the result in `--on-surface`. `.history-entry.pressed` gets a `--num-bg-pressed` background.

- [ ] **Step 1: Add the markup** in `index.html`: the wrapper, the toggle button (`aria-label="History"`, `aria-expanded="false"`, `aria-controls="history"`), and `<aside id="history" class="history" aria-label="History" hidden>` containing an `<h2>History</h2>`, the list, the empty message `No history yet`, and `<button id="history-clear" type="button" tabindex="-1">Clear</button>`.

- [ ] **Step 2: Add the styles** in `src/styles.css` as decided above. Add `.history[hidden] { display: none; }` so the author `display` rule cannot override `hidden`.

- [ ] **Step 3: Wire it in `src/app.js`.**
  - `renderHistory()` rebuilds `#history-list` from `calc.getHistory()` with `textContent` (no `innerHTML` with data), and shows `#history-empty` only when the list is empty. Call it from `render()`.
  - `toggleHistory()` flips `hidden` and `aria-expanded`.
  - Click on the toggle: `toggleHistory(); flash(toggleBtn); toggleBtn.blur();`
  - In the keydown handler, after the modifier check and before the `KEYMAP` lookup: if `event.key` is `'h'` or `'H'`, call `preventDefault()`, `toggleHistory()` and `flash(toggleBtn)`, then return.
  - Click on Clear: `calc.clearHistory(); render(); clearBtn.blur();`

- [ ] **Step 4: Run the tests** (no logic changed)

Run: `node --test tests/`
Expected: all pass

- [ ] **Step 5: Manual check** (`start index.html`, then Chrome, Edge and Firefox):
  - On load, the app looks like v1 apart from a faint clock in the display corner.
  - Clicking the clock, or pressing H or h, opens and closes the panel and flashes the clock. The calculator doesn't move. Ctrl+H still opens the browser's history and doesn't toggle the panel.
  - `2+3=`, `7*6=` and `8/0=` give two entries, newest first. The error isn't listed.
  - Clear empties the list and shows `No history yet`. C clears only the calculator.
  - At a narrow window width, the panel sits below the calculator.

- [ ] **Step 6: Commit**

```bash
git add index.html src/styles.css src/app.js
git commit -m "Add history side panel with subtle toggle (H key)"
```

---

### Task 4: Click an entry to load it, and README

**Files:**
- Modify: `src/app.js`, `README.md`

**Interfaces:**
- Consumes: `useEntry(index)` (Task 2), `#history-list` and `.history-entry[data-index]` (Task 3), `flash()`, `render()`.

- [ ] **Step 1: Wire entry clicks.** Add one delegated click listener on `#history-list` that finds `.history-entry`, reads `i = Number(btn.dataset.index)`, and calls `calc.useEntry(i); render();`. Then call `flash()` on the button **re-queried after `render()`** (`[data-index="i"]`), because `render()` rebuilds the list. Blur it afterwards.

- [ ] **Step 2: Update `README.md`** with a short "Calculation history" section covering the clock toggle and H, click to load (mouse only), only successful calculations recorded, Clear, and session-only (cleared on reload).

- [ ] **Step 3: Run the tests**

Run: `node --test tests/`
Expected: all pass

- [ ] **Step 4: Manual check** in Chrome, Edge and Firefox:
  - `1/3=`, then `C3*`, then click the ⅓ entry: the display shows `3×0.333333333333`, the preview is `1`, and `=` gives `1`.
  - `40+2=`, then `5*-`, then click the 42 entry: the display shows `5×−42`.
  - With a result showing, clicking an entry replaces it, and the clicked entry flashes.
  - After clicking an entry, pressing Enter gives `=` and doesn't reload the entry. Space does nothing. Tab never lands on an entry or on Clear.
  - `8/0=`, then clicking an entry: the error is replaced by that result.

- [ ] **Step 5: Commit**

```bash
git add src/app.js README.md
git commit -m "Load history entry on click; document history in README"
```
