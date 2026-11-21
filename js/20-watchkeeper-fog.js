// Watchkeeper fog missions (Mission 5): radar only, fog signals (Rule 35) and conduct in restricted visibility (Rule 19).
// In fog nobody is stand-on or give-way: every vessel acts to avoid close quarters. Manoeuvring signals (Rule 34(a))
// are for vessels in sight of one another, so they don't belong here. A mission opts in with `fog:true`.
const FOG_EVERY=6;      // real seconds between fog signals (2 minutes at sea)
const FOG_HEAR=2;       // nm: you hear another ship's fog signal inside this range
const FOG_SAFE=8.5;     // kn: a safe speed for this visibility (Rules 6 & 19(b))
const FOG_STEER=4.5;    // kn: "the minimum at which she can be kept on her course" (Rule 19(e))
const radarOnly=()=>P.m.night||P.m.fog;

function fogInit(m){if(!m.fog)return null;return{on:false,onT:0,next:0,heard:[]};}
function fogToggle(){if(!P?.fog)return;P.fog.on=!P.fog.on;P.fog.next=P.time;fogUI();
  wkToast(P.fog.on?`🌫 Fog signal on: ${patHTML('L')} every 2 minutes while making way, ${patHTML('LL')} when stopped (Rule 35)`:'🌫 Fog signal off','info');}
function fogUI(){const b=$('pFogBtn');if(!b||!P?.fog)return;b.classList.toggle('on',P.fog.on);b.textContent=P.fog.on?'🌫 auto':'🌫 off';b.setAttribute('aria-label',P.fog.on?'Automatic fog signal on':'Automatic fog signal off');}

// Each tick: your automatic fog signal, and other ships' fog signals that you hear.
function fogTick(dt){
  const F=P.fog,o=P.own;
  if(F.on){F.onT+=dt;if(P.time>=F.next){F.next=P.time+FOG_EVERY;const p=o.v>0.3?'L':'LL';P.horn.push({t:P.time,p,auto:true});sound(p,0.3);}}
  for(const a of P.ais){
    if(a.fogT==null)a.fogT=P.time+Math.random()*FOG_EVERY;
    if(P.time<a.fogT)continue;a.fogT=P.time+FOG_EVERY;
    const d=dist(o,a);if(d>FOG_HEAR)continue;
    const p=wkType(a)!=='power'?'LSS':a.v<0.3?'LL':'L',rb=norm(brg(o,a)-o.h),app=norm(rb+(Math.random()*40-20)); // sound in fog is hard to place
    F.heard.push({t:P.time,rb:app,p});if(F.heard.length>6)F.heard.shift();
    sound(p,Math.max(0.25,1-d/FOG_HEAR));
    const e=P.encs.findLast(x=>x.id===a.id&&!x.done),c=cpaOf(o,a);
    if(e&&Math.abs(app)<90&&e.heardT==null&&c.tcpa>0&&c.cpa<0.5)e.heardT=P.time; // Rule 19(e) applies while a risk of collision still exists
  }
}

// ---- grading ----
function fogEncSetup(e){e.geo=e.cl.type;e.cl={type:'fog',role:'fog',rule:'Rule 19'};}
function fogGrade(e,add){
  if(e.spd0!=null){if(e.spd0<=FOG_SAFE)add(20,true,`Safe speed when you picked her up on radar: ${e.spd0.toFixed(1)} kn (Rules 6 & 19(b))`);
    else add(-30,false,`Too fast for the visibility: ${e.spd0.toFixed(1)} kn when you picked her up (Rules 6 & 19(b))`,'In fog, slow to a speed at which you can stop in the distance you can see. Half speed or less here.');}
  if(e.act){
    if(e.act.tg>=5)add(60,true,`Took avoiding action in ample time, ${Math.round(e.act.tg)} min before CPA, by ${e.act.by} (Rule 19(d))`);
    else add(30,true,`Took avoiding action ${Math.max(0,e.act.tg).toFixed(1)} min before CPA (Rule 19(d))`,'Act as soon as radar shows a close-quarters situation developing.');
  }else if((e.minV??99)<=FOG_STEER&&e.minR>=0.4)add(30,true,'Kept to steerage way and let her pass clear (Rule 19(e))');
  else if(e.minR>=0.5)add(20,true,`No action needed: she passed ${e.minR.toFixed(2)} nm clear (Rule 19(d))`);
  else add(-80,false,'No avoiding action (Rule 19(d))','In fog every ship must act when close quarters is developing: alter course or slow right down, in ample time.');
  if(e.dir){const fwd=Math.abs(e.dirRb)<90;
    if(fwd&&e.dir<0&&e.geo!=='overtaking')add(-50,false,'Altered to port for a ship forward of your beam (Rule 19(d)(i))','In fog, for a ship forward of the beam, alter to starboard (unless you are overtaking her) or slow down.');
    else if(!fwd&&Math.abs(e.dirRb)<165&&Math.sign(e.dir)===Math.sign(e.dirRb))add(-50,false,'Altered towards a ship abeam or abaft your beam (Rule 19(d)(ii))','Never turn towards a ship that\'s abeam or behind you. Turn away from her, or keep your course.');}
  if(e.heardT!=null){
    if((e.minV??99)<=FOG_STEER)add(30,true,'Slowed to steerage way after hearing her fog signal forward of the beam (Rule 19(e))');
    else add(-30,false,'Heard her fog signal forward of the beam but didn\'t slow right down (Rule 19(e))','When you hear a fog signal apparently forward of your beam, slow to the minimum speed that keeps you on course, or stop.');}
  const man=P.horn.filter(h=>['S','SS','SSS'].includes(h.p)&&h.t>=e.t0&&h.t<=(e.doneT??P.time));
  if(man.length)add(-10,false,'Manoeuvring signal in fog (Rule 34(a))','One, two and three short blasts are only for ships in sight of one another. In fog, sound your fog signal (Rule 35).');
  if(!e.collided){if(e.minR<0.25)add(-50,false,`Close quarters: passed only ${e.minR.toFixed(2)} nm off`,'In fog, aim to pass at least half a mile clear.');
    else if(e.minR>=0.5)add(25,true,`Passed well clear (${e.minR.toFixed(2)} nm)`);}
}
// Mission end: how long your fog signal was going.
function fogEndGrade(){
  const F=P.fog;if(!F)return'';
  const pct=P.time>0?Math.round(100*F.onT/P.time):0,p=pct>=90?100:pct>=50?0:-100;P.score+=p;
  return `<div class="enc"><h4><span>${p>=0?'✅':'❌'} Fog conduct</span><span style="color:${p>=0?'var(--ok)':'var(--bad)'}">${p>=0?'+':''}${p}</span></h4><ul>`+
    `<li style="color:${p>0?'#bfeccd':'#ffb3b3'}">${p>0?'✓':'✗'} Fog signal sounding ${pct}% of the time (Rule 35(a)) (${p>0?'+':''}${p})</li></ul></div>`;
}

// ---- drawing: fog haze over the radar picture, and where you heard fog signals from ----
function fogDraw(c,cy0,R){
  const g=c.createRadialGradient(PW/2,cy0,R*0.15,PW/2,cy0,R*1.3);g.addColorStop(0,'rgba(200,210,220,0)');g.addColorStop(1,'rgba(200,210,220,.18)');
  c.fillStyle=g;c.fillRect(0,0,PW,PH);
  c.font='bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';
  for(const h of P.fog.heard){const age=P.time-h.t;if(age>2.5)continue;const a=h.rb*D2R,r=R*0.86;
    c.globalAlpha=1-age/2.5;c.fillStyle='#e8f0ff';c.fillText(`🔊 ${patHTML(h.p)}`,PW/2+Math.sin(a)*r,cy0-Math.cos(a)*r);c.globalAlpha=1;}
  c.textBaseline='alphabetic';
}
$('pFogBtn').onclick=fogToggle;
