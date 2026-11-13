# Calculator

A basic calculator web app, built as a hands-on exercise in learning how to build apps with Claude.
It looks like the Google Android Calculator (v9.3) and runs entirely in the browser: no server,
no build step, no internet connection.

## Features

- Add, subtract, multiply and divide
- Decimal numbers
- Clear (C) and backspace
- Phone-style number pad on screen
- Works with both mouse and keyboard. The pressed key lights up on screen either way.

### Keyboard shortcuts

| Key                    | Action    |
|------------------------|-----------|
| `0`–`9`, `.`           | Enter a number |
| `+` `-` `*` `/`        | Operators |
| `Enter`                | Equals    |
| `Backspace`            | Delete last digit |
| `Esc`                  | Clear     |
| `H`                    | Show or hide history |

## How it behaves

- **Order of operations (BODMAS):** `×` and `÷` happen before `+` and `−`. Operators of equal
  precedence go left to right, so `10 - 2 + 3 = 11` and `8 / 2 * 4 = 16`.
- **Pressing `=` again** does nothing.
- **Dividing by zero** shows `Error: Cannot divide by zero`.
- **Floating point:** `0.1 + 0.2` shows `0.3`. Results are rounded for display only; the
  calculation itself is not changed.

## Calculation history

- Click the faint clock in the top-left corner of the display, or press **H**, to show or hide
  a history panel beside the calculator. On a narrow window the panel sits below it instead.
- Only successful calculations are listed, newest first. Errors and repeated `=` presses are
  not recorded.
- Click an entry to load its result. After an operator (e.g. `5 +`) it becomes the next number;
  otherwise it replaces what is showing. It loads at full precision, so `1 ÷ 3` then `× 3`
  gives exactly `1`. Loading entries is mouse only.
- **Clear** at the bottom of the panel empties the history. `C` clears only the calculator.
- History lasts for the session only: it is gone when you reload the page.

Not included: scientific functions, memory and themes.

## Getting started

No installation needed. Double-click `index.html`, or from PowerShell:

```powershell
start index.html
```

Supported browsers: the latest Chrome, Edge and Firefox.

## Running the tests

The tests use Node's built-in test runner, so there is nothing to install beyond Node.js.

```powershell
node --test tests/                                         # all tests
node --test tests/calculator.test.js                       # one file
node --test --test-name-pattern="divide by zero" tests/    # by name
```

## Project layout

```
index.html            UI markup
src/calculator.js     calculator logic (no DOM; shared by the browser and the Node tests)
src/app.js            mouse/keyboard wiring and key highlighting
src/styles.css        styling
tests/*.test.js       tests (node:test + node:assert)
docs/PRODUCT.md       product requirements
docs/superpowers/     design specs and implementation plans
CLAUDE.md             instructions for Claude Code working in this repo
```

## Design constraints

- Plain HTML, CSS and JavaScript only: no frameworks, npm packages, CDNs or web fonts.
- It has to work when opened straight from disk (`file://`), so scripts load as classic
  `<script>` tags (`src/calculator.js` first, then `src/app.js`) and don't use ES modules.

## Contributing

- Read [docs/PRODUCT.md](docs/PRODUCT.md) before working on a feature.
- Write a failing test before you change calculator logic, and run the tests before you call
  something done.
- Do feature work on a branch and keep commits small, with clear messages. Don't commit directly
  to `main`.

---
## [Exercise details](docs/calculator-claude-code-exercise.md)
