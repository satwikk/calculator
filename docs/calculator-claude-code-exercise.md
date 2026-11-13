# Hands-on: Planning a Calculator App for Claude Code

_As of 2026-11-14_

## Overview

You will build a basic calculator in plain HTML, CSS and JavaScript that opens by double-clicking `index.html`. Most of your effort goes into the files that tell Claude Code what to build. Claude then writes the code from them.

**What you'll learn:**

1. How to lay out a project's folders and files so an agent can work in it.
2. Which files you write yourself before handing off, and which ones Claude writes.
3. How plan mode, slash commands and Superpowers skills turn a rough idea into a plan the agent can follow.
4. How to record each stage in git and push the result to GitHub.

**Your setup:** Windows, Claude Code CLI (installed and signed in), Superpowers plugin, Git and a GitHub account. No build tools.

**Time:** about 2–3 hours, done in one sitting or split across the parts.

**Rule for this exercise:** you write the *what* and the *why*, and Claude writes the *how*. Review every file Claude produces before you accept it.

## Part 0: Prepare your machine (15 min)

You need an empty project folder that git is tracking. You also need Node.js, so Claude can run the calculator's tests from the terminal.

**Step 1. Check your tools.** Open PowerShell and run:

```powershell
git --version
claude --version
node --version
```

If `node` isn't found, install the LTS version with `winget install OpenJS.NodeJS.LTS`, then close and reopen PowerShell. You only need Node for its built-in test runner (`node --test`). The app itself won't depend on it, and you won't install any npm packages.

**Step 2. Tell git who you are** (skip this if you've done it before):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

**Step 3. Create the project folder and start a repo:**

```powershell
mkdir $HOME\projects\calculator
cd $HOME\projects\calculator
git init
```

**Step 4. Check Superpowers is active.** Run `claude` in this folder, then ask: *"Which Superpowers skills do you have available?"* It should list skills such as `brainstorming`, `writing-plans` and `test-driven-development`. Type `/exit` to leave.

**Windows tip:** if Shift+Tab doesn't switch modes in Claude Code later on, use **Alt+M** instead.

## Part 1: Plan the files and folders (20 min)

A project for an agent has three layers: **instructions for the agent**, **documents that describe what to build**, and **the app itself**. Keeping them in separate places lets Claude find context quickly and lets you see in a git diff what has changed.

This is the layout you're aiming for. Folders marked *(later)* start out empty and get filled in by Claude.

```text
calculator/
├── CLAUDE.md                  ← rules Claude reads at the start of every session
├── README.md                  ← for humans: what it is and how to open it
├── .gitignore
├── .claude/
│   └── settings.json          ← shared Claude Code permissions (committed)
├── docs/
│   ├── PRODUCT.md             ← your requirements: what and why
│   └── superpowers/
│       ├── specs/             ← (later) design doc from brainstorming
│       └── plans/             ← (later) step-by-step plan
├── index.html                 ← (later) double-click to open the app
├── src/
│   ├── calculator.js          ← (later) pure logic: no DOM access
│   ├── app.js                 ← (later) connects the buttons and keys to the logic
│   └── styles.css             ← (later)
└── tests/
    └── calculator.test.js     ← (later) run with: node --test tests/
```

**Why split `calculator.js` from `app.js`:** the arithmetic can be tested in Node without a browser, and the UI code stays thin. Agents work best when every file has a single job.

**Who owns each file:**

| File | Written by | When | Read by |
| --- | --- | --- | --- |
| `docs/PRODUCT.md` | You | Before Claude starts | Claude, during brainstorming |
| `CLAUDE.md` | You (Claude can draft it) | Before Claude starts, updated as you learn | Claude, every session |
| `.gitignore` | You | Before the first commit | Git |
| `.claude/settings.json` | You | Before Claude starts | Claude Code |
| `README.md` | You, or Claude at the end | Start or end | People |
| `docs/superpowers/specs/*.md` | Claude, approved by you | Brainstorming | You, Claude |
| `docs/superpowers/plans/*.md` | Claude, approved by you | Planning | Claude, while building |
| `index.html`, `src/*`, `tests/*` | Claude, reviewed by you | Building | Browser, Node |

**Exercise 1.1:** create the empty skeleton in PowerShell:

```powershell
mkdir docs\superpowers\specs, docs\superpowers\plans, .claude, src, tests
New-Item CLAUDE.md, README.md, .gitignore, docs\PRODUCT.md, .claude\settings.json
```

Git doesn't track empty folders, which is fine. They'll be committed once Claude adds files to them.

## Part 2: Write the human files before handing off (40 min)

Four files are yours to write: **PRODUCT.md** (what to build), **CLAUDE.md** (how to work in this repo), **.gitignore** and **.claude/settings.json**. Claude can only be as specific as these files are. Anything you leave out, it will guess.

### 2.1 docs/PRODUCT.md: the what and the why

This file holds requirements only, with no code and no design decisions. Copy the template below and replace every `<...>` with your own answers. The questions are deliberate: answering them is the exercise.

```markdown
# Calculator — Product Brief

## Goal
<One sentence: who it's for and why it exists.>

## Must have (v1)
- Add, subtract, multiply, divide
- Decimal numbers
- Clear (C) and backspace
- Keyboard input: <which keys? e.g. 0-9 . + - * / Enter Esc Backspace>
- <anything else you want>

## Behaviour rules
- Order of operations: <left-to-right like a basic calculator, or × ÷ before + −?>
- Pressing = repeatedly: <repeat the last operation, or do nothing?>
- Divide by zero shows: <"Error"? "Cannot divide by zero"?>
- Floating-point: 0.1 + 0.2 must show <0.3>
- Long results: <max digits on screen; what happens beyond that?>

## Out of scope (v1)
- Scientific functions, history, memory, themes

## Constraints
- Opens by double-clicking index.html (no server, no build, no internet)
- Plain HTML, CSS, JavaScript; no frameworks or npm packages
- Works in the latest Chrome, Edge and Firefox

## Done means
- All must-haves work with both mouse and keyboard
- Every behaviour rule has a passing test
- <how it should look: e.g. "like the iPhone calculator", "dark, large buttons">
```

**Exercise 2.1:** fill this in yourself and **don't ask Claude to do it**. The "behaviour rules" section is where most real bugs start. Those are decisions only you can make.

### 2.2 CLAUDE.md: the rules for working in this repo

Claude Code loads `CLAUDE.md` into every session automatically. Keep it short (under about 60 lines): stack, commands, conventions and the mistakes to avoid. Put product details in PRODUCT.md, not here.

```markdown
# CLAUDE.md

## Project
Basic calculator web app. Requirements: docs/PRODUCT.md (read before any feature work).

## Stack and hard constraints
- Plain HTML/CSS/JS. No frameworks, no npm dependencies, no build step.
- The app must work when index.html is opened directly from disk (file://).
  Therefore: do NOT use <script type="module"> or import/export in browser code —
  browsers block ES modules over file://. Use classic <script> tags.
- src/calculator.js holds pure logic with no DOM access. Export it so both
  the browser (a global) and Node tests (module.exports) can use it.
- src/app.js handles DOM and keyboard wiring only.

## Commands
- Run tests: node --test tests/
- Open app: start index.html   (PowerShell)

## Working rules
- Write a failing test before changing calculator logic.
- Run the tests before saying something works.
- Make small commits with clear messages; never commit to main directly during feature work.
- Ask me before adding any file outside the layout in docs/PRODUCT.md.

## Environment
- Windows, PowerShell. Use Windows-friendly commands and paths.
```

**Why the `file://` rule matters:** it's exactly the kind of fact an agent gets wrong without being told. Ask most agents for "modern JavaScript" and they'll reach for ES modules, and your double-click requirement will quietly break. Your CLAUDE.md is where lessons like that are kept.

**Exercise 2.2:** write your CLAUDE.md. To compare, run `claude` and then `/init`. Claude drafts its own CLAUDE.md from what it finds in the repo. Keep whichever lines are better, and remember you own the final version. Later, use `/memory` to edit it from inside a session.

### 2.3 .gitignore

```gitignore
# Personal Claude Code files (not shared)
.claude/settings.local.json
CLAUDE.local.md

# OS / editor noise
Thumbs.db
Desktop.ini
.DS_Store
.vscode/
```

### 2.4 .claude/settings.json: what Claude may do without asking

This file is committed and shared. Allow the safe commands you'll run all the time and deny anything risky. Personal overrides go in `settings.local.json`, which is gitignored above.

```json
{
  "permissions": {
    "allow": [
      "Bash(node --test:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Bash(git push:*)"
    ]
  }
}
```

Denying `git push` keeps the final step with you, so Claude can commit locally but only you publish.

**Checkpoint:** commit your human-written files. Part 4 explains why each stage gets its own commit.

```powershell
git add .
git commit -m "docs: add product brief, CLAUDE.md and project config"
```

## Part 3: Plan mode, slash commands and Superpowers (45 min)

Plan mode and Superpowers both stop Claude from writing code before you agree on what to build. Plan mode is built into Claude Code and fits a single task. Superpowers is a complete workflow (brainstorm, then spec, then plan, then tests and code, then review) that saves each stage as a file you can review and commit.

| Tool | What it is | How you start it | What it produces | Use it when |
| --- | --- | --- | --- | --- |
| Plan mode | Built-in read-only mode: Claude explores and proposes, but can't edit files | Shift+Tab (or Alt+M) until the status bar shows plan mode, or start a message with `/plan` | A plan in the chat for you to approve; Ctrl+G opens it in your editor | One task or change that touches a few files |
| `/init`, `/memory` | Built-in slash commands | Type them in a session | Draft of CLAUDE.md, or opens CLAUDE.md for editing | Setting up or updating project rules |
| `superpowers:brainstorming` | Skill: asks you questions one at a time, proposes approaches, writes a design doc | Describe new work, or ask "use the brainstorming skill" | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Starting any new feature or project |
| `superpowers:writing-plans` | Skill: turns the approved spec into small steps, each with its files, tests and commands | Runs after brainstorming, or ask for it | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | When a spec is approved |
| `superpowers:executing-plans` / `subagent-driven-development` | Skills: carry out the plan task by task, with reviews | Offered when the plan is done | Code, tests and commits | When the plan is approved |
| `superpowers:test-driven-development` | Skill: write the test, watch it fail, then write code until it passes | Triggers automatically while building | Tests written before the code they cover | Any logic change |

**About command names:** older tutorials show `/superpowers:brainstorm`, `/write-plan` and `/execute-plan`. Recent Superpowers releases removed those commands. You now start the skills by describing what you want, or by naming the skill. Type `/` in Claude Code to see what your installed version offers.

### Exercise 3.1: feel what plan mode does (10 min, throwaway)

In the project folder, run `claude` and send:

```text
/plan Read docs/PRODUCT.md and CLAUDE.md. How would you structure the calculator? Don't write any files.
```

Read the plan, but **don't approve it**. Press Shift+Tab to leave plan mode, then `/exit`. Things to notice: what did it get right from your files, what did it assume, and what is missing from your PRODUCT.md?

Fix any gaps in PRODUCT.md now. This is the cheapest point to fix them.

### Exercise 3.2: brainstorm the spec with Superpowers (15 min)

Start a fresh session with `claude` and send:

```text
Use the superpowers brainstorming skill. I want to build the calculator described in
docs/PRODUCT.md, following the rules in CLAUDE.md. Ask me about anything that's unclear
before proposing approaches.
```

Answer each question it asks. When it shows approaches, choose one and ask *why* it recommends it. It then writes a design doc to `docs/superpowers/specs/`. **Read the whole doc.** Check that every behaviour rule from PRODUCT.md is in it, then approve it.

### Exercise 3.3: turn the spec into a plan (10 min)

When the spec is approved, Superpowers moves on to `writing-plans`. If it doesn't, ask: *"Use the writing-plans skill on the approved spec."* The plan lands in `docs/superpowers/plans/`.

Review the plan against this checklist:

- [ ] Every task is small (a few minutes of work) and names the exact files it touches
- [ ] Logic tasks start with a failing test in `tests/calculator.test.js`
- [ ] No `type="module"` or `import` in browser code (your CLAUDE.md rule)
- [ ] Every PRODUCT.md behaviour rule maps to at least one task
- [ ] Each task ends with a test run and a commit

If something is wrong, tell Claude and have it update the plan file. **Stop before it starts building.** Exercise 4.1 commits the spec and plan first.

### Exercise 3.4 (optional): write your own skill

A skill is a folder containing a `SKILL.md` file. Project skills live in `.claude/skills/` and are committed with the repo, so you can use them as your own slash commands. Create `.claude/skills/check/SKILL.md`:

```markdown
---
name: check
description: Use before saying any calculator work is done - runs tests and reviews the diff.
---

1. Run `node --test tests/` and show the summary.
2. Run `git diff --stat` and list files changed outside src/, tests/, index.html.
3. Confirm no <script type="module"> or import/export was added to browser code.
4. Report pass/fail for each step. Do not fix anything without asking.
```

Restart Claude Code and type `/check`. You've now written the same kind of file that Superpowers is made of.

## Part 4: Organize it all in a git repo (20 min)

Give every stage of the work its own commit: your brief and rules, then the approved spec, then the approved plan, then the code on a feature branch. The history then shows *why* each piece of code exists, and any bad agent change can be undone in one command.

**Commit sequence for this exercise:**

1. `docs: add product brief, CLAUDE.md and project config` (you, in Part 2), on `main`
2. `docs: add calculator design spec`, on `main`
3. `docs: add calculator implementation plan`, on `main`
4. Many small commits such as `feat: add division with divide-by-zero error`, made by Claude on `feature/calculator-v1`
5. Merge into `main` through a pull request on GitHub, after you review it

### Exercise 4.1: commit the spec and plan

Superpowers may already have committed the spec, so check first:

```powershell
git log --oneline
git status
```

Commit anything in `docs/superpowers/` that isn't committed yet, as separate spec and plan commits.

### Exercise 4.2: put the repo on GitHub

1. On github.com, click **New repository** and name it `calculator`. Leave it **empty**: no README, .gitignore or licence, because you already have those.
2. Connect your local repo and push it:

```powershell
git remote add origin https://github.com/<your-username>/calculator.git
git push -u origin main
```

The first push opens a browser window so you can sign in to GitHub. Git for Windows' credential manager handles that.

### Exercise 4.3: create the feature branch

```powershell
git switch -c feature/calculator-v1
```

All the code is built on this branch. If the build goes badly, `main` stays clean and you can delete the branch and start again. Superpowers may offer to use a **git worktree** instead (a second working folder linked to the same repo). Either works. For a first project, a plain branch is easier to follow.

**What gets committed and what doesn't:**

| Commit it | Keep it local |
| --- | --- |
| `CLAUDE.md`, `docs/`, `.claude/settings.json`, `.claude/skills/` | `.claude/settings.local.json`, `CLAUDE.local.md` |
| `index.html`, `src/`, `tests/`, `README.md`, `.gitignore` | Anything containing passwords or API keys |

## Part 5: Build, review and verify (40 min)

Building is where you do the least typing. Your job is to watch, answer questions and check the results.

### Exercise 5.1: execute the plan

On the feature branch, start `claude` and send:

```text
Execute the plan in docs/superpowers/plans/ on branch feature/calculator-v1.
Use test-driven development and commit after each task.
```

Superpowers will ask whether to run the tasks in this session or hand them to subagents. Choose **inline (executing-plans)** for this first project, so you can watch every step.

While it works:

- When Claude asks for permission to run a command or edit a file, read what it wants to do before you approve it.
- Every few tasks, run `git log --oneline` in a second PowerShell window to watch the commits arrive.
- If it drifts from the plan, interrupt with Esc and tell it which task it's on.

### Exercise 5.2: verify it yourself

```powershell
node --test tests/
start index.html
```

Go through the PRODUCT.md "behaviour rules" one at a time, by hand, using the mouse and then the keyboard. Try `0.1 + 0.2`, `5 / 0`, pressing `=` twice, and very long numbers.

### Exercise 5.3: fix a bug the right way

If something's wrong, don't just say "it's broken". Send:

```text
Use the systematic-debugging skill. Expected: <what PRODUCT.md says>. Actual: <what you saw>.
Steps to reproduce: <keys pressed>. Write a failing test first.
```

If the bug came from a rule you never wrote down, add it to PRODUCT.md. If it came from a convention, add it to CLAUDE.md. That way the next session won't repeat it.

### Exercise 5.4: review and merge

```powershell
git push -u origin feature/calculator-v1
```

On GitHub, open a pull request from `feature/calculator-v1` into `main`. Read the **Files changed** tab as if a colleague wrote it. You can also ask Claude to *"use the requesting-code-review skill on this branch"* for a second opinion. When you're satisfied, merge it, then update your local copy:

```powershell
git switch main
git pull
```

## Checklist and next steps

You're done when every box below is ticked.

- [ ] Node, Git and Claude Code all work in PowerShell; Superpowers skills are listed
- [ ] Folder skeleton created
- [ ] PRODUCT.md filled in by you, including every behaviour rule
- [ ] CLAUDE.md written, including the `file://` / no-modules rule
- [ ] `.gitignore` and `.claude/settings.json` in place
- [ ] Tried `/plan` once and fixed the gaps it showed in PRODUCT.md
- [ ] Spec brainstormed, read in full and approved
- [ ] Plan written, checked against the checklist and approved
- [ ] Spec and plan committed; repo pushed to GitHub
- [ ] Code built on `feature/calculator-v1` with tests passing
- [ ] Every behaviour rule tested by hand in the browser
- [ ] Pull request reviewed and merged

**Next steps:** add a v2 feature, such as calculation history, using the same loop: update PRODUCT.md, brainstorm, plan, branch, build, review. The second time through, notice how much less you need to explain. CLAUDE.md and the docs folder now carry that context for you.

## Sources

- [obra/superpowers on GitHub](https://github.com/obra/superpowers): skills, install steps and release notes. Version 7.0.2 was checked for the spec and plan paths and for the removal of the old slash commands.
- [Claude Code plan mode guide](https://alexcloudstar.com/blog/claude-code-plan-mode-2026/): Shift+Tab, `/plan`, and the Alt+M fallback on Windows.
- [Claude Code docs](https://docs.claude.com/en/docs/claude-code/overview): the official reference for CLAUDE.md, settings, skills and slash commands. Check here if a command has changed.
