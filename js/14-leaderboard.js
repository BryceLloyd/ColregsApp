// Challenge runs: personal, kept on this device. The shared leaderboard (when it comes) is for Watchkeeper only.
const LB_VERSION=5; // bump when Challenge scoring changes so old runs drop off your list
function localBoard(){try{return (JSON.parse(localStorage.getItem('colregsLocalBoard')||'[]')||[]).filter(r=>typeof r.score==='number'&&(r.v??LB_VERSION)===LB_VERSION);}catch(e){return [];}}
function saveLocal(rows){try{localStorage.setItem('colregsLocalBoard',JSON.stringify(rows.slice(0,100)));}catch(e){}}
const better=(a,b)=>(a.score-b.score)||((a.level||0)-(b.level||0))||((b.time||1e9)-(a.time||1e9));
const challengeRuns=()=>localBoard().sort((a,b)=>better(b,a));
const shortDate=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
let lastRun=null;
function boardHTML(max){
  const rows=challengeRuns().slice(0,max||10),medal=['🥇','🥈','🥉'];
  if(!rows.length)return '<p class="small">No Challenge runs yet. Finish one and it appears here.</p>';
  return '<table class="lb">'+rows.map((r,i)=>
    `<tr class="${r===lastRun||(lastRun&&r.d&&r.d===lastRun.d)?'me':''}"><td class="rk">${medal[i]||i+1}</td><td class="sc" style="text-align:left">✔ ${r.score}</td><td class="lv">${r.level?'L'+r.level:''}</td><td class="tm">${r.time?fmt(r.time):''}</td><td class="tm">${shortDate(r.d)}</td></tr>`).join('')+'</table>';
}
function renderBoard(){$('endBoard').innerHTML=boardHTML(5);}
function saveScore(){
  const mine={nick,score,level,time:Math.round(gameTime),d:Date.now(),v:LB_VERSION},local=localBoard();
  local.push(mine);local.sort((a,b)=>better(b,a));saveLocal(local);lastRun=mine;
  const rank=challengeRuns().findIndex(r=>r.d===mine.d)+1;
  $('saveNote').textContent=rank===1?'🏆 Your best Challenge run yet!':`Saved: your #${rank} Challenge run. Use “Challenge a friend” to share your score.`;
  renderBoard();
}
