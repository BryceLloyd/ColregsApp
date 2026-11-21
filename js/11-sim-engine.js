// Scenario simulator: setup, physics, decisions, feedback, why-it-was-wrong text.
// ================= SIMULATOR =================
let mode='challenge',queue=[],qi=0,level=1,lives=MAX_LIVES,score=0,answered=0,missed=[],practiceSet=null,practiceBack=['rules',1];
let aground=false,sc=null,own,other,t,phase,decT,minD,collided,trails,choice,replayChoice=null;
let gameTime=0,running=false,paused=false,bonus=0;
const cv=$('cv'),ctx=cv.getContext('2d'),bcv=$('bridge'),bctx=bcv.getContext('2d');
let W=360,H=400,BW=360,BH=64,S=36;

function resize(){
  const dpr=window.devicePixelRatio||1,st=$('stage');
  const sw=st.clientWidth,sh=st.clientHeight;if(!sw||!sh)return;
  const night=sc&&sc.night;
  BH=night?Math.min(72,Math.round(sh*0.22)):0;bcv.style.display=night?'block':'none';
  BW=sw;W=sw;H=sh-BH;
  S0=Math.min(W/9,0.64*H/7.8);S=S0;camInit=true;
  cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  if(night){bcv.width=BW*dpr;bcv.height=BH*dpr;bcv.style.height=BH+'px';bctx.setTransform(dpr,0,0,dpr,0,0);}
}
window.addEventListener('resize',()=>{if(view==='app'){resize();if(sc)draw();}});

function hud(){
  $('hMode').textContent=mode==='challenge'?`Level ${level}/${LEVELS.length}`:`Practice · ${practiceSet?practiceSet.name:''}`;
  $('hLives').style.display=mode==='challenge'?'':'none';
  $('hLives').textContent='❤️'.repeat(Math.max(0,lives))+'🤍'.repeat(Math.max(0,MAX_LIVES-Math.max(0,lives)));
  $('hClock').style.display=mode==='challenge'?'':'none';
  $('sc').textContent=score;
}
function load(){
  const it=queue[qi];
  if(typeof it==='object'&&it.t!=='sim')return loadQ(it);
  $('stage').style.display='flex';$('dock').style.display='block';$('mcq').style.display='none';
  sc=typeof it==='object'?it.sc:SCEN[it];
  const ov=(sc.own&&sc.own.v)||1;
  own={x:0,y:0,h:0,v:ov,tv:ov,th:0,type:(sc.own&&sc.own.type)||'power'};
  const o=sc.other;
  other={type:o.type,h:o.h||0,v:o.v||0,tv:o.v||0,th:o.h||0};
  if(o.T!=null){const C={x:0,y:ov*o.T},ve=vel(o.h,o.v);other.x=C.x-ve.x*o.T+(o.dx||0);other.y=C.y-ve.y*o.T+(o.dy||0);}
  else{other.x=o.x;other.y=o.y;}
  if(sc.rot){const R=sc.rot;own.h=own.th=R;const q=rotPt(other.x,other.y,R);other.x=q[0];other.y=q[1];other.h=other.th=norm(other.h+R);}
  camInit=true;
  t=0;phase='intro';decT=null;minD=dist(own,other);collided=false;aground=false;trails={own:[],other:[]};
  $('prog').textContent=`${qi+1} / ${queue.length}`;
  const tg=[`<span class="pill">${sc.cat}</span>`];
  if(sc.night)tg.push('<span class="pill night">Night</span>');
  if(sc.fog)tg.push('<span class="pill fog">Fog</span>');
  if(sc.vtags&&sc.vtags.length)tg.push('<span class="pill" style="background:#3b2f12;color:#ffd98a">Variant</span>');
  $('tags').innerHTML=tg.join(' ');
  $('title').textContent=sc.title;$('prompt').textContent=sc.prompt;
  if(!replayChoice){
    document.querySelectorAll('.choice').forEach(b=>{b.disabled=true});
    $('fb').style.display='none';$('choices').style.display='grid';$('dock').style.height='';
  }
  setStatus('Watch the situation develop…','');
  hud();resize();
}
function loadQ(q){
  sc=null;$('stage').style.display='none';$('dock').style.display='none';const m=$('mcq');m.style.display='flex';m.scrollTop=0;
  $('prog').textContent=`${qi+1} / ${queue.length}`;
  $('tags').innerHTML=`<span class="pill">${q.cat}</span>`+(q.bonus?' <span class="pill night">Bonus</span>':'');
  $('title').textContent=q.bonus?'Follow-up: same situation':q.cat==='Rules'?'Rules of the road':q.cat;
  $('prompt').textContent=q.bonus?'Bonus point — no life lost if wrong.':q.order?'Tap the items in the right order.':'Tap the best answer.';
  mountQ(m,q,{wrongLabel:q.bonus?'❌ Not quite (no life lost)':(mode==='challenge'?'❌ Wrong — life lost':'❌ Not quite'),
    onAnswer:ok=>{if(!q.bonus)answered++;if(ok){score++;if(q.bonus)bonus++;}else if(!q.bonus){missed.push(q.cat);if(mode==='challenge')lives--;}hud();},
    nextText:nextLabel,onNext:nextQ});
  hud();
}
function freezeTime(){return sc.freezeAt!=null?sc.freezeAt:sc.other.T*0.45}
function setStatus(txt,cls){const s=$('status');s.textContent=txt;s.className=cls||''}
function stepB(b,dt){
  if(b.revertAt!=null&&t>=b.revertAt){b.th=b.baseH;b.revertAt=null;}
  const d=norm(b.th-b.h),r=38*dt;b.h+=Math.abs(d)<r?d:Math.sign(d)*r;
  const dv=b.tv-b.v,a=0.45*dt;b.v+=Math.abs(dv)<a?dv:Math.sign(dv)*a;
  const ve=vel(b.h,b.v);b.x+=ve.x*dt;b.y+=ve.y*dt;
}
function step(dt){
  t+=dt;stepB(own,dt);stepB(other,dt);
  const d=dist(own,other);minD=Math.min(minD,d);
  if(Math.floor(t*8)!==Math.floor((t-dt)*8)){trails.own.push({x:own.x,y:own.y});trails.other.push({x:other.x,y:other.y});}
  if(d<0.32)collided=true;
  if(sc.hazards)for(const [hx,hy,hr] of sc.hazards)if(Math.hypot(own.x-hx,own.y-hy)<hr){collided=true;aground=true;}
}
function applyAction(k){
  phase='outcome';decT=t;
  if(k==='stbd'||k==='port'){const s=k==='stbd'?1:-1;
    if(sc.lane){own.baseH=own.h;own.th=own.h+s*(sc.laneDeg||28);own.revertAt=t+(sc.laneT||1.6);}else own.th=own.h+s*(sc.turnDeg||70);}
  if(k==='slow')own.tv=sc.fog?0.05:0.08;
  if(sc.otherReacts!=null)other.th=other.h+sc.otherReacts;
  setStatus('Watching the outcome…','');
}
// ---------- why a wrong answer is still wrong, even if it ends well ----------
const ACT={stbd:'turning to starboard',port:'turning to port',slow:'slowing down',stand:'holding your course and speed'};
function dangerWhy(V,k){
  const i=V.idx!=null?V.idx:SCEN.indexOf(V),c=V.correct;
  if(i===43&&k==='port')return "Turning to port took you out of the scheme heading against the traffic, and in a head-on meeting the rule is a turn to starboard. Get into the lane for your direction.";
  if(i===44&&k==='port')return "Turning to port runs you along the lane with the traffic instead of across it. Rule 10(c): cross with your heading at right angles to the flow.";
  if(i===44&&k==='slow')return "Slowing keeps you crossing at an angle and in the lanes for longer, and ships can't read what you're doing. Cross at right angles and get across.";
  if(i===45&&k==='stand')return "A sailing vessel must not impede a ship following a traffic lane (Rule 10(j)). You got through on the angles, but a big ship in a lane can't easily manoeuvre for you.";
  if(i===27)return "There was no risk of collision: her bearing was drawing right. "+(k==='stbd'?"Turning to starboard swung you across her bow and CREATED a risk that wasn't there.":"Changing course or speed for no reason only makes you harder to predict.");
  if(i===4||i===30)return "She was the overtaking vessel and was keeping clear of you. Turning or slowing under her bow makes her job harder. Overtaking collisions often happen exactly like that.";
  if(i===16&&k==='stand')return "Rule 17(b): once the give-way vessel can't avoid collision by her action alone, you must act. Standing on into a collision is never allowed. You got through only because of the angles.";
  if(i===24&&k==='stand')return "She's at anchor and can't move out of your way. Avoiding her is entirely up to you (Rule 8). You got through only because of the angles.";
  if(i===14)return "In a narrow channel you keep to the starboard side. Moving to port put you on her side of the channel, head-on in a narrow space with nowhere to go.";
  if((i===0||i===11)&&k==='stand'&&V.other.type==='power')return "In a head-on situation BOTH vessels must turn to starboard. You left it all to her. If she'd expected you to act too, the gap would have been far too small.";
  if(V.other.type==='buoy'&&k==='slow')return "Stopping short doesn't solve anything: the mark is telling you which side to pass, and you still have to choose one. Sitting stopped in a channel also gets in other vessels' way.";
  if(V.other.type==='buoy')return "You got past this time, but on the wrong side of the mark. Marks show where the safe water is: on a real chart the rocks or shallows would be right where you went.";
  if(V.fog){if(k==='port')return "Turning to port towards a contact forward of the beam: if she turned to starboard (the usual move) at the same time, you'd have met head-on. You only cleared because of where she happened to be.";
    if(k==='stand')return "Holding speed towards a vessel you can't see is how fog collisions happen. You only cleared because of where she happened to be.";
    if(k==='stbd'&&i===29)return "Turning towards a vessel abeam or abaft the beam closes the gap. You only cleared because of her course and speed.";
    if(k==='stbd')return "With a fog signal forward of the beam, Rule 19(e) says slow right down. Turning at full speed towards a vessel you can't place is a gamble. It only cleared because of where she happened to be.";
    return "In fog you need the action the rules call for. Anything else relies on luck, because you can't see what she's doing.";}
  if(c.length===1&&c[0]==='stand')return `You were the stand-on vessel. By ${ACT[k]} you made yourself unpredictable: she was planning her avoiding action around you holding on. It only worked because her action still cleared yours. If she'd turned the same way at the same moment, you'd have collided.`;
  if(k==='stand')return "It was your job to keep clear and you didn't act. You got through only because the angles happened to work out. With a slightly different course or speed this was a collision, and she was entitled to hold on.";
  if(k==='port'&&c.includes('stbd'))return "Turning to port took you across her bow or towards her. The rules expect a turn to starboard here. If she'd made the normal last-minute turn to starboard as you turned to port, you'd have turned into each other.";
  if(k==='slow')return "Slowing down wasn't the action the rules call for here. It's hard for the other vessel to see, it takes a long time to work, and it left the risk in place. You were relying on her to sort it out.";
  return `${ACT[k][0].toUpperCase()+ACT[k].slice(1)} wasn't the move the rules call for here. It passed, but by luck rather than by the rules, and the other vessel couldn't predict you.`;
}
function nextLabel(){
  if(mode==='challenge'){if(lives<=0)return 'See result 🏁';if(qi+1>=queue.length)return level>=LEVELS.length?'Finish 🏁':'Level up ⬆';return 'Next ➜';}
  return qi+1>=queue.length?'Done ✔':'Next ➜';
}
function decide(k){
  if(phase!=='decide')return;
  choice=k;applyAction(k);
  const ok=sc.correct.includes(k);
  answered++;if(ok)score++;else{missed.push(sc.cat);if(mode==='challenge')lives--;}
  hud();
  const fb=$('fb');fb.className=ok?'ok':'bad';fb.style.display='flex';$('choices').style.display='none';
  if(!ok){$('dock').style.height='220px';resize();}
  $('fbH').textContent=ok?'✅ Correct':(mode==='challenge'?'❌ Wrong — life lost':'❌ Not quite');
  $('fbRule').textContent=sc.rule;
  let txt=ok?sc.ok:sc.bad;
  if(ok&&sc.best&&k!==sc.best)txt+=` (Best answer: ${NAMES[sc.best]}.)`;
  const pre=ok?'':`<b>You chose:</b> ${NAMES[k]} · <b>Correct:</b> ${sc.correct.map(c=>NAMES[c]).join(' or ')}<br>`;
  $('fbText').innerHTML=pre+(ok?'':`<span class="why" style="margin:2px 0 6px">⚠️ <b>Why it's dangerous, even if it ends well:</b> ${esc(dangerWhy(sc,k))}<span id="nearMiss"></span></span>`)+esc(txt)+`<span class="tip">💡 ${esc(sc.tip)}</span>`;
  $('fbText').scrollTop=0;
  if(!replayChoice){const fu=followUp(sc,k);
    if(fu&&(mode==='practice'||Math.random()<0.6))queue.splice(qi+1,0,Object.assign(fu,{cat:'Sound signals',bonus:true,vis:''}));}
  $('next').textContent=nextLabel();
}
function nextQ(){
  if(mode==='challenge'){
    if(lives<=0)return finish(false);
    qi++;if(qi>=queue.length){if(level>=LEVELS.length)return finish(true);level++;return levelIntro();}
    load();
  }else{qi++;if(qi>=queue.length)return practiceDone();load();}
}
