// Study record and rule map. Every Watchkeeper verdict, Challenge scenario and quiz answer is logged against the
// rules it tests (kept on this device). The home page shows a rule map: each rule coloured by your last 10 results,
// with your weakest rules called out; tap a rule for a short summary, your record and where to practise it.
// Also: the first-launch welcome, the iPhone install hint, and backing up / restoring progress with a code.

const STUDY_KEY='colregsStudy';
let study=(()=>{try{const s=JSON.parse(localStorage.getItem(STUDY_KEY)||'null');return s&&s.r?s:{v:1,r:{}};}catch(e){return{v:1,r:{}};}})();
const studySave=()=>{try{localStorage.setItem(STUDY_KEY,JSON.stringify(study));}catch(e){}};

// The rule numbers a text cites: "(Rule 34(a))", "Rules 8 & 16", "Rules 13–17", "Rule 19(d)(i)".
function rulesIn(t){const out=new Set();
  for(const m of String(t||'').replace(/<[^>]*>/g,'').matchAll(/\bRules?\s+(\d{1,2}(?:\([a-z]+\))*(?:\s*(?:&|,|and|–|-|to)\s*\d{1,2}(?:\([a-z]+\))*)*)/gi)){
    const s=m[1].replace(/\([^)]*\)/g,''),r=s.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})/);
    if(r)for(let i=+r[1];i<=+r[2];i++)out.add(String(i));
    for(const n of s.matchAll(/\d{1,2}/g))out.add(n[0]);}
  return [...out].filter(n=>+n>=1&&+n<=38);}

function studyLog(keys,ok){if(!keys?.length)return;const now=Date.now();
  for(const k of new Set(keys)){const x=study.r[k]||(study.r[k]={n:0,ok:0,h:''});x.n++;if(ok)x.ok++;x.h=(x.h+(ok?'1':'0')).slice(-10);x.t=now;}
  if(!ok&&typeof deckMiss==='function')deckMiss(keys); // into the mistakes deck
  studySave();}

// Quiz and Challenge questions: the rules their explanation cites, otherwise worked out from what they're about.
function qKeys(q){
  const strip=s=>String(s||'').replace(/<[^>]*>/g,' '),right=(q.opts||[]).filter(o=>o.ok).map(o=>strip(o.h)).join(' ');
  const txt=`${q.prompt||''} ${strip(q.explain)} ${right}`,cited=rulesIn(txt);if(cited.length)return cited;
  const k=q.kind||'';
  if(k==='flags'||/\bflag\b/i.test(q.prompt||''))return['Flags'];
  if(k==='buoys'||/\b(buoy|mark|cardinal|lateral|IALA)\b/i.test(txt))return['IALA'];
  if(k==='sounds'||/\b(blast|fog signal|whistle)\b/i.test(txt))return[/distress/i.test(txt)?'37':/attention/i.test(txt)?'36':/fog|restricted visibility/i.test(txt)?'35':'34'];
  if(k==='lights'||/\b(light|lights|shape|ball|cone|diamond|cylinder)\b/i.test(txt)){
    const L=[[/trawl|fishing/i,'26'],[/not under command|\bNUC\b/i,'27'],[/restricted in her ability|\bRAM\b|dredg|diving/i,'27'],[/draught|\bCBD\b/i,'28'],
      [/pilot/i,'29'],[/anchor|aground/i,'30'],[/tow|push/i,'24'],[/seaplane|WIG/i,'31'],[/sail|yacht|rowing/i,'25'],[/arc|225|112\.5|135°/i,'21'],[/visible|range of/i,'22']];
    for(const [re,r] of L)if(re.test(txt))return[r];return['23'];}
  return[];}
function studyQ(q,ok){studyLog(qKeys(q),ok);}

// Watchkeeper: each scored note counts for the rules it cites; a collision or close call counts against Rule 8
// (and the rule for that encounter), passing well clear counts for it.
function studyEnc(e){if(e.silent)return;
  for(const n of e.notes){if(n.ok!==true&&n.ok!==false)continue;let keys=rulesIn(n.txt);
    if(!keys.length&&/^(Collision|Close quarters|Passed|Safe passing)/.test(n.txt))keys=['8',...(n.ok?[]:rulesIn(e.cl.rule))];
    studyLog(keys,n.ok);}}

// ---- the rule map ----
const RULE_INFO={
  2:['Responsibility','Nothing in the rules excuses poor seamanship. You may depart from them only to avoid immediate danger.'],
  3:['Definitions','What counts as power-driven, sailing, fishing, NUC, RAM, constrained by draught, underway, in sight and restricted visibility.'],
  5:['Look-out','Keep a proper look-out at all times, by sight and hearing and with every means you have, radar included.'],
  6:['Safe speed','Always go at a speed that lets you act properly and stop in a distance that suits the conditions.'],
  7:['Risk of collision','Use every means to judge it. If her compass bearing hardly changes as the range closes, risk exists. If in doubt, assume it does.'],
  8:['Action to avoid collision','Act early and positively, with a change big enough for the other ship to see, and pass at a safe distance.'],
  9:['Narrow channels','Keep to the starboard side. Small craft, sailing and fishing vessels must not impede a ship that can only navigate inside the channel.'],
  10:['Traffic separation schemes','Use the right lane in its general direction, join and leave at the ends, and cross at close to a right angle.'],
  12:['Sailing vessels','Wind on different sides: the one on port tack keeps clear. Same side: the windward one keeps clear.'],
  13:['Overtaking','The overtaking vessel keeps clear, whatever the other rules say, until she is past and clear.'],
  14:['Head-on','Two power-driven vessels meeting head-on both alter to starboard and pass port to port.'],
  15:['Crossing','Two power-driven vessels crossing: the one with the other on her starboard side keeps out of the way and avoids crossing ahead.'],
  16:['Give-way vessel','Take early and substantial action to keep well clear.'],
  17:['Stand-on vessel','Hold course and speed. You may act once she clearly isn\'t, and must act if she alone can\'t avoid collision. Don\'t turn to port for a ship on your port side.'],
  18:['Responsibilities between vessels','Power keeps clear of sail, fishing, RAM and NUC; sail keeps clear of fishing, RAM and NUC. All but NUC and RAM avoid impeding a ship constrained by her draught.'],
  19:['Restricted visibility','No stand-on or give-way here. Go at a safe speed, act early on radar, and slow right down if you hear a fog signal forward of the beam.'],
  21:['Light definitions','Masthead light 225°, each sidelight 112.5°, sternlight 135°, plus towing and all-round lights.'],
  22:['Visibility of lights','The minimum range each light must be seen at, by the vessel\'s length.'],
  23:['Power-driven vessels underway','Masthead light (two if 50 m or more), sidelights and a sternlight.'],
  24:['Towing and pushing','Extra masthead lights and a yellow towing light; a diamond by day if the tow is over 200 m.'],
  25:['Sailing and rowing','Sidelights and a sternlight, no masthead light. Under sail and engine by day: a cone, point down.'],
  26:['Fishing vessels','Trawling: green over white. Other fishing: red over white. By day: two cones, points together.'],
  27:['NUC and RAM','Not under command: red over red, two balls by day. Restricted in ability to manoeuvre: red-white-red, ball-diamond-ball.'],
  28:['Constrained by draught','Three red all-round lights, or a cylinder by day.'],
  29:['Pilot vessels','On duty: white over red all-round lights.'],
  30:['Anchored and aground','At anchor: white all-round light(s), a ball by day. Aground: add two red all-round lights, three balls by day.'],
  31:['Seaplanes and WIG craft','Lights and shapes as close as practical to those for ships.'],
  34:['Manoeuvring and warning signals','In sight: • starboard, • • port, • • • astern. Five short means you doubt she\'s keeping clear. ▬ before a blind bend.'],
  35:['Fog signals','Power making way: ▬ every 2 minutes; stopped: ▬ ▬. Special vessels and sailing: ▬ • •.'],
  36:['Attention signals','You may use light or sound to attract attention, if it can\'t be mistaken for another signal.'],
  37:['Distress signals','The signals listed in Annex IV. Never use them for anything else.'],
  IALA:['Buoyage (IALA Region A)','Going in: red to port, green to starboard. Cardinal marks show the safe side by compass quadrant.'],
  Flags:['Signal flags','International Code of Signals: single-letter flags and what they mean.']};
const RULE_GROUPS=[['General',[2,3]],['Steering and sailing',[5,6,7,8,9,10,12,13,14,15,16,17,18,19]],['Lights and shapes',[21,22,23,24,25,26,27,28,29,30,31]],
  ['Sound signals',[34,35,36,37]],['Buoyage and flags',['IALA','Flags']]];
const RULE_MISSION={5:'m4',6:'m5',7:'m1',8:'m1',13:'m1',14:'m1',15:'m1',16:'m1',17:'m6',18:'m2',2:'m2',9:'m3',19:'m5',35:'m5',34:'m1',
  21:'m4',22:'m4',23:'m4',25:'m4',26:'m4',27:'m4',28:'m4'};
const ruleSec=k=>k==='IALA'?'buoys':k==='Flags'?'flags':+k<=19?'rules':'lights';
const ruleName=k=>isNaN(k)?RULE_INFO[k][0]:`Rule ${k}`;
// Level: 0 not tried, 1 needs work (<60% of your last 10), 2 getting there, 3 strong (85%+, at least 3 tries).
function ruleLevel(k){const x=study.r[k];if(!x||!x.h)return 0;const p=[...x.h].filter(c=>c==='1').length/x.h.length;return p>=0.85&&x.h.length>=3?3:p>=0.6?2:1;}
function weakRules(){return Object.keys(RULE_INFO).filter(k=>study.r[k]?.h.length>=2&&ruleLevel(k)===1)
  .sort((a,b)=>{const p=k=>[...study.r[k].h].filter(c=>c==='1').length/study.r[k].h.length;return p(a)-p(b);}).slice(0,3);}

function renderRuleMap(){
  const all=Object.keys(RULE_INFO),tried=all.filter(k=>ruleLevel(k)>0).length,strong=all.filter(k=>ruleLevel(k)===3).length,weak=weakRules();
  $('ruleMap').innerHTML=`<div class="rmSum">${tried?`<b>${tried}</b> of ${all.length} practised · <b>${strong}</b> strong`:'Play or answer questions and each rule fills in here.'}</div>`+
    (weak.length?`<div class="rmWeak">Work on: ${weak.map(k=>`<button class="rmLink" data-r="${k}">${ruleName(k)}</button>`).join(' ')}</div>`:'')+
    RULE_GROUPS.map(([g,ks])=>`<div class="rmG">${g}</div><div class="rmRow">${ks.map(k=>`<button class="rc l${ruleLevel(String(k))}${isNaN(k)?' w':''}" data-r="${k}" aria-label="${ruleName(String(k))}">${k==='IALA'?'Buoyage':k==='Flags'?'Flags':k}</button>`).join('')}</div>`).join('')+
    `<div class="rmKey"><span class="rc l0"></span>not tried <span class="rc l1"></span>needs work <span class="rc l2"></span>getting there <span class="rc l3"></span>strong</div>`;
  $('ruleMap').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>openRule(b.dataset.r));
}
function openRule(k){
  const [title,sum]=RULE_INFO[k],x=study.r[k],mis=RULE_MISSION[k]&&MISSIONS.find(m=>m.id===RULE_MISSION[k]);
  $('rlTitle').textContent=isNaN(k)?title:`Rule ${k} · ${title}`;
  $('rlBody').innerHTML=`<div class="note">${esc(sum)}</div>`+
    (x?`<div class="rlRec"><b>${x.ok}</b> of <b>${x.n}</b> right · last ${x.h.length}: <span class="dots">${[...x.h].map(c=>`<i class="${c==='1'?'g':'b'}"></i>`).join('')}</span></div>`
      :`<div class="small">You haven't been tested on this yet.</div>`)+
    (mis?`<button class="btn" id="rlPlay">${MISSION_META[mis.id]?.icon||'⚓'} Practise in Watchkeeper: ${esc(mis.name)}</button>`:'')+
    `<button class="btn sec" id="rlLearn">📖 Learn: ${esc(SECTIONS[ruleSec(k)].title)}</button>`;
  if(mis)$('rlPlay').onclick=()=>{closeOv('ovRule');wkStart(mis);};
  $('rlLearn').onclick=()=>{closeOv('ovRule');openSec(ruleSec(k));};
  openOv('ovRule');
}

// ---- first launch, install hint, keeping your progress ----
const PROG_KEYS=k=>/^(wkBest|colregs|wkPauseErr)/.test(k); // everything this app stores
const hasProgress=()=>{try{return Object.keys(localStorage).some(k=>/^wkBest|^colregsStudy$|^colregsLocalBoard$|^colregsMockRuns$/.test(k));}catch(e){return false;}};
const flag=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)==='1';localStorage.setItem(k,v?'1':'0');}catch(e){return false;}};
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const installed=()=>window.navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches;

function firstLaunch(){
  if(flag('colregsSeen'))return;
  if(hasProgress()){flag('colregsSeen',true);return;} // an existing player: no welcome
  openOv('ovWelcome');
}
$('wcGo').onclick=()=>{flag('colregsSeen',true);closeOv('ovWelcome');wkStart(MISSIONS[0]);};
$('wcLook').onclick=()=>{flag('colregsSeen',true);closeOv('ovWelcome');};

function renderInstall(){
  const show=isIOS&&!installed()&&!flag('colregsInstallOff');$('installHint').style.display=show?'':'none';}
$('installOff').onclick=()=>{flag('colregsInstallOff',true);renderInstall();};

// Ask the browser to keep this site's storage (lowers the chance Safari clears it after a week away).
try{navigator.storage?.persist?.().catch(()=>{});}catch(e){}

// Backup code: everything the app keeps, as one string you can paste into another browser or the installed app.
function backupCode(){const d={};try{for(const k of Object.keys(localStorage))if(PROG_KEYS(k))d[k]=localStorage.getItem(k);}catch(e){}
  return 'CT1.'+btoa(unescape(encodeURIComponent(JSON.stringify(d))));}
function restoreCode(code){
  const s=String(code||'').trim();if(!s.startsWith('CT1.'))return false;
  let d;try{d=JSON.parse(decodeURIComponent(escape(atob(s.slice(4)))));}catch(e){return false;}
  if(!d||typeof d!=='object')return false;
  try{for(const k of Object.keys(localStorage))if(PROG_KEYS(k))localStorage.removeItem(k);
    for(const [k,v] of Object.entries(d))if(PROG_KEYS(k)&&typeof v==='string')localStorage.setItem(k,v);}catch(e){return false;}
  study=(()=>{try{return JSON.parse(localStorage.getItem(STUDY_KEY))||{v:1,r:{}};}catch(e){return{v:1,r:{}};}})();
  return true;}
$('bkCopy').onclick=async()=>{const c=backupCode(),t=$('bkCode');t.value=c;t.select();let ok=false;
  try{await navigator.clipboard.writeText(c);ok=true;}catch(e){try{ok=document.execCommand('copy');}catch(e2){}}
  $('bkMsg').textContent=ok?'✓ Copied. Paste it somewhere safe, or into the other browser or app.':'Select the code above and copy it.';};
$('bkRestore').onclick=()=>{const c=$('bkCode').value;
  if(!c.trim().startsWith('CT1.')){$('bkMsg').textContent='Paste a backup code (it starts with CT1.) into the box first.';return;}
  if(!confirm('Replace the progress on this device with the backup?'))return;
  if(restoreCode(c)){$('bkMsg').textContent='✓ Progress restored.';$('pPauseErr').checked=wkPref('wkPauseErr',true);muted=wkPref('colregsMute',false);muteUI();renderHome();}
  else $('bkMsg').textContent='That code didn\'t work. Check it was copied in full.';};
