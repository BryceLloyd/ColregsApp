// True/false, spot-the-mistake, ordering questions and the shared question renderer.
// ================= NEW QUESTION FORMATS =================
const tfQ=(vis,stmt,truth,explain)=>({vis,prompt:stmt+' — true or false?',opts:[{h:'True',ok:truth},{h:'False',ok:!truth}],explain:(truth?'True. ':'False. ')+explain});
const coin=()=>Math.random()<0.5;
function tfGen(kind,topic){
  if(kind==='lights'){const x=shuffle(LIGHTS)[0],tr=coin(),y=tr?x:shuffle(LIGHTS.filter(o=>o!==x&&!lookAlike(o,x)))[0];
    return tfQ(`<div class="w">${lightSVG(x)}</div>`,`These lights show: ${y.s}`,tr,`They show: ${x.s}. ${x.note}`);}
  if(kind==='flags'){const f=shuffle(FLAGS)[0],tr=coin(),g=tr?f:shuffle(FLAGS.filter(o=>o!==f))[0];
    return tfQ(`<div class="w" style="width:42%">${flagSVG(f[0])}</div>`,`This flag means “${g[2]}”`,tr,`${f[0]} · ${f[1]}: ${f[2]}.`);}
  if(kind==='buoys'){buoyRegion='A';const b=shuffle(BUOYS)[0],tr=coin(),c=tr?b:shuffle(BUOYS.filter(o=>o!==b))[0];
    return tfQ(`<div class="w" style="width:34%">${buoySVG(b,false)}</div>`,`In Region A, this mark is: ${c.s}`,tr,`It's: ${b.s}. ${b.note}`);}
  if(kind==='sounds'){const s=shuffle(SOUNDS.filter(o=>!topic||o.g===topic))[0],tr=coin(),u=tr?s:shuffle(SOUNDS.filter(o=>o.g===s.g&&o.p!==s.p))[0];
    return tfQ(`<div class="pat"><span>${patHTML(s.p)}</span><button class="play" data-p="${s.p}">▶</button></div>`,`${GROUP_LABEL[s.g]}, this means: “${u.m}”`,tr,`${patHTML(s.p)} = ${s.m}.`);}
  if(kind==='rules'){const r=shuffle(RULEQ.filter(o=>!topic||o.g===topic))[0],tr=coin(),a=tr?r.a:shuffle(r.w)[0];
    return tfQ('',`${r.q} Answer: “${a}”`,tr,r.e);}
}
const SPOT=[
 {k:'lights',claim:"a sailing yacht under sail, seen from ahead",L:[['w',0,-2.2],['g',-.6,0],['r',.6,0]],a:"It's showing a masthead light",w:["The sidelights are the wrong way round","It should show red over red","Nothing — it's correct"],e:"Under sail alone she shows no masthead light. A masthead light means power-driven."},
 {k:'lights',claim:"a power-driven vessel heading straight at you",L:[['w',0,-2.2],['r',-.7,0],['g',.7,0]],a:"The sidelights are the wrong way round",w:["It's missing a sternlight","It needs two all-round reds","Nothing — it's correct"],e:"Coming towards you, her green (starboard) side is on YOUR left and her red on your right."},
 {k:'lights',claim:"a vessel engaged in trawling, making way",L:[['w',0,-2.6],['g',0,-1.7],['g',-.6,0],['r',.6,0]],a:"Upside down — it should be green OVER white",w:["Trawlers show red over white","It needs a yellow light","Nothing — it's correct"],e:"'Green over white, trawling tonight.'"},
 {k:'lights',claim:"a vessel not under command, making way",L:[['r',0,-2.6],['r',0,-1.7],['g',-.6,0],['r',.6,0]],a:"Nothing — it's correct",w:["It should be red over white","It's missing a masthead light","The sidelights shouldn't show"],e:"Red over red, plus sidelights (and sternlight) when making way through the water. All correct."},
 {k:'lights',claim:"a pilot vessel on duty",L:[['r',0,-2.6],['w',0,-1.7],['g',-.6,0],['r',.6,0]],a:"Upside down — it should be white OVER red",w:["It should be green over white","It needs three all-round lights","Nothing — it's correct"],e:"'White over red, pilot ahead.' Red over white is a fishing vessel."},
 {k:'buoys',claim:"a north cardinal mark",b:{id:'N',top:['S']},a:"The topmark is wrong — north cones both point UP",w:["The colours are wrong — it should be all yellow","It should be can-shaped","Nothing — it's correct"],e:"North: both cones point up, and the black band is on top (where the points are)."},
 {k:'buoys',claim:"a port-hand lateral mark in Region A",b:{id:'port',bands:[['G',1]],top:['can','G']},a:"Wrong colour — in Region A it should be red",w:["Wrong shape — it should be a cone","It needs a yellow band","Nothing — it's correct"],e:"Region A port-hand marks are red cans. A green can would be Region B."},
 {k:'buoys',claim:"a west cardinal mark",b:{id:'W'},a:"Nothing — it's correct",w:["The topmark should point up","The black band should be on top","It should have a red ball on top"],e:"Yellow–black–yellow with cones point to point (a wine glass): a correct west cardinal."},
 {k:'buoys',claim:"an isolated danger mark",b:{id:'iso',top:['ball']},a:"The topmark is wrong — it should be two black balls",w:["The colours should be red and white stripes","It should be can-shaped","Nothing — it's correct"],e:"Isolated danger: black with red band(s), TWO black balls. A single red ball belongs on a safe water mark."}
];
function spotQ(k){const s=shuffle(SPOT.filter(x=>x.k===k))[0];let vis;
  if(k==='lights')vis=`<div class="w">${lightSVG({L:s.L})}</div>`;
  else{buoyRegion='A';vis=`<div class="w" style="width:34%">${buoySVG(Object.assign({},BUOYS.find(x=>x.id===s.b.id),s.b),false)}</div>`;}
  return {vis,prompt:`This is meant to be ${s.claim}. What's wrong?`,opts:shuffle([s.a,...s.w]).map(t=>({h:esc(t),ok:t===s.a})),explain:s.e};}
const ORDERQ=[
 {k:'rules',prompt:"Rule 18: put these in order, starting with the vessel everyone else keeps clear of.",items:["Not under command or restricted in ability to manoeuvre (equal)","Constrained by draught","Fishing","Sailing","Power-driven"],explain:"NUC = RAM → CBD → fishing → sail → power. The less able she is to manoeuvre, the more others keep clear."},
 {k:'rules',prompt:"You're the stand-on vessel and the give-way vessel isn't acting. Put your actions in order.",items:["Keep your course and speed","Sound at least five short blasts","You may act to avoid collision","You must take the best action to avoid collision"],explain:"Rule 17: hold on (a)(i) → warn with five short blasts (34(d)) → you MAY act (a)(ii) → you MUST act when she alone can't avoid collision (b)."},
 {k:'lights',prompt:"Put these light arcs in order, widest first.",items:["All-round light (360°)","Masthead light (225°)","Sternlight (135°)","Each sidelight (112.5°)"],explain:"360° → 225° → 135° → 112.5°."},
 {k:'buoys',prompt:"Put these cardinal lights in order of flashes per group, fewest first.",items:["East — Q(3)","South — Q(6) + long flash","West — Q(9)"],explain:"Clock face: east 3, south 6 (+ long), west 9. North flashes continuously."}
];
function orderQ(k){const o=shuffle(ORDERQ.filter(x=>x.k===k))[0];if(!o)return null;
  return {order:true,items:o.items,shuf:shuffle(o.items),vis:'',prompt:o.prompt,explain:o.explain};}
// extra formats mixed into any set
function extraQs(kind,n,topic){
  const out=[];
  for(let k=0;k<n;k++){const r=Math.random();let q=null;
    if(r<0.5)q=tfGen(kind,topic);
    else if(r<0.8&&(kind==='lights'||kind==='buoys'))q=spotQ(kind);
    else if(kind!=='flags'&&kind!=='sounds'&&!(kind==='rules'&&topic==='fog'))q=orderQ(kind);
    out.push(q||tfGen(kind,topic));}
  return out;
}
// ---------- shared question mount (quiz + challenge) ----------
function mountQ(m,q,{wrongLabel,onAnswer,nextText,onNext}){
  const body=q.order?`<div class="ord">${q.shuf.map((s,j)=>`<button class="opt ordi" data-j="${j}"><span class="num"></span><span>${esc(s)}</span></button>`).join('')}</div><button class="linkb" id="ordReset">↺ Reset order</button>`
    :`<div class="opts">${q.opts.map((o,j)=>`<button class="opt ${q.img?'img':''}" data-j="${j}">${o.h}</button>`).join('')}</div>`;
  m.innerHTML=(q.vis?`<div class="qvis">${q.vis}</div>`:'')+`<div class="qp">${esc(q.prompt)}</div>${body}<div class="qfb"></div><button class="btn qnext" style="display:none"></button>`;
  const pb=m.querySelector('.play');if(pb)pb.onclick=()=>sound(pb.dataset.p);
  if(q.sound)sound(q.sound);
  const done=ok=>{q.answered=true;onAnswer(ok);
    const fb=m.querySelector('.qfb');fb.className='qfb '+(ok?'ok':'bad');fb.style.display='block';
    fb.innerHTML=`<h4>${ok?'✅ Correct':wrongLabel}</h4>${esc(q.explain)}`+(q.order&&!ok?`<ol style="margin:4px 0 0;padding-left:18px">${q.items.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'');
    const nb=m.querySelector('.qnext');nb.style.display='block';nb.textContent=nextText();nb.onclick=onNext;
    nb.scrollIntoView({block:'nearest',behavior:'smooth'});};
  if(q.order){let seq=[];const btns=[...m.querySelectorAll('.ordi')];
    const paint=()=>btns.forEach((b,j)=>{const p=seq.indexOf(j);b.querySelector('.num').textContent=p<0?'':p+1;b.classList.toggle('picked',p>=0);});
    btns.forEach((b,j)=>b.onclick=()=>{if(q.answered||seq.includes(j))return;seq.push(j);paint();
      if(seq.length===btns.length){const ok=seq.every((jj,p)=>q.shuf[jj]===q.items[p]);
        btns.forEach((bb,jj)=>bb.classList.add(q.shuf[jj]===q.items[seq.indexOf(jj)]?'right':'wrong'));
        m.querySelector('#ordReset').style.display='none';done(ok);}});
    m.querySelector('#ordReset').onclick=()=>{if(q.answered)return;seq=[];paint();};
  }else m.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    if(q.answered)return;const o=q.opts[+b.dataset.j];
    m.querySelectorAll('.opt').forEach((x,j)=>{if(q.opts[j].ok)x.classList.add('right');else if(x===b)x.classList.add('wrong');});
    done(o.ok);});
}
