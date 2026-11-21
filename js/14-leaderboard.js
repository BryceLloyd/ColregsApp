// Leaderboard. Uses Supabase (REST, no SDK) when js/config.js has a URL and anon key;
// otherwise scores are kept on this device only (localStorage).
const CFG=window.APP_CONFIG||{};
const LB_ON=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
const LB_VERSION=5; // bump when Challenge scoring changes so old scores drop off the board
let board=[],boardState='loading';
const lbHeaders=()=>({apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+CFG.supabaseAnonKey,'Content-Type':'application/json'});
function localBoard(){try{return JSON.parse(localStorage.getItem('colregsLocalBoard')||'[]')}catch(e){return []}}
function saveLocal(rows){try{localStorage.setItem('colregsLocalBoard',JSON.stringify(rows.slice(0,100)))}catch(e){}}
async function initCloud(){
  if(!LB_ON){board=localBoard();boardState='local';return renderBoard();}
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
  try{
    const r=await fetch(`${CFG.supabaseUrl}/rest/v1/scores?select=id,nick,score,level,time_s&version=eq.${LB_VERSION}&order=score.desc,level.desc,time_s.asc&limit=300`,{headers:lbHeaders(),signal:ctl.signal});
    if(!r.ok)throw new Error(r.status);
    board=(await r.json()).map(x=>({id:x.id,nick:x.nick,score:x.score,level:x.level,time:x.time_s}));boardState='ready';
  }catch(e){board=localBoard();boardState='offline';}
  clearTimeout(timer);renderBoard();
}
const better=(a,b)=>(a.score-b.score)||((a.level||0)-(b.level||0))||((b.time||1e9)-(a.time||1e9));
function sorted(){ // best run per name
  const best=new Map();
  for(const r of board){if(typeof r.score!=='number')continue;const k=(r.nick||'').trim().toLowerCase();const p=best.get(k);if(!p||better(r,p)>0)best.set(k,r);}
  return [...best.values()].sort((a,b)=>better(b,a));
}
function boardHTML(max){
  if(boardState==='loading')return '<p class="small">Loading leaderboard…</p>';
  const rows=sorted().slice(0,max||100),medal=['🥇','🥈','🥉'],me=(nick||'').toLowerCase();
  const note=boardState==='local'?'<p class="small">Scores are saved in this browser on this device.</p>':
    boardState==='offline'?'<p class="small">Can\'t reach the shared leaderboard right now — showing scores from this device.</p>':'';
  if(!rows.length)return note+'<p class="small">No scores yet — be the first!</p>';
  return note+'<table class="lb">'+rows.map((r,i)=>
    `<tr class="${(r.nick||'').toLowerCase()===me?'me':''}"><td class="rk">${medal[i]||i+1}</td><td>${esc(r.nick||'Sailor')}</td><td class="sc">✔ ${r.score}</td><td class="lv">${r.level?'L'+r.level:''}</td><td class="tm">${r.time?fmt(r.time):''}</td></tr>`).join('')+'</table>';
}
function renderBoard(){$('lbBoard').innerHTML=boardHTML();$('endBoard').innerHTML=boardHTML(10);}
async function saveScore(){
  const note=$('saveNote'),mine={nick,score,level,time:Math.round(gameTime)};
  const local=localBoard();local.push(mine);local.sort((a,b)=>better(b,a));saveLocal(local);
  if(!LB_ON){board=local;renderBoard();const rank=sorted().findIndex(r=>r.nick===nick)+1;note.textContent=`Saved on this device${rank?` · you're #${rank}`:''}. Use “Challenge a friend” to share your score.`;return;}
  try{
    const r=await fetch(`${CFG.supabaseUrl}/rest/v1/scores`,{method:'POST',headers:Object.assign(lbHeaders(),{Prefer:'return=minimal'}),
      body:JSON.stringify({nick,score,level,time_s:mine.time,version:LB_VERSION})});
    if(!r.ok)throw new Error(r.status);
    await initCloud();const rank=sorted().findIndex(x=>(x.nick||'').toLowerCase()===nick.toLowerCase())+1;
    note.textContent='✅ Score posted!'+(rank?` You're #${rank} on the board.`:'');
  }catch(e){note.textContent='Couldn\'t reach the leaderboard — your score is saved on this device. Try again later.';}
}
