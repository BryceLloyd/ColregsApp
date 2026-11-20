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

// 4. Watchkeeper: dropping back astern of a ship you're overtaking keeps clear and doesn't stall the mission.
const back = await page.evaluate(() => {
  wkStart(MISSIONS[0]); const seen = new Set();
  for (let i = 0; i < 20000 && !P.over; i++) {
    const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
    if (act.length) { const e = act[0];
      if (e.cl.type === 'overtaking' && !seen.has(e.id)) { seen.add(e.id); e.drop = 1; }
      if (e.drop) { o.tv = 4; o.th = P.ais.find(a => a.id === e.id).h; } // slow to her speed and follow in her wake
      else if (e.cl.role === 'give' && !e.bot) { o.tv = 12; o.th = norm(e.h0 + (e.cl.type === 'overtaking' ? -40 : 50)); e.bot = 1; P.horn.push({ t: P.time, p: e.cl.type === 'overtaking' ? 'SS' : 'S' }); } }
    else { o.tv = 12; const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)]; o.th = brg(o, { x: wp[0], y: wp[1] }); }
    wkTick(0.05);
  }
  const d = P.encs.find(e => e.droppedBack);
  return { over: P.over, hull: P.hull, spawned: P.spawnI, of: P.m.enc.length, dropPts: d ? d.pts : null, again: d ? P.encs.filter(e => e.id === d.id).length : 0 };
});
ok(back.over && back.hull === 3 && back.spawned === back.of && back.dropPts > 0 && back.again === 2,
  `watchkeeper drop-back: mission ends, ${back.spawned}/${back.of} ships spawned, drop-back scored ${back.dropPts}, re-encounter when passing later`);

// 5. Rule 18 in Watchkeeper: you keep out of the way of special vessels (Rule 13 still wins when you overtake),
//    and a rule-following bot handles every type without mistakes.
const r18 = await page.evaluate(() => {
  const me = { x: 0, y: 0, h: 0, v: 12 }, wrong = [];
  for (const t of R18_POOL) {
    const port = classify(me, { type: t, x: -1, y: 1, h: 90, v: 5 }), head = classify(me, { type: t, x: 0, y: 2, h: 180, v: 5 }),
      ahead = classify(me, { type: t, x: 0, y: 1, h: 0, v: 3 }), they = classify({ type: t, x: -1, y: 1, h: 90, v: 5 }, me);
    if (port.role !== 'give' || !port.r18) wrong.push(t + ' crossing from port');
    if (head.role !== 'give' || !head.r18) wrong.push(t + ' head-on');
    if (ahead.type !== 'overtaking' || ahead.rule !== 'Rule 13') wrong.push(t + ' overtaking');
    if (they.role !== 'stand') wrong.push(t + ' (her view)');
  }
  const keep = MISSIONS[0].enc, runs = [];
  for (const t of R18_POOL) {
    MISSIONS[0].enc = ['xport:' + t, 'headon:' + t];
    wkStart(MISSIONS[0]);
    for (let i = 0; i < 20000 && !P.over; i++) {
      const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
      if (act.length) { const e = act[0]; if (e.cl.role === 'give' && !e.bot) { o.th = norm(e.h0 + 50); e.bot = 1; P.horn.push({ t: P.time, p: 'S' }); } }
      else { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)]; o.th = brg(o, { x: wp[0], y: wp[1] }); }
      wkTick(0.05);
    }
    runs.push({ t, n: P.encs.length, ok: P.hull === 3 && P.encs.every(e => e.cl.r18 && e.cl.role === 'give' && e.vt === t && !e.notes.some(n => n.ok === false)) });
  }
  MISSIONS[0].enc = keep;
  return { wrong, bad: runs.filter(r => !r.ok || r.n !== 2).map(r => r.t) };
});
ok(r18.wrong.length === 0 && r18.bad.length === 0, `watchkeeper Rule 18: sail, fishing, NUC, RAM and CBD all handled ${r18.wrong.concat(r18.bad).join(', ')}`);

// 6. Horn scoring (Rule 34(a)): correct, missing, wrong, stray and astern signals.
const horn = await page.evaluate(() => {
  const keep = MISSIONS[0].enc, out = {};
  const run = (name, th, tv, horns) => {
    MISSIONS[0].enc = ['xstbd']; wkStart(MISSIONS[0]); let e = null;
    for (let i = 0; i < 20000 && !P.encs[0]?.done; i++) {
      e = P.encs[0];
      if (e?.announced && !e.bot) { e.bot = 1; P.own.th = norm(e.h0 + th); P.own.tv = tv; for (const p of horns) P.horn.push({ t: P.time, p }); }
      wkTick(0.05);
    }
    out[name] = P.encs[0].notes.filter(n => /signal/i.test(n.txt)).map(n => n.p);
  };
  run('correct', 50, 12, ['S']); run('missing', 50, 12, []); run('wrong', 50, 12, ['SS']); run('stray', 50, 12, ['S', 'SSS']);
  run('astern', 0, -4, ['SSS']); run('asternMissing', 0, -4, []);
  MISSIONS[0].enc = keep; return out;
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(same(horn.correct, [15]) && same(horn.missing, [-10]) && same(horn.wrong, [-20]) && same(horn.stray, [15, -15]) && same(horn.astern, [10]) && same(horn.asternMissing, [-10]),
  `horn scoring: correct +15, missing −10, wrong −20, stray −15, astern +10/−10 ${JSON.stringify(horn)}`);

// 7. Mission 2 (Busy crossing): every group spawns, two-ship moments work, and altering for a give-way ship
//    while stand-on to another is allowed (Rule 2(b)).
const m2 = await page.evaluate(() => {
  wkStart(MISSIONS[1]); let turnFor = null;
  for (let i = 0; i < 30000 && !P.over; i++) {
    const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
    if (turnFor && turnFor.done) turnFor = null;
    for (const e of act) if (e.cl.role === 'give' && !e.bot) { e.bot = 1;
      if (!turnFor) { turnFor = e; const d = e.cl.type === 'overtaking' ? -40 : 50; o.th = norm(e.h0 + d); P.horn.push({ t: P.time, p: d > 0 ? 'S' : 'SS' }); } }
    if (!act.length) { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)]; o.th = brg(o, { x: wp[0], y: wp[1] }); }
    wkTick(0.05);
  }
  return { over: P.over, hull: P.hull, score: P.score, spawned: P.spawnI, groups: P.m.enc.length, encs: P.encs.length,
    bad: P.encs.filter(e => e.notes.some(n => n.ok === false)).length, excused: P.encs.filter(e => e.excused).length };
});
ok(m2.over && m2.hull === 3 && m2.spawned === m2.groups && m2.encs === 12 && m2.bad === 0 && m2.excused > 0,
  `mission 2: ${m2.encs} ships in ${m2.spawned}/${m2.groups} groups, score ${m2.score}, ${m2.bad} with mistakes, Rule 2(b) used ${m2.excused}×`);

// 8. Rogue ships (Mission 6, Rules 17 & 34(d)): stand on, sound five short once it's clear she isn't acting, then act.
const rogue = await page.evaluate(() => {
  const keep = MISSIONS[5].enc, out = {};
  const run = (name, kind, how) => {
    MISSIONS[5].enc = [kind]; wkStart(MISSIONS[5]);
    for (let i = 0; i < 6000 && !P.encs[0]?.done; i++) { const e = P.encs[0];
      if (e?.announced && !e.bot) { const a = P.ais[0], c = cpaOf(P.own, a);
        if (how === 'early') { e.bot = 1; P.own.th = norm(e.h0 + 90); }
        else if (how !== 'nothing' && c.range < 2.2 && c.cpa < 0.35 && (e.seen ??= P.time) && P.time - e.seen >= 3.5 && a.state === 'cruise') {
          e.bot = 1; P.horn.push({ t: P.time, p: 'SSSSS' }); const d = how === 'port' ? -60 : 90; P.own.th = norm(e.h0 + d); P.horn.push({ t: P.time, p: d > 0 ? 'S' : 'SS' }); } }
      wkTick(0.05); }
    const e = P.encs[0]; out[name] = { pts: e.pts, rogue: e.rogue, acted: !!e.bot, notes: e.notes.filter(n => n.p).map(n => n.p) };
  };
  run('good', 'xport!', 'good'); run('nothing', 'xport!', 'nothing'); run('early', 'xport!', 'early'); run('port', 'xport!', 'port'); run('compliant', 'xport', 'good'); run('overtaken', 'overtaken!', 'good');
  MISSIONS[5].enc = keep; return out;
});
const has = (r, p) => r.notes.includes(p);
ok(rogue.good.rogue && has(rogue.good, 20) && has(rogue.good, 60) && rogue.good.pts > 0 &&
   has(rogue.nothing, -60) && has(rogue.early, -50) && has(rogue.port, -40) &&
   !rogue.compliant.rogue && !rogue.compliant.acted && has(rogue.compliant, 60) && has(rogue.overtaken, 60) && rogue.overtaken.pts > 0,
  `rogue ships: act after five short ${rogue.good.pts}, never act ${rogue.nothing.pts}, act too early ${rogue.early.pts}, turn to port ${rogue.port.pts}, compliant ship held ${rogue.compliant.pts}, overtaker ${rogue.overtaken.pts}`);

ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('all checks passed');
