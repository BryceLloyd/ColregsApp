// Scenario rendering: chart, vessels, lights, buoys, hazards, TSS, bridge view.
// ---------- drawing ----------
let cam={x:0,y:0},camInit=true,S0=36,camY=0.64;
let VR=0;
function scr(p){const dx=p.x-cam.x,dy=p.y-cam.y,c=Math.cos(VR*D2R),sn=Math.sin(VR*D2R);return{x:W/2+(dx*c-dy*sn)*S,y:H*camY-(dx*sn+dy*c)*S}}
function updateCam(){VR=sc.rot||0;camY=0.64;S=S0;cam={x:sc.channel?0:own.x,y:own.y};}
function revealed(){return !(sc.night||sc.fog)||phase==='outcome'}

function draw(){
  if(!sc)return;
  updateCam();
  const night=sc.night;
  ctx.fillStyle=night?'#071022':'#1d6fa5';ctx.fillRect(0,0,W,H);
  // grid
  ctx.strokeStyle=night?'rgba(120,150,200,.07)':'rgba(255,255,255,.08)';ctx.lineWidth=1;
  const gx=Math.floor(cam.x),gy=Math.floor(cam.y),G=12;
  for(let i=-G;i<=G;i++){let a=scr({x:gx+i,y:gy-G}),b=scr({x:gx+i,y:gy+G});ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    a=scr({x:gx-G,y:gy+i});b=scr({x:gx+G,y:gy+i});ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  drawTSS();
  // channel
  if(sc.channel){
    const l=scr({x:-1.2,y:0}).x,r=scr({x:1.2,y:0}).x;
    ctx.fillStyle='#c9b98a';ctx.fillRect(0,0,l,H);ctx.fillRect(r,0,W-r,H);
    ctx.fillStyle='#6f9a52';ctx.fillRect(0,0,l-14,H);ctx.fillRect(r+14,0,W-r-14,H);
    ctx.setLineDash([6,8]);ctx.strokeStyle='rgba(255,255,255,.35)';const m=scr({x:0,y:0}).x;
    ctx.beginPath();ctx.moveTo(m,0);ctx.lineTo(m,H);ctx.stroke();ctx.setLineDash([]);
    // buoys
    for(let i=-3;i<12;i+=2){const by=Math.floor(cam.y)+i;let p=scr({x:-1.1,y:by});ctx.fillStyle='#e33';ctx.fillRect(p.x-3,p.y-5,6,10);
      p=scr({x:1.1,y:by});ctx.fillStyle='#1b9e3e';ctx.beginPath();ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x+4,p.y+5);ctx.lineTo(p.x-4,p.y+5);ctx.fill();}
  }
  if(sc.hazards&&phase==='outcome'){
    for(const [hx,hy,hr] of sc.hazards){const p=scr({x:hx,y:hy});
      ctx.fillStyle=sc.night?'rgba(120,140,170,.18)':'rgba(190,230,240,.55)';ctx.beginPath();ctx.arc(p.x,p.y,hr*S*1.5,0,7);ctx.fill();}
    for(const [hx,hy,hr] of sc.hazards){const p=scr({x:hx,y:hy});
      for(let k=0;k<5;k++){const a=k*1.3+hx*7,rr=hr*S*(0.35+0.12*(k%3));ctx.fillStyle=sc.night?'#3a3530':'#6b5a48';ctx.beginPath();ctx.arc(p.x+Math.cos(a)*hr*S*0.45,p.y+Math.sin(a)*hr*S*0.45,rr*0.55,0,7);ctx.fill();}}
  }
  // trails
  const showOther=revealed();
  drawTrail(trails.own,night?'rgba(110,170,255,.35)':'rgba(255,255,255,.45)');
  if(showOther)drawTrail(trails.other,night?'rgba(255,170,110,.35)':'rgba(255,220,180,.6)');
  // vessels
  if(showOther)drawBoat(other,false);
  drawBoat(own,true);
  // night hint for hidden other
  if(sc.night&&!showOther){ctx.fillStyle='rgba(200,210,255,.55)';ctx.font='12px sans-serif';ctx.textAlign='center';
    ctx.fillText(other.type==='buoy'?'Top view hidden — read the light in the bridge view ↑':'Top view hidden — read her lights in the bridge view ↑',W/2,22);}
  // fog
  if(sc.fog){
    const p=scr(own);const g=ctx.createRadialGradient(p.x,p.y,20,p.x,p.y,W*0.5);
    g.addColorStop(0,'rgba(215,220,225,.25)');g.addColorStop(1,'rgba(215,220,225,'+(phase==='outcome'?0.6:0.97)+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(phase!=='outcome'&&!sc.radar){ // sound waves from approx direction
      const b=norm(brg(own,other)-VR)*D2R,pulse=(t*1.2)%1;
      ctx.strokeStyle=`rgba(40,60,90,${1-pulse})`;ctx.lineWidth=3;
      for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(p.x,p.y,40+k*16+pulse*16,b-Math.PI/2-0.35,b-Math.PI/2+0.35);ctx.stroke();}
      ctx.fillStyle='#223';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('🔊 ▬ prolonged blast',p.x+Math.sin(b)*110,p.y-Math.cos(b)*110);
    }
  }
  if(sc.radar&&phase!=='outcome'){
    ctx.fillStyle='rgba(20,140,60,.85)';for(const q of trails.other.slice(-12)){const s=scr(q);ctx.beginPath();ctx.arc(s.x,s.y,2,0,7);ctx.fill();}
    const s=scr(other),pl=0.5+0.5*Math.sin(t*6);ctx.fillStyle='#0a7a2e';ctx.beginPath();ctx.arc(s.x,s.y,6+pl*2,0,7);ctx.fill();
    ctx.strokeStyle='#0a7a2e';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y,13,0,7);ctx.stroke();
    ctx.fillStyle='#063';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('RADAR TARGET',s.x,s.y-18);
  }
  // wind
  if(sc.wind!=null){
    const cx=W-34,cy=36,a=(sc.wind+180-VR)*D2R;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(a);ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(0,-12);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-7,-8);ctx.lineTo(7,-8);ctx.fill();ctx.restore();
    ctx.fillStyle='#fff';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('WIND',cx,cy+30);
  }
  // north
  {ctx.save();ctx.translate(20,22);ctx.fillStyle='rgba(5,12,24,.45)';ctx.beginPath();ctx.arc(0,0,15,0,7);ctx.fill();
   ctx.rotate(-VR*D2R);ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(4,0);ctx.lineTo(-4,0);ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(4,0);ctx.lineTo(-4,0);ctx.fill();
   ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('N',0,-19);ctx.restore();
   ctx.textBaseline='alphabetic';ctx.fillStyle='#ffd98a';ctx.font='bold 11px sans-serif';ctx.textAlign='left';
   ctx.fillText('HDG '+String(Math.round(((sc.rot||0)%360+360)%360)).padStart(3,'0')+'°',40,26);}
  if(collided){const p=scr(own);ctx.fillStyle='rgba(255,60,60,.35)';ctx.beginPath();ctx.arc(p.x,p.y-10,40,0,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText(aground?'🪨 AGROUND':other.type==='buoy'?'💥 HIT THE BUOY':'💥 COLLISION',W/2,H*0.3);}
  if(sc.night)drawBridge();
}
function drawTSS(){
  const T=sc.tss;if(!T)return;const zw=0.3,lw=1.2,L=40,d=T.dir*D2R,u=[Math.sin(d),Math.cos(d)],n=[Math.cos(d),-Math.sin(d)];
  const P=(a,b)=>scr({x:T.cx+u[0]*a+n[0]*b,y:T.cy+u[1]*a+n[1]*b});
  const mag=sc.night?'rgba(220,80,170,.45)':'rgba(214,51,132,.85)';
  ctx.fillStyle=sc.night?'rgba(220,80,170,.12)':'rgba(214,51,132,.28)';
  let a=P(-L,-zw),b=P(L,-zw),c=P(L,zw),e=P(-L,zw);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(e.x,e.y);ctx.fill();
  ctx.strokeStyle=mag;ctx.lineWidth=1.5;
  for(const off of[-zw,zw]){a=P(-L,off);b=P(L,off);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  ctx.setLineDash([8,6]);for(const off of[-(zw+lw),zw+lw]){a=P(-L,off);b=P(L,off);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.setLineDash([]);
  ctx.fillStyle=mag;ctx.lineWidth=3;
  const arrow=(s0,off,dirSign)=>{const t0=P(s0-0.45*dirSign,off),t1=P(s0+0.45*dirSign,off),l=P(s0+0.15*dirSign,off-0.22),r=P(s0+0.15*dirSign,off+0.22);
    ctx.beginPath();ctx.moveTo(t0.x,t0.y);ctx.lineTo(t1.x,t1.y);ctx.stroke();ctx.beginPath();ctx.moveTo(t1.x,t1.y);ctx.lineTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.fill();};
  for(let s0=-24;s0<=24;s0+=3){arrow(s0,zw+lw/2,1);arrow(s0+1.5,-(zw+lw/2),-1);}
}
function drawTrail(tr,c){ctx.fillStyle=c;for(const p of tr){const s=scr(p);ctx.beginPath();ctx.arc(s.x,s.y,1.6,0,7);ctx.fill();}}

function light(c,x,y,r,g){const C=g||ctx;C.save();C.shadowColor=c;C.shadowBlur=r*3;C.fillStyle=c;C.beginPath();C.arc(x,y,r,0,7);C.fill();C.restore();}
const RED='#ff3b3b',GRN='#2bff6a',WHT='#ffffff';

const buoyImg={};
function getBuoyImg(id,reg){const key=id+reg;if(buoyImg[key])return buoyImg[key];
  const keep=buoyRegion;buoyRegion=reg;let svg=buoySVG(BUOYS.find(x=>x.id===id),false);buoyRegion=keep;
  svg=svg.replace(' filter="url(#glow)"','').replace('<rect width="100" height="140" fill="#bcd6ea"/>','').replace('<svg class="sh" ','<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" ');
  const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);buoyImg[key]=im;return im;}
function drawBoat(b,isOwn){
  if(b.type==='buoy'){const p=scr(b),im=getBuoyImg(sc.other.buoy,sc.region||'A'),w=38,h=53;
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(p.x,p.y,13,4,0,0,7);ctx.fill();
    const hh=w*118/100;if(im.complete)ctx.drawImage(im,0,0,100,118,p.x-w/2,p.y-hh,w,hh);
    return;}
  const p=scr(b),night=sc.night;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate((b.h-VR)*D2R);ctx.scale(1.15,1.15);
  if(b.v>0.12){ctx.strokeStyle=night?'rgba(150,180,255,.18)':'rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(-5,10);ctx.lineTo(-8-b.v*6,14+b.v*20);ctx.moveTo(5,10);ctx.lineTo(8+b.v*6,14+b.v*20);ctx.stroke();}
  if(b.type==='fishing'){ctx.strokeStyle=night?'rgba(200,200,200,.25)':'rgba(255,255,255,.7)';ctx.setLineDash([3,3]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-3,12);ctx.lineTo(-7,34);ctx.moveTo(3,12);ctx.lineTo(7,34);ctx.lineTo(-7,34);ctx.stroke();ctx.setLineDash([]);}
  ctx.beginPath();ctx.moveTo(0,-15);ctx.quadraticCurveTo(8,-6,6.5,12);ctx.lineTo(-6.5,12);ctx.quadraticCurveTo(-8,-6,0,-15);ctx.closePath();
  let col=isOwn?'#2b7de9':'#e8742c';ctx.fillStyle=col;ctx.globalAlpha=night?0.55:1;ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle=night?'rgba(255,255,255,.25)':'#0b2340';ctx.lineWidth=1;ctx.stroke();
  if(b.type!=='sail'){ctx.fillStyle=night?'#334':'#f2f2f2';ctx.fillRect(-4,1,8,5);}
  if(b.type==='sail'&&sc.wind!=null){
    const rel=norm(sc.wind-b.h);const side=rel>0?-1:1;
    ctx.fillStyle=night?'rgba(255,255,255,.3)':'#fff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(side*9,9);ctx.lineTo(0,9);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#333';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(side*9,9);ctx.stroke();
    ctx.fillStyle='#222';ctx.beginPath();ctx.arc(0,-6,1.8,0,7);ctx.fill();
  }
  if(!night)daySignal(b.type);
  if(night){
    if(b.type!=='anchor'){light(RED,-6,-5,2.2);light(GRN,6,-5,2.2);light(WHT,0,12,1.8);}
    if(MAST[b.type])light(WHT,0,-10,2);
    (STACK[b.type]||[]).forEach((c,i)=>light(c,0,7-i*5,2.1));
  }
  ctx.restore();
  if(!isOwn&&(!night||phase==='outcome')){
    ctx.fillStyle=night?'#cdd':'#fff';ctx.font='11px sans-serif';ctx.textAlign='center';
    ctx.fillText(TYPE_LABEL[b.type],p.x,p.y+(b.type==='fishing'?48:30));
  }
  if(isOwn){ctx.fillStyle=night?'#9cf':'#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('YOU',p.x,p.y+30);}
}

function daySignal(type){
  ctx.fillStyle='#111';const ball=y=>{ctx.beginPath();ctx.arc(0,y,2.3,0,7);ctx.fill();};
  if(type==='nuc'){ball(-4);ball(-9);}
  else if(type==='anchor'){ball(-5);}
  else if(type==='ram'){ball(-12);ctx.beginPath();ctx.moveTo(0,-9.5);ctx.lineTo(2.5,-6.5);ctx.lineTo(0,-3.5);ctx.lineTo(-2.5,-6.5);ctx.fill();ball(-1);}
  else if(type==='cbd'){ctx.fillRect(-2.2,-10,4.4,7);}
  else if(type==='fishing'||type==='fishnt'){ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-3,-12);ctx.lineTo(3,-12);ctx.fill();ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-3,-2);ctx.lineTo(3,-2);ctx.fill();}
}
function lightsSeen(b,viewer){
  if(b.type==='buoy'){const B=BUOYS.find(x=>x.id===sc.other.buoy),seq=B.seq,per=seq.reduce((a,c)=>a+c,0);
    let tt=performance.now()%per,i=0;while(tt>=seq[i]){tt-=seq[i];i++;}
    return i%2===0?[{c:BL[B.lc],dy:-4,dx:0}]:[];}
  const a=norm(brg(b,viewer)-b.h),L=[];
  const side=[];
  if(a>=-4&&a<=112.5)side.push('g');
  if(a<=4&&a>=-112.5)side.push('r');
  const st=STACK[b.type]||[];
  if(MAST[b.type]&&Math.abs(a)<=112.5)L.push({c:WHT,dy:-16,dx:st.length?11:0});
  if(b.type==='anchor'){st.forEach((c,i)=>L.push({c,dy:-2-i*10,dx:0}));return L;}
  if(side.length===2){L.push({c:GRN,dy:0,dx:-7});L.push({c:RED,dy:0,dx:7});}
  else if(side[0]==='g')L.push({c:GRN,dy:0,dx:0});
  else if(side[0]==='r')L.push({c:RED,dy:0,dx:0});
  if(Math.abs(a)>112.5)L.push({c:WHT,dy:0,dx:0});
  st.forEach((c,i)=>L.push({c,dy:-17-i*9,dx:0}));
  return L;
}
function drawBridge(){
  const g=bctx.createLinearGradient(0,0,0,BH);g.addColorStop(0,'#05070f');g.addColorStop(.74,'#0b1530');g.addColorStop(.75,'#03060c');g.addColorStop(1,'#02040a');
  bctx.fillStyle=g;bctx.fillRect(0,0,BW,BH);
  const hy=BH*0.74;bctx.fillStyle='rgba(160,180,210,.7)';bctx.font='bold 10px sans-serif';bctx.textAlign='left';bctx.fillText('👁 YOUR BRIDGE VIEW',8,13);bctx.textAlign='center';
  bctx.strokeStyle='rgba(120,150,200,.25)';bctx.beginPath();bctx.moveTo(0,hy);bctx.lineTo(BW,hy);bctx.stroke();
  bctx.fillStyle='rgba(160,180,210,.6)';bctx.font='10px sans-serif';bctx.textAlign='center';
  for(const d of[-60,-30,0,30,60]){const x=BW/2+d/60*(BW/2-34);bctx.fillRect(x-.5,BH-14,1,6);bctx.fillText(d===0?'ahead':(d<0?'port ':'stbd ')+Math.abs(d)+'°',x,BH-2);}
  // bow
  bctx.fillStyle='#1a2a44';bctx.beginPath();bctx.moveTo(BW/2-30,BH);bctx.lineTo(BW/2,BH-14);bctx.lineTo(BW/2+30,BH);bctx.fill();
  const rb=norm(brg(own,other)-own.h);
  if(Math.abs(rb)>62){bctx.fillStyle='#aab';bctx.font='12px sans-serif';bctx.textAlign='center';bctx.fillText((rb>0?'→ lights now abaft, to starboard':'← lights now abaft, to port'),BW/2,20);return;}
  const x=BW/2+rb/60*(BW/2-34),d=dist(own,other),r=Math.max(2.2,Math.min(5,6-d*0.45)),k=Math.max(.7,Math.min(1.15,5/d));
  for(const l of lightsSeen(other,own))light(l.c,x+l.dx*k,hy-6+l.dy*k,r,bctx);
}
