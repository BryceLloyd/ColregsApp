// Scenario variants: rotation, day/night swap, vessel-type swap, approach-angle variation, follow-ups.
// ================= VARIANTS (same scenario, different angles) =================
const NIGHT_OK={0:"Night. Lights almost dead ahead. Bearing steady, range closing fast.",1:"Night. Lights on your starboard bow. Bearing steady, range closing.",
  2:"Night. Lights on your port bow. Bearing steady, range closing.",3:"Night. A light almost dead ahead — and you're gaining on it.",5:"Night. Lights on your port bow, crossing. Bearing steady, range closing."};
const TYPE_SWAP={0:'headon',11:'headon',1:'xstbd',8:'xstbd',2:'xport',9:'xport'};
const SWAP_TYPES={sail:{v:.6,lab:"sailing vessel",tip:"At night a sailing vessel shows sidelights but NO masthead light."},
  fishing:{v:.4,lab:"vessel engaged in trawling",tip:"Green over white = trawling. By day: two cones, points together."},
  nuc:{v:.25,lab:"vessel not under command",tip:"Red over red = not under command. By day: two black balls."},
  ram:{v:.35,lab:"vessel restricted in her ability to manoeuvre",tip:"Red–white–red = RAM. By day: ball–diamond–ball."}};
let varyOn=true;
function rotPt(x,y,R){const c=Math.cos(R*D2R),s=Math.sin(R*D2R);return [x*c+y*s,y*c-x*s];}
function simOutcome(V,k){
  const ov=(V.own&&V.own.v)||1,o=V.other;
  const A={x:0,y:0,h:0,v:ov,tv:ov,th:0},B={h:o.h||0,v:o.v||0,tv:o.v||0,th:o.h||0};
  if(o.T!=null){const C={x:0,y:ov*o.T},ve=vel(o.h,o.v);B.x=C.x-ve.x*o.T+(o.dx||0);B.y=C.y-ve.y*o.T+(o.dy||0);}else{B.x=o.x;B.y=o.y;}
  const fz=V.freezeAt!=null?V.freezeAt:o.T*0.45,dt=0.04;let tt=0,md=1e9;
  const st=b=>{const d=norm(b.th-b.h),r=38*dt;b.h+=Math.abs(d)<r?d:Math.sign(d)*r;const dv=b.tv-b.v,a=0.45*dt;b.v+=Math.abs(dv)<a?dv:Math.sign(dv)*a;const ve=vel(b.h,b.v);b.x+=ve.x*dt;b.y+=ve.y*dt;};
  while(tt<fz){st(A);st(B);tt+=dt;}
  const rb=norm(brg(A,B)-A.h),asp=norm(brg(B,A)-B.h),fd=dist(A,B);
  if(k){if(k==='stbd')A.th=70;if(k==='port')A.th=-70;if(k==='slow')A.tv=V.fog?0.05:0.08;if(V.otherReacts!=null)B.th=B.h+V.otherReacts;
    const end=tt+6.5;while(tt<end){st(A);st(B);tt+=dt;md=Math.min(md,dist(A,B));if(md<0.32)break;}}
  return {rb,asp,fd,md};
}
const ANGLE_OK=new Set([1,2,5,8,9,12,13,15,22,23,26,28,29,30]);
const aspCls=a=>Math.abs(a)>112.5?'s':a>0?'g':'r';
function varyAngle(V){
  const b0=simOutcome(V,null);
  for(let tries=0;tries<16;tries++){
    const cand=Object.assign({},V,{other:Object.assign({},V.other,{h:norm(V.other.h+(Math.random()*80-40)),v:V.other.v*(0.75+Math.random()*0.5)})});
    const g=simOutcome(cand,null);
    if(Math.sign(g.rb)!==Math.sign(b0.rb)||Math.abs(g.rb)<8)continue;
    if(Math.abs(Math.abs(g.rb)-Math.abs(b0.rb))>30)continue;
    if((Math.abs(b0.rb)<=112.5)!==(Math.abs(g.rb)<=112.5)||(Math.abs(b0.rb)<90)!==(Math.abs(g.rb)<90))continue;
    if(aspCls(g.asp)!==aspCls(b0.asp)||g.fd<2.2)continue;
    if(!V.correct.every(k=>simOutcome(cand,k).md>=0.9))continue;
    return cand.other;
  }
  return null;
}
function makeVariant(i,lvl,noNight){
  const base=SCEN[i],V=Object.assign({},base,{other:Object.assign({},base.other),idx:i});
  if(base.own)V.own=Object.assign({},base.own);
  const p=Math.min(0.9,0.35+0.1*(lvl||3)),tags=[];
  // vessel-type swap (changes the right answer)
  const sw=TYPE_SWAP[i];
  if(sw&&(!V.own||V.own.type!=='sail')&&Math.random()<0.4){
    const ty=shuffle(sw==='headon'?['sail','fishing','nuc']:['sail','fishing','nuc','ram'])[0],info=SWAP_TYPES[ty];
    V.other.type=ty;V.other.v=info.v;delete V.otherReacts;delete V.best;
    if(ty==='sail'&&V.wind==null)V.wind=norm(V.other.h-100);
    V.correct=sw==='headon'?['stbd']:sw==='xstbd'?['stbd','slow']:['stbd','port','slow'];
    if(sw!=='headon')V.best='stbd';
    const L=info.lab;
    if(!base.night)V.prompt=base.prompt.replace(/A power-driven vessel/,'A '+L).replace(/a power-driven vessel/,'a '+L);
    V.title=base.night?base.title:(sw==='headon'?'Meeting a '+L+' head-on':sw==='xstbd'?'A '+L+' on your starboard bow':'A '+L+' on your port bow');
    if(base.night)V.title='Night: lights '+(sw==='headon'?'dead ahead':sw==='xstbd'?'on your starboard bow':'on your port bow');
    V.rule='Rule 18 – Keep clear of a '+L;
    V.ok=`A ${L} ranks above a power-driven vessel in Rule 18, so you keep clear${sw==='xport'?' even though she is on your port side':''}. Early, bold action to starboard is the classic answer.`;
    V.bad=`Rule 18: a power-driven vessel keeps out of the way of a ${L}. The ${sw==='headon'?'head-on':'crossing'} rule only applies between two power-driven vessels.`;
    V.tip=info.tip;tags.push('type');
  }
  // day -> night
  if(!noNight&&NIGHT_OK[i]&&!base.night&&Math.random()<p*0.45){V.night=true;V.prompt=NIGHT_OK[i];V.title='Night: what are these lights?';tags.push('night');}
  // small geometry change
  if(ANGLE_OK.has(i)&&Math.random()<0.8){const nv=varyAngle(V);if(nv){V.other=nv;tags.push('angle');}}
  // rotate the whole world
  if(!base.channel&&Math.random()<p){
    const buoy=base.other.type==='buoy',R=buoy?Math.round(Math.random()*60-30):Math.round(Math.random()*359);
    if(Math.abs(R)>=8){V.rot=R;if(V.wind!=null)V.wind=norm(V.wind+R);
      if(base.hazards)V.hazards=base.hazards.map(([x,y,r])=>{const q=rotPt(x,y,R);return [q[0],q[1],r];});
      if(base.tss){const q=rotPt(base.tss.cx,base.tss.cy,R);V.tss=Object.assign({},base.tss,{cx:q[0],cy:q[1],dir:norm(base.tss.dir+R)});}
      tags.push('rot');}
  }
  V.vtags=tags;
  // every correct answer must still pass well clear; if a change broke that, use the scenario as written
  if(tags.length&&base.other.type!=='buoy'&&!V.correct.every(k=>simOutcome(V,k).md>=0.9))return i;
  return tags.length?{t:'sim',sc:V}:i;
}
function soundOpts(right,pool){return shuffle([right,...shuffle(pool.filter(p=>p!==right)).slice(0,3)]).map(p=>({h:`<span style="font-size:18px;letter-spacing:3px">${patHTML(p)}</span>`,ok:p===right}));}
function followUp(V,k){
  if(V.fog){if(V.cat==='Restricted visibility')return {prompt:"Same fog. You're power-driven and making way. What fog signal should YOU be sounding?",opts:soundOpts('L',['L','LL','LSS','SSSSS']),explain:"One prolonged blast at intervals of not more than 2 minutes (Rule 35(a)). Stopped in the water: two prolonged."};return null;}
  if(other.type==='buoy'||!V.correct.includes(k)||(V.idx??SCEN.indexOf(V))===27)return null; // no risk of collision in 27: no doubt signal to ask about
  const P=['S','SS','SSS','SSSSS','L'];
  if(k==='stand')return {prompt:"She's still closing and you doubt she's doing enough to keep clear. What do you sound?",opts:soundOpts('SSSSS',P),explain:"Five or more short, rapid blasts: 'I doubt you're taking sufficient action' (Rule 34(d)). A vessel in sight that's in doubt shall give it."};
  if(own.type!=='power')return null;
  if(k==='stbd')return {prompt:"You're altering course to starboard with her in sight. Which sound signal do you give?",opts:soundOpts('S',P),explain:"One short blast: 'I am altering my course to starboard' (Rule 34(a))."};
  if(k==='port')return {prompt:"You're altering course to port with her in sight. Which sound signal do you give?",opts:soundOpts('SS',P),explain:"Two short blasts: 'I am altering my course to port' (Rule 34(a))."};
  if(k==='slow')return {prompt:"You take way off by putting the engines astern. Which sound signal do you give?",opts:soundOpts('SSS',P),explain:"Three short blasts: 'I am operating astern propulsion' (Rule 34(a))."};
  return null;
}
