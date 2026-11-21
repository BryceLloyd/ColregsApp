// View switching, overlays, learning sections and practice lists.
// ================= VIEWS =================
let view='home';
function show(v){view=v;if(v==='home'&&typeof renderHome==='function')renderHome();['home','sec','app','play'].forEach(id=>$(id).style.display=id===v?'flex':'none');if(v==='app')resize();if(v==='play')wkResize();}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.ov').classList.remove('on'));
function openOv(id){$(id).classList.add('on');if(id==='ovEnd')renderBoard();}
function closeOv(id){$(id).classList.remove('on')}

// ---------- sections ----------
const SECTIONS={
  rules:{title:"🚢 Rules & scenarios",tabs:["Cheat-sheet","Scenarios","Quiz"]},
  lights:{title:"💡 Lights, shapes & sounds",tabs:["Learn","Scenarios","Quiz"]},
  buoys:{title:"🛟 Buoyage (IALA)",tabs:["Learn","Scenarios","Quiz"]},
  flags:{title:"🚩 Signal flags",tabs:["Learn","Quiz"]}
};
const PRACTICE={
  rules:[
    {name:"The basics",desc:"Head-on, crossing and overtaking between power vessels.",pool:[0,1,2,3,4]},
    {name:"Who gives way?",desc:"Sailing rules, tacks and the Rule 18 pecking order.",pool:[5,6,7,17,18,19,20,21]},
    {name:"Traffic separation schemes",desc:"Rule 10: lanes, crossing at right angles, and who must not impede whom.",pool:[43,44,45,46]},
    {name:"Channels & tough calls",desc:"Narrow channels, overtaking from the quarter, and when the stand-on vessel must act.",pool:[14,30,16]},
    {name:"Restricted visibility (radar)",desc:"Rule 19: radar targets in fog.",pool:[28,29]}],
  lights:[
    {name:"Night lights",desc:"Read the lights from your bridge: head-on, crossing, overtaking, anchored, sail.",pool:[8,9,10,11,24,25,27]},
    {name:"Special vessels & fog signals",desc:"Trawlers, NUC, RAM, deep-draught, fishing — and a fog signal you can only hear.",pool:[12,13,22,23,26,15]}],
  buoys:[
    {name:"Buoyage by day",desc:"Lateral, cardinal, isolated danger, safe water and Region B.",pool:[31,32,33,34,35,36,37,38,39,40]},
    {name:"Cardinal lights at night",desc:"Identify the mark from its flashing light alone.",pool:[41,42]}]
};
const LIGHTS_REF="        <table><tr><th>Vessel</th><th>Lights</th></tr>    <tr><td>Power-driven, underway</td><td><span class=\"l lw\"></span> masthead (225° ahead) + <span class=\"l lr\"></span><span class=\"l lg\"></span> sidelights + <span class=\"l lw\"></span> sternlight</td></tr>    <tr><td>Sailing</td><td>Sidelights + sternlight — <b>no</b> masthead light</td></tr>    <tr><td>Trawling</td><td><span class=\"l lg\"></span> over <span class=\"l lw\"></span> all-round (\"green over white, trawling tonight\")</td></tr>    <tr><td>Fishing (not trawling)</td><td><span class=\"l lr\"></span> over <span class=\"l lw\"></span> all-round (\"red over white, fishing at night\")</td></tr>    <tr><td>Not under command</td><td><span class=\"l lr\"></span> over <span class=\"l lr\"></span> all-round (\"red over red, the captain is dead\")</td></tr>    <tr><td>RAM</td><td><span class=\"l lr\"></span><span class=\"l lw\"></span><span class=\"l lr\"></span> vertical</td></tr>    <tr><td>Constrained by draught</td><td>3 <span class=\"l lr\"></span> vertical</td></tr>    <tr><td>At anchor (&lt;50 m)</td><td>1 <span class=\"l lw\"></span> all-round</td></tr></table>    <p class=\"small\">Sidelights each cover 112.5° from dead ahead to 22.5° abaft the beam; the sternlight covers the remaining 135° astern.</p>";
let curSec=null,curTab=0;
function openSec(k,tab){curSec=k;const S=SECTIONS[k];$('secTitle').textContent=S.title;
  $('secTabs').innerHTML=S.tabs.map((t,i)=>`<button class="tab" data-i="${i}">${t}</button>`).join('');
  $('secTabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>renderTab(+b.dataset.i));
  show('sec');renderTab(tab||0);}
function practiceList(body,key){
  const sets=PRACTICE[key],all=[].concat(...sets.map(x=>x.pool));
  body.innerHTML='<p class="small" style="margin:2px 2px 8px">Practise the animated scenarios — no timer, no lives. The Challenge draws on these at random.</p>'+
    `<label class="note" style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><input type="checkbox" id="varyT" ${varyOn?'checked':''} style="width:22px;height:22px"><span><b>🎲 Mix it up</b><br><span class="small">Rotate the scene${key==='rules'?'':', switch day ↔ night'}, swap vessel types — same rules, new picture.</span></span></label>`+
    sets.map((p,n)=>`<button class="tile lvl" data-n="${n}"><b>${esc(p.name)}</b><small>${esc(p.desc)} · ${p.pool.length} scenarios</small></button>`).join('')+
    `<button class="tile lvl" data-n="all"><b>All ${all.length} in this section</b><small>Everything, in order.</small></button>`;
  $('varyT').onchange=e=>{varyOn=e.target.checked;};
  body.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{const n=b.dataset.n;
    startPractice(n==='all'?{name:'All',pool:all}:sets[+n],[key,1]);});
}
function renderTab(i){curTab=i;
  $('secTabs').querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',+b.dataset.i===i));
  const body=$('secBody');body.scrollTop=0;
  if(i===1&&PRACTICE[curSec])return practiceList(body,curSec);
  if(curSec==='rules'){
    if(i===0)body.innerHTML='<div class="rules">'+$('rulesTpl').innerHTML+'</div>';
    else startQuiz('rules');
  }else if(curSec==='lights'){
    if(i===0){
      let h=`<div class="jumps"><button data-j="lt">💡 Lights</button><button data-j="sh">⚫ Shapes</button><button data-j="sn">📯 Sounds</button></div>`+
      `<div class="secH" id="lt">Lights at night</div><div class="rules">${LIGHTS_REF}</div><div class="cards" style="margin-top:8px">`+LIGHTS.map(it=>`<div class="card">${lightSVG(it)}<b>${esc(it.s)}</b><span>${esc(it.note)}</span></div>`).join('')+
      '</div><div class="secH" id="sh">Day shapes</div><div class="cards">'+SHAPES.map(it=>`<div class="card">${shapeSVG(it)}<b>${esc(it.s)}</b><span>${esc(it.note)}</span></div>`).join('')+'</div>'+
      '<div class="secH" id="sn">Sound signals</div><p class="small" style="margin:2px 2px 8px">• short blast (~1 s) · ▬ prolonged blast (4–6 s). Tap ▶ to hear (sped up).</p>';
      for(const g of['sight','fog']){h+=`<div class="secH" style="font-size:13px;color:var(--mut)">${GROUP_LABEL[g]}</div>`+SOUNDS.map((s,j)=>s.g!==g?'':`<div class="snd"><span class="pat">${patHTML(s.p)}</span><span class="m">${esc(s.m)}</span><button class="play" data-j="${j}">▶</button></div>`).join('');}
      body.innerHTML=h;body.querySelectorAll('.play').forEach(b=>b.onclick=()=>sound(SOUNDS[+b.dataset.j].p));
      body.querySelectorAll('[data-j="lt"],[data-j="sh"],[data-j="sn"]').forEach(b=>b.onclick=()=>{const el=$(b.dataset.j);body.scrollTo({top:el.offsetTop-body.offsetTop-6,behavior:'smooth'});});
    }else startQuiz('lightsound');
  }else if(curSec==='flags'){
    if(i===0)body.innerHTML='<p class="small" style="margin:2px 2px 8px">International Code of Signals — single-letter flags and their meanings.</p><div class="cards">'+FLAGS.map(f=>`<div class="card">${flagSVG(f[0])}<b>${f[0]} · ${f[1]}</b><span>${esc(f[2])}</span></div>`).join('')+'</div>';
    else startQuiz('flags');
  }else if(curSec==='buoys'){
    if(i===0)renderBuoyLearn(body);else startQuiz('buoys');
  }
}
document.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>openSec(b.dataset.sec));
$('secBack').onclick=()=>show('home');
