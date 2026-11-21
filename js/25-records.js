// Records: one screen for every score you've set, in three tabs. Watchkeeper (endless) is the main board: your best
// watches with your name, ready for a shared leaderboard later. Challenge and the mock exam are personal.
const WK_RUNS='wkBestRuns',MOCK_RUNS='colregsMockRuns'; // key names the backup code picks up (wkBest*, colregs*)
const getList=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')||[];}catch(e){return [];}};
const setList=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const wkRuns=()=>getList(WK_RUNS).sort((a,b)=>b.score-a.score||b.level-a.level);
// An endless watch ends: keep it (top 50). Returns its place among your watches.
function recordWatch(r){const all=getList(WK_RUNS);all.push(r);all.sort((a,b)=>b.score-a.score||b.level-a.level);setList(WK_RUNS,all.slice(0,50));
  return all.findIndex(x=>x===r)+1;}
function recordMock(r){const all=getList(MOCK_RUNS);all.push(r);setList(MOCK_RUNS,all.slice(-20));}

let recTab='wk',recLast=null;
function openRecords(tab){recTab=tab||recTab;renderRecords();openOv('ovRecords');}
function renderRecords(){
  $('recTabs').querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===recTab));
  const B=$('recBody'),medal=['🥇','🥈','🥉'];
  if(recTab==='wk'){
    const runs=wkRuns().slice(0,10);
    B.innerHTML=`<label class="small" for="recNick">Your name on the Watchkeeper board</label><input id="recNick" maxlength="20" placeholder="e.g. Bryce" autocomplete="off" value="${esc(nick)}">`+
      `<h3 class="sh">🌊 Best watches</h3>`+(runs.length?'<table class="lb">'+runs.map((r,i)=>`<tr class="${recLast&&r.d===recLast.d?'me':''}"><td class="rk">${medal[i]||i+1}</td><td>${esc(r.nick||'Sailor')}</td><td class="sc">${r.score.toLocaleString()}</td><td class="lv">L${r.level}</td><td class="tm">${shortDate(r.d)}</td></tr>`).join('')+'</table>'
        :'<p class="small">No endless watches yet. Tap ⚓ Play on the home page.</p>')+
      `<p class="small">Kept on this device for now. A shared leaderboard for Watchkeeper is planned.</p>`+
      `<h3 class="sh">Practice missions</h3>`+MISSIONS.filter(m=>MISSION_META[m.id]).map(m=>{const b=bestOf(m.id);
        return `<div class="recRow"><span>${MISSION_META[m.id].icon} ${esc(m.name)}</span>${starHTML(starsOf(m.id))}<b>${b?b.toLocaleString():'–'}</b></div>`;}).join('');
    const n=$('recNick');n.onchange=()=>{nick=n.value.trim().slice(0,20)||'Sailor';n.value=nick;$('nick').value=nick;try{localStorage.setItem('colregsNick',nick);}catch(e){}};
  }else if(recTab==='ch'){
    B.innerHTML=`<p class="small">Your best Challenge runs: score, level reached and time. Personal, kept on this device.</p>`+boardHTML(10)+
      `<button class="btn" id="recCh">🏆 Start a Challenge</button>`;
    $('recCh').onclick=()=>{closeOv('ovRecords');$('goChallenge').click();};
  }else{
    const all=getList(MOCK_RUNS),best=mockBest(),pass=r=>r.score/r.n>=MOCK_PASS;
    B.innerHTML=(best?`<div class="recBest"><div class="small">Best mock exam</div><div class="big">${best.score} / ${best.n}</div><div class="${pass(best)?'g':'r'}">${pass(best)?'✅ Pass':'❌ Not yet'} · ${Math.round(100*best.score/best.n)}% · ${mmss(best.ms)}</div></div>`
        :'<p class="small">No mock exams yet. 30 questions, pass mark 80%.</p>')+
      (all.length?`<h3 class="sh">Recent attempts</h3>`+all.slice().reverse().map(r=>{const p=Math.round(100*r.score/r.n);
        return `<div class="recRow"><span>${pass(r)?'✅':'❌'} ${shortDate(r.d)}</span><span class="bar"><i style="width:${p}%" class="${pass(r)?'g':'r'}"></i></span><b>${r.score}/${r.n}</b></div>`;}).join(''):'')+
      `<button class="btn" id="recMk">📝 Take a mock exam</button>`;
    $('recMk').onclick=()=>{closeOv('ovRecords');startMock();};
  }
}
$('recTabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{recTab=b.dataset.t;renderRecords();});
$('goRecords').onclick=()=>openRecords('wk');
$('wkBest').onclick=()=>openRecords('wk');
