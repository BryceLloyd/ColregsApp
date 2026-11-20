# CLAUDE.md: COLREGs Trainer

Guidance for Claude Code when working in this repo.

## How to work here
Give concise, opinionated answers and keep the architecture simple. Build iteratively: propose a scoped step, get approval, then build it. The app is tested on an iPhone, so the layout must work on a phone first.

## What this is
A static, mobile-first PWA for learning the COLREGs. There is no framework and no build step. It was originally a single HTML file and has been split into plain files.

## Architecture (read before editing)
- **Classic scripts sharing one global scope.** `index.html` loads `js/config.js`, then `js/00-core.js` … `js/99-boot.js` in numeric order as ordinary `<script>` tags, not modules. Top-level `const`/`let`/`function` in one file are visible to the files after it.
  - Keep top-level code that runs at load time in the right order. Add new files with a number that places them correctly.
  - Function bodies can reference anything, because they run later.
  - When you add a file, also add it to `index.html` and to `FILES` in `sw.js`.
- **Views:** `#home`, `#sec` (learning sections), `#app` (scenario simulator), `#play` (Watchkeeper). Switch between them with `show(name)`. Overlays (`.ov`) open with `openOv(id)` and close with `closeOv(id)`.
- **One animation loop:** `loop()` in `13-sim-flow.js`. It drives the simulator when `view==='app'` and calls `wkFrame()` when `view==='play'`. It also ticks buoy-light animation.

## Key data (append, don't reorder)
- `SCEN` (`01-scenarios.js`): animated scenarios. **The array index is the scenario's ID**, and these maps refer to scenarios by index: `LEVELS[].pool`, `PRACTICE`, `NIGHT_OK`, `TYPE_SWAP`, `ANGLE_OK`, and the overrides in `dangerWhy()`. Add new scenarios at the end.
  - Fields: `cat, title, prompt, other{type,h,v,T|x,y,dx}, own{type,v}, correct[], best, rule, ok, bad, tip`.
  - Optional fields: `night, fog, radar, channel, lane, laneDeg, laneT, turnDeg, hazards[[x,y,r]], tss{cx,cy,dir}, wind, region, otherReacts, freezeAt`.
  - Units are arbitrary. Your vessel starts at the origin heading 0°. With `other.T`, the other vessel is placed so that both reach the collision point at time `T`.
- `LEVELS` (`02-…`): Challenge levels. `sims` scenarios are drawn from `pool`, plus multiple-choice questions from `mcq: [[kind, n, topic]]`.
- `RULEQ`, `LIGHTQ`, `SPOT`, `ORDERQ`: question banks. `makeQs(kind, n, topic)` mixes formats.
- `BUOYS` (`06-buoyage.js`): IALA marks. **`REGION = 'A'` is the standard** (South Africa). Region B appears only as a Learn toggle and in one labelled scenario.
- Watchkeeper (`15-…`): `MISSIONS`. Only `m1` is `ready`.
  - `classify(me, target)` decides head-on, crossing, or overtaking, and from that give-way or stand-on.
  - `encTick` and `wkGrade` are the referee. An encounter is created when a ship spawns, and its baseline is your ordered course and speed at that moment.
  - Only actions taken before CPA count. Actions count from the moment they're ordered.
  - Overtaking: slowing to her speed or less and not closing for 3 s closes the encounter as kept clear (`droppedBack`). If you later close in on her again, one new encounter opens for that ship.
  - Time scale: `WK_TS = 20` (×20 real time).

## Content rules
- Paraphrase the rules. Never paste long verbatim passages of official text. Always cite the rule number.
- During Watchkeeper encounters, **never reveal the player's role or the answer**. The only exception is the paid 💡 hint, which costs −20. Explain the role and answer after each encounter, in the result card and the debrief.
- A wrong answer that still passes clear must say why it was dangerous (`dangerWhy`).
- Buoyage scenarios must not show the hazards until the player has answered.
- Use sentence case. Use plain South African/UK English. Keep the tone concise.

## Commands
- `npm run dev`: local server on port 5173.
- `npm run check`: syntax-checks every JS file.
- `npm test`: Playwright smoke tests (`CHROMIUM_PATH=…` to use an existing Chrome).

Run `npm run check && npm test` before committing. If you change scenario geometry, the test "correct answers pass clear" must still pass.

## Deploy
GitHub Pages from the `Website-Dev` branch (root): https://brycelloyd.github.io/ColregsApp/. Storage is browser-only for now (`localStorage`); leave `js/config.js` blank. **Bump `CACHE` in `sw.js` on every deploy.** If you change Challenge scoring or levels, bump `LB_VERSION` in `14-leaderboard.js` so old scores drop off the board.

## Roadmap
Watchkeeper stages, in order:
1. ✅ Engine, Mission 1, referee, result cards, debrief.
2. Rule 18 vessel types (sail, fishing, NUC, RAM, CBD) in traffic; horn scoring; Mission 2 (Busy crossing); Mission 6 (Rogue ships that ignore the rules, to test Rule 17(a)(ii)/(b) and five short blasts).
3. Mission 3: buoyed harbour channel (Region A), narrow-channel judging (Rule 9), grounding.
4. Mission 4 (night: lights only, with a bridge view) and Mission 5 (fog: radar and sound signals, Rule 19).
5. Endless mode and Watchkeeper leaderboards (Supabase).

Known issues and ideas:
- If the codebase keeps growing, consider moving to ES modules (Vite) and TypeScript. Do this as a separate, approved step.
