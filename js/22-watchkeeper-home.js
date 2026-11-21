// Watchkeeper as the home page: your best endless watch and a big Play button, then the practice missions with stars
// and best scores. Also endless mode (Mission 7): an ever-extending route, traffic that builds level by level, and
// hearts you lose for collisions or badly handled encounters (and win back with clean ones). Endless never pauses.

// What each practice mission trains, and a reference score for its stars (roughly a clean, rule-perfect run).
const MISSION_META={
  m1:{icon:'🌊',tag:'Crossing, head-on, overtaking',rules:'Rules 13–17',ref:1220},
  m2:{icon:'🛳️',tag:'Two ships at once, mixed types',rules:'Rules 2 & 18',ref:1930},
  m3:{icon:'⛴️',tag:'Narrow channel, buoys, blind bends',rules:'Rule 9',ref:880},
  m4:{icon:'🌙',tag:'Read the lights at night',rules:'Rules 20–31',ref:1250},
  m5:{icon:'🌫️',tag:'Radar only, fog signals',rules:'Rules 19 & 35',ref:1250},
  m6:{icon:'🏴‍☠️',tag:"When they don't give way",rules:'Rules 17 & 34(d)',ref:1300}};
const bestOf=id=>{try{return +localStorage.getItem('wkBest_'+id)||0;}catch(e){return 0;}};
// Stars: 1 for finishing (a best score is only kept for a finished mission), 2 at 60% of the reference, 3 at 85%.
function starsOf(id){const b=bestOf(id),r=MISSION_META[id]?.ref;if(!b||!r)return 0;return 1+(b>=0.6*r)+(b>=0.85*r);}
const starHTML=n=>`<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3-n)}</span></span>`;

function renderHome(){
  const best=bestOf('m7');let lvl=0;try{lvl=+localStorage.getItem('wkBestLevel')||0;}catch(e){}
  $('wkBest').innerHTML=best?`Your best watch: <b>${best.toLocaleString()}</b> pts${lvl?` · reached level ${lvl}`:''}`:'No watch kept yet. Set your first score.';
  $('wkPractice').innerHTML=MISSIONS.filter(m=>MISSION_META[m.id]).map(m=>{const M=MISSION_META[m.id],b=bestOf(m.id);
    return `<button class="tile prac" data-m="${m.id}"><span class="pi">${M.icon}</span><b>${esc(m.name)}</b><small>${esc(M.tag)} · ${M.rules}</small>`+
      `<span class="pr">${starHTML(starsOf(m.id))}<small>${b?'Best '+b.toLocaleString():'Not sailed yet'}</small></span></button>`;}).join('');
  $('wkPractice').querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>wkStart(MISSIONS.find(m=>m.id===b.dataset.m)));
  renderRuleMap();renderInstall();
}
$('wkPlay').onclick=()=>wkStart(MISSIONS.find(m=>m.endless));

// ---- endless mode ----
const ENDLESS_LEVELS=[
  {name:'Power-driven traffic',pool:['headon','xstbd','xport','overtaking','overtaken'],gap:3},
  {name:'Mixed vessel types (Rule 18)',pool:['headon:r18','xport:r18','xstbd:r18'],gap:3},
  {name:'Two ships at once',pool:[['xstbd','xport'],['headon','xstbd:r18'],['xstbd:r18','xport']],gap:3},
  {name:'Some ships ignore the rules',pool:['xport?','overtaken?'],gap:2.5},
  {name:'Traffic builds',pool:[],gap:1.5}];
const endlessLevel=()=>Math.min(1+Math.floor(P.encs.filter(e=>e.done&&!e.silent).length/5),ENDLESS_LEVELS.length+3);
// The route: legs of 4.5–5.5 nm that wander up to 40° either side of north.
function endlessWp(from){const h=(Math.random()*80-40)*D2R,d=4.5+Math.random();return [from[0]+Math.sin(h)*d,from[1]+Math.cos(h)*d];}
function endlessSetup(m){const wps=[[0.6,5]];while(wps.length<4)wps.push(endlessWp(wps[wps.length-1]));
  return Object.assign({},m,{wps,enc:[],gap:3});}
function endlessExtend(){const w=P.m.wps;while(w.length<P.wpi+3)w.push(endlessWp(w[w.length-1]));}
// Keep one ship queued, drawn from every level unlocked so far.
function endlessFeed(){
  const L=endlessLevel();
  if(L!==P.level){if(P.level)wkToast(`⬆ Level ${L}: ${ENDLESS_LEVELS[Math.min(L,ENDLESS_LEVELS.length)-1].name}`,'ok');P.level=L;
    $('pTitle').textContent=`⚓ Watchkeeper · level ${L}`;}
  P.m.gap=ENDLESS_LEVELS[Math.min(L,ENDLESS_LEVELS.length)-1].gap;
  if(P.spawnI<P.m.enc.length)return;
  const pool=ENDLESS_LEVELS.slice(0,L).flatMap(l=>l.pool);P.m.enc.push(pool[Math.floor(Math.random()*pool.length)]);
}
// Hearts: a collision or a close call costs one (referee and showResult). Five clean encounters in a row win one back (up to 3).
function endlessAfter(e){
  const clean=!e.notes.some(n=>n.ok===false);
  if(e.collided||e.closeCall)P.streak=0;
  else if(clean){P.streak=(P.streak||0)+1;if(P.streak>=5){P.streak=0;if(P.hull<3){P.hull++;popText('❤️ +1 heart',true);}}}
  else P.streak=0;
}
function endlessEnd(){
  const prev=bestOf('m7');let lvl=0;
  try{lvl=+localStorage.getItem('wkBestLevel')||0;if(P.score>prev)localStorage.setItem('wkBest_m7',P.score);if(P.level>lvl)localStorage.setItem('wkBestLevel',P.level);}catch(e){}
  $('dbHead').textContent=P.hull>0?'⚓ Watch ended':'⚓ Watch over: out of hearts';
  $('dbSub').textContent=`Level ${P.level} · ${P.spawnI} ship${P.spawnI===1?'':'s'} · ${gclock(P.time)} at sea${P.score>prev&&P.score>0?' · new best!':''}`;
}
