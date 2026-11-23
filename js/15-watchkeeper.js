// Watchkeeper free play: missions, AI traffic, encounter referee and scoring.
// ================= WATCHKEEPER (free play) =================
const REGION='A';               // IALA buoyage region used as the standard
const WK_TS=20, KN=WK_TS/3600;  // knots -> nm per real second at 20x
const TELE=[{l:'Astern',v:-4},{l:'Stop',v:0},{l:'Slow',v:4},{l:'Half',v:8},{l:'Full',v:12}];
const MISSIONS=[
 {id:'m1',name:'Open water',desc:'Daylight, light traffic: head-on, crossing and overtaking encounters. Watch for day shapes (Rule 18).',wps:[[0.6,5],[3.6,8.6],[3.0,13.2],[6.4,16.4]],enc:['xstbd','headon','xport','overtaking','xport:r18','overtaken','headon:r18'],par:400,ready:true},
 {id:'m2',name:'Busy crossing',desc:'Heavier traffic, sometimes two ships at once, and mixed vessel types (Rule 18).',wps:[[-0.5,5],[2.5,9.5],[1.0,14.5],[4.5,18.5],[3.0,25]],
  enc:['xstbd','xport:r18',['xstbd','xport'],'headon:r18','overtaken',['headon','xstbd:fishing'],'overtaking',['xstbd:r18','xport:r18'],'xport'],par:610,ready:true},
 {id:'m3',name:'Harbour channel',desc:'A buoyed channel into harbour (IALA Region A): keep to starboard, mind the blind bends, don\'t run aground (Rule 9).',
  chan:{pts:[[0,-3],[0,4],[2.2,7.2],[2.2,11],[0.6,14],[-0.6,18],[-0.8,21.5],[-0.6,25]],hw:0.3,bank:0.25},wps:[[0,4],[2.2,7.2],[2.2,11],[0.6,14],[-0.6,18],[-0.8,21.5]],enc:['chan:out','chan:cross?','chan:over','chan:out','chan:cross!'],par:400,ready:true},
 {id:'m4',name:'Night passage',desc:'Night: the chart shows radar echoes only. Read each ship\'s lights in the bridge view to know what she is and which way she\'s heading.',night:true,
  wps:[[0.6,5],[3.6,8.6],[3.0,13.2],[6.4,16.4],[8.2,20.6]],enc:['headon','xstbd','xport','overtaking','xport:r18','headon:r18','xstbd:fishing'],par:490,ready:true},
 {id:'m5',name:'Fog',desc:'Fog: radar only. Switch on your fog signal, keep a safe speed, and act early for every ship: in fog there\'s no stand-on vessel (Rules 19 & 35).',fog:true,
  wps:[[0.6,5],[3.6,8.6],[3.0,13.2],[6.4,16.4]],enc:['headon','xstbd','xport','overtaken','headon:r18','xstbd:r18','overtaking'],par:650,ready:true},
 {id:'m6',name:'Rogue ships',desc:'Some ships ignore the rules. Stand on, sound five short when in doubt, and act when you must (Rules 17 & 34(d)).',wps:[[0.5,5],[-2.5,9],[0,13.5],[-1.5,18],[1.5,21.5]],
  enc:['xport','xport!','xstbd','overtaken?','xport?','headon','overtaken!','xport?'],par:530,ready:true},
 {id:'m7',name:'Endless',desc:'Keep the watch as the traffic builds. Lose a heart for each collision or close call; five clean encounters win one back.',endless:true,ready:true,wps:[[0.6,5]],enc:[]}];
const COLLIDE=0.1; // nm between centres: the ship icons overlap by about half
const HORN_WIN=8; // a manoeuvring signal counts if it's sounded within this many real seconds of the manoeuvre (Rule 34(a))
const ROGUE_AFTER=3; // real seconds after a compliant ship would have acted: by then it's clear she isn't (Rule 17(a)(ii))
const ENC_LABEL={chan:'Meeting in the channel',chancross:'Small craft at the channel',chanover:'Overtaking in the channel',headon:'Head-on',xstbd:'Crossing from starboard',xport:'Crossing from port',overtaking:'You overtaking',overtaken:'Being overtaken'};
// Rule 18 traffic. rank: who keeps out of whose way (higher = more privileged); v: typical speed (kn).
const WK_TYPES={power:{rank:0,v:null},sail:{rank:1,v:6,rule:'Rule 18(a)(iv)',look:'Under sail'},fishing:{rank:2,v:4,rule:'Rule 18(a)(iii)',look:'Shapes: two cones, points together'},
  cbd:{rank:3,v:10,rule:'Rule 18(d)(i)',look:'Shape: a cylinder'},ram:{rank:4,v:5,rule:'Rule 18(a)(ii)',look:'Shapes: ball, diamond, ball'},nuc:{rank:4,v:3,rule:'Rule 18(a)(i)',look:'Shapes: two black balls'}};
const R18_POOL=['sail','fishing','nuc','ram','cbd'];
const wkType=b=>WK_TYPES[b.type]?b.type:'power';
let P=null,pctx=null,PW=360,PH=400;
const pvel=b=>vel(b.h,b.v*KN);
// "Rule 14" + 16 → "Rules 14 & 16"; "Rules 13 & 17" + 16 → "Rules 13, 17 & 16".
function rulesAnd(r,n){const m=String(r).match(/^Rules? (.+)$/);if(!m)return `${r} & Rule ${n}`;const p=m[1].split(/\s*&\s*|,\s*/).concat(String(n));return `Rules ${p.slice(0,-1).join(', ')} & ${p[p.length-1]}`;}
function cpaOf(a,b){const px=b.x-a.x,py=b.y-a.y,va=pvel(a),vb=pvel(b),wx=vb.x-va.x,wy=vb.y-va.y,w2=wx*wx+wy*wy;
  const tc=w2<1e-12?0:-(px*wx+py*wy)/w2,tt=Math.max(tc,0);return{cpa:Math.hypot(px+wx*tt,py+wy*tt),tcpa:tc,range:Math.hypot(px,py)};}
function classify(me,tg){
  const rb=norm(brg(me,tg)-me.h),a=norm(brg(tg,me)-tg.h);
  if(Math.abs(rb)>112.5&&tg.v>me.v)return{type:'overtaken',role:'stand',rule:'Rules 13 & 17'};
  if(Math.abs(a)>112.5&&me.v>tg.v)return{type:'overtaking',role:'give',rule:'Rule 13'};
  const geo=Math.abs(rb)<10&&Math.abs(a)<10?'headon':rb>0?'xstbd':'xport',rm=WK_TYPES[wkType(me)].rank,rt=WK_TYPES[wkType(tg)].rank;
  if(rm!==rt){const hi=rt>rm?tg:me;return{type:geo,role:rt>rm?'give':'stand',rule:WK_TYPES[wkType(hi)].rule,r18:true};}
  if(Math.abs(rb)<10&&Math.abs(a)<10)return{type:'headon',role:'give',rule:'Rule 14'};
  if(rb>0)return{type:'xstbd',role:'give',rule:'Rule 15'};
  return{type:'xport',role:'stand',rule:'Rule 17'};
}
function bestKey(m){return 'wkBest_'+m.id;}
function wkOpen(){openOv('ovPlay');}
function wkStart(m){
  if(m.endless)m=endlessSetup(m);
  const wp=m.wps[0],h0=Math.round(brg({x:0,y:0},{x:wp[0],y:wp[1]}));
  P={m,own:{x:0,y:0,h:h0,th:h0,v:12,tv:12,tele:4,trail:[]},ais:[],encs:[],wpi:0,score:0,hull:3,time:0,horn:[],turns:[],refTh:h0,spawnI:0,lastSpawn:-8,
     sel:null,range:3,hints:$('pHints').checked,paused:false,over:false,nid:0,toasts:[],trailT:0,pops:[],lastRes:null,mistakePause:false,booms:[],lateHits:[]};$('pResult').style.display='none';
  P.chan=chanInit(m);$('pHornChan').style.display='none';$('pBridge').style.display=m.night?'block':'none';
  P.fog=fogInit(m);$('pFogBtn').style.display=m.fog?'':'none';fogUI();
  if(m.fog){P.own.v=P.own.tv=TELE[3].v;P.own.tele=3;P.lastSpawn=4;} // fog: start at half speed, with a moment before the first ship
  $('pTitle').textContent=m.endless?'⚓ Level 1':`${MISSIONS.findIndex(x=>x.id===m.id)+1} · ${m.name}`;P.level=0;P.streak=0;$('pPause').textContent='⏸';
  $('pTele').innerHTML=TELE.map((x,i)=>`<button data-i="${i}" aria-label="${x.l}">${innerWidth<400&&x.l==='Astern'?'Astn':x.l}</button>`).join(''); // narrow phones: a shorter label so it isn't clipped
  $('pTele').querySelectorAll('button').forEach(b=>b.onclick=()=>{P.own.tele=+b.dataset.i;P.own.tv=TELE[P.own.tele].v;wkUI();});
  show('play');wkResize();wkUI();wkToast('Steer for waypoint 1 ⚑','info');if(m.fog)wkToast('🌫 Fog: you can see less than half a mile. Radar only.','info');
}
function wkResize(){if(P?.m.night)nightResize();const st=$('pStage'),dpr=window.devicePixelRatio||1;PW=st.clientWidth;PH=st.clientHeight;if(!PW||!PH)return;
  const c=$('pcv');c.width=PW*dpr;c.height=PH*dpr;pctx=c.getContext('2d');pctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',()=>{if(view==='play')wkResize();});
function wkToast(txt,cls){if(!P)return;P.toasts.push({txt,cls,t:P.time});if(P.toasts.length>3)P.toasts.shift();renderToasts();}
function renderToasts(){$('pToast').innerHTML=P.toasts.map(x=>`<div class="ptoast ${x.cls}">${esc(x.txt)}</div>`).join('');}
const GROUP_T=[20,28]; // ships spawned together reach your track at different times
// How far you can see on the chart (nm) at the current range, capped at the 3 nm view so zooming out doesn't delay traffic.
function wkView(){const r=Math.min(P.range,3);if(!PW||!PH)return{ahead:3.3*r/3,behind:1.7*r/3,side:1.75*r/3};
  const k=(PH*0.6)/r;return{ahead:PH*0.66/k,behind:PH*0.34/k,side:PW/2/k};}
function inView(p,m=0.1){const o=P.own,V=wkView(),dx=p.x-o.x,dy=p.y-o.y,s=Math.sin(o.h*D2R),c=Math.cos(o.h*D2R),f=dx*s+dy*c,l=dx*c-dy*s;
  return f>-V.behind-m&&f<V.ahead+m&&Math.abs(l)<V.side+m;}
function spawnAI(kind,T=20,commit=true){
  if(kind.startsWith('chan:'))return chanSpawn(kind);
  let rogue=false;if(kind.endsWith('!')){rogue=true;kind=kind.slice(0,-1);}else if(kind.endsWith('?')){rogue=Math.random()<0.5;kind=kind.slice(0,-1);}
  let [geo,ty]=kind.split(':');ty=ty==='r18'?R18_POOL[Math.floor(Math.random()*R18_POOL.length)]:ty||'power';kind=geo;
  const o=P.own,sp=Math.max(o.v,6)*KN,V=wkView();
  let h,v,x,y;const lat=(d)=>({x:Math.cos(o.h*D2R)*d,y:-Math.sin(o.h*D2R)*d});
  if(kind==='overtaking'&&o.v<2)kind='headon'; // you're stopped: nothing to overtake
  if(kind==='overtaking'){h=o.h;v=Math.min(4,o.v*0.45);const l=lat(0.04),d=Math.max(1.4,V.ahead+0.25);x=o.x+Math.sin(o.h*D2R)*d+l.x;y=o.y+Math.cos(o.h*D2R)*d+l.y;}
  else if(kind==='overtaken'){h=o.h;v=Math.max(o.v,6)+9;const l=lat(rogue?0:-0.05),d=Math.max(1.6,V.behind+0.25);x=o.x-Math.sin(o.h*D2R)*d+l.x;y=o.y-Math.cos(o.h*D2R)*d+l.y;}
  else{if(kind==='headon'){h=norm(o.h+180+(Math.random()*6-3));v=9+Math.random()*4;}
    else if(kind==='xstbd'){h=norm(o.h-90+(Math.random()*50-25));v=8+Math.random()*6;}
    else{h=norm(o.h+90+(Math.random()*50-25));v=8+Math.random()*6;}
    if(WK_TYPES[ty].v)v=WK_TYPES[ty].v;
    // both ships reach the same point M at the same time T; push T back until she starts off the chart
    const ve=vel(h,v*KN);for(let TT=T;TT<=60;TT+=2){T=TT;const M={x:o.x+Math.sin(o.h*D2R)*sp*T,y:o.y+Math.cos(o.h*D2R)*sp*T};x=M.x-ve.x*T;y=M.y-ve.y*T;if(!inView({x,y},0.25))break;}}
  const a={type:ty,x,y,h,th:h,h0:h,v,tv:v,trail:[],state:'cruise',bh:[],rogue};
  return commit?addAI(a):a;
}
function addAI(a){P.nid++;a.id=P.nid;a.name='Ship '+'ABCDEFGHJKLMNP'[(P.nid-1)%14];P.ais.push(a);newEnc(a);return a;}
// Would a new ship start on top of, or soon run into, a ship already out there? Then wait and try again.
const aiClash=a=>P.ais.some(b=>{if(b.dead||b.state?.startsWith('chan'))return false;const c=cpaOf(a,b);return dist(a,b)<0.6||(c.tcpa>0&&c.cpa<0.2&&c.tcpa<25);});
function newEnc(a){
  const o=P.own,c=cpaOf(o,a);
  P.encs.push({id:a.id,name:a.name,vt:wkType(a),cl:classify(o,a),h0:o.th,v0:o.tv,act:null,dir:0,dirT:0,asp:norm(brg(a,o)-a.h),crossed:false,standBreak:false,minR:c.range,notes:[],pts:0,collided:false,announced:false,backT:null,droppedBack:false,t0:P.time,asternT:null,rogue:!!a.rogue,dueT:null,cpaT:null});
  if(P.m.fog)fogEncSetup(P.encs[P.encs.length-1]);
}
function turnTo(b,rate,dt){const d=norm(b.th-b.h),r=rate*dt;b.h=norm(b.h+(Math.abs(d)<r?d:Math.sign(d)*r));}
function aiTick(a,dt){
  if(a.state?.startsWith('chan'))return chanAiTick(a,dt);
  if(P.m.fog&&a.state==='cruise'){const c=cpaOf(a,P.own);if(c.cpa<0.5&&c.tcpa>0&&c.range<2.2){ // in fog every ship acts: starboard for a ship forward of her beam
    if(Math.abs(norm(brg(a,P.own)-a.h))<90){a.th=norm(a.h0+35);a.state='avoid';}else a.state='stand';}}
  if((a.state==='resume'||a.state==='cruise')&&!a.rogue&&P.encs.findLast(x=>x.id===a.id)?.done){ // her encounter is over, but she's closing on you again
    const c=cpaOf(a,P.own);if(c.tcpa>0&&c.cpa<0.25&&c.range<1.2){const cl=classify(a,P.own);
      if(cl.role==='give'){const rb=norm(brg(a,P.own)-a.h),turns=cl.type==='overtaking'?(rb>0?[-30,-60,-90]:[30,60,90]):[30,45,60,90,120];
        const d=turns.find(d=>{const k=cpaOf({x:a.x,y:a.y,h:norm(a.h+d),v:a.v},P.own);return k.tcpa<=0||k.cpa>=0.3;})??turns[turns.length-1]; // the smallest turn that clears you
        a.th=norm(a.h+d);a.state='avoid';}}}
  aiAvoidAis(a);
  const c=cpaOf(a,P.own),cl=classify(a,P.own),risk=c.cpa<0.35&&c.tcpa>0&&c.range<3.5;
  if(a.state==='cruise'&&risk&&c.range<2.2&&!a.rogue){
    if(cl.role==='give'){if(cl.type==='overtaking'){const rb=norm(brg(a,P.own)-a.h);a.th=norm(a.h0+(rb>0?-25:25));}else a.th=norm(a.h0+(cl.type==='headon'?30:45));a.state='avoid';}
    else a.state='stand';}
  if(a.state==='stand'&&c.cpa<0.08&&c.range<0.35&&c.tcpa>0&&a.type!=='nuc'&&a.type!=='ram'){a.th=norm(a.h0+60);a.state='avoid';}
  if(a.state==='avoid'&&c.tcpa<0&&c.range>0.8){const back=cpaOf({x:a.x,y:a.y,h:a.h0,v:a.v},P.own);if(!(back.tcpa>0&&back.cpa<0.6)){a.th=a.h0;a.state='resume';}} // resume her course only once it won't cut back across you
  aiLastResort(a,dt);
  turnTo(a,10,dt);const ve=pvel(a);a.x+=ve.x*dt;a.y+=ve.y*dt;
  a.bh.push({t:P.time,b:brg(P.own,a)});while(a.bh.length&&P.time-a.bh[0].t>2.5)a.bh.shift();
}
// Other ships keep clear of each other by the same rules: the give-way ship turns (starboard, or away when
// overtaking); a stand-on ship acts herself if the other can't or won't (a rogue, or not under command). Rogue ships
// hold on regardless. Once they're past and opening, she resumes her course.
function aiAvoidAis(a){
  if(a.rogue||a.v<0.3||a.type==='nuc'||a.type==='ram')return; // restricted vessels can't keep out of the way
  const busy=a.state==='avoidAi';if(!busy&&!['cruise','resume','stand','avoid'].includes(a.state))return;
  let th=null,tc=1e9; // the most urgent ship she should act for
  for(const b of P.ais){if(b===a||b.dead||b.state?.startsWith('chan'))continue;
    const c=cpaOf(a,b);if(!(c.tcpa>0&&c.cpa<0.3&&c.range<2.5))continue;
    const cl=classify(a,b),stuck=b.rogue||b.v<0.3||['nuc','ram'].includes(b.type)||(b.state==='avoidAi'&&b.avoidId!==a.id);
    const yielding=b.state==='avoidAi'&&b.avoidId===a.id;
    if(cl.role!=='give'&&!(stuck&&c.range<2)&&!(c.range<0.6&&c.cpa<0.1&&!yielding))continue; // stand-on acts if the other can't, or at the last moment
    if(c.tcpa<tc){tc=c.tcpa;th={b,cl};}}
  const cur=busy&&P.ais.find(x=>x.id===a.avoidId),cc=cur&&!cur.dead&&cpaOf(a,cur);
  if(th&&(!busy||(th.b!==cur&&(!cc||cc.tcpa<0||tc<cc.tcpa)))){ // act, or switch to a more urgent ship
    const rb=norm(brg(a,th.b)-a.h);if(!busy){a.prevState=a.state;a.prevTh=a.th;}a.state='avoidAi';a.avoidId=th.b.id;
    a.avoidDir=th.cl.type==='overtaking'?(rb>0?-1:1):rb>100?-1:1;
    const want=norm(a.h+a.avoidDir*(th.cl.role==='give'?45:60));if(Math.abs(norm(want-a.prevTh))<=120)a.th=want;return;}
  if(!busy)return;
  if(!cc||(cc.tcpa<0&&cc.range>0.5)){a.th=a.prevTh;a.state=a.prevState;return;}
  if(cc.tcpa>0&&cc.cpa<0.15&&Math.abs(norm(a.th-a.h))<5&&Math.abs(norm(a.th-a.prevTh))<110)a.th=norm(a.th+a.avoidDir*30); // not enough yet: more
}
// Last resort between other ships (every ship, rogues and restricted vessels too): about to pass too close to
// another, she takes the smallest turn (starboard first) that clears every nearby ship, or stops if none does.
// Once clear she goes back to the course she was steering.
const LR_TURNS=[20,40,60,90,-20,-40,-60,-90,130];
function aiLastResort(a,dt){
  a.v0??=a.v;
  const thr=P.ais.filter(b=>{if(b===a||b.dead||b.state?.startsWith('chan'))return false;
    const c=cpaOf(a,b),va=pvel(a),vb=pvel(b),rel=Math.hypot(va.x-vb.x,va.y-vb.y);
    return c.tcpa>0&&c.cpa<0.18&&c.range<Math.max(0.6,rel*15);}); // about 15 real seconds out
  if(!thr.length){if(a.lrTh!=null){a.th=a.lrTh;a.lrTh=null;}a.v+=Math.max(-4*dt,Math.min(dt,a.v0-a.v));return;}
  if(a.lrTh==null)a.lrTh=a.th;
  const clear=h=>thr.every(b=>{const c=cpaOf({x:a.x,y:a.y,h,v:Math.max(a.v,a.v0*0.5)},b);return c.tcpa<=0||c.cpa>=0.25;});
  const d=a.v0<4?null:LR_TURNS.find(d=>clear(norm(a.h+d))); // a slow ship is the obstacle: she holds on, the others go round
  if(d!=null){a.th=norm(a.h+d);a.v+=Math.max(-4*dt,Math.min(dt,a.v0-a.v));}
  else if(a.v0>=4)a.v=Math.max(0,a.v-4*dt);
}
function encAlert(e){if(e.cl.type==='fog')return `⚠ Radar: ${e.name}, close-quarters situation developing.`;if(e.cl.type==='chan')return `⚠ ${e.name} is coming down the channel towards you.`;
  if(e.cl.type==='chancross')return `⚠ ${e.name} is at the edge of the channel ahead.`;if(e.cl.type==='chanover')return `⚠ You're coming up behind ${e.name} in the channel.`;return `⚠ Risk of collision with ${e.name}: bearing steady, range closing.`;}
function encHint(e){
  const n=e.name;
  if(e.cl.type==='fog')return `In fog there's no stand-on vessel: act early for ${n}. Alter to starboard if she's forward of your beam (never towards a ship abeam or astern), or slow right down. If you hear her fog signal forward of the beam, slow to steerage way (Rule 19).`;
  if(e.cl.type==='chan')return `Keep to the starboard side of the channel and pass ${n} port to port (Rule 9(a)).`;
  if(e.cl.type==='chancross')return `${n} must not impede you in the channel (${e.cl.rule} & 9(d)). Hold your course; if she starts across, sound five short and slow down or stop.`;
  if(e.cl.type==='chanover')return `To overtake ${n} in the channel, sound ${patHTML('LLSS')} (I intend to pass on your port side) and wait for her ${patHTML('LSLS')} before passing (Rule 9(e)).`;
  if(e.cl.r18)return `${n} is ${A_VESSEL[e.vt]}: a power-driven vessel keeps out of her way (${e.cl.rule}), whatever the crossing or head-on rules say. Act early and boldly.`;
  return {headon:`Head-on with ${n}: both turn to STARBOARD (Rule 14).`,xstbd:`${n} is crossing from starboard: you give way (Rule 15). Act early and boldly.`,
    xport:`${n} is crossing from port: you stand on. Hold course and speed (Rule 17). If she clearly isn't keeping clear, sound five short (Rule 34(d)) and act: not to port for a ship on your port side.`,overtaking:`You're overtaking ${n}: keep well clear, either side (Rule 13).`,
    overtaken:`${n} is overtaking you: hold course and speed (Rules 13 & 17). If she clearly isn't keeping clear, sound five short (Rule 34(d)) and act.`}[e.cl.type];
}
function encTick(a,c){
  const o=P.own;let e=P.encs.find(x=>x.id===a.id&&!x.done);
  if(!e){ // you dropped back from her earlier and are now closing in again: that's a new encounter
    if(c.tcpa>0&&c.cpa<0.5&&c.range<3.2&&!a.dead&&P.encs.findLast(x=>x.id===a.id).droppedBack){newEnc(a);e=P.encs[P.encs.length-1];}
    else{if(c.tcpa>0&&c.cpa<0.25&&c.range<2&&!(a.hitT!=null&&P.time-a.hitT<15)){a.warnUntil=P.time+3;if(a.warnT==null||P.time-a.warnT>20){a.warnT=P.time;wkToast(`⚠ Watch ${a.name}: you're closing on her again`,'bad');}}return;}}
  const before=c.tcpa>0&&e.cpaT===null; // once past CPA, turning back towards her doesn't reopen it
  if(e.announced&&!e.clearT&&before&&c.cpa>=0.5&&(e.cl.role==='stand'||e.act))e.clearT=P.time; // she's passing clear (and you've acted, if it was yours to do)
  const judge=before&&!e.clearT; // from then on, a course change (say, for the next waypoint) isn't judged against her
  if(!e.announced&&before&&(c.cpa<0.5||e.cl.type.startsWith('chan'))&&c.range<3.2){ // channel traffic always matters, even passing 0.5 nm off
    e.announced=true;if(P.m.night)e.lights=lightsWords(a,o);if(P.m.fog)e.spd0=o.v;P.sel=a.id;}
  e.minR=Math.min(e.minR,c.range);
  const dho=norm(o.th-e.h0); // ordered course change since the encounter began
  if(judge){
    if(!e.dir&&Math.abs(dho)>=10){e.dir=Math.sign(dho);e.dirT=P.time;e.dirRb=norm(brg(o,a)-o.h);
}
    if(o.tv<0&&e.asternT===null)e.asternT=P.time;

    if(e.cl.role==='stand'&&e.dueT===null&&c.cpa<0.35&&c.range<2.2)e.dueT=P.time; // when a compliant give-way ship acts
    const apparent=e.rogue&&e.dueT!==null&&P.time-e.dueT>=ROGUE_AFTER;
    if(!e.act){const cut=e.v0>2?Math.max(0,1-Math.max(o.tv,0)/e.v0):0,k=Math.round(dho)+'/'+Math.round(cut*20); // smaller alterations held 1.5 s, for the result card
      if(e.holdK!==k){e.holdK=k;e.holdT=P.time;}
      else if(P.time-e.holdT>=1.5){if(Math.abs(dho)>Math.abs(e.partD||0))e.partD=dho;if(cut>(e.partCut||0))e.partCut=cut;}}
    if(!e.act){if(Math.abs(dho)>=30||(e.v0>2&&o.tv<=0.5*e.v0)){e.actP??={t:P.time,range:c.range,apparent,tg:c.tcpa*WK_TS/60,by:Math.abs(dho)>=30?'course':'speed'};if(P.time-e.actP.t>=1.5)e.act=e.actP;}
      else e.actP=null;} // cancelled straight away: not an action
    if(e.cl.role==='stand'&&e.announced&&!e.standBreak&&!e.excused&&!apparent&&c.range>0.6&&(Math.abs(dho)>=15||o.tv<0.6*e.v0)){
      const g=P.encs.find(x=>x!==e&&x.announced&&x.cl.role==='give'&&(x.act||x.actP)&&(!x.done||x.doneT>e.t0+1)); // a give-way encounter overlapping this one, that you acted for
      if(g)e.excused=g.name;else e.standBreak=true;}
  }
  if(P.m.fog)e.minV=Math.min(e.minV??99,o.tv); // ordered speed: actions count from the moment they're ordered
  if(c.tcpa<=0&&e.cpaT===null){e.cpaT=P.time;if(P.m.chan)e.cpaOff=chanPos(P.m.chan,o).off;}
  const asp=norm(brg(a,o)-a.h);
  if(e.cl.type==='xstbd'&&!e.crossed&&Math.sign(asp)!==Math.sign(e.asp)&&Math.abs(asp)<40&&c.range<1.5)e.crossed=true;
  e.asp=asp;
  if(c.range<COLLIDE){e.collided=true;P.hull--;a.hitT=P.time;a.inContact=true;P.booms.push({x:(o.x+a.x)/2,y:(o.y+a.y)/2,t:P.time});popText('💥 Collision',false);wkToast('💥 Collision with '+a.name+'!','bad');wkGrade(e);return;}
  // Overtaking, but you've slowed to her speed (or less) and aren't closing: staying astern keeps clear (Rule 13).
  if((e.geo||e.cl.type)==='overtaking'&&c.tcpa<=0&&o.v<=a.v+0.05){if(e.backT===null)e.backT=P.time;else if(P.time-e.backT>=3){e.droppedBack=true;return wkGrade(e);}}
  else e.backT=null;
  if(e.cl.type==='chanover'&&chanPos(P.m.chan,o).s<chanPos(P.m.chan,a).s+0.3)return; // still astern of her or alongside
  // running alongside her, passing well clear, with the range hardly changing: she's no longer a risk, so it's over
  if(c.cpa>0.5){if(e.staleR==null||Math.abs(c.range-e.staleR)>0.05){e.staleR=c.range;e.staleT=P.time;}else if(P.time-e.staleT>6)return wkGrade(e);}else e.staleR=null;
  if((c.tcpa<0&&c.range>1.0)||c.range>5)wkGrade(e);
}
function wkGrade(e){
  if(e.done)return;e.done=true;e.doneT=P.time;const N=e.notes;let pts=0;
  if(!e.act&&e.actP)e.act=e.actP; // an order still held as she passed counts
  if(!e.announced&&!e.collided&&!e.act&&!e.cl.type.startsWith('chan')){e.silent=true;e.pts=0;return;} // never a risk of collision, nothing done: nothing to judge
  const add=(p,ok,txt,fix)=>{pts+=p;N.push({ok,txt,p,fix});};
  if(e.collided)add(-200,false,'Collision','Act earlier and make a bigger change of course or speed.');
  if(e.hintCost)N.push({ok:null,txt:'You used a hint (−20, already taken)',p:0});
  if(e.lights)N.push({ok:null,txt:`When you first saw her she showed ${e.lights}`,p:0});
  if(e.cl.type==='fog'){fogGrade(e,add);e.pts=pts;P.score+=pts;return showResult(e);}
  if(e.cl.type.startsWith('chan')){chanGrade(e,add);e.pts=pts;P.score+=pts;return showResult(e);}
  if(e.cl.r18)N.push({ok:null,txt:`${P.m.night?'':WK_TYPES[e.vt].look+' = '+TYPE_LABEL[e.vt].toLowerCase()+'. '}${e.cl.rule} puts her above a power-driven vessel, so ${e.cl.type==='headon'?'Rule 14 (head-on) didn\'t apply':'the crossing rule didn\'t apply'}: you keep out of her way.`,p:0});
  if(e.cl.role==='give'){
    const pd=e.partD||0,pc=e.partCut||0,small=Math.abs(pd)>=10?`altered only ${Math.round(Math.abs(pd))}° to ${pd>0?'starboard':'port'}`:pc>=0.15?`slowed by only ${Math.round(pc*100)}%`:'';
    if(!e.act)add(small&&(Math.abs(pd)>=15||pc>=0.25)?-40:-100,false,small?`Action too small: you ${small}, not enough for her to see (Rules 8(b) & 16)`:`No action taken (${rulesAnd(e.cl.rule,16)})`,
      e.cl.r18?`She was ${A_VESSEL[e.vt]}. Keep out of her way: alter boldly (30° or more) or slow right down, early.`:
      e.cl.type==='headon'?'Head-on: turn boldly to starboard (30° or more) as soon as you see her ahead with a steady bearing.':
      e.cl.type==='overtaking'?'When overtaking, alter course well before you close: 30° or more to either side.':
      'You were give-way: alter 30° or more to starboard to pass astern of her, or cut your speed by half or more — early.');
    else if(e.act.tg>=5)add(100,true,`Early, substantial action ${Math.round(e.act.tg)} min before CPA, by ${e.act.by} (Rules 8 & 16)`);
    else if(e.act.tg>=2.5)add(40,true,`Action ${e.act.tg.toFixed(1)} min before CPA (Rule 8)`,'Good, but act as soon as the bearing is steady: aim for 5+ minutes before CPA.');
    else add(-50,false,`Action left late: only ${Math.max(0,e.act.tg).toFixed(1)} min before CPA (Rule 8)`,'Act as soon as you see the bearing is steady and the range closing. Aim for 5+ minutes before CPA.');
    if(e.cl.type==='headon'&&!e.cl.r18&&e.dir<0)add(-75,false,'Turned to port in a head-on situation (Rule 14)','Head-on, both ships turn to starboard and pass port to port.');
    if(e.cl.type==='xstbd'&&e.dir<0&&!e.crossed)add(-40,false,`Turned to port for a ship on your starboard side (${e.cl.r18?rulesAnd(e.cl.rule,8):'Rule 15'})`,'Turn to starboard so you pass astern of her. A port turn heads across her bow.');
    if(e.crossed)add(-75,false,`Crossed ahead of the stand-on vessel (${e.cl.r18?rulesAnd(e.cl.rule,8):'Rule 15'})`,'Always pass astern of the ship on your starboard side. Never cut across her bow.');
    if(e.droppedBack)add(0,true,'Dropped back and stayed astern of her: that keeps clear (Rules 8(e) & 13)');
  }else{
    if(e.standBreak)add(-50,false,'Changed course or speed while she was keeping clear (Rule 17(a))','As stand-on, hold course and speed so she can predict you. Only act if she clearly isn\'t (sound 5 short first) or collision is imminent.');
    else if(e.rogue&&!e.excused)rogueGrade(e,add);
    else if(e.excused)add(40,true,`Altered for ${e.excused}, which you had to keep clear of. With two ships, keeping clear of one comes before standing on for the other (Rule 2(b))`);
    else add(60,true,`Held course and speed as the stand-on vessel (${e.cl.rule})`);
  }
  if(!e.collided){if(e.minR<0.2)add(-50,false,`Close quarters: passed only ${e.minR.toFixed(2)} nm off`,'Make a bigger alteration (or slow more) so you pass at least 0.5 nm clear.');
    else if(e.minR>=0.4)add(25,true,`Safe passing distance (${e.minR.toFixed(2)} nm)`);}
  hornGrade(e,add);
  e.pts=pts;P.score+=pts;showResult(e);
}
// A rogue give-way ship that holds on: stand on until it's clear she isn't acting, sound five short, then act (Rules 17 & 34(d)).
function rogueGrade(e,add){
  const her=e.cl.type==='overtaken'?'Rule 13':'Rule 15';
  e.notes.push({ok:null,txt:`${e.name} ignored the rules: she should have kept out of your way (${her}) but held her course and speed.`,p:0});
  const doubt=P.horn.find(h=>h.p==='SSSSS'&&h.t>=e.t0&&h.t<=(e.cpaT??e.doneT??P.time));
  if(doubt)add(20,true,`Sounded five short blasts when in doubt about her intentions (Rule 34(d))`);
  else add(-15,false,'No doubt signal (Rule 34(d))','When you can\'t tell whether she\'s keeping clear, sound at least five short, rapid blasts.');
  if(!e.act)add(-60,false,'Stood on into danger: she wasn\'t keeping clear and you didn\'t act (Rule 17(b))','Once it\'s clear she isn\'t giving way, you may act (Rule 17(a)(ii)). When she can\'t avoid a collision alone, you must (Rule 17(b)).');
  else if(e.act.range>=0.5)add(60,true,`Stood on, then acted at ${e.act.range.toFixed(2)} nm once it was clear she wasn't giving way (Rule 17(a)(ii))`);
  else add(30,true,`Acted late, at ${e.act.range.toFixed(2)} nm, when collision was close (Rule 17(b))`,'Once you\'ve sounded five short and she still holds on, act. Don\'t wait for the last moment.');
  if(e.cl.type==='xport'&&e.dir<0)add(-40,false,'Turned to port for a ship on your port side (Rule 17(c))','Acting as stand-on in a crossing, turn to starboard or slow down. A port turn heads towards her.');
  if(e.cl.type==='xport'&&(e.collided||e.minR<0.4))e.notes.push({ok:null,txt:'With a rogue ship crossing from port: stop and let her pass ahead, or turn boldly (90°) to starboard at full speed. Slowing while you turn to starboard lets her catch you.',p:0});
}
// Rule 34(a): manoeuvring signals while in sight. • = altering to starboard, • • = altering to port, • • • = operating astern propulsion.
function hornGrade(e,add){
  const near=(t,p)=>P.horn.find(h=>h.p===p&&Math.abs(h.t-t)<=HORN_WIN),used=new Set();
  if(e.dir){const want=e.dir>0?'S':'SS',wrong=e.dir>0?'SS':'S',side=e.dir>0?'to starboard':'to port',hit=near(e.dirT,want),bad=!hit&&near(e.dirT,wrong);
    if(hit){used.add(hit);add(15,true,`Correct sound signal ${patHTML(want)} as you altered ${side} (Rule 34(a))`);}
    else if(bad){used.add(bad);add(-20,false,`Wrong sound signal: ${patHTML(wrong)} means the opposite of your turn ${side} (Rule 34(a))`,`${want==='S'?'One short blast':'Two short blasts'} = "I am altering my course ${side}". A wrong signal misleads the other ship.`);}
    else add(-10,false,`No sound signal as you altered ${side} (Rule 34(a))`,`In sight of another ship, sound ${want==='S'?'one short blast as you turn to starboard':'two short blasts as you turn to port'}.`);}
  if(e.asternT!==null){const hit=near(e.asternT,'SSS');
    if(hit){used.add(hit);add(10,true,`Correct sound signal ${patHTML('SSS')} when going astern (Rule 34(a))`);}
    else add(-10,false,`No sound signal when going astern (Rule 34(a))`,'Three short blasts = "I am operating astern propulsion". Sound it as you put the engine astern.');}
  // signals that don't match anything you did mislead the other ship
  const done=e.doneT??P.time,stray=P.horn.filter(h=>['S','SS','SSS'].includes(h.p)&&h.t>=e.t0&&h.t<=done&&!used.has(h)&&
    !(h.p==='SSS'?(e.asternT!==null&&Math.abs(h.t-e.asternT)<=HORN_WIN):P.turns.some(x=>x.d===(h.p==='S'?1:-1)&&Math.abs(x.t-h.t)<=HORN_WIN)));
  if(stray.length)add(-15,false,`Sound signal with no matching manoeuvre: ${stray.map(h=>patHTML(h.p)).join(', ')} (Rule 34(a))`,'Manoeuvring signals say what you are doing right now. Only sound one when you actually alter course or go astern.');
}
const roleLine=e=>e.cl.type==='fog'?'In fog there are no stand-on or give-way roles: if close quarters is developing, every ship acts (Rule 19(d)).':e.cl.type.startsWith('chan')?chanRoleLine(e):`You were the ${e.cl.role==='give'?'give-way':'stand-on'} vessel (${e.cl.rule}).`;
const encTitle=e=>ENC_LABEL[e.geo||e.cl.type]+(e.cl.type==='fog'?' · in fog':'')+(e.vt!=='power'?' · '+TYPE_LABEL[e.vt]:'')+(e.rogue?' · ignored the rules':'');
function wpPassed(m,o){const wp=m.wps[P.wpi],pv=P.wpi?m.wps[P.wpi-1]:[0,0],d=Math.hypot(wp[0]-o.x,wp[1]-o.y);
  if(d<0.2)return true;const lx=wp[0]-pv[0],ly=wp[1]-pv[1],L=Math.hypot(lx,ly)||1;
  return d<1.0&&((o.x-wp[0])*lx+(o.y-wp[1])*ly)/L>0;} // past abeam of it, within a mile
function wkTick(dt){
  const o=P.own;P.time+=dt;
  const dth=norm(o.th-P.refTh);if(Math.abs(dth)>=10){P.turns.push({t:P.time,d:Math.sign(dth)});P.refTh=o.th;}
  turnTo(o,0.5+17.5*Math.min(1,Math.abs(o.v)/12),dt);
  const dv=o.tv-o.v,acc=1.2*dt;o.v+=Math.abs(dv)<acc?dv:Math.sign(dv)*acc;
  const ve=pvel(o);o.x+=ve.x*dt;o.y+=ve.y*dt;
  P.trailT+=dt;if(P.trailT>0.4){P.trailT=0;o.trail.push({x:o.x,y:o.y});if(o.trail.length>60)o.trail.shift();for(const a of P.ais){a.trail.push({x:a.x,y:a.y});if(a.trail.length>40)a.trail.shift();}}
  for(const a of P.ais){if(a.inContact&&dist(o,a)>2*COLLIDE)a.inContact=false;}
  for(const a of P.ais)if(dist(o,a)<COLLIDE&&!a.inContact&&!P.encs.some(e=>e.id===a.id&&!e.done)){
    a.inContact=true;a.hitT=P.time;P.lateHits.push(a.name);P.hull--;P.score-=100;P.booms.push({x:(o.x+a.x)/2,y:(o.y+a.y)/2,t:P.time,name:a.name});popText('💥 Collision −100',false);wkToast('💥 Collision with '+a.name+'!','bad');}
  if(P.chan)chanTick(dt);
  if(P.fog&&P.m.fog)fogTick(dt);
  for(const a of P.ais){aiTick(a,dt);encTick(a,cpaOf(o,a));}
  P.ais=P.ais.filter(a=>{if(a.dead)return false;const c=cpaOf(o,a);return !(c.range>6&&c.tcpa<0);});
  // spawn
  const m=P.m,active=P.encs.some(e=>!e.done),near=P.ais.some(a=>{const c=cpaOf(o,a),le=P.encs.findLast(e=>e.id===a.id);
    if(c.tcpa<=0&&le?.droppedBack)return false;
    if(le?.done&&(c.tcpa<=0||c.cpa>=0.5)&&c.range>=0.5)return false; // dealt with and passing clear: doesn't hold up new traffic
    return c.range<1.6||(c.tcpa>0&&c.range<3);}),last=m.wps[m.wps.length-1];
  const wpN=m.wps[Math.min(P.wpi,m.wps.length-1)],steady=Math.abs(norm(o.th-o.h))<3&&(m.endless||Math.abs(norm(brg(o,{x:wpN[0],y:wpN[1]})-o.th))<12&&Math.hypot(wpN[0]-o.x,wpN[1]-o.y)>2.0); // endless: traffic finds you wherever you steer
  if(m.endless)endlessFeed();
  if(P.spawnI<m.enc.length&&!active&&!near&&steady&&Math.abs(o.tv-o.v)<1&&P.time-P.lastSpawn>(m.gap??3)&&Math.hypot(last[0]-o.x,last[1]-o.y)>2.2){const ks=[].concat(m.enc[P.spawnI]);
    if(ks.some(k=>k.startsWith('chan:'))){P.spawnI++;ks.forEach(k=>spawnAI(k));P.lastSpawn=P.time;}
    else{const cs=ks.map((k,i)=>spawnAI(k,GROUP_T[i],false));
      if(!cs.some(aiClash)){P.spawnI++;cs.forEach(addAI);P.lastSpawn=P.time;}else P.lastSpawn=P.time-(m.gap??3)+0.5;}} // try again shortly
  // waypoints
  const wp=m.wps[P.wpi];
  if(P.chan?chanPos(P.m.chan,o).s>=P.chan.wpS[P.wpi]:wpPassed(m,o)){P.score+=50;P.wpi++;if(m.endless)endlessExtend();
    popText('+50 waypoint',true);if(P.wpi>=m.wps.length)return wkEnd(true);wkToast(`⚑ Waypoint ${P.wpi} reached (+50). Next: waypoint ${P.wpi+1}`,'ok');}
  if(P.hull<=0)return wkEnd(false);
  P.toasts=P.toasts.filter(x=>P.time-x.t<7);
}
function wkEnd(ok){
  P.over=true;for(const e of P.encs)if(!e.done)wkGrade(e);
  const chanHTML=chanEndGrade()+fogEndGrade()+(P.lateHits.length?`<div class="enc"><h4><span>❌ Collisions after an encounter</span><span style="color:var(--bad)">−${100*P.lateHits.length}</span></h4><ul>${P.lateHits.map(n=>`<li style="color:#ffb3b3">✗ Hit ${esc(n)} after you'd already passed her (−100, −1 heart)<div class="fix">➜ Keep watching ships you've passed, especially slow ones, before you turn back to your course.</div></li>`).join('')}</ul></div>`:'');
  let bonus=0;if(ok){bonus=(P.m.fog?0:Math.max(0,Math.round((P.m.par-P.time)*2)))+P.hull*50;P.score+=bonus;} // no time bonus in fog: safe speed comes first
  try{const k=bestKey(P.m),b=+localStorage.getItem(k)||0;if(ok&&P.score>b)localStorage.setItem(k,P.score);}catch(e){}
  $('dbHead').textContent=ok?'⚓ Mission complete':'💥 Mission failed: out of hearts';
  $('dbScore').textContent=`${P.score} pts`;
  $('dbSub').textContent=`${P.m.name} · ${gclock(P.time)} at sea · hull ${'❤️'.repeat(Math.max(0,P.hull))}${ok?` · bonus +${bonus}`:''}`;
  if(P.m.endless)endlessEnd(); // endless: its own heading, subtitle and best score
  const shown=P.encs.filter(e=>!e.silent),good=shown.filter(e=>e.pts>=60).length;
  $('dbList').innerHTML=`<p class="small" style="margin:4px 2px 8px">${shown.length} encounter${shown.length===1?'':'s'} · ${good} handled well. Here's how each one went:</p>`+
    chanHTML+shown.map(e=>`<div class="enc"><h4><span>${e.pts>=60?'✅':e.pts>=0?'⚠️':'❌'} ${esc(e.name)} · ${encTitle(e)}</span><span style="color:${e.pts>=0?'var(--ok)':'var(--bad)'}">${e.pts>=0?'+':''}${e.pts}</span></h4>
      <div class="small" style="margin-bottom:4px">${roleLine(e)}</div>
      <ul>${e.notes.map(n=>`<li style="color:${n.ok===true?'#bfeccd':n.ok===false?'#ffb3b3':'#e8d9a8'}">${n.ok===true?'✓':n.ok===false?'✗':'💡'} ${n.txt}${n.p?` (${n.p>0?'+':''}${n.p})`:''}${n.fix?`<div class="fix">➜ ${esc(n.fix)}</div>`:''}</li>`).join('')}</ul></div>`).join('');
  const mi=MISSIONS.findIndex(x=>x.id===P.m.id),nx=!P.m.endless&&mi>=0&&mi<5?MISSIONS[mi+1]:null;
  $('dbMis').textContent=nx?`Next: ${nx.name} ›`:'Practice';$('dbMis').dataset.next=nx?nx.id:'';
  openOv('ovDebrief');
}
