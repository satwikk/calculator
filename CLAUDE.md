# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Basic calculator web app. Requirements: docs/PRODUCT.md (read before any feature work).
Specs and plans from brainstorming/planning go in docs/superpowers/specs/ and docs/superpowers/plans/.

## Stack and hard constraints
- Plain HTML/CSS/JS. No frameworks, no npm dependencies, no build step, no internet
  (no CDNs, no Google Fonts — use system fonts).
- The app must work when index.html is opened directly from disk (file://).
  Therefore: do NOT use <script type="module"> or import/export in browser code —
  browsers block ES modules over file://. Use classic <script> tags, loading
  src/calculator.js before src/app.js.
- src/calculator.js holds pure logic with no DOM access. Export it so both the
  browser (a global) and Node tests (require) can use it:
  ```js
  if (typeof module !== 'undefined' && module.exports) module.exports = Calculator;
  else window.Calculator = Calculator;
  ```
- src/app.js handles DOM and keyboard wiring only.
- Target browsers: latest Chrome, Edge, Firefox.

## File layout
Ask me before adding any file outside this layout.
```
index.html            UI markup
src/calculator.js     pure logic, no DOM
src/app.js            DOM + keyboard wiring
src/styles.css        styling
tests/*.test.js       node:test + node:assert (built in, no deps)
docs/PRODUCT.md       requirements
docs/superpowers/     specs/ and plans/
```

## Commands
- Run all tests: `node --test tests/`
- Run one file: `node --test tests/calculator.test.js`
- Run tests by name: `node --test --test-name-pattern="divide by zero" tests/`
- Open app: `start index.html`   (PowerShell)

## Behaviour decisions (implementation notes for docs/PRODUCT.md rules)
- Operator precedence: standard BODMAS — `*` and `/` before `+` and `-`; operators of
  equal precedence evaluate left-to-right. So `10 - 2 + 3 = 11`, `8 / 2 * 4 = 16`.
- Floating point: fix it at display time (e.g. `parseFloat(x.toPrecision(12))`), so
  `0.1 + 0.2` shows `0.3`; don't change how numbers are calculated.
- Keyboard and mouse input must both highlight the pressed key — route both through
  one shared highlight path in app.js.
- Visual target: Google Android Calculator (com.google.android.calculator) v9.3.

## Working rules
- Write a failing test before changing calculator logic.
- Run the tests before saying something works.
- Make small commits with clear messages; never commit to main directly during feature work.

## Environment
- Windows, PowerShell. Use Windows-friendly commands and paths.
