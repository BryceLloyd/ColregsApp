import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(new URL('./index.html', import.meta.url).href); await page.waitForTimeout(300);
console.log(await page.evaluate(() => { window.sound = () => {}; MISSIONS[0].enc = []; wkStart(MISSIONS[0]); const o = P.own, log = [];
  o.tele = 0; o.tv = TELE[0].v;   // Astern
  for (let i = 0; i < 400; i++) { wkTick(0.05); if (i % 20 === 0) { wkUI(); log.push(`t=${P.time.toFixed(1)} v=${o.v.toFixed(2)} h=${o.h.toFixed(1)} th=${o.th.toFixed(1)} hdgUI=${$('pHdg').textContent} pos=(${o.x.toFixed(3)},${o.y.toFixed(3)}) trail=${o.trail.length}`); } }
  // now press the helm 10° to starboard while going astern
  o.th = norm(o.th + 10); for (let i = 0; i < 200; i++) { wkTick(0.05); if (i % 20 === 0) log.push(`helm+10: v=${o.v.toFixed(2)} h=${o.h.toFixed(1)} th=${o.th.toFixed(1)}`); }
  return log.join('\n'); }));
await browser.close();
