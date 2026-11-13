# Calculation History — Design (v2)

Date: 2026-11-13 · Branch: `feature/calculator-v2` · Requirements: `docs/PRODUCT.md` (Must have v2)

## Intent
Add a calculation history beside the existing calculator, shown or hidden by a toggle.
It's part of the same hands-on exercise in building apps with Claude. The v1 experience
must stay essentially unchanged: with history closed, the app looks and behaves like v1.

## Goals
- A list of past successful calculations, shown in a side panel.
- A subtle toggle that opens and closes the panel, using the mouse or the **H** key.
- Clicking an entry loads its result back into the calculator.

## Non-goals
- Saving history between page loads (no localStorage). History lasts for the session only.
- Picking or loading entries from the keyboard.
- Editing or deleting single entries.
- Recreating the pull-down history from Google Calculator 9.3. This app takes only mouse
  and keyboard input.

## Anti-goals (failure even if it works)
- Any visible change to the v1 calculator when history is closed: the keypad grid, sizes
  and position stay the same.
- Any change to what existing keys do. In particular, Enter stays `=`, Esc stays C, and
  Backspace stays backspace, whether or not the panel is open.

## Approaches considered
- **A. Side panel beside the calculator (chosen).** The toggle adds a history column to the
  right. You can keep calculating with history visible, and new results appear in the list
  straight away. Trade-off: the layout is wider while the panel is open.
- **B. The toggle swaps the keypad for the history list.** Same footprint, and closest to the
  look of Google Calculator. Rejected: the keypad disappears, so a mouse user must close the
  history to keep calculating.
- Pull-down gesture (Google Calculator's own way): not possible with mouse and keyboard input.

## Decided behaviour

### Toggle
- A small, faint clock icon in the top-left corner of the display. It is not a keypad key,
  and the keypad grid is unchanged.
- It brightens on hover and stays lit while the panel is open.
- **H** (also `h`, with no Ctrl/Alt/Meta) toggles the panel. This is the only thing H does.
  The toggle icon flashes through the same shared highlight path that keys use (CLAUDE.md
  rule).
- The panel is closed when the app loads.

### Panel
- A column to the right of the calculator. The calculator doesn't move or resize when it
  opens.
- Entries are listed newest first. Each one shows the expression and result in display
  formatting, e.g. `1,234 + 0.1 = 1,234.1` (using the same `group` and operator symbols as
  the display).
- A **Clear** control at the bottom empties the history (mouse only).
- When the list is empty, the panel shows a short message such as "No history yet".

### What gets recorded
- Only **successful** `=` presses add an entry.
- Errors are never recorded ("Error: Cannot divide by zero", "Error: Result too large").
- A repeated `=` does nothing in v1, so it records nothing.
- The C key does not clear the history. It clears only the calculator, as in v1.

### Loading an entry (mouse click only)
- If the calculator is waiting for a number (the expression ends in an operator, e.g.
  `5 +`), the entry's result is inserted as that number: `5 + 42`.
- Otherwise (empty, a result showing, or in the middle of typing a number), the entry's
  result replaces the expression. It then behaves exactly like a fresh `=` result: a digit
  starts fresh, and an operator continues from it.
- Results load at **full precision**, using the same mechanism v1 uses after `=`. So
  continuing from a stored `1 ÷ 3` uses the real ⅓, not `0.333333333333`.
- If an error is showing, it is cleared first, as with any v1 key.
- The clicked entry gets the same short highlight as a pressed key.
- Entries must not be activated from the keyboard. Make them unreachable with Tab, and blur
  them after a click (the way v1 keys are blurred), so Space or Enter can never trigger one.

## Constraints (from CLAUDE.md / PRODUCT.md)
- Plain HTML/CSS/JS, classic scripts, works from `file://`, no dependencies, system fonts.
- Recording history and loading entries are pure logic in `src/calculator.js`, with failing
  `node:test` tests written first. `src/app.js` does DOM and keyboard wiring only.
- No new files outside the agreed layout.
- Visual style follows the existing Google Calculator 9.3-inspired theme in `styles.css`.

## Left to the builder (my calls unless you object)
- The method names on `Calculator` (e.g. `getHistory()`, `clearHistory()`, `useEntry(i)`) and
  the entry shape. A suggested entry: `{ expression, result, value }`, where `value` is the
  full-precision number.
- No cap on the number of entries. The list scrolls inside the panel.
- On a narrow window (not wide enough for both columns), the panel stacks below the calculator.
- Accessibility: the toggle is a `<button>` with `aria-label="History"` and `aria-expanded`.
- Exact icon glyph, sizes, colours and the open/close transition, kept subtle.
