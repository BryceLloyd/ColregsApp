// Main loop, challenge and practice flow, sharing.
// ---------- loop ----------
let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(view!=='home')tickLights(now);
  if(view==='app'&&running&&!paused){gameTime+=dt;$('clock').textContent=fmt(gameTime);}
  if(view==='app'&&sc){
    if(!paused){
      if(phase==='intro'){step(dt);if(t>=freezeTime()){
        if(replayChoice){applyAction(replayChoice);replayChoice=null;}
        else{phase='decide';document.querySelectorAll('.choice').forEach(b=>b.disabled=false);setStatus('⏸ What do you do?','warn');}}}
      else if(phase==='outcome'&&!collided&&t<decT+6.5){step(dt);if(t>=decT+6.5||collided)finishOutcome();}
    }
    draw();
  }
  if(view==='play')wkFrame(dt);
  requestAnimationFrame(loop);
}
function finishOutcome(){
  const wrong=choice&&sc&&!sc.correct.includes(choice);
  if(wrong&&!collided){
    if(other.type==='buoy'&&choice==='slow')setStatus('⏸ Stopped short — you still have to pick a side','warn');
    else setStatus('⚠️ Got through — but not by the rules','warn');
    const nm=$('nearMiss');if(nm&&other.type!=='buoy'&&minD<1.0)nm.textContent=' And it was a near miss: you passed far too close.';
    return;}
  if(collided){const w=document.querySelector('#fbText .why');if(w)w.style.display='none';}
  if(aground)setStatus('🪨 Aground!','bad');
  else if(collided)setStatus(other.type==='buoy'?'💥 You hit the buoy!':'💥 Collision!','bad');
  else if(other.type==='buoy'){const R=(sc.rot||0)*D2R,ahead=(other.x-own.x)*Math.sin(R)+(other.y-own.y)*Math.cos(R)>0;setStatus(ahead?'⏸ Stopped short of the mark':'✔ Passed the mark',ahead?'warn':'ok');}
  else if(minD<0.8)setStatus('⚠️ Close quarters — far too close','warn');
  else setStatus('✔ Passed clear','ok');
}
document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>decide(b.dataset.k)));
$('replay').addEventListener('click',()=>{if(!sc)return;if(phase==='outcome')replayChoice=choice;load();});
$('next').addEventListener('click',nextQ);

let homeArmed=false;
$('gHome').onclick=()=>{
  if(mode==='challenge'&&running&&!homeArmed){homeArmed=true;setStatus('Tap 🏠 again to quit the challenge','warn');if(!sc)$('prompt').textContent='Tap 🏠 again to quit the challenge';setTimeout(()=>homeArmed=false,2500);return;}
  homeArmed=false;running=false;if(mode==='practice')openSec(practiceBack[0],practiceBack[1]);else show('home');
};

// ---------- game flow ----------
let nick='';try{nick=localStorage.getItem('colregsNick')||''}catch(e){}
$('nick').value=nick;
$('goChallenge').onclick=()=>openOv('ovStart');
function startChallenge(){
  nick=$('nick').value.trim().slice(0,20)||nick||'Sailor';$('nick').value=nick;
  try{localStorage.setItem('colregsNick',nick)}catch(e){}
  mode='challenge';level=1;lives=MAX_LIVES;score=0;bonus=0;answered=0;missed=[];gameTime=0;replayChoice=null;running=true;
  closeOv('ovStart');levelIntro();
}
function levelIntro(){
  const L=LEVELS[level-1];let items=shuffle(L.pool).slice(0,L.sims).map(i=>makeVariant(i,level));
  for(const [k,n,tp] of L.mcq)items=items.concat(makeQs(k,n,tp).map(q=>Object.assign(q,{cat:QCAT[k]})));
  queue=L.sims?shuffle(items):items;qi=0;paused=true;sc=null;
  $('lvNum').textContent=level;$('lvName').textContent=LEVELS[level-1].name;$('lvDesc').textContent=LEVELS[level-1].desc;
  $('lvLives').textContent='❤️'.repeat(lives)+'🤍'.repeat(Math.max(0,MAX_LIVES-lives));
  openOv('ovLevel');
}
$('lvGo').onclick=()=>{closeOv('ovLevel');paused=false;show('app');load();};
function startPractice(L,back){
  mode='practice';practiceSet=L;if(back)practiceBack=back;queue=L.pool.map(i=>varyOn?makeVariant(i,4,practiceBack[0]==='rules'):i);
  qi=0;score=0;bonus=0;answered=0;missed=[];running=false;paused=false;replayChoice=null;show('app');load();
}
function practiceDone(){
  $('doneScore').textContent=`${score-bonus} / ${answered}`+(bonus?` +${bonus}`:'');
  const u=[...new Set(missed)];$('doneMsg').textContent=u.length?'Revise: '+u.join(' · '):'Clean sweep! Try the Challenge.';
  openOv('ovDone');
}
$('doneAgain').onclick=()=>{closeOv('ovDone');startPractice(practiceSet);};
$('doneBack').onclick=()=>{closeOv('ovDone');openSec(practiceBack[0],practiceBack[1]);};
function finish(cleared){
  running=false;paused=true;
  $('endHead').textContent=cleared?'🏆 All levels cleared!':'⚓ Out of lives';
  $('endScore').textContent=`${score} correct`;$('endSub').dataset.b=bonus;
  $('endSub').textContent=`${bonus?`incl. ${bonus} bonus · `:''}Reached level ${level} of ${LEVELS.length} · time ${fmt(gameTime)}`;
  $('endMsg').textContent=cleared&&lives===MAX_LIVES?'Flawless watchkeeping!':cleared?'Good seamanship — you made it through.':level>=4?'Strong run — the hard levels bite.':'Practise the levels in Rules & scenarios, then go again.';
  const u=[...new Set(missed)];$('missed').textContent=u.length?'Revise: '+u.join(' · '):'';
  $('copyBox').style.display='none';$('shareBtn').textContent='📣 Challenge a friend';
  openOv('ovEnd');saveScore();
}
$('startBtn').onclick=startChallenge;
$('again').onclick=()=>{closeOv('ovEnd');openOv('ovStart');};
$('endHome').onclick=()=>{closeOv('ovEnd');show('home');};
$('homeLb').onclick=()=>openOv('ovLb');

$('shareBtn').onclick=async()=>{
  const msg=`⚓ I got ${score} right and reached level ${level} of ${LEVELS.length} in ${fmt(gameTime)} on the COLREGs Trainer. Think you know the Rules of the Road better? ${LINK}`;
  try{await navigator.clipboard.writeText(msg);$('shareBtn').textContent='✅ Copied — paste it to your friends';}
  catch(e){const b=$('copyBox');b.style.display='block';b.value=msg;b.focus();b.select();$('shareBtn').textContent='Copy the text below';}
};
