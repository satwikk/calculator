# Calculator v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a four-function BODMAS calculator that looks like Android Calculator v9.3 and runs from `index.html` over file://.

**Architecture:** `src/calculator.js` is a pure state machine. It stores the expression as a token list, takes key presses through `press(key)` and returns display strings through `getDisplay()`. `src/app.js` maps clicks and keystrokes to key names and routes both through one `handleKey` → render → flash path. All behaviour is tested in Node. The DOM is checked by hand.

**Tech Stack:** Plain HTML/CSS/JS with classic `<script>` tags, and `node:test` + `node:assert`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-calculator-v1-design.md` (read it first; it holds the full key-rules table).

## Global Constraints

- No frameworks, npm packages, CDNs, web fonts, or `type="module"` / `import` / `export` in browser code.
- `index.html` loads `src/calculator.js` and then `src/app.js` with classic `<script src>` tags.
- `calculator.js` has no DOM access and ends with:
  `if (typeof module !== 'undefined' && module.exports) module.exports = Calculator; else window.Calculator = Calculator;`
- Only these files: `index.html`, `src/calculator.js`, `src/app.js`, `src/styles.css`, `tests/*.test.js`. Ask the user before adding others.
- Divide-by-zero copy, exactly: `Error: Cannot divide by zero`
- Display symbols are `×` `÷` `−` (U+2212), used for both the operator and the negative sign. Internal keys are `*` `/` `-`.
- Work on branch `calculator-v1`. Write the failing test before any logic. Run `node --test tests/` before claiming anything passes.

## Review Focus

1. **Overflow to Infinity:** a run like `999999999999999*999999999999999=` repeated can reach `Infinity`. Treat any non-finite result like divide-by-zero, with the message `Error: Result too large` on `=` and a blank preview. *(Planner's call. Test in Task 2.)*
2. **Backspace on a grouped number:** `12345` shows `12,345`, and Backspace must give `1,234`, never leave a stray comma. Tokens never hold commas. *(Test in Task 2.)*
3. **Holding a key down:** keyboard auto-repeat fires many keydowns. Each one must apply, and the flash must restart instead of stacking timers. *(Manual check in Task 4.)*
4. **Enter while a button has focus** after a mouse click: it must not press that button as well as `=`, so mapped keys call `preventDefault()`. *(Manual check in Task 4.)*
5. **Preview mid-negative:** `5*-` (a lone `−` after an operator) shows a blank preview, and `=` does nothing. *(Test in Task 2.)*

---

## Token model (used by Tasks 1–2)

`tokens: string[]` alternates **number, operator, number, …**, so the even indices are numbers and the odd indices are operators (`'+' '-' '*' '/'`). Number tokens are raw strings: `'0.'`, `'-'` (a lone minus), `'-12.5'`, `'1e+21'`. The position of a token, not its text, tells a lone `'-'` number apart from the `'-'` operator.

Example: `5×−3` → `['5','*','-3']`.

---

### Task 1: Pure helpers — evaluate, format, group

**Files:**
- Create: `src/calculator.js`
- Test: `tests/format.test.js`

**Interfaces:**
- Produces (static members on `Calculator`):
  - `Calculator.evaluate(tokens: string[]) → number | null`. Applies BODMAS left to right. Returns `null` if any division has a zero divisor. Assumes a complete expression (odd length, last token is a number). Number tokens are read with `parseFloat` (so `'3.'` is 3).
  - `Calculator.format(n: number) → string`. Raw result text: `String(parseFloat(n.toPrecision(12)))`, with `-0` → `'0'`.
  - `Calculator.group(raw: string) → string`. Display form of one number token: commas in the integer part, a leading `-` → `−`, `e+` → `e`, `e-` → `e−`, and no grouping in exponent form.
  - `Calculator.ERROR_DIV_ZERO = 'Error: Cannot divide by zero'`, `Calculator.ERROR_TOO_LARGE = 'Error: Result too large'`.
  - `Calculator` is a class. Its constructor and instance methods arrive in Task 2. For now an empty class with the statics is enough.

- [ ] **Step 1: Write the failing tests** in `tests/format.test.js` (`const Calculator = require('../src/calculator.js');`):

```js
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
```

- [ ] **Step 2: Run** `node --test tests/format.test.js`. Expected: FAIL (`Cannot find module` or `not a function`).
- [ ] **Step 3: Implement** the statics and the dual export in `src/calculator.js`. `evaluate` makes two passes over a copy: the first folds `*` and `/`, the second folds `+` and `-`. `group` must not use `toLocaleString`, so that results are the same in every locale.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all PASS.
- [ ] **Step 5: Commit** with `git add src/calculator.js tests/format.test.js` and then `git commit -m "Add calculator evaluate/format/group helpers"`.

---

### Task 2: Calculator state machine — press() and getDisplay()

**Files:**
- Modify: `src/calculator.js`
- Test: `tests/calculator.test.js`

**Interfaces:**
- Consumes: the Task 1 statics.
- Produces:
  - `new Calculator()`
  - `calc.press(key: string) → void`, where `key ∈ '0'..'9' '.' '+' '-' '*' '/' '=' 'C' 'Backspace'`. Unknown keys are ignored.
  - `calc.getDisplay() → { expression: string, preview: string }`
    - `expression` is the tokens joined with no spaces. Number tokens go through `group`, and operators are mapped `*`→`×`, `/`→`÷`, `-`→`−`, `+`→`+`. In an error state, `expression` is the error message.
    - `preview` is `''` unless the tokens have length ≥ 3, the last token is a number other than `'-'`, the state is not `justEvaluated`, and evaluating gives a finite number. In that case it is `group(format(value))`. A trailing `.` is ignored when evaluating.
  - Internal state: `tokens`, `justEvaluated`, `error` (`null` or a message string).

The spec's key-rules table is the source of truth. These are the planner's decisions on top of it:
- `Backspace` trims one character from the last token and pops the token if it becomes empty. After `=`, a result containing `e` is cleared instead of trimmed.
- An operator after the lone `'-'` at index 0 is ignored. An operator after a lone `'-'` that follows an operator pops the `'-'` and then replaces that operator (`5*-` then `+` → `5+`).
- After `=` succeeds, `tokens = [format(value)]` and `justEvaluated = true`. A non-finite value sets `error = ERROR_TOO_LARGE`.
- Digits are counted without the sign or the `.`. When a number already has 15, further digits are ignored. A `0` token followed by a digit is replaced (`'0'`→`'5'`, `'-0'`→`'-5'`).

- [ ] **Step 1: Write the failing tests** in `tests/calculator.test.js`. Use this helper so the tests stay short:

```js
const KEY = { B: 'Backspace' };              // other chars map to themselves
function run(seq) { const c = new Calculator(); for (const ch of seq) c.press(KEY[ch] || ch); return c.getDisplay(); }
const expr = s => run(s).expression, prev = s => run(s).preview;
```

Write one `test()` per behaviour, with these assertions:

| Test name | Assertions |
|---|---|
| BODMAS | `expr('10-2+3=')==='11'`, `expr('8/2*4=')==='16'`, `expr('2+3*4=')==='14'` |
| floating point | `expr('0.1+0.2=')==='0.3'` |
| repeated equals does nothing | `expr('2+3==')==='5'`, `expr('2+3===')==='5'` |
| divide by zero on = | `expr('8/0=')==='Error: Cannot divide by zero'`, `prev('8/0')===''`, `expr('8/0')==='8÷0'` |
| divide by 0.5 is fine | `prev('8/0.5')==='16'` |
| live preview | `run('2+3*4')` deep-equals `{expression:'2+3×4', preview:'14'}`, `prev('5')===''`, `prev('5+')===''` |
| digit after = starts fresh | `expr('2+3=7')==='7'` |
| operator after = continues | `expr('2+3=+2')==='5+2'` |
| operator replaces operator | `expr('5+*')==='5×'` |
| negative start | `expr('-5+2=')==='−3'`, `expr('+')===''`, `expr('*')===''` |
| negative after × ÷ | `expr('5*-3')==='5×−3'`, `expr('5*-3=')==='−15'`, `expr('5*-+')==='5+'`, `expr('5+-')==='5−'` |
| lone minus | `prev('5*-')===''`, `expr('5*-=')==='5×−'`, `expr('-+')==='−'` |
| decimals | `expr('.5')==='0.5'`, `expr('1.2.3')==='1.23'`, `expr('2+3=.')==='0.'`, `expr('3.+1=')==='4'` |
| leading zeros | `expr('005')==='5'`, `expr('-05')==='−5'` |
| = with incomplete input does nothing | `expr('5+=')==='5+'`, `expr('5=')==='5'`, `expr('=')===''`, `expr('5=7')==='57'` |
| C clears | `run('2+3C')` deep-equals `{expression:'', preview:''}` |
| backspace | `expr('123B')==='12'`, `expr('5+B')==='5'`, `expr('2+3=B')===''`, `expr('12+34=B')==='4'` |
| backspace on grouped number | `expr('12345B')==='1,234'` |
| thousands separators | `expr('1234567')==='1,234,567'`, `prev('1000*1000')==='1,000,000'` |
| error then any key | `expr('8/0=7')==='7'`, `expr('8/0=+')===''`, `expr('8/0=-')==='−'`, `expr('8/0=B')===''` |
| digit limit | `expr('1234567890123456')==='123,456,789,012,345'` |
| exponent results | build `1e21` with `run('1000000000000*1000000000=')` → `expression==='1e21'`; pressing `B` after it → `''`; pressing `+2=` after it → `'1e21'` (since `1e21+2` formats to `1e21`) |
| overflow | Start from `999999999999999` and repeat `*999999999999999=` exactly 20 times in a loop. The value passes 1.8e308 on the 20th repeat, giving `expression === 'Error: Result too large'`. With 19 repeats followed by `*999999999999999` (no `=`), `preview === ''` |

- [ ] **Step 2: Run** `node --test tests/calculator.test.js`. Expected: FAIL (`Calculator is not a constructor` or failing assertions).
- [ ] **Step 3: Implement** the `constructor`, `press` and `getDisplay` in `src/calculator.js`. Give each key type its own small private method (`_digit`, `_dot`, `_operator`, `_equals`, `_backspace`, `_clear`), so the rules are easy to trace back to the spec table.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all PASS, including Task 1.
- [ ] **Step 5: Commit** with `git add src/calculator.js tests/calculator.test.js` and then `git commit -m "Add calculator key handling and display state"`.

---

### Task 3: Markup and Android-style layout

**Files:**
- Create: `index.html`, `src/styles.css`

**Interfaces:**
- Produces (relied on by Task 4):
  - Display elements: `#expression` and `#preview`.
  - 18 `<button>` elements with `data-key` set to `C` `Backspace` `/` `7` `8` `9` `*` `4` `5` `6` `-` `1` `2` `3` `+` `0` `.` `=`, in reading order, matching the spec's layout grid.
  - Visible labels: `C`, `⌫`, `÷`, `×`, `−`, `+`, `=`, `.` and the digits. Give `⌫` `aria-label="Backspace"`.
  - Class `pressed`, which is the highlight style.
  - Classes for colour roles: `key-num`, `key-op`, `key-eq`, `key-clear` (⌫ uses `key-op`).

- [ ] **Step 1: Write `index.html`.** Use `<!doctype html>`, `lang="en"`, `<title>Calculator</title>`, and a `<link>` to `src/styles.css`. The body holds a `<main class="calc">` with a display `<section>` and a `<div class="keys">` grid. At the end of the body, add `<script src="src/calculator.js"></script>` and then `<script src="src/app.js"></script>`.
- [ ] **Step 2: Write `src/styles.css`.**
  - Put colours in custom properties on `:root`, taken from Android's default Material You baseline (light).
  - Use a system font stack (`system-ui, "Segoe UI", Roboto, sans-serif`).
  - The `.calc` card is about 360–400 px wide and centred in the viewport.
  - `.keys` is `display:grid; grid-template-columns:repeat(4,1fr)`. `C` and `0` use `grid-column: span 2`.
  - Buttons are large and pill-shaped or round, with gaps between them.
  - `#expression` is large and right-aligned, with `white-space:nowrap; overflow-x:auto`. Long text shrinks through a modifier class that Task 4 toggles. `#preview` is smaller, grey and right-aligned.
  - `.pressed` is clearly visible: a darker tone plus a smaller corner radius or `transform: scale(.95)`, with a transition of about 100 ms.
- [ ] **Step 3: Verify.** Run `start index.html`. The page loads with no console errors (there will be one about `app.js` until Task 4, which is expected). The grid matches the spec layout, and C and 0 are double width. Compare it side by side with an Android Calculator screenshot.
- [ ] **Step 4: Commit** with `git add index.html src/styles.css` and then `git commit -m "Add calculator markup and Android-style layout"`.

---

### Task 4: DOM and keyboard wiring with shared highlight

**Files:**
- Create: `src/app.js`

**Interfaces:**
- Consumes: `window.Calculator` (Task 2) and the DOM contract (Task 3).
- Produces: `handleKey(name: string)`, the single path for both inputs. It calls `calc.press(name)`, then `render()`, then `flash(button)`.

- [ ] **Step 1: Implement `src/app.js`** as a classic script wrapped in an IIFE, with no globals except what's read from `window`.
  - **Click handler:** one delegated listener on `.keys` that reads `event.target.closest('button').dataset.key`.
  - **Keydown map:** `0`–`9`, `.`, `+`, `-`, `*`, `/` map to themselves. `x`/`X` → `*`, `Enter` and `=` → `=`, `Escape` → `C`, `Backspace` → `Backspace`. Unmapped keys, and keys pressed with Ctrl, Meta or Alt, are ignored. Mapped keys call `preventDefault()`. Numpad keys produce the same `event.key` values.
  - **`render()`:** writes `getDisplay()` to `#expression` and `#preview` as `textContent`, toggles the font-shrink class when the expression is longer than about 12 characters, and scrolls `#expression` to its right end.
  - **`flash(btn)`:** keeps one timer per button. It clears any existing timer, removes `pressed` and forces a reflow (`void btn.offsetWidth`), then adds `pressed` and removes it after 150 ms.
  - **After a click:** call `btn.blur()` so that focus doesn't linger.
- [ ] **Step 2: Run** `node --test tests/`. Expected: all PASS. app.js isn't tested in Node, but this confirms nothing has regressed.
- [ ] **Step 3: Manual checklist.** Run `start index.html` in Chrome, Edge and Firefox, and tick each item:
  - Mouse: `10-2+3=` shows `11`; `8/2*4=` shows `16`; `0.1+0.2=` shows `0.3`; `8/0=` shows the error.
  - Keyboard: the same four sequences, typed. Esc clears, Backspace deletes, Enter and `=` evaluate, and `x` multiplies.
  - Every mouse click and every key press flashes the matching on-screen button.
  - Holding `5` down repeats input, and the `5` button stays highlighted until about 150 ms after you release it.
  - Click `7`, then press Enter: the result is `=` applied once, and no extra `7` appears.
  - `/` in Firefox does not open quick-find.
  - A long expression (30+ digits) shrinks and scrolls, and never wraps or overflows the card.
  - There are no console errors when the page is opened from file://.
- [ ] **Step 4: Commit** with `git add src/app.js` and then `git commit -m "Wire mouse and keyboard input with shared highlight"`.
