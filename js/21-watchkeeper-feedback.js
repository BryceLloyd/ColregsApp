// Watchkeeper in-play feedback: floating points over your ship, a one-line verdict in the hint bar after each
// encounter (tap it for the full card), an optional pause on mistakes (practice missions only; never in endless),
// and the mute button. The full result card no longer pops up over the chart on its own.

// ---- settings (kept on this device) ----
const wkPref=(k,def)=>{try{const v=localStorage.getItem(k);return v===null?def:v==='1';}catch(e){return def;}};
const wkSetPref=(k,v)=>{try{localStorage.setItem(k,v?'1':'0');}catch(e){}};
$('pPauseErr').checked=wkPref('wkPauseErr',true);
$('pPauseErr').onchange=e=>wkSetPref('wkPauseErr',e.target.checked);
const pauseOnMistakes=()=>!P.m.endless&&$('pPauseErr').checked;

function muteUI(){$('pMute').textContent=muted?'🔇':'🔊';$('pMute').setAttribute('aria-label',muted?'Sound off':'Sound on');}
$('pMute').onclick=()=>{muted=!muted;wkSetPref('colregsMute',muted);muteUI();};
muteUI();

// ---- floating points ----
// A short label for a scoring note: its rule if it cites one ("Rule 13", "Rules 8 & 16"), otherwise its first words.
function popLabel(txt){
  const plain=txt.replace(/<[^>]*>/g,''),rules=[...plain.matchAll(/\((Rules? [^()]*(?:\([^()]*\)[^()]*)*)\)/g)]; // allows 34(a), 17(a)(ii)
  if(rules.length)return rules[rules.length-1][1];
  return plain.replace(/\s*\(.*$/,'').split(/[:,]/)[0].split(' ').slice(0,3).join(' ');
}
function popText(txt,good){if(!P)return;const now=performance.now(),last=P.pops.length?P.pops[P.pops.length-1].at:0;
  P.pops.push({txt,good,at:Math.max(now,last+700)});} // stagger so they don't stack on top of each other
// Horn notes (Rules 34 & 35) just say ✓ Horn or ✗ Horn.
const isHorn=lbl=>/\b3[45]\b|\b3[45]\(/.test(lbl);
const ptsTxt=p=>`${p>0?'+':'−'}${Math.abs(p)}`;
function popPoints(e){for(const n of e.notes)if(n.p){const l=popLabel(n.txt);popText(isHorn(l)?`${n.p>0?'✓':'✗'} Horn ${ptsTxt(n.p)}`:`${ptsTxt(n.p)} ${l}`,n.p>0);}}
function popsDraw(c,x,y){
  const now=performance.now();P.pops=P.pops.filter(p=>now-p.at<2400);
  c.textAlign='center';c.font='bold 14px sans-serif';c.lineJoin='round';
  for(const p of P.pops){const age=(now-p.at)/1000;if(age<0)continue;
    c.globalAlpha=Math.min(1,age*6,Math.max(0,(2.4-age)/0.8));const py=y-30-age*36;
    c.lineWidth=4;c.strokeStyle='rgba(5,12,24,.85)';c.strokeText(p.txt,x,py);c.fillStyle=p.good?'#7dffa8':'#ff8a8a';c.fillText(p.txt,x,py);}
  c.globalAlpha=1;
}

// ---- after each encounter: points float up, the verdict goes in the hint bar ----
// Hearts are for safety: a collision (in the referee) or a close call costs one. Mistakes cost points only.
function showResult(e){
  if(!e.collided&&e.notes.some(n=>n.txt.startsWith('Close quarters'))){P.hull--;e.closeCall=true;
    e.notes.push({ok:false,txt:'Close call: that cost a heart',p:0});popText('💔 Close call',false);}
  studyEnc(e);popPoints(e);P.lastRes={e,t:P.time};if(P.m.endless)endlessAfter(e);
  if(e.notes.some(n=>n.ok===false)&&pauseOnMistakes()){P.paused=true;P.mistakePause=true;$('pPause').textContent='▶';}
  const h=$('pHint');if(h)h.dataset.k='';
}
// One line: the worst mistake, or that it went well.
function resSummary(e){
  const worst=e.notes.filter(n=>n.ok===false).sort((a,b)=>a.p-b.p)[0],pts=`${e.pts>=0?'+':'−'}${Math.abs(e.pts)}`;
  return worst?`❌ ${esc(e.name)} ${pts}: ${worst.txt}`:`✅ ${esc(e.name)} ${pts}: ${e.cl.type==='fog'?'handled well in fog':'well handled'}`;
}
// The hint bar shows the last verdict when it's paused on a mistake, or for a while after an encounter when nothing
// else needs your attention. Returns true if it drew the bar.
function fbHintBar(h){
  const R=P.lastRes,active=P.encs.some(e=>!e.done&&e.announced);
  if(!R||(!P.mistakePause&&(active||P.time-R.t>16)))return false;
  const key='res'+R.e.id+R.t+(P.mistakePause?'p':'');if(h.dataset.k===key)return true;h.dataset.k=key;
  const bad=R.e.notes.some(n=>n.ok===false);h.className=bad?'risk':'';
  h.innerHTML=`<span class="sum">${resSummary(R.e)}</span><button class="more">${P.mistakePause?'Why? ›':'Details ›'}</button>`+
    (P.mistakePause?'<button class="go">▶</button>':'');
  h.querySelector('.sum').onclick=h.querySelector('.more').onclick=()=>openResult(R.e);
  const go=h.querySelector('.go');if(go)go.onclick=resumeFromMistake;
  return true;
}
function resumeFromMistake(){P.mistakePause=false;P.paused=false;$('pPause').textContent='⏸';$('pResult').style.display='none';$('pHint').dataset.k='';wkUI();}
// The full card, on request. It pauses the game while it's open.
function openResult(e){
  const el=$('pResult'),bad=e.notes.some(n=>n.ok===false),wasPaused=P.paused;
  el.innerHTML=`<div class="rh"><b>${bad?'❌':'✅'} ${esc(e.name)} · ${encTitle(e)}</b><span style="color:${e.pts>=0?'var(--ok)':'var(--bad)'}">${e.pts>=0?'+':''}${e.pts}</span></div>
    <div class="small">${roleLine(e)}</div>
    <ul>${e.notes.map(n=>`<li class="${n.ok===true?'g':n.ok===false?'b':'t'}">${n.ok===true?'✓':n.ok===false?'✗':'💡'} ${n.txt}${n.p?` (${n.p>0?'+':''}${n.p})`:''}${n.fix?`<div class="fix">➜ ${esc(n.fix)}</div>`:''}</li>`).join('')}</ul>
    <button class="btn" id="pResGo">Back to the bridge ▶</button>`;
  el.style.display='block';P.paused=true;$('pPause').textContent='▶';
  $('pResGo').onclick=()=>{el.style.display='none';if(P.mistakePause||!wasPaused)resumeFromMistake();};
}
