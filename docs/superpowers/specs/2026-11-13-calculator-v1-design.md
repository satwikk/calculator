# Calculator v1 — Design

Date: 2026-11-13
Status: draft, awaiting approval
Requirements: [docs/PRODUCT.md](../../PRODUCT.md) · Rules: [CLAUDE.md](../../../CLAUDE.md)

## Intent

A basic four-function calculator. It is built as a hands-on exercise in learning to build
apps with Claude, so the result should be simple to read and test-driven, and every rule
should be easy to trace from the brief to a test to the code. It should look like Google's
Android Calculator (com.google.android.calculator) v9.3.

## Goals

- Add, subtract, multiply and divide decimal numbers, following BODMAS.
- Full mouse and keyboard input. Both highlight the pressed on-screen key through one shared path.
- Every behaviour rule in PRODUCT.md, plus the decisions below, has a passing `node:test` test.
- It opens by double-clicking `index.html` (file://), with no server, build step, dependencies or internet.

## Non-goals (v1)

- Brackets, percent, ± key, scientific functions, history, memory and themes.
- Mobile or touch-specific behaviour beyond what works by default.

## Anti-goals (a failure even if it technically works)

- Buttons on screen that do nothing.
- Logic mixed into DOM code, which would make the rules untestable from Node.
- A pocket-calculator "running total" result (`2+3×4 = 20`).

## Constraints

These come from CLAUDE.md and PRODUCT.md:
- Plain HTML/CSS/JS, classic `<script>` tags (no modules), with `src/calculator.js` loaded before `src/app.js`.
- `calculator.js` has no DOM access and uses the dual export (`module.exports` / `window.Calculator`).
- System fonts only. Targets the latest Chrome, Edge and Firefox.
- Files are limited to the layout in CLAUDE.md: `index.html`, `src/calculator.js`, `src/app.js`,
  `src/styles.css` and `tests/*.test.js`.
- Write a failing test first for any logic change. Small commits, on branch `calculator-v1`, not `main`.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | **Token list + two-pass evaluation.** State is an array like `[2,'+',3,'*',4]`. Pass 1 folds `*` `/` left-to-right; pass 2 folds `+` `-` left-to-right. | About 30 readable lines. Edits such as replacing an operator or ignoring a second dot are list operations, and each rule is a small testable function. Supporting brackets later would need a rework. |
| B | Expression string + shunting-yard parser. | General and bracket-ready, but more code than four operators need. Edits become string surgery that is harder to test. |
| C | Immediate-execution running total. | Simplest, but it breaks BODMAS and can't show the whole expression. Rejected. |

The user chose A.

## Decisions made with the user

1. **Keypad is calculator style**, with 7-8-9 on top. The brief's "telephone keyboard style"
   wording is overridden by the Android visual target.
2. **Display shows the whole expression**, large, with a **live result preview** under it, smaller and grey.
3. **Android's `( )` and `%` buttons are left out.** The grid is adjusted so nothing on screen is dead.
4. **The clear key is labelled `C`**, as in the brief, not Android's `AC`.
5. **The divide-by-zero message appears only on `=`.** While the expression would divide by zero, the preview is blank.
6. Android-style behaviours, accepted as proposed:
   - After `=`, a digit starts a new calculation, and an operator continues from the result (`14` → `14+2`).
   - Two operators in a row: the second replaces the first (`5+×` → `5×`).
   - A leading `−` starts a negative number. A second `.` in the same number is ignored.
   - The keys `x` (as ×) and `=` (as =) also work, in addition to the keys in the brief.
   - After an error, the next key clears the error and starts fresh.
   - Every press, by mouse or keyboard, flashes the matching on-screen key for about 150 ms.
7. **Large numbers show thousands separators** (`1,234,567`), as Android does.

## Layout

```
┌──────────────────────┐
│               2+3×4  │  expression: large, right-aligned
│                  14  │  preview: smaller, grey, right-aligned
├──────────────────────┤
│ [   C   ]   ⌫    ÷   │  C spans 2 columns
│   7    8    9    ×   │
│   4    5    6    −   │
│   1    2    3    +   │
│ [   0   ]   .    =   │  0 spans 2 columns
└──────────────────────┘
```

A 4-column CSS grid. Display symbols are `×`, `÷` and `−`. Internally they are `*`, `/` and `-`.

## Logic design (`src/calculator.js`)

### Public shape

```js
const calc = new Calculator();
calc.press(key);    // key ∈ '0'..'9', '.', '+', '-', '*', '/', '=', 'C', 'Backspace'
calc.getDisplay();  // → { expression: '2+3×4', preview: '14' }
```

`app.js` turns every input into one of these key names, calls `press`, and renders
`getDisplay()`. It does nothing else to the calculator. Pure helpers such as
`Calculator.evaluate(tokens)` and `Calculator.format(number)` are exposed as static methods
so they can be tested on their own.

### State

- `tokens`: alternating numbers and operators. The number being typed is kept as a **string**
  (e.g. `'0.'`, `'-'`, `'12.50'`) so partial input survives until evaluation.
- `justEvaluated`: true right after a successful `=`.
- `error`: `null` or the error message string.

### Key rules

| Situation | Result |
|---|---|
| Digit | Appends to the current number. `0` then `5` → `5` (no leading zeros). After `=` or an error, starts fresh. |
| `.` | Adds a decimal point to the current number. If there's no number yet, it starts `0.`. A second `.` in the same number is ignored. After `=`, starts fresh as `0.`. |
| Operator on an empty expression | `-` starts a negative number. `+`, `*` and `/` are ignored. |
| `-` right after `*` or `/` | Starts a negative number (`5×−3` = −15), as Android does. *(My call.)* |
| Operator after an operator | Replaces it, except in the `-` case above. If the expression ends in `×−` or `÷−`, a new operator replaces both. |
| Operator after `=` | Continues from the result. |
| Operator after `x.` | Drops the trailing `.` (`3.` → `3`), then applies the operator. *(My call.)* |
| `=` | Evaluates. A trailing `.` is dropped first. On success, the expression becomes the formatted result, the preview is blank, and `justEvaluated` is set. |
| `=` again (nothing changed) | Does nothing. |
| `=` with a trailing operator, a lone `-`, empty input, or no operator at all (e.g. `5`) | Does nothing, and `justEvaluated` keeps its value. *(My call.)* |
| `=` with division by zero anywhere | The expression shows `Error: Cannot divide by zero` and the preview is blank. |
| `C` | Resets everything. |
| `Backspace` | Removes the last character (a digit, a `.` or an operator). After `=`, it edits the result as a normal number. If the result is in exponent form (`1e21`), it clears the result instead. In an error state, it clears. *(My call on the exponent case.)* |
| Digit limit | At most 15 significant digits per typed number. Further digits are ignored. *(My call.)* |
| Any key in an error state | Clears first, then the key applies to an empty calculator. |

### Preview

The preview shows the formatted value of the expression when it contains at least one operator
and ends in a number. Otherwise it is blank, and it is also blank when the expression would
divide by zero.

### Evaluation and formatting

- Pass 1: fold `*` and `/` left to right. Pass 2: fold `+` and `-` left to right.
  Division by zero produces the error.
- Numbers are calculated as ordinary JS numbers. Display formatting uses
  `parseFloat(x.toPrecision(12))` and then `String(...)`, so `0.1+0.2` → `0.3`. A result of `-0` displays as `0`.
- Very large or very small results come out in JS exponent form (`1e+21`). They are displayed as `1e21`, and an
  operator can continue from them. *(My call.)*
- **Thousands separators (user decision):** the expression and the preview show the integer part of every number
  grouped with commas: `1,234,567.891`, `−12,345`. This is display only. Tokens hold raw strings (`'1234567.891'`),
  so typing, Backspace and evaluation never see commas. Grouping applies while typing too (`12345` shows `12,345`).
  Exponent-form numbers are not grouped. One pure helper, `Calculator.group(str)`, is tested separately.

## UI wiring (`src/app.js`)

- Each button has `data-key="7"`, `data-key="*"`, and so on.
- A keyboard map converts `event.key` to a key name: digits, `.`, `+ - * /`, `x`→`*`,
  `Enter` and `=`→`=`, `Escape`→`C`, `Backspace`→`Backspace`. Other keys are ignored. Mapped
  keys call `preventDefault()`, which stops Enter from re-clicking a focused button and stops
  `/` from triggering the browser's quick-find.
- **One shared path:** both the click handler and the keydown handler call `handleKey(name)`,
  which does `calc.press(name)` → render → `flash(button)`. `flash` adds a `pressed` class and
  removes it after about 150 ms, restarting the flash if the same key is pressed again quickly.

## Visual style (`src/styles.css`)

Match the Android Calculator v9.3, using Material You. As a starting point, from memory (the
builder should check against screenshots):
- light background, large round or pill-shaped buttons with a gap between them;
- number keys in a light neutral tonal colour, operators in a stronger tonal accent,
  `=` in the strongest accent, and `C` in its own tonal colour;
- a large light-weight font for the expression and a smaller grey one for the preview, both right-aligned;
- the `pressed` highlight is clearly visible, for example a darker tone with a slight scale or shape change.
- **Page:** a phone-sized calculator card, about 360–400 px wide, centred in the browser window on a neutral background. *(My call.)*
- **Palette:** Android's default Material You baseline colours, not colours taken from a wallpaper. *(My call.)*
- Long expressions shrink the font, then scroll horizontally, so the display never wraps or overflows.

## Testing

- `tests/calculator.test.js` uses `node:test` + `node:assert` and runs with `node --test tests/`.
- Every PRODUCT.md behaviour rule and every row of the key-rules table has a test that drives
  `press()` sequences and checks `getDisplay()`. Required cases include `10-2+3=11`, `8/2*4=16`,
  `0.1+0.2=0.3`, repeated `=` doing nothing, and the divide-by-zero message.
- DOM wiring, keyboard mapping and highlighting are checked by hand in each target browser,
  using a short checklist in the plan. Node has no DOM, and CLAUDE.md allows no dependencies such as jsdom.

## Left to the builder

- Exact colours, radii, spacing and font sizes, matched to the Android app.
- How to structure the code inside `calculator.js`, within the public shape above.
- Commit granularity and task order, as long as tests come first.
- Behaviour for an operator pressed right after a lone `-` (e.g. `-` then `+`), as long as it is consistent and tested.
