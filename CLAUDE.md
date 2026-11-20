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
- Watchkeeper (`15-…`): `MISSIONS`. `m1`, `m2`, `m3` and `m6` are `ready`.
  - `classify(me, target)` decides head-on, crossing, or overtaking, and from that give-way or stand-on.
  - `encTick` and `wkGrade` are the referee. An encounter is created when a ship spawns, and its baseline is your ordered course and speed at that moment.
  - Only actions taken before CPA count. Actions count from the moment they're ordered.
  - Overtaking: slowing to her speed or less and not closing for 3 s closes the encounter as kept clear (`droppedBack`). If you later close in on her again, one new encounter opens for that ship.
  - Rule 18: `WK_TYPES` gives each vessel type a `rank` (who keeps out of whose way), speed, rule and day-shape description. `classify` applies Rule 13 first, then Rule 18 between different ranks (`cl.r18`), then Rules 14/15/17 between power-driven vessels. Mission encounters can carry a type: `'xport:fishing'`, or `'xport:r18'` for a random one from `R18_POOL`. The type is shown only by day shapes (chart and target card) and named after the encounter.
  - Horn (Rule 34(a)), in `hornGrade`: the avoiding turn needs • (starboard) or • • (port) within `HORN_WIN` (8 real s): +15 / missing −10 / opposite −20. Going astern needs • • •: +10 / −10. Any •, • • or • • • in the encounter that matches no turn (`P.turns`, logged per 10° of ordered course) or astern order costs −15. Judged only in the result card.
  - Spawning waits until no ship is near. A ship whose encounter is done and that is past CPA or passing 0.5 nm+ clear (and 0.5 nm+ away) doesn't count as near.
  - An `enc` entry can be an array to spawn ships together (`['xstbd','xport']`); they reach your track at the times in `GROUP_T`. Don't group an overtaking ship with one that crosses her path: AI ships don't avoid each other.
  - Two at once: if you're stand-on to one ship but alter for an overlapping give-way encounter, that's allowed (Rule 2(b)): `e.excused`, +40 instead of the Rule 17 penalty.
  - Rogue ships (`m6`): an `enc` entry ending `!` is a rogue give-way ship that holds course and speed; `?` makes it rogue half the time. For your stand-on encounter, `dueT` is when a compliant ship would act; from `ROGUE_AFTER` (3 real s) later it's "apparent" and you may act (Rule 17(a)(ii)) without the Rule 17(a) penalty. `rogueGrade`: five short +20 / −15 (Rule 34(d)), acting at 0.5 nm+ +60, later +30 (17(b)), never −60, port turn for a ship on your port side −40 (17(c)). Against a rogue crossing from port, stopping or a bold 90° starboard turn at full speed works; slowing while turning to starboard lets her catch you.
  - Channel missions (`18-watchkeeper-channel.js`, `m3`): a mission with `chan:{pts,hw,bank}` draws land, shallows, the dredged channel and Region A lateral marks (red to port, green to starboard going in). `chanPos` gives the signed offset (+ = starboard side going in) and distance along. Leaving the channel (|off| > `hw`) runs you aground: −1 heart, −100, reset inside, stopped. Waypoints count when you're abeam of them. `chanTick` scores Rule 9(a) time on the starboard side (debrief: 90%+ +100, 70%+ +40, else −50) and one prolonged blast (▬) within 1 nm before each 25°+ bend (Rules 9(f) & 34(e), +15 / −10). `'chan:out'` spawns an outbound ship that follows her own starboard side; that encounter (`cl.type 'chan'`) is graded by `chanEncGrade`: your side at CPA (+60 / −60) and passing distance, not by a 30° turn, and channel bends don't need Rule 34(a) signals.
  - Channel traffic (`chanSpawn`): `'chan:cross!'` is a yacht or fishing boat waiting at the channel edge that sets off to cross your bow just as you arrive (Rule 9(b)–(d)); `'chan:cross?'` does so half the time, otherwise she waits until you're past. Graded by `chanCrossGrade`: five short +20 / −15, slowing down +40, keeping going −40; a craft that waits: holding course +40. `'chan:over'` is a slow ship ahead on her starboard side: signal ▬ ▬ • • (pass on her port side, the second horn row "Pass", shown only in channel missions), she replies ▬ • ▬ • and moves over (`e.agreedT`); ▬ ▬ • gets five short (no room). `chanOverGrade`: signal and agreement before passing +20, none −30, wrong side −20; staying astern +30. That encounter only ends once you're 0.3 nm past her, and Rule 9(a) time doesn't count while you overtake with her agreement.
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
2. Rule 18 and more traffic, in parts:
   - 2a ✅ Rule 18 vessel types (sail, fishing, NUC, RAM, CBD) with day shapes; two of Mission 1's ships are special.
   - 2b ✅ Horn scoring (Rule 34(a)): manoeuvring signals scored, wrong and stray signals penalised.
   - 2c ✅ Mission 2 (Busy crossing): 12 ships in 9 groups, three two-ship moments, mixed types.
   - 2d ✅ Mission 6 (Rogue ships): give-way ships that hold on; stand on, five short, then act (Rules 17 & 34(d)).
3. Mission 3, in parts:
   - 3a ✅ Buoyed harbour channel (Region A), keep to starboard (Rule 9(a)), blind-bend signal (9(f) & 34(e)), grounding, outbound ships meeting you.
   - 3b ✅ Small craft crossing the channel (Rule 9(b)–(d)); overtaking in a channel with signals and agreement (Rules 9(e) & 34(c)).
4. Mission 4 (night: lights only, with a bridge view) and Mission 5 (fog: radar and sound signals, Rule 19).
5. Endless mode and Watchkeeper leaderboards (Supabase).

Known issues and ideas:
- Watchkeeper on small phones (320 px, iPhone SE 1st gen): the engine panel's Full button is cut off at the right edge.
- If the codebase keeps growing, consider moving to ES modules (Vite) and TypeScript. Do this as a separate, approved step.
