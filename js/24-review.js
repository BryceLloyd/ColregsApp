// Mistakes deck and mock exam.
// Mistakes deck: any rule you get wrong (quiz, Challenge or Watchkeeper) goes into the deck, due straight away.
// Reviewing it right moves it up a box and spaces it out (1, 3, 7, 21 days); a fifth right answer clears it.
// Getting it wrong again sends it back to the start. The deck lives in the study record (study.d), so the backup
// code carries it.
// Mock exam: 30 mixed questions with no feedback until the end, a pass mark, and a breakdown by part of the rules.

const DECK_DAYS=[0,1,3,7,21],DAY=864e5,DECK_RETRY=10*60e3;
const deck=()=>study.d||(study.d={});
function deckMiss(keys){const d=deck(),now=Date.now();for(const k of keys)d[k]={b:0,due:now};}
function deckHit(k){const d=deck(),x=d[k];if(!x)return;x.b++;if(x.b>=DECK_DAYS.length)delete d[k];else x.due=Date.now()+DECK_DAYS[x.b]*DAY;studySave();}
const deckDue=()=>Object.entries(deck()).filter(([,x])=>x.due<=Date.now()).sort((a,b)=>a[1].due-b[1].due).map(([k])=>k);

// Every question the app can ask in the quiz format, tagged with the rules it tests.
function reviewPool(){
  const tag=(qs,kind)=>qs.filter(Boolean).map(q=>{q.kind??=kind;q.keys=qKeys(q);return q;});
  return [...tag(RULEQ.map(tq),'rules'),...tag(LIGHTQ.map(tq),'lights'),...tag(makeQs0('lights',24),'lights'),
    ...tag(makeQs0('sounds',16),'sounds'),...tag(buoyQs(9),'buoys'),...tag(makeQs0('flags',8),'flags')];
}
const fmtDays=ms=>{if(ms<3600e3)return `in ${Math.max(1,Math.ceil(ms/60e3))} min`;const d=Math.ceil(ms/DAY);return d<=1?'tomorrow':`in ${d} days`;};

// ---- running a set of questions in the section view ----
function qRun(o){
  $('secTitle').textContent=o.title;$('secTabs').innerHTML='';show('sec');
  let i=0,score=0;const res=[],t0=Date.now();clearInterval(qRun.tick);
  if(o.exam)qRun.tick=setInterval(()=>{const el=$('exT');if(!el||view!=='sec'){if(view!=='sec')clearInterval(qRun.tick);return;}el.textContent=mmss(Date.now()-t0);},1000);
  const next=()=>{const body=$('secBody'),q=qRun.q=o.qs[i];body.scrollTop=0;
    if(!q){clearInterval(qRun.tick);return o.done(body,score,res,Date.now()-t0);}
    body.innerHTML=`<div class="quiz"><div class="qtop"><span>Question ${i+1} / ${o.qs.length}</span><span>${o.exam?`⏱ <span id="exT">${mmss(Date.now()-t0)}</span>`:`Score ${score}`}</span></div><div class="quiz" id="qbox" style="min-height:0"></div></div>`;
    mountQ($('qbox'),q,{silent:o.exam,wrongLabel:'❌ Not quite',onAnswer:ok=>{if(ok)score++;res.push({q,ok});o.onAnswer?.(q,ok);},
      nextText:()=>i+1>=o.qs.length?'See result':'Next ➜',onNext:()=>{i++;next();}});};
  next();
}
const mmss=ms=>{const s=Math.round(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};

// ---- review ----
function startReview(){
  const due=deckDue(),pool=reviewPool(),qs=[],used=new Set();
  for(const k of due){if(qs.length>=10)break;const c=shuffle(pool.filter(q=>q.keys.includes(k)&&!used.has(q)));
    if(!c.length){delete deck()[k];continue;} // nothing in the quiz bank tests it: practise it in Watchkeeper instead
    used.add(c[0]);c[0].target=k;qs.push(c[0]);}
  studySave();if(!qs.length){renderHome();return;}
  qRun({title:'🔁 Review mistakes',qs,onAnswer:(q,ok)=>{if(ok)return deckHit(q.target);
      for(const k of q.keys)if(deck()[k]?.b===0)deck()[k].due=Date.now()+DECK_RETRY;studySave();}, // missed again: back in 10 minutes, not straight away
    done:(body,score,res)=>{const left=Object.values(deck()),now=Date.now(),dueNow=left.filter(x=>x.due<=now).length,
        nextT=left.filter(x=>x.due>now).reduce((m,x)=>Math.min(m,x.due),Infinity);
      body.innerHTML=`<div class="quiz" style="justify-content:center;text-align:center"><div class="small">Review done</div><div class="big">${score} / ${res.length}</div>`+
        `<div>${score===res.length?'All right. Those rules move on to a longer gap.':'The ones you missed stay in the deck for another go.'}</div>`+
        `<div class="small" style="margin-top:6px">${dueNow?`${dueNow} rule${dueNow>1?'s':''} still due now.`:isFinite(nextT)?`Next review ${fmtDays(nextT-now)}.`:'Deck cleared. 🎉'}</div>`+
        `<div class="row" style="margin-top:12px;justify-content:center;gap:8px">${dueNow?'<button class="btn" id="rvMore">Keep going</button>':''}<button class="btn sec" id="rvHome">Home</button></div></div>`;
      if(dueNow)$('rvMore').onclick=startReview;$('rvHome').onclick=()=>show('home');}});
}

// ---- mock exam ----
const MOCK_MIX=[['rules',13],['lights',8],['sounds',5],['buoys',4]],MOCK_PASS=0.8;
const MOCK_PARTS=[['General & steering (Rules 2–19)',k=>+k<=19],['Lights & shapes (Rules 20–31)',k=>+k>=20&&+k<=31],['Sound & distress signals (Rules 32–37)',k=>+k>=32&&+k<=37],['Buoyage (IALA A)',k=>k==='IALA']];
const mockBest=()=>{try{return JSON.parse(localStorage.getItem('colregsMockBest')||'null');}catch(e){return null;}};
function startMock(){
  const qs=MOCK_MIX.flatMap(([k,n])=>makeQs(k,n)).filter(Boolean);
  qRun({title:'📝 Mock exam',qs:shuffle(qs),exam:true,done:(body,score,res,ms)=>{
    const n=res.length,pct=n?score/n:0,pass=pct>=MOCK_PASS,best=mockBest();
    recordMock({score,n,ms,d:Date.now()});
    if(!best||score>best.score||(score===best.score&&ms<best.ms))try{localStorage.setItem('colregsMockBest',JSON.stringify({score,n,ms}));}catch(e){}
    const parts=MOCK_PARTS.map(([name,f])=>{const r=res.filter(x=>(x.q.keys||qKeys(x.q)).some(f));return{name,n:r.length,ok:r.filter(x=>x.ok).length};}).filter(p=>p.n);
    const ans=q=>q.order?q.items.join(' → '):q.img?'':(q.opts||[]).filter(o=>o.ok).map(o=>o.h.replace(/<[^>]*>/g,'')).join('');
    body.innerHTML=`<div style="text-align:center;padding-top:6px"><div class="small">Mock exam · ${mmss(ms)}</div><div class="big">${score} / ${n}</div>`+
      `<div class="mkRes ${pass?'ok':'bad'}">${pass?'✅ Pass':'❌ Not yet'} · ${Math.round(pct*100)}% (pass mark ${Math.round(MOCK_PASS*100)}%)</div></div>`+
      `<div class="card stack" style="margin-top:8px;text-align:left">${parts.map(p=>`<div class="mkPart"><span>${p.name}</span><b class="${p.ok/p.n>=MOCK_PASS?'g':'r'}">${p.ok}/${p.n}</b></div>`).join('')}</div>`+
      (res.some(x=>!x.ok)?`<h3 class="sh" style="margin-top:10px">What you missed</h3>`+res.filter(x=>!x.ok).map(({q})=>`<div class="note mkMiss">${q.vis?`<div class="mkVis">${q.vis}</div>`:''}<b>${esc(q.prompt)}</b>${ans(q)?`<div class="g">✓ ${esc(ans(q))}</div>`:''}<div>${esc(q.explain||'')}</div></div>`).join(''):'')+
      `<div class="row" style="margin:12px 0;gap:8px;justify-content:center"><button class="btn" id="mkAgain">New exam</button><button class="btn sec" id="mkHome">Home</button></div>`;
    body.querySelectorAll('.mkVis .play').forEach(b=>b.onclick=()=>sound(b.dataset.p));
    $('mkAgain').onclick=startMock;$('mkHome').onclick=()=>show('home');}});
}

// ---- home tiles ----
function renderStudyTiles(){
  const d=Object.values(deck()),due=deckDue().length,now=Date.now(),nextT=d.filter(x=>x.due>now).reduce((m,x)=>Math.min(m,x.due),Infinity),b=mockBest();
  $('rvTile').querySelector('small').textContent=due?`${due} rule${due>1?'s':''} to review now`:d.length?`Next review ${fmtDays(nextT-now)}`:'Rules you get wrong come back here';
  $('rvTile').classList.toggle('due',!!due);
  $('mkTile').querySelector('small').textContent=b?`30 questions · best ${b.score}/${b.n}${b.score/b.n>=MOCK_PASS?' ✅':''}`:'30 questions, no hints · pass mark 80%';
}
$('rvTile').onclick=()=>{if(deckDue().length)startReview();else{const t=$('rvTile');t.classList.add('nudge');setTimeout(()=>t.classList.remove('nudge'),600);}};
$('mkTile').onclick=startMock;
