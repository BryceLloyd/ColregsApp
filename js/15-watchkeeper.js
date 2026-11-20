// Watchkeeper free play: missions, AI traffic, encounter referee and scoring.
// ================= WATCHKEEPER (free play) =================
const REGION='A';               // IALA buoyage region used as the standard
const WK_TS=20, KN=WK_TS/3600;  // knots -> nm per real second at 20x
const TELE=[{l:'Astern',v:-4},{l:'Stop',v:0},{l:'Slow',v:4},{l:'Half',v:8},{l:'Full',v:12}];
const MISSIONS=[
 {id:'m1',name:'Open water',desc:'Daylight, light traffic: head-on, crossing and overtaking encounters with other power-driven vessels.',wps:[[0.6,5],[3.6,8.6],[3.0,13.2],[6.4,16.4]],enc:['xstbd','headon','xport','overtaking','overtaken','xstbd','headon'],par:310,ready:true},
 {id:'m2',name:'Busy crossing',desc:'More traffic and mixed vessel types (Rule 18).'},
 {id:'m3',name:'Harbour channel',desc:'A buoyed channel, IALA Region A.'},
 {id:'m4',name:'Night passage',desc:'Lights only.'},
 {id:'m5',name:'Fog',desc:'Radar and sound signals only.'},
 {id:'m6',name:'Rogue ships',desc:'Some ships ignore the rules.'},
 {id:'m7',name:'Endless',desc:'Survive as the traffic builds.'}];
const ENC_LABEL={headon:'Head-on',xstbd:'Crossing from starboard',xport:'Crossing from port',overtaking:'You overtaking',overtaken:'Being overtaken'};
let P=null,pctx=null,PW=360,PH=400;
const pvel=b=>vel(b.h,b.v*KN);
function cpaOf(a,b){const px=b.x-a.x,py=b.y-a.y,va=pvel(a),vb=pvel(b),wx=vb.x-va.x,wy=vb.y-va.y,w2=wx*wx+wy*wy;
  const tc=w2<1e-12?0:-(px*wx+py*wy)/w2,tt=Math.max(tc,0);return{cpa:Math.hypot(px+wx*tt,py+wy*tt),tcpa:tc,range:Math.hypot(px,py)};}
function classify(me,tg){
  const rb=norm(brg(me,tg)-me.h),a=norm(brg(tg,me)-tg.h);
  if(Math.abs(rb)>112.5&&tg.v>me.v)return{type:'overtaken',role:'stand',rule:'Rules 13 & 17'};
  if(Math.abs(a)>112.5&&me.v>tg.v)return{type:'overtaking',role:'give',rule:'Rule 13'};
  if(Math.abs(rb)<10&&Math.abs(a)<10)return{type:'headon',role:'give',rule:'Rule 14'};
  if(rb>0)return{type:'xstbd',role:'give',rule:'Rule 15'};
  return{type:'xport',role:'stand',rule:'Rule 17'};
}
function bestKey(m){return 'wkBest_'+m.id;}
function wkOpen(){
  let h='';for(const m of MISSIONS){let best=null;try{best=localStorage.getItem(bestKey(m))}catch(e){}
    h+=`<button class="tile mis" ${m.ready?'':'disabled'} data-m="${m.id}"><b>${MISSIONS.indexOf(m)+1} · ${esc(m.name)}</b><small>${esc(m.desc)}${m.ready?(best?` · Your best: ${best}`:''):' · Coming soon'}</small></button>`;}
  $('pMissions').innerHTML=h;$('pMissions').querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{closeOv('ovPlay');wkStart(MISSIONS.find(m=>m.id===b.dataset.m));});
  openOv('ovPlay');
}
function wkStart(m){
  const wp=m.wps[0],h0=Math.round(brg({x:0,y:0},{x:wp[0],y:wp[1]}));
  P={m,own:{x:0,y:0,h:h0,th:h0,v:12,tv:12,tele:4,trail:[]},ais:[],encs:[],wpi:0,score:0,hull:3,time:0,horn:[],spawnI:0,lastSpawn:-8,
     sel:null,range:3,hints:$('pHints').checked,paused:false,over:false,nid:0,toasts:[],trailT:0};
  $('pTitle').textContent=`${MISSIONS.indexOf(m)+1} · ${m.name}`;$('pPause').textContent='⏸';
  $('pTele').innerHTML=TELE.map((x,i)=>`<button data-i="${i}">${x.l}</button>`).join('');
  $('pTele').querySelectorAll('button').forEach(b=>b.onclick=()=>{P.own.tele=+b.dataset.i;P.own.tv=TELE[P.own.tele].v;wkUI();});
  show('play');wkResize();wkUI();wkToast('Steer for waypoint 1 ⚑','info');
}
function wkResize(){const st=$('pStage'),dpr=window.devicePixelRatio||1;PW=st.clientWidth;PH=st.clientHeight;if(!PW||!PH)return;
  const c=$('pcv');c.width=PW*dpr;c.height=PH*dpr;pctx=c.getContext('2d');pctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',()=>{if(view==='play')wkResize();});
function wkToast(txt,cls){if(!P)return;P.toasts.push({txt,cls,t:P.time});if(P.toasts.length>3)P.toasts.shift();renderToasts();}
function renderToasts(){$('pToast').innerHTML=P.toasts.map(x=>`<div class="ptoast ${x.cls}">${esc(x.txt)}</div>`).join('');}
function spawnAI(kind){
  const o=P.own,T=20,sp=Math.max(o.v,6)*KN,M={x:o.x+Math.sin(o.h*D2R)*sp*T,y:o.y+Math.cos(o.h*D2R)*sp*T};
  let h,v,x,y;const lat=(d)=>({x:Math.cos(o.h*D2R)*d,y:-Math.sin(o.h*D2R)*d});
  if(kind==='overtaking'){h=o.h;v=4;const l=lat(0.04);x=o.x+Math.sin(o.h*D2R)*1.4+l.x;y=o.y+Math.cos(o.h*D2R)*1.4+l.y;}
  else if(kind==='overtaken'){h=o.h;v=Math.max(o.v,6)+9;const l=lat(-0.05);x=o.x-Math.sin(o.h*D2R)*1.6+l.x;y=o.y-Math.cos(o.h*D2R)*1.6+l.y;}
  else{if(kind==='headon'){h=norm(o.h+180+(Math.random()*6-3));v=9+Math.random()*4;}
    else if(kind==='xstbd'){h=norm(o.h-90+(Math.random()*50-25));v=8+Math.random()*6;}
    else{h=norm(o.h+90+(Math.random()*50-25));v=8+Math.random()*6;}
    const ve=vel(h,v*KN);x=M.x-ve.x*T;y=M.y-ve.y*T;}
  P.nid++;const a={id:P.nid,name:'Ship '+'ABCDEFGHJKLMNP'[(P.nid-1)%14],type:'power',x,y,h,th:h,h0:h,v,tv:v,trail:[],state:'cruise',bh:[]};P.ais.push(a);
  newEnc(a);
}
function newEnc(a){
  const o=P.own,c=cpaOf(o,a);
  P.encs.push({id:a.id,name:a.name,cl:classify(o,a),h0:o.th,v0:o.tv,act:null,dir:0,dirT:0,asp:norm(brg(a,o)-a.h),crossed:false,standBreak:false,minR:c.range,notes:[],pts:0,collided:false,announced:false,backT:null,droppedBack:false});
}
function turnTo(b,rate,dt){const d=norm(b.th-b.h),r=rate*dt;b.h=norm(b.h+(Math.abs(d)<r?d:Math.sign(d)*r));}
function aiTick(a,dt){
  const c=cpaOf(a,P.own),cl=classify(a,P.own),risk=c.cpa<0.35&&c.tcpa>0&&c.range<3.5;
  if(a.state==='cruise'&&risk&&c.range<2.2){
    if(cl.role==='give'){if(cl.type==='overtaking'){const rb=norm(brg(a,P.own)-a.h);a.th=norm(a.h0+(rb>0?-25:25));}else a.th=norm(a.h0+(cl.type==='headon'?30:45));a.state='avoid';}
    else a.state='stand';}
  if(a.state==='stand'&&c.cpa<0.08&&c.range<0.35&&c.tcpa>0){a.th=norm(a.h0+60);a.state='avoid';}
  if(a.state==='avoid'&&c.tcpa<0&&c.range>0.8){a.th=a.h0;a.state='resume';}
  turnTo(a,10,dt);const ve=pvel(a);a.x+=ve.x*dt;a.y+=ve.y*dt;
  a.bh.push({t:P.time,b:brg(P.own,a)});while(a.bh.length&&P.time-a.bh[0].t>2.5)a.bh.shift();
}
function encAlert(e){return `⚠ Risk of collision with ${e.name}: bearing steady, range closing. Your move.`;}
function encHint(e){
  const n=e.name;
  return {headon:`Head-on with ${n}: both turn to STARBOARD (Rule 14).`,xstbd:`${n} is crossing from starboard: you give way (Rule 15). Act early and boldly.`,
    xport:`${n} is crossing from port: you stand on. Hold course and speed (Rule 17).`,overtaking:`You're overtaking ${n}: keep well clear, either side (Rule 13).`,
    overtaken:`${n} is overtaking you: hold course and speed (Rules 13 & 17).`}[e.cl.type];
}
function encTick(a,c){
  const o=P.own;let e=P.encs.find(x=>x.id===a.id&&!x.done);
  if(!e){ // you dropped back from her earlier and are now closing in again: that's a new encounter
    if(c.tcpa>0&&c.cpa<0.5&&c.range<3.2&&!a.dead&&P.encs.findLast(x=>x.id===a.id).droppedBack){newEnc(a);e=P.encs[P.encs.length-1];}else return;}
  const before=c.tcpa>0;
  if(!e.announced&&before&&c.cpa<0.5&&c.range<3.2){e.announced=true;P.sel=a.id;wkToast(encAlert(e),'info');}
  e.minR=Math.min(e.minR,c.range);
  const dho=norm(o.th-e.h0); // ordered course change since the encounter began
  if(before){
    if(!e.dir&&Math.abs(dho)>=10){e.dir=Math.sign(dho);e.dirT=P.time;
      if(e.cl.type==='headon'&&e.dir<0)wkToast('✗ Rule 14: head-on, turn to STARBOARD','bad');
      if(e.cl.type==='xstbd'&&e.dir<0)wkToast('✗ Rule 15: turn to starboard and pass astern of her','bad');}
    if(!e.act&&(Math.abs(dho)>=30||(e.v0>2&&o.tv<=0.5*e.v0)))e.act={range:c.range,tg:c.tcpa*WK_TS/60,by:Math.abs(dho)>=30?'course':'speed'};
    if(e.cl.role==='stand'&&e.announced&&!e.standBreak&&c.range>0.6&&(Math.abs(dho)>=15||o.tv<0.6*e.v0)){e.standBreak=true;wkToast('✗ Rule 17(a): you are stand-on — hold course and speed','bad');}
  }
  const asp=norm(brg(a,o)-a.h);
  if(e.cl.type==='xstbd'&&!e.crossed&&Math.sign(asp)!==Math.sign(e.asp)&&Math.abs(asp)<40&&c.range<1.5){e.crossed=true;wkToast('✗ Rule 15: you crossed ahead of her','bad');}
  e.asp=asp;
  if(c.range<0.04){e.collided=true;P.hull--;wkToast('💥 Collision with '+a.name+'!','bad');a.dead=true;wkGrade(e);return;}
  // Overtaking, but you've slowed to her speed (or less) and aren't closing: staying astern keeps clear (Rule 13).
  if(e.cl.type==='overtaking'&&c.tcpa<=0&&o.v<=a.v+0.05){if(e.backT===null)e.backT=P.time;else if(P.time-e.backT>=3){e.droppedBack=true;return wkGrade(e);}}
  else e.backT=null;
  if((c.tcpa<0&&c.range>1.0)||c.range>5)wkGrade(e);
}
function wkGrade(e){
  if(e.done)return;e.done=true;const N=e.notes;let pts=0;
  const add=(p,ok,txt,fix)=>{pts+=p;N.push({ok,txt,p,fix});};
  if(e.collided)add(-200,false,'Collision','Act earlier and make a bigger change of course or speed.');
  if(e.hintCost)N.push({ok:null,txt:'You used a hint (−20, already taken)',p:0});
  if(e.cl.role==='give'){
    if(!e.act)add(-100,false,`No substantial action taken (${e.cl.rule} & Rule 16)`,
      e.cl.type==='headon'?'Head-on: turn boldly to starboard (30° or more) as soon as you see her ahead with a steady bearing.':
      e.cl.type==='overtaking'?'When overtaking, alter course well before you close: 30° or more to either side.':
      'You were give-way: alter 30° or more to starboard to pass astern of her, or cut your speed by half or more — early.');
    else if(e.act.tg>=5)add(100,true,`Early, substantial action ${Math.round(e.act.tg)} min before CPA, by ${e.act.by} (Rules 8 & 16)`);
    else if(e.act.tg>=2.5)add(40,true,`Action ${e.act.tg.toFixed(1)} min before CPA (Rule 8)`,'Good, but act as soon as the bearing is steady: aim for 5+ minutes before CPA.');
    else add(-50,false,`Action left late: only ${Math.max(0,e.act.tg).toFixed(1)} min before CPA (Rule 8)`,'Act as soon as you see the bearing is steady and the range closing. Aim for 5+ minutes before CPA.');
    if(e.cl.type==='headon'&&e.dir<0)add(-75,false,'Turned to port in a head-on situation (Rule 14)','Head-on, both ships turn to starboard and pass port to port.');
    if(e.cl.type==='xstbd'&&e.dir<0&&!e.crossed)add(-40,false,'Turned to port for a ship on your starboard side (Rule 15)','Turn to starboard so you pass astern of her. A port turn heads across her bow.');
    if(e.crossed)add(-75,false,'Crossed ahead of the stand-on vessel (Rule 15)','Always pass astern of the ship on your starboard side. Never cut across her bow.');
    if(e.droppedBack)add(0,true,'Dropped back and stayed astern of her: that keeps clear (Rules 8(e) & 13)');
  }else{
    if(e.standBreak)add(-50,false,'Changed course or speed while she was keeping clear (Rule 17(a))','As stand-on, hold course and speed so she can predict you. Only act if she clearly isn\'t (sound 5 short first) or collision is imminent.');
    else add(60,true,`Held course and speed as the stand-on vessel (${e.cl.rule})`);
  }
  if(!e.collided){if(e.minR<0.2)add(-50,false,`Close quarters: passed only ${e.minR.toFixed(2)} nm off`,'Make a bigger alteration (or slow more) so you pass at least 0.5 nm clear.');
    else if(e.minR>=0.4)add(25,true,`Safe passing distance (${e.minR.toFixed(2)} nm)`);}
  if(e.dir&&e.cl.role==='give'){const want=e.dir>0?'S':'SS',hit=P.horn.find(x=>Math.abs(x.t-e.dirT)<=8&&x.p===want);
    if(hit)add(15,true,`Correct sound signal ${patHTML(want)} (Rule 34)`);
    else N.push({ok:null,txt:`No sound signal: give ${patHTML(want)} when you alter ${want==='S'?'to starboard':'to port'} in sight of another ship (Rule 34)`,p:0});}
  e.pts=pts;P.score+=pts;showResult(e);
}
function showResult(e){
  const bad=e.notes.some(n=>n.ok===false),el=$('pResult');
  el.innerHTML=`<div class="rh"><b>${bad?'❌':'✅'} ${esc(e.name)} · ${ENC_LABEL[e.cl.type]}</b><span style="color:${e.pts>=0?'var(--ok)':'var(--bad)'}">${e.pts>=0?'+':''}${e.pts}</span></div>
    <div class="small">You were the ${e.cl.role==='give'?'give-way':'stand-on'} vessel (${e.cl.rule}).</div>
    <ul>${e.notes.map(n=>`<li class="${n.ok===true?'g':n.ok===false?'b':'t'}">${n.ok===true?'✓':n.ok===false?'✗':'💡'} ${n.txt}${n.p?` (${n.p>0?'+':''}${n.p})`:''}${n.fix?`<div class="fix">➜ ${esc(n.fix)}</div>`:''}</li>`).join('')}</ul>`+
    (bad?'<button class="btn" id="pResGo">Got it — continue ▶</button>':'');
  el.style.display='block';clearTimeout(P.resT);
  if(bad){P.paused=true;$('pPause').textContent='▶';$('pResGo').onclick=()=>{el.style.display='none';P.paused=false;$('pPause').textContent='⏸';};}
  else P.resT=setTimeout(()=>{el.style.display='none';},4500);
}
function wkTick(dt){
  const o=P.own;P.time+=dt;
  turnTo(o,3+15*Math.min(1,Math.abs(o.v)/12),dt);
  const dv=o.tv-o.v,acc=1.2*dt;o.v+=Math.abs(dv)<acc?dv:Math.sign(dv)*acc;
  const ve=pvel(o);o.x+=ve.x*dt;o.y+=ve.y*dt;
  P.trailT+=dt;if(P.trailT>0.4){P.trailT=0;o.trail.push({x:o.x,y:o.y});if(o.trail.length>60)o.trail.shift();for(const a of P.ais){a.trail.push({x:a.x,y:a.y});if(a.trail.length>40)a.trail.shift();}}
  for(const a of P.ais){aiTick(a,dt);encTick(a,cpaOf(o,a));}
  P.ais=P.ais.filter(a=>{if(a.dead)return false;const c=cpaOf(o,a);return !(c.range>6&&c.tcpa<0);});
  // spawn
  const m=P.m,active=P.encs.some(e=>!e.done),near=P.ais.some(a=>{const c=cpaOf(o,a);if(c.tcpa<=0&&P.encs.findLast(e=>e.id===a.id)?.droppedBack)return false;return c.range<1.6||(c.tcpa>0&&c.range<3);}),last=m.wps[m.wps.length-1];
  const wpN=m.wps[Math.min(P.wpi,m.wps.length-1)],steady=Math.abs(norm(o.th-o.h))<3&&Math.abs(norm(brg(o,{x:wpN[0],y:wpN[1]})-o.th))<12&&Math.hypot(wpN[0]-o.x,wpN[1]-o.y)>2.0;
  if(P.spawnI<m.enc.length&&!active&&!near&&steady&&P.time-P.lastSpawn>3&&Math.hypot(last[0]-o.x,last[1]-o.y)>2.2){spawnAI(m.enc[P.spawnI++]);P.lastSpawn=P.time;}
  // waypoints
  const wp=m.wps[P.wpi];
  if(Math.hypot(wp[0]-o.x,wp[1]-o.y)<0.2){P.score+=50;P.wpi++;
    if(P.wpi>=m.wps.length)return wkEnd(true);wkToast(`⚑ Waypoint ${P.wpi} reached (+50). Next: waypoint ${P.wpi+1}`,'ok');}
  if(P.hull<=0)return wkEnd(false);
  P.toasts=P.toasts.filter(x=>P.time-x.t<7);
}
function wkEnd(ok){
  P.over=true;for(const e of P.encs)if(!e.done)wkGrade(e);
  let bonus=0;if(ok){bonus=Math.max(0,Math.round((P.m.par-P.time)*2))+P.hull*50;P.score+=bonus;}
  try{const k=bestKey(P.m),b=+localStorage.getItem(k)||0;if(ok&&P.score>b)localStorage.setItem(k,P.score);}catch(e){}
  $('dbHead').textContent=ok?'⚓ Mission complete':'💥 Mission failed — out of hull';
  $('dbScore').textContent=`${P.score} pts`;
  $('dbSub').textContent=`${P.m.name} · ${gclock(P.time)} at sea · hull ${'❤️'.repeat(Math.max(0,P.hull))}${ok?` · bonus +${bonus}`:''}`;
  const good=P.encs.filter(e=>e.pts>=60).length;
  $('dbList').innerHTML=`<p class="small" style="margin:4px 2px 8px">${P.encs.length} encounters · ${good} handled well. Here's how each one went:</p>`+
    P.encs.map(e=>`<div class="enc"><h4><span>${e.pts>=60?'✅':e.pts>=0?'⚠️':'❌'} ${esc(e.name)} · ${ENC_LABEL[e.cl.type]}</span><span style="color:${e.pts>=0?'var(--ok)':'var(--bad)'}">${e.pts>=0?'+':''}${e.pts}</span></h4>
      <div class="small" style="margin-bottom:4px">You were the ${e.cl.role==='give'?'give-way':'stand-on'} vessel (${e.cl.rule}).</div>
      <ul>${e.notes.map(n=>`<li style="color:${n.ok===true?'#bfeccd':n.ok===false?'#ffb3b3':'#e8d9a8'}">${n.ok===true?'✓':n.ok===false?'✗':'💡'} ${n.txt}${n.p?` (${n.p>0?'+':''}${n.p})`:''}${n.fix?`<div class="fix">➜ ${esc(n.fix)}</div>`:''}</li>`).join('')}</ul></div>`).join('');
  openOv('ovDebrief');
}
