// Smoke tests: loads the app in headless Chromium and checks the core logic.
// Run: npm install && npx playwright install chromium && npm test
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const url = new URL('../index.html', import.meta.url).href;
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };

// CHROMIUM_PATH lets you point at an existing Chrome/Chromium if Playwright's download isn't available.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(300);

// 1. Every scenario: each correct answer passes clear (no collision / grounding).
const scen = await page.evaluate(() => {
  show('app');
  const bad = [];
  for (let i = 0; i < SCEN.length; i++) for (const k of SCEN[i].correct) {
    queue = [i]; qi = 0; mode = 'practice'; replayChoice = null; load();
    while (t < freezeTime()) step(0.02);
    choice = k; applyAction(k);
    while (t < decT + 6.5 && !collided) step(0.02);
    if (collided) bad.push(`${i}:${k}`);
  }
  show('home');
  return { n: SCEN.length, bad };
});
ok(scen.bad.length === 0, `all ${scen.n} scenarios: correct answers pass clear ${scen.bad.join(' ')}`);

// 2. A full Challenge run builds every level and finishes.
const ch = await page.evaluate(() => {
  nick = 'Test'; mode = 'challenge'; level = 1; lives = 99; score = 0; bonus = 0; answered = 0; missed = []; gameTime = 0; running = true;
  let levels = 0, items = 0;
  for (level = 1; level <= LEVELS.length; level++) { levelIntro(); closeOv('ovLevel'); levels++; items += queue.length; }
  return { levels, items, total: TOTAL };
});
ok(ch.levels === 7 && ch.items >= ch.total, `challenge builds ${ch.levels} levels with ${ch.items} questions (TOTAL ${ch.total})`);

// 3. Watchkeeper: a rule-following bot finishes Mission 1 undamaged with a good score.
const wk = await page.evaluate(() => {
  wkStart(MISSIONS[0]);
  for (let i = 0; i < 20000 && !P.over; i++) {
    const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
    if (act.length) { const e = act[0]; if (e.cl.role === 'give' && !e.bot) { o.th = norm(e.h0 + (e.cl.type === 'overtaking' ? -40 : 50)); e.bot = 1; P.horn.push({ t: P.time, p: e.cl.type === 'overtaking' ? 'SS' : 'S' }); } }
    else { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)]; o.th = brg(o, { x: wp[0], y: wp[1] }); }
    wkTick(0.05);
  }
  return { over: P.over, hull: P.hull, score: P.score, encs: P.encs.length, bad: P.encs.filter(e => e.notes.some(n => n.ok === false)).length };
});
ok(wk.over && wk.hull === 3 && wk.bad === 0 && wk.score > 800, `watchkeeper good bot: score ${wk.score}, hull ${wk.hull}, ${wk.encs} encounters, ${wk.bad} with mistakes`);

ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('all checks passed');
