# Calculator — Product Brief

## Goal
Build a calculator app as part of an hands-on exersice for a human to undertand how to build apps with Claude

## Must have (v1)
- Add, subtract, multiply, divide
- Decimal numbers
- Clear (C) and backspace
- Keyboard input: 0-9 . + - * / Enter Esc Backspace
- Show a Telephone Keyboard style number pad on the UI
- Number input from keyboard must be highlighted on the UI
- Number input by mouse click must be highlighted on the UI

## Behaviour rules
- Order of operations: Follow BODMAS — × and ÷ before + and −; operators of equal precedence evaluate left to right (e.g. 10 - 2 + 3 = 11, 8 / 2 * 4 = 16)
- Pressing = repeatedly: Do nothing
- Divide by zero shows: "Error: Cannot divide by zero"
- Floating-point: 0.1 + 0.2 must show 0.3

## Out of scope (v1)
- Scientific functions, history, memory, themes

## Constraints
- Opens by double-clicking index.html (no server, no build, no internet)
- Plain HTML, CSS, JavaScript; no frameworks or npm packages
- Works in the latest Chrome, Edge and Firefox

## Done means
- All must-haves work with both mouse and keyboard
- Every behaviour rule has a passing test
- It should look like the calculator app (com.google.android.calculator) version 9.3
