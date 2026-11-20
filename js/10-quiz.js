// Section quizzes (makeQs) and quiz flow.
// ---------- multiple-choice quiz ----------
let quiz=null;
function makeQs(kind,n,topic){
  const nx=n>=3?Math.round(n*0.35):(Math.random()<0.4?1:0);
  const base=makeQs0(kind,n-nx,topic);
  if(kind==='lightsound')return base;
  return shuffle(base.concat(extraQs(kind,nx,topic)));
}
function makeQs0(kind,n,topic){
  const qs=[];
  if(kind==='lightsound')return shuffle(makeQs('lights',7).concat(makeQs('sounds',3)));
  if(kind==='rules'){for(const x of shuffle(RULEQ.filter(r=>!topic||r.g===topic)).slice(0,n))qs.push(tq(x));}
  else if(kind==='lights'){
    const pool=shuffle(LIGHTS.map(x=>({t:'L',x})).concat(SHAPES.map(x=>({t:'S',x})))),facts=shuffle(LIGHTQ),rev=shuffle(LIGHTS);
    for(let k=0;k<n;k++){const r=k%4;
      if(r===2){const x=rev.pop(),others=shuffle(LIGHTS.filter(o=>o!==x)).slice(0,3);
        qs.push({vis:'',prompt:`Which of these is: ${x.s}?`,img:true,opts:shuffle([x,...others]).map(o=>({h:lightSVG(o),ok:o===x})),explain:x.note});continue;}
      if(r===3&&facts.length){qs.push(tq(facts.pop()));continue;}
      const {t,x}=pool.pop();const src=t==='L'?LIGHTS:SHAPES;
      const wrong=shuffle(src.filter(o=>o.s!==x.s)).slice(0,3).map(o=>o.s);
      qs.push({vis:`<div class="w">${t==='L'?lightSVG(x):shapeSVG(x)}</div>`,prompt:t==='L'?"At night you see these lights. What is she?":"By day you see this shape. What does it mean?",
        opts:shuffle([x.s,...wrong]).map(s=>({h:esc(s),ok:s===x.s})),explain:x.note});}
  }else if(kind==='flags'){
    for(const f of shuffle(FLAGS).slice(0,n)){const type=Math.floor(Math.random()*3),others=shuffle(FLAGS.filter(o=>o!==f)).slice(0,3);
      if(type===0)qs.push({vis:`<div class="w" style="width:42%">${flagSVG(f[0])}</div>`,prompt:"What does this flag mean?",opts:shuffle([f,...others]).map(o=>({h:esc(o[2]),ok:o===f})),explain:`${f[0]} · ${f[1]}: ${f[2]}.`});
      else if(type===1)qs.push({vis:`<div class="w" style="width:42%">${flagSVG(f[0])}</div>`,prompt:"Which letter is this flag?",opts:shuffle([f,...others]).map(o=>({h:`${o[0]} · ${o[1]}`,ok:o===f})),explain:`${f[0]} · ${f[1]}: ${f[2]}.`});
      else qs.push({vis:`<div class="qp" style="font-size:17px;padding:0 8px">“${esc(f[2])}”</div>`,prompt:"Which flag means this?",img:true,opts:shuffle([f,...others]).map(o=>({h:flagSVG(o[0]),ok:o===f})),explain:`That's ${f[0]} · ${f[1]}.`});}
  }else if(kind==='buoys'){qs.push(...buoyQs(n));
  }else if(kind==='sounds'){
    for(const s of shuffle(SOUNDS.filter(o=>!topic||o.g===topic)).slice(0,n)){const others=shuffle(SOUNDS.filter(o=>o.g===s.g&&o.p!==s.p)).slice(0,3);
      qs.push({vis:`<div class="pat"><span>${patHTML(s.p)}</span><button class="play" data-p="${s.p}">▶</button></div>`,prompt:`${GROUP_LABEL[s.g]}, you hear this. What does it mean?`,sound:s.p,
        opts:shuffle([s,...others]).map(o=>({h:esc(o.m),ok:o===s})),explain:`${patHTML(s.p)} = ${s.m}.`});}
  }
  return qs;
}
function startQuiz(kind){quiz={kind,qs:makeQs(kind,10),i:0,score:0,done:false};renderQ();}
function renderQ(){
  const body=$('secBody'),q=quiz.qs[quiz.i];
  if(!q){const n=quiz.qs.length,p=quiz.score/n;
    body.innerHTML=`<div class="quiz" style="justify-content:center;text-align:center"><div class="small">Quiz complete</div><div class="big">${quiz.score} / ${n}</div><div>${p===1?'Perfect! 🏆':p>=.7?'Nice work.':'Review the Learn tab and try again.'}</div><div class="row" style="margin-top:12px"><button class="btn" id="qAgain">New quiz</button><button class="btn sec" id="qLearn">Learn</button></div></div>`;
    $('qAgain').onclick=()=>startQuiz(quiz.kind);$('qLearn').onclick=()=>renderTab(0);return;}
  body.innerHTML=`<div class="quiz"><div class="qtop"><span>Question ${quiz.i+1} / ${quiz.qs.length}</span><span>Score ${quiz.score}</span></div><div class="quiz" id="qbox" style="min-height:0"></div></div>`;
  mountQ($('qbox'),q,{wrongLabel:'❌ Not quite',onAnswer:ok=>{if(ok)quiz.score++;},nextText:()=>quiz.i+1>=quiz.qs.length?'See score':'Next ➜',onNext:()=>{quiz.i++;renderQ();}});
}
