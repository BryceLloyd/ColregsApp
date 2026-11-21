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
// Seeded random numbers: every run plays the same traffic, so results repeat exactly (stress runs elsewhere stay random).
await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
await page.goto(url);
await page.waitForTimeout(300);
// First launch (fresh storage): the welcome is showing; "Look around first" closes it for good.
const welcome = await page.evaluate(() => { const at = $('ovWelcome').classList.contains('on'); $('wcLook').click(); const closed = !$('ovWelcome').classList.contains('on'); firstLaunch(); return { at, closed, again: $('ovWelcome').classList.contains('on') }; });

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
    else { { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)], wb = brg(o, { x: wp[0], y: wp[1] }), risk = h => P.ais.some(a => { if (!P.encs.findLast(x => x.id === a.id)?.done) return false; const c = cpaOf({ x: o.x, y: o.y, h, v: o.v }, a); return c.range < 2 && c.cpa < 0.4 && c.tcpa > 0; }); if (!risk(wb)) o.th = wb; else if (risk(o.h) && Math.abs(norm(o.th - o.h)) < 1) o.th = norm(o.h + 40); } } // resume only once the new course is clear; turn away from a ship you're closing on again
    wkTick(0.05);
  }
  return { over: P.over, hull: P.hull, score: P.score, encs: P.encs.length, bad: P.encs.filter(e => e.notes.some(n => n.ok === false)).length };
});
ok(wk.over && wk.hull === 3 && wk.bad === 0 && wk.score > 800, `watchkeeper good bot: score ${wk.score}, hull ${wk.hull}, ${wk.encs} encounters, ${wk.bad} with mistakes`);

// 4. Watchkeeper: dropping back astern of a ship you're overtaking keeps clear and doesn't stall the mission.
const back = await page.evaluate(() => {
  const keep = MISSIONS[0].enc; MISSIONS[0].enc = ['overtaking', 'xstbd', 'headon']; // the ship to drop back from, then traffic must keep coming
  wkStart(MISSIONS[0]); const seen = new Set();
  for (let i = 0; i < 20000 && !P.over; i++) {
    const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
    if (act.length) { const e = act[0];
      if (e.cl.type === 'overtaking' && !seen.has(e.id)) { seen.add(e.id); e.drop = 1; }
      if (e.drop) { o.tv = 4; o.th = P.ais.find(a => a.id === e.id).h; } // slow to her speed and follow in her wake
      else if (e.cl.role === 'give' && !e.bot) { o.tv = 12; o.th = norm(e.h0 + (e.cl.type === 'overtaking' ? -40 : 50)); e.bot = 1; P.horn.push({ t: P.time, p: e.cl.type === 'overtaking' ? 'SS' : 'S' }); } }
    else { o.tv = 12; { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)], wb = brg(o, { x: wp[0], y: wp[1] }), risk = h => P.ais.some(a => { if (!P.encs.findLast(x => x.id === a.id)?.done) return false; const c = cpaOf({ x: o.x, y: o.y, h, v: o.v }, a); return c.range < 2 && c.cpa < 0.4 && c.tcpa > 0; }); if (!risk(wb)) o.th = wb; else if (risk(o.h) && Math.abs(norm(o.th - o.h)) < 1) o.th = norm(o.h + 40); } } // resume only once the new course is clear; turn away from a ship you're closing on again
    wkTick(0.05);
  }
  const d = P.encs.find(e => e.droppedBack);
  const res = { over: P.over, hull: P.hull, spawned: P.spawnI, of: P.m.enc.length, dropPts: d ? d.pts : null, again: d ? P.encs.filter(e => e.id === d.id).length : 0 };
  MISSIONS[0].enc = keep; return res;
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
      else { { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)], wb = brg(o, { x: wp[0], y: wp[1] }), risk = h => P.ais.some(a => { if (!P.encs.findLast(x => x.id === a.id)?.done) return false; const c = cpaOf({ x: o.x, y: o.y, h, v: o.v }, a); return c.range < 2 && c.cpa < 0.4 && c.tcpa > 0; }); if (!risk(wb)) o.th = wb; else if (risk(o.h) && Math.abs(norm(o.th - o.h)) < 1) o.th = norm(o.h + 40); } } // resume only once the new course is clear; turn away from a ship you're closing on again
      wkTick(0.05);
    }
    runs.push({ t, n: P.spawnI, ok: P.hull === 3 && P.encs.every(e => e.cl.r18 && e.cl.role === 'give' && e.vt === t && !e.notes.some(n => n.ok === false)) }); // n = ships spawned (a ship can give a second encounter if you close on her again)
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
    if (!act.length) { { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)], wb = brg(o, { x: wp[0], y: wp[1] }), risk = h => P.ais.some(a => { if (!P.encs.findLast(x => x.id === a.id)?.done) return false; const c = cpaOf({ x: o.x, y: o.y, h, v: o.v }, a); return c.range < 2 && c.cpa < 0.4 && c.tcpa > 0; }); if (!risk(wb)) o.th = wb; else if (risk(o.h) && Math.abs(norm(o.th - o.h)) < 1) o.th = norm(o.h + 40); } } // resume only once the new course is clear; turn away from a ship you're closing on again
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
      // once she's past, resume course as a player would (otherwise you can end up running parallel with her for ever)
      if (e?.bot && !e.resumed && P.ais[0] && cpaOf(P.own, P.ais[0]).tcpa < 0) { e.resumed = 1; P.own.th = e.h0; }
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

// 9. Mission 3 (harbour channel, Rule 9): keep to starboard, signal at blind bends, don't run aground.
const chan = await page.evaluate(() => {
  const keep = MISSIONS[2].enc; MISSIONS[2].enc = ['chan:out', 'chan:out', 'chan:out'];
  const run = (off, horn, steps = 20000) => { wkStart(MISSIONS[2]); const ch = P.m.chan;
    for (let i = 0; i < steps && !P.over; i++) { const o = P.own, q = chanPos(ch, o); o.th = brg(o, chanAt(ch, q.s + 0.5, ch.hw * off));
      if (horn) for (const b of P.chan.bends) if (!b.hornd && q.s > b.s - 0.9 && q.s < b.s) { b.hornd = 1; P.horn.push({ t: P.time, p: 'L' }); }
      wkTick(0.05); }
    const C = P.chan, q = chanPos(ch, P.own);
    return { over: P.over, hull: P.hull, pct: Math.round(100 * C.stbdT / C.inT), aground: C.aground, bends: C.bends.filter(b => b.ok).length,
      meets: P.encs.filter(e => e.cl.type === 'chan' && e.pts > 0).length, inside: Math.abs(q.off) < ch.hw };
  };
  const res = { good: run(0.4, true), port: run(-0.4, true), quiet: run(0.4, false), ground: run(1.6, false, 400) };
  MISSIONS[2].enc = keep; return res;
});
ok(chan.good.over && chan.good.hull === 3 && chan.good.pct >= 90 && chan.good.aground === 0 && chan.good.bends === 3 && chan.good.meets === 3 &&
   chan.port.meets === 0 && chan.quiet.bends === 0 && chan.ground.aground > 0 && chan.ground.hull < 3 && chan.ground.inside,
  `mission 3 channel: good run ${chan.good.pct}% starboard, ${chan.good.meets}/3 meetings, ${chan.good.bends}/3 bend signals; port side ${chan.port.meets} good meetings; leaving the channel runs aground (${chan.ground.aground}×) and resets you inside`);

// 10. Channel traffic (Rule 9(b)-(e)): a small craft crossing your bow, and overtaking with signals.
const ch2 = await page.evaluate(() => {
  const keep = MISSIONS[2].enc, out = {};
  const run = (name, kind, how) => { MISSIONS[2].enc = [kind]; wkStart(MISSIONS[2]); const ch = P.m.chan; let stop = false;
    for (let i = 0; i < 20000 && !P.encs[0]?.done && !P.over; i++) { const o = P.own, q = chanPos(ch, o), e = P.encs[0], a = e && P.ais.find(x => x.id === e.id); let off = 0.4;
      if (a && a.state === 'chancross' && how === 'slow' && a.mode === 'go' && !e.bot) { e.bot = 1; stop = true; P.horn.push({ t: P.time, p: 'SSSSS' }); }
      if (stop) o.tv = a && a.mode !== 'done' ? 0 : 12;
      if (a && a.state === 'chanover' && chanPos(ch, a).s - q.s < 0.8) { if (how === 'signal' && !e.sig) { e.sig = 1; P.horn.push({ t: P.time, p: 'LLSS' }); }
        if (how !== 'signal' || e.agreedT != null) { off = q.s < chanPos(ch, a).s + 0.4 ? -0.45 : 0.4; o.tv = 12; } else o.tv = 4; }
      o.th = brg(o, chanAt(ch, q.s + 0.5, ch.hw * off)); wkTick(0.05); }
    const e = P.encs[0]; out[name] = { pts: e.pts, p: e.notes.filter(n => n.p).map(n => n.p), agreed: e.agreedT != null, coll: e.collided };
  };
  run('rogueSlow', 'chan:cross!', 'slow'); run('rogueIgnore', 'chan:cross!', 'ignore'); run('waits', 'chan:cross', 'ignore');
  run('overSignal', 'chan:over', 'signal'); run('overNoSignal', 'chan:over', 'none');
  MISSIONS[2].enc = keep; return out;
});
ok(ch2.rogueSlow.p.includes(20) && ch2.rogueSlow.p.includes(40) && ch2.rogueSlow.pts > 0 && ch2.rogueIgnore.pts < 0 && ch2.waits.p.includes(40) &&
   ch2.overSignal.agreed && ch2.overSignal.p.includes(20) && ch2.overNoSignal.p.includes(-30),
  `channel traffic: crossing craft slow+five short ${ch2.rogueSlow.pts}, ignored ${ch2.rogueIgnore.pts}${ch2.rogueIgnore.coll ? ' (collision)' : ''}, waiting craft ${ch2.waits.pts}; overtaking with agreement ${ch2.overSignal.pts}, without signal ${ch2.overNoSignal.pts}`);

// 11. Mission 4 (night): radar echoes on the chart, lights in the bridge view, and the result card explains her lights.
const night = await page.evaluate(() => {
  wkStart(MISSIONS[3]);
  for (let i = 0; i < 20000 && !P.over; i++) { const o = P.own, act = P.encs.filter(e => !e.done && e.announced);
    if (act.length) { const e = act[0]; if (e.cl.role === 'give' && !e.bot) { const d = e.cl.type === 'overtaking' ? -40 : 50; o.th = norm(e.h0 + d); e.bot = 1; P.horn.push({ t: P.time, p: d > 0 ? 'S' : 'SS' }); } }
    else { { const wp = P.m.wps[Math.min(P.wpi, P.m.wps.length - 1)], wb = brg(o, { x: wp[0], y: wp[1] }), risk = h => P.ais.some(a => { if (!P.encs.findLast(x => x.id === a.id)?.done) return false; const c = cpaOf({ x: o.x, y: o.y, h, v: o.v }, a); return c.range < 2 && c.cpa < 0.4 && c.tcpa > 0; }); if (!risk(wb)) o.th = wb; else if (risk(o.h) && Math.abs(norm(o.th - o.h)) < 1) o.th = norm(o.h + 40); } } // resume only once the new course is clear; turn away from a ship you're closing on again
    wkTick(0.05); if (i % 40 === 0) { wkDraw(); wkUI(); } }
  const me = { x: 0, y: 0, h: 0 }, sw = lightsWords({ type: 'fishing', x: 1, y: 1, h: 270 }, me), hd = lightsWords({ type: 'power', x: 0, y: 2, h: 180 }, me);
  return { over: P.over, hull: P.hull, n: P.encs.length, bad: P.encs.filter(e => e.notes.some(n => n.ok === false)).length,
    explained: P.encs.filter(e => e.notes.some(n => n.txt.startsWith('When you first saw her'))).length, sw, hd, bridge: $('pBridge').style.display };
});
ok(night.over && night.hull === 3 && night.n === 7 && night.bad === 0 && night.explained === 7 && night.bridge === 'block' &&
   /green over white/.test(night.sw) && /red sidelight/.test(night.sw) && /trawling/.test(night.sw) && /both sidelights/.test(night.hd) && /heading straight at you/.test(night.hd),
  `mission 4 night: ${night.n} ships, ${night.explained} with their lights explained, bridge view on; "${night.sw}"`);

// 12. Mission 5 (fog, Rules 19 & 35): no stand-on vessel, safe speed, fog signal, and how you alter.
const fog = await page.evaluate(() => {
  const keep = MISSIONS[4].enc, snd = window.sound; window.sound = () => {}; const out = {};
  const run = (name, enc, how) => { MISSIONS[4].enc = enc; wkStart(MISSIONS[4]); if (how.signal) fogToggle(); if (how.full) P.own.tv = 12;
    for (let i = 0; i < 30000 && !P.encs[0]?.done && !P.over; i++) { const o = P.own, e = P.encs[0], a = e && P.ais.find(x => x.id === e.id);
      if (e?.announced && !e.bot && a) { e.bot = 1; o.th = norm(e.h0 + how.turn); if (how.slow) o.tv = 4; if (how.horn) P.horn.push({ t: P.time, p: how.horn }); }
      wkTick(0.05); }
    const e = P.encs[0]; out[name] = { role: e.cl.role, p: e.notes.filter(n => n.p).map(n => n.p), fogEnd: fogEndGrade() };
  };
  run('good', ['headon'], { signal: true, turn: 50, slow: true });
  run('fast', ['headon'], { full: true, turn: 50 });
  run('port', ['headon'], { signal: true, turn: -50, slow: true });
  run('horn', ['xstbd'], { signal: true, turn: 50, slow: true, horn: 'S' });
  MISSIONS[4].enc = keep; window.sound = snd; return out;
});
ok(fog.good.role === 'fog' && fog.good.p.includes(20) && fog.good.p.includes(60) && !fog.good.p.some(p => p < 0) && /\+100/.test(fog.good.fogEnd) &&
   fog.fast.p.includes(-30) && /-100/.test(fog.fast.fogEnd) && fog.port.p.includes(-50) && fog.horn.p.includes(-10),
  `mission 5 fog: good ${JSON.stringify(fog.good.p)}, too fast ${JSON.stringify(fog.fast.p)}, port turn ${JSON.stringify(fog.port.p)}, manoeuvring signal ${JSON.stringify(fog.horn.p)}`);

// 13. In-play feedback: floating points, the hint-bar verdict, optional pause on mistakes, the details card, mute.
const fb = await page.evaluate(() => {
  const keep = MISSIONS[0].enc, out = {};
  const run = (pause, turn) => { $('pPauseErr').checked = pause; MISSIONS[0].enc = ['headon']; wkStart(MISSIONS[0]);
    for (let i = 0; i < 6000 && !P.encs[0]?.done; i++) { const e = P.encs[0]; if (e?.announced && !e.bot) { e.bot = 1; P.own.th = norm(e.h0 + turn); P.horn.push({ t: P.time, p: turn > 0 ? 'S' : 'SS' }); } wkTick(0.05); }
    wkUI(); const h = $('pHint');
    return { paused: P.paused, mp: P.mistakePause, pops: P.pops.map(p => p.txt), bar: h.textContent, why: !!h.querySelector('.more'), go: !!h.querySelector('.go'), card: $('pResult').style.display };
  };
  out.mistake = run(true, -50);
  $('pHint').querySelector('.more').click(); out.cardOpen = $('pResult').style.display; $('pResGo').click(); out.afterClose = { paused: P.paused, mp: P.mistakePause, card: $('pResult').style.display };
  out.noPause = run(false, -50);
  out.good = run(true, 50);
  out.labels = [popLabel('Turned to port in a head-on situation (Rule 14)'), popLabel('Safe passing distance (0.87 nm)'), popLabel('Early, substantial action 6 min before CPA, by course (Rules 8 & 16)'), popLabel('Correct sound signal • as you altered to starboard (Rule 34(a))'), popLabel('Stood on, then acted at 1.78 nm (Rule 17(a)(ii))')];
  const m0 = muted; $('pMute').click(); out.mute = [m0, muted, $('pMute').textContent]; $('pMute').click();
  $('pPauseErr').checked = true; MISSIONS[0].enc = keep; return out;
});
ok(fb.mistake.paused && fb.mistake.mp && fb.mistake.card === 'none' && fb.mistake.bar.startsWith('❌') && /Rule 14/.test(fb.mistake.bar) && fb.mistake.go &&
   fb.mistake.pops.some(p => p.includes('Rule 14')) && fb.cardOpen === 'block' && !fb.afterClose.paused && !fb.afterClose.mp && fb.afterClose.card === 'none' &&
   !fb.noPause.paused && fb.noPause.bar.startsWith('❌') && !fb.noPause.go && !fb.good.paused && fb.good.bar.startsWith('✅') &&
   fb.labels.join('|') === 'Rule 14|Safe passing distance|Rules 8 & 16|Rule 34(a)|Rule 17(a)(ii)' && fb.mute[0] !== fb.mute[1],
  `feedback: mistake pauses (setting on) and shows "${fb.mistake.bar.slice(0, 60)}…", pops ${JSON.stringify(fb.mistake.pops)}; setting off keeps playing; good run "${fb.good.bar.slice(0, 30)}…"`);

// 14. Home page and endless mode: practice tiles with stars, the big Play button, hearts, levels and the best watch.
const home = await page.evaluate(() => {
  const snd = window.sound; window.sound = () => {}; for (const k of Object.keys(localStorage)) if (k.startsWith('wkBest')) localStorage.removeItem(k);
  localStorage.setItem('wkBest_m1', '1100'); localStorage.setItem('wkBest_m3', '400');
  show('home');
  const tiles = [...document.querySelectorAll('#wkPractice .tile')].map(t => t.querySelector('b').textContent + ':' + t.querySelectorAll('.stars > :not(.off)').length + ':' + (t.querySelector('.stars').textContent.replace(/[^★]/g, '').length));
  const stars = [starsOf('m1'), starsOf('m2'), starsOf('m3')], bestBefore = $('wkBest').textContent;
  $('wkPlay').click(); const started = { endless: !!P.m.endless, title: $('pTitle').textContent, view };
  let lostHeart = false;
  for (let i = 0; i < 60000 && !P.over; i++) { const h = P.hull; wkTick(0.05); if (P.hull < h) lostHeart = true; }   // nobody at the helm: she'll run out of hearts
  const res = { over: P.over, level: P.level, head: $('dbHead').textContent, best: +localStorage.getItem('wkBest_m7') || 0, score: P.score };
  closeOv('ovDebrief'); P = null; show('home'); const bestAfter = $('wkBest').textContent;
  localStorage.removeItem('wkBest_m1'); localStorage.removeItem('wkBest_m3'); localStorage.removeItem('wkBest_m7'); localStorage.removeItem('wkBestLevel'); window.sound = snd;
  return { tiles, stars, bestBefore, started, lostHeart, res, bestAfter };
});
ok(home.tiles.length === 6 && home.stars.join() === '3,0,1' && /No watch kept yet/.test(home.bestBefore) && home.started.endless && home.started.view === 'play' && /⚓ Level 1$/.test(home.started.title) &&
   home.lostHeart && home.res.over === true && /out of hearts/.test(home.res.head) && (home.res.score > 0 ? home.res.best === home.res.score && /best watch/.test(home.bestAfter) : true),
  `home & endless: ${home.tiles.length} practice tiles, stars ${home.stars.join('/')}; Play starts "${home.started.title}"; unattended watch ended at level ${home.res.level} (${home.res.score} pts): "${home.res.head}"`);

// 15. Game feel: the helm keeps turning one way, collisions match the chart, ships start off-screen, waypoints count once passed.
const feel = await page.evaluate(() => {
  const snd = window.sound; window.sound = () => {}; const keep = MISSIONS[0].enc, out = {};
  // hold the starboard helm while going astern (slow turning): the ship must never swing back to port
  MISSIONS[0].enc = []; wkStart(MISSIONS[0]); P.own.v = P.own.tv = -4; P.own.tele = 0;
  const btn = document.querySelector('.helm [data-dh="10"]'); let back = 0, turned = 0;
  for (let i = 0; i < 400; i++) { if (i % 6 === 0 && i < 300) { btn.dispatchEvent(new PointerEvent('pointerdown')); btn.dispatchEvent(new PointerEvent('pointerup')); }
    const h = P.own.h; wkTick(0.05); const d = norm(P.own.h - h); if (d < -0.01) back++; turned += d; }
  out.helm = { back, turned: Math.round(turned) };
  // a collision registers when the ships touch on the chart, and the other ship stays put
  MISSIONS[0].enc = ['xport!']; wkStart(MISSIONS[0]); for (let i = 0; i < 6000 && !P.encs[0]?.done; i++) wkTick(0.05); // a rogue holds her course into you
  out.coll = { hull: P.hull, booms: P.booms.length, stillThere: P.ais.length === 1, collided: P.encs[0].collided };
  // every kind of ship starts beyond the edge of the chart
  MISSIONS[0].enc = []; wkStart(MISSIONS[0]); out.offscreen = ['xstbd', 'xport', 'headon', 'overtaking', 'overtaken'].map(k => { spawnAI(k); return !inView(P.ais[P.ais.length - 1], 0); });
  // a waypoint counts once you're past it, abeam within a mile, not only within 0.2 nm
  const wp = P.m.wps[0], o = P.own, L = Math.hypot(wp[0], wp[1]), ux = wp[0] / L, uy = wp[1] / L;
  const at = (along, side) => ({ x: wp[0] + ux * along + uy * side, y: wp[1] + uy * along - ux * side });
  out.wp = [wpPassed(P.m, at(-0.3, 0.6)), wpPassed(P.m, at(0.05, 0.6)), wpPassed(P.m, at(0.05, 1.3))];
  // a ship that's stopped barely turns
  o.x = o.y = 0; o.v = o.tv = 0; const h0 = o.h; o.th = norm(o.h + 90); for (let i = 0; i < 40; i++) wkTick(0.05); out.stoppedTurn = Math.abs(norm(o.h - h0));
  MISSIONS[0].enc = keep; window.sound = snd; return out;
});
ok(feel.helm.back === 0 && feel.helm.turned > 100 && feel.coll.collided && feel.coll.hull === 2 && feel.coll.booms === 1 && feel.coll.stillThere &&
   feel.offscreen.every(Boolean) && feel.wp.join() === 'false,true,false' && feel.stoppedTurn < 2,
  `game feel: helm held astern turned ${feel.helm.turned}° without swinging back; collision ${JSON.stringify(feel.coll)}; ships start off-screen ${feel.offscreen.join('/')}; waypoint passed abeam ${feel.wp.join('/')}; stopped ship turned ${feel.stoppedTurn.toFixed(1)}°`);

// 16. Referee fairness: no-risk encounters close quietly, a cancelled order isn't an action, one collision per contact.
const fair = await page.evaluate(() => {
  const snd = window.sound; window.sound = () => {}; const keep = MISSIONS[0].enc, out = {};
  const run = (setup, drive, until) => { MISSIONS[0].enc = []; wkStart(MISSIONS[0]); const a = setup(); const e = P.encs[0];
    for (let i = 0; i < 8000 && !until(e, a); i++) { drive(e, a, i); wkTick(0.05); } return { e, a }; };
  // a ship that turns away straight after appearing is never a risk: nothing to judge
  let r = run(() => { spawnAI('xstbd'); const a = P.ais[0]; a.h = a.th = a.h0 = norm(a.h + 180); return a; }, () => {}, e => e.done);
  out.quiet = { silent: !!r.e.silent, pts: r.e.pts, score: P.score };
  // ordering 40° for one tick and cancelling it is not "substantial action"
  r = run(() => { spawnAI('xstbd'); return P.ais[0]; }, (e, a, i) => { if (e.announced && !e.flick) { e.flick = 1; P.own.th = norm(e.h0 + 40); } else if (e.flick === 1) { e.flick = 2; P.own.th = e.h0; } }, e => e.done);
  out.flick = r.e.notes.some(n => /^No action taken \(Rules 15 & 16\)/.test(n.txt));
  // the same order held is an action
  r = run(() => { spawnAI('xstbd'); return P.ais[0]; }, (e) => { if (e.announced && !e.bot) { e.bot = 1; P.own.th = norm(e.h0 + 50); } }, e => e.done);
  out.held = !!r.e.act && !r.e.notes.some(n => /No action taken|Action too small/.test(n.txt));
  // a 20° turn held is too small: −40 and the card says how far you turned; 10° counts for nothing
  r = run(() => { spawnAI('xstbd'); return P.ais[0]; }, (e) => { if (e.announced && !e.bot) { e.bot = 1; P.own.th = norm(e.h0 + 20); } }, e => e.done);
  out.small20 = r.e.notes.find(n => /Action too small/.test(n.txt)); out.small20 = out.small20 && out.small20.p + ' ' + out.small20.txt;
  r = run(() => { spawnAI('xstbd'); return P.ais[0]; }, (e) => { if (e.announced && !e.bot) { e.bot = 1; P.own.th = norm(e.h0 + 10); } }, e => e.done);
  out.small10 = r.e.notes.find(n => /Action too small/.test(n.txt))?.p;
  // once her encounter is over, sitting on top of her costs one heart, not one every few seconds
  const a = r.a; a.x = P.own.x; a.y = P.own.y; a.h = a.th = P.own.h; a.v = a.tv = P.own.v; a.state = 'resume'; const h0 = P.hull;
  for (let i = 0; i < 300; i++) { a.x = P.own.x + 0.02; a.y = P.own.y; wkTick(0.05); }
  out.contact = { heartsLost: h0 - P.hull, logged: P.lateHits.length };
  MISSIONS[0].enc = keep; window.sound = snd; return out;
});
ok(fair.quiet.silent && fair.quiet.pts === 0 && fair.quiet.score === 0 && fair.flick && fair.held && /^-40 Action too small: you altered only 20° to starboard/.test(fair.small20 || '') && fair.small10 === -100 && fair.contact.heartsLost === 1 && fair.contact.logged === 1,
  `referee fairness: no-risk ship closed quietly (${fair.quiet.score} pts); a cancelled 40° order ${fair.flick ? 'is not' : 'IS'} an action; a held one ${fair.held ? 'is' : 'is NOT'}; 20° held: "${fair.small20}"; 10°: ${fair.small10}; 15 s overlapping a passed ship cost ${fair.contact.heartsLost} heart`);

// 17. Older iPhones (iOS 15): without findLast or canvas roundRect, and with an error in one frame, the app keeps running.
const oldPage = await browser.newPage({ viewport: { width: 375, height: 667 } });
const oldErrors = []; oldPage.on('pageerror', e => oldErrors.push(String(e)));
await oldPage.addInitScript(() => { delete Array.prototype.findLast; delete CanvasRenderingContext2D.prototype.roundRect; });
await oldPage.goto(url); await oldPage.waitForTimeout(200);
const old = await oldPage.evaluate(async () => {
  window.sound = () => {}; MISSIONS[0].enc = ['xport:fishing', 'headon:nuc']; wkStart(MISSIONS[0]);
  for (let i = 0; i < 3000 && P.ais.length < 1; i++) wkTick(0.05); for (let i = 0; i < 100; i++) wkTick(0.05);
  wkDraw(); P.encs.findLast(() => true);
  const t0 = P.time, draw = wkDraw; let thrown = 0; window.wkDraw = () => { if (!thrown++) throw new Error('test: one bad frame'); draw(); };
  await new Promise(r => setTimeout(r, 600));
  return { advanced: P.time > t0, thrown };
});
await oldPage.close();
ok(old.advanced && old.thrown > 1, `older iPhones: special vessels drawn without roundRect/findLast; the loop kept running after an error in one frame (${old.thrown} frames drawn)`);

// 18. Small-phone layout (iPhone SE, 320 × 568) and navigation: every control fits and is tappable; rows appear only when needed.
const se = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
await se.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
await se.goto(url); await se.waitForTimeout(200);
const lay = await se.evaluate(() => {
  window.sound = () => {}; const box = el => el.getBoundingClientRect(), out = {};
  wkStart(MISSIONS[0]);
  const ctl = [...document.querySelectorAll('#pTele button, .helm button, .phorn:not([style*="none"]) button, #pHome, #pPause')].filter(b => b.offsetParent);
  out.offscreen = ctl.filter(b => box(b).right > innerWidth + 0.5 || box(b).left < -0.5).map(b => b.textContent);
  out.small = ctl.filter(b => box(b).height < 40).map(b => b.textContent);
  out.chart = Math.round(box($('pStage')).height);
  out.fogBtnInM1 = $('pFogBtn').style.display !== 'none';
  wkStart(MISSIONS[4]); out.fogBtnInFog = $('pFogBtn').style.display !== 'none';
  wkStart(MISSIONS[2]); out.passAtStart = $('pHornChan').style.display !== 'none';
  // endless: 🏠 twice ends the watch and keeps the score
  localStorage.removeItem('wkBest_m7'); wkStart(MISSIONS.find(m => m.endless)); P.score = 321; $('pHome').click(); $('pHome').click();
  out.endWatch = { over: P.over, best: +localStorage.getItem('wkBest_m7'), head: $('dbHead').textContent }; closeOv('ovDebrief');
  // practice debrief offers the next mission
  wkStart(MISSIONS[0]); wkEnd(true); out.next = $('dbMis').textContent; closeOv('ovDebrief'); localStorage.removeItem('wkBest_m7'); localStorage.removeItem('wkBest_m1');
  return out;
});
await se.close();
ok(!lay.offscreen.length && !lay.small.length && lay.chart >= 160 && !lay.fogBtnInM1 && lay.fogBtnInFog && !lay.passAtStart &&
   lay.endWatch.over && lay.endWatch.best === 321 && /Watch ended/.test(lay.endWatch.head) && /Next: Busy crossing/.test(lay.next),
  `small phone: all controls on screen and ≥40 px ${JSON.stringify({ offscreen: lay.offscreen, small: lay.small })}, chart ${lay.chart} px; fog button only in fog; Pass row hidden until overtaking; ending a watch keeps ${lay.endWatch.best}; debrief offers "${lay.next}"`);

// 19. Study record and rule map: answers are logged by rule, the map colours them in, a backup code round-trips.
const st = await page.evaluate(() => {
  const out = {}; localStorage.removeItem('colregsStudy'); study = { v: 1, r: {} };
  out.cites = [rulesIn('Signalled late (Rules 9(f) & 34(e))'), rulesIn('Rules 13–17'), rulesIn('Turned to port (Rule 19(d)(i))'), rulesIn('no rule here')].map(r => r.join(','));
  out.light = qKeys({ kind: 'lights', prompt: 'At night you see these lights. What is she?', explain: 'Green over white: she is trawling.', opts: [] }).join(',');
  out.buoy = qKeys({ kind: 'buoys', prompt: 'Which side?', explain: 'Leave it to port.', opts: [] }).join(',');
  // a quiz question through the shared renderer (Rule 14), answered right
  const q = tq(RULEQ[0]), box = document.createElement('div'); document.body.appendChild(box);
  mountQ(box, q, { wrongLabel: 'x', onAnswer() {}, nextText: () => 'n', onNext() {} }); box.querySelector(`[data-j="${q.opts.findIndex(o => o.ok)}"]`).click(); box.remove();
  // a Watchkeeper encounter: good action, then a close call
  studyEnc({ notes: [{ ok: true, txt: 'Bold, early action (Rules 8 & 16)', p: 100 }, { ok: false, txt: 'Close quarters: passed only 0.15 nm off', p: -50 }], cl: { rule: 'Rule 15' } });
  // a Challenge scenario, answered right
  show('app'); queue = [0]; qi = 0; mode = 'practice'; replayChoice = null; load(); while (t < freezeTime()) step(0.02); phase = 'decide'; decide(SCEN[0].correct[0]); out.scenRule = rulesIn(SCEN[0].rule).join(',');
  out.scenLogged = rulesIn(SCEN[0].rule).every(k => study.r[k]?.ok >= 1);
  out.r = { 14: study.r[14], 8: study.r[8], 16: study.r[16], 15: study.r[15] };
  show('home'); out.collapsed = { chips: document.querySelectorAll('#ruleMap .rmRow .rc').length, strip: document.querySelectorAll('#ruleMap .rmStrip i').length };
  document.querySelector('#ruleMap .rmHead').click(); out.chips = document.querySelectorAll('#ruleMap .rmRow .rc').length; out.chip16 = document.querySelector('#ruleMap [data-r="16"]').className; out.chip15 = document.querySelector('#ruleMap [data-r="15"]').className;
  out.sum = $('ruleMap').querySelector('.rmSum').textContent;
  document.querySelector('#ruleMap [data-r="14"]').click(); out.sheet = { open: $('ovRule').classList.contains('on'), title: $('rlTitle').textContent, play: $('rlPlay')?.textContent }; closeOv('ovRule');
  const code = backupCode(); localStorage.removeItem('colregsStudy'); study = { v: 1, r: {} }; out.restored = restoreCode(code) && study.r[16]?.ok === 1; out.badCode = restoreCode('nonsense');
  out.install = $('installHint').style.display;
  wkStart(MISSIONS.find(m => m.endless)); out.title = $('pTitle').textContent; P = null; show('home');
  return out;
});
ok(welcome.at && welcome.closed && !welcome.again && st.cites.join('|') === '9,34|13,14,15,16,17|19|' && st.light === '26' && st.buoy === 'IALA' &&
   st.r[14]?.ok === 2 && st.r[8]?.n === 2 && st.r[8]?.ok === 1 && st.r[16]?.ok === 1 && st.r[15]?.ok === 0 && st.scenLogged &&
   st.chips === 33 && st.collapsed.chips === 0 && st.collapsed.strip === 33 && /l2/.test(st.chip16) && /l1/.test(st.chip15) && st.sheet.open && st.sheet.title === 'Rule 14 · Head-on' && /Open water/.test(st.sheet.play || '') &&
   st.restored && !st.badCode && st.install === 'none' && st.title === '⚓ Level 1',
  `study record: welcome on first launch only; quiz, scenario (${st.scenRule}) and Watchkeeper answers logged by rule; rule map ${st.chips} rules, collapsed ${JSON.stringify(st.collapsed)} ("${st.sum}"); sheet "${st.sheet.title}"; backup restores; title "${st.title}" ${JSON.stringify(st.r)}`);

// 20. Mistakes deck and mock exam.
const rv = await page.evaluate(() => {
  const out = {}, pick = right => { const q = qRun.q, box = $('qbox');
    if (q.order) { const idx = q.items.map(s => q.shuf.indexOf(s)); (right ? idx : idx.slice().reverse()).forEach(j => box.querySelector(`[data-j="${j}"]`).click()); }
    else box.querySelector(`[data-j="${q.opts.findIndex(o => right ? o.ok : !o.ok)}"]`).click();
    const nb = box.querySelector('.qnext'); if (nb && nb.style.display !== 'none') nb.click(); };
  localStorage.removeItem('colregsStudy'); study = { v: 1, r: {} };
  studyLog(['17'], false); out.inDeck = deckDue().join();
  startReview(); pick(true); const d17 = study.d['17']; out.hit = d17 && d17.b === 1 && Math.round((d17.due - Date.now()) / 864e5);
  studyLog(['35'], false); startReview(); pick(false); out.retryMin = Math.round((study.d['35'].due - Date.now()) / 60e3); out.dueAfterMiss = deckDue().join();
  show('home'); out.tile = $('rvTile').textContent;
  startMock(); out.mockN = 0; for (let i = 0; i < 40 && $('qbox'); i++) { pick(true); out.mockN++; }
  out.mock = $('secBody').innerText.slice(0, 60).replace(/\s+/g, ' '); out.best = JSON.parse(localStorage.getItem('colregsMockBest') || 'null');
  out.covered = (() => { const c = new Set(reviewPool().flatMap(q => q.keys)); return Object.keys(RULE_INFO).filter(k => !c.has(k)); })();
  show('home'); return out;
});
ok(rv.inDeck === '17' && rv.hit === 1 && rv.retryMin === 10 && rv.dueAfterMiss === '' && /Next review in 10 min/.test(rv.tile) &&
   rv.mockN === 30 && /30 \/ 30/.test(rv.mock) && /Pass/.test(rv.mock) && rv.best?.score === 30 && !rv.covered.length,
  `mistakes deck and mock exam: a miss goes in the deck, a right review moves it out ${rv.hit} day, a missed review comes back in ${rv.retryMin} min; mock exam ${rv.mockN} questions "${rv.mock}"; rules with no quiz questions: ${rv.covered.join(',') || 'none'}`);

// 21. Endless keeps getting harder: night, fog and daylight come round after level 5, with less time between ships.
const esc2 = await page.evaluate(() => {
  window.sound = () => {}; wkStart(MISSIONS.find(m => m.endless)); const out = [];
  const at = L => { while (P.encs.filter(e => e.done && !e.silent).length < (L - 1) * 5) P.encs.push({ done: true, silent: false, notes: [] });
    P.spawnI = P.m.enc.length; endlessFeed(); const k = P.m.enc[P.m.enc.length - 1];
    return { L: P.level, phase: P.phase || 'day', night: !!P.m.night, fog: !!P.m.fog, bridge: $('pBridge').style.display, fogBtn: $('pFogBtn').style.display !== 'none', gap: P.m.gap, title: $('pTitle').textContent, k: [].concat(k).join('+') }; };
  for (const L of [5, 6, 7, 8, 9, 10, 11, 15]) out.push(at(L));
  // at night, no "being overtaken" ships
  let ot = 0; P.encs.length = 0; for (let i = 0; i < 40; i++) P.encs.push({ done: true, silent: false, notes: [] }); endlessSetPhase('night');
  for (let i = 0; i < 200; i++) { P.spawnI = P.m.enc.length; endlessFeed(); if ([].concat(P.m.enc[P.m.enc.length - 1]).some(x => x.startsWith('overtaken'))) ot++; }
  P = null; show('home'); return { out, ot };
});
const ph = esc2.out.map(o => o.phase).join(',');
ok(ph === 'day,night,fog,day,night,fog,day,night' && esc2.out[1].bridge === 'block' && esc2.out[2].fog && esc2.out[2].fogBtn && esc2.out[2].bridge === 'none' && !esc2.out[3].fog &&
   /Level 6 🌙/.test(esc2.out[1].title) && esc2.out[7].gap < esc2.out[3].gap && esc2.ot === 0,
  `endless escalation: phases by level 5–11, 15: ${ph}; gaps ${esc2.out.map(o => o.gap).join('/')}; titles "${esc2.out[1].title}", "${esc2.out[2].title}"; overtaken at night: ${esc2.ot}`);

// 22. Records: one screen, three tabs. Endless watches are the main board (with your name); Challenge and mock exam are personal.
const rec = await page.evaluate(() => {
  const out = {}; for (const k of ['wkBestRuns', 'colregsLocalBoard', 'colregsMockRuns']) localStorage.removeItem(k);
  const watch = (sc, lv) => { wkStart(MISSIONS.find(m => m.endless)); P.score = sc; P.level = lv; P.spawnI = 3; wkEnd(false); const t = $('dbSub').textContent; closeOv('ovDebrief'); return t; };
  out.first = watch(500, 4); out.second = watch(200, 2); P = null; show('home');
  openRecords('wk'); out.wkRows = document.querySelectorAll('#recBody .lb tr').length; out.wkTop = document.querySelector('#recBody .lb .sc').textContent;
  out.prac = document.querySelectorAll('#recBody .recRow').length;
  const n = $('recNick'); n.value = 'Skipper'; n.onchange(); out.nick = localStorage.getItem('colregsNick');
  score = 12; level = 3; gameTime = 100; saveScore(); out.chNote = $('saveNote').textContent;
  openRecords('ch'); out.chRows = document.querySelectorAll('#recBody .lb tr').length;
  recordMock({ score: 25, n: 30, ms: 60000, d: Date.now() }); openRecords('mk'); out.mk = document.querySelectorAll('#recBody .recRow').length;
  out.tabs = [...document.querySelectorAll('#recTabs .tab')].map(b => b.textContent).join('/');
  out.backup = /wkBestRuns/.test(atob(backupCode().slice(4))) && /colregsMockRuns/.test(atob(backupCode().slice(4)));
  closeOv('ovRecords'); return out;
});
ok(/Your best watch/.test(rec.first) && /#2 of your watches/.test(rec.second) && rec.wkRows === 2 && rec.wkTop === '500' && rec.prac === 6 && rec.nick === 'Skipper' &&
   /best Challenge run/.test(rec.chNote) && rec.chRows === 1 && rec.mk === 1 && rec.tabs === 'Watchkeeper/Challenge/Mock exam' && rec.backup,
  `records: watches "${rec.first}" then "${rec.second}"; ${rec.wkRows} watches, ${rec.prac} practice missions; Challenge "${rec.chNote}"; mock attempts ${rec.mk}; backup includes them ${rec.backup}`);

ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('all checks passed');
