// Watchkeeper channel missions (Mission 3): channel geometry, lateral marks, grounding,
// Rule 9(a) keep-to-starboard, Rule 9(f)/34(e) blind-bend signal, outbound traffic and channel meetings.
// A mission opts in with `chan:{pts:[[x,y],...], hw, bank}` (nm). The channel is entered in the direction
// of buoyage, so port-hand (red) marks are on your left and starboard-hand (green) marks on your right.

// Where is p relative to the centreline? off > 0 = starboard side going in; s = distance along the channel.
function chanPos(ch,p){
  let best=null,s0=0;
  for(let i=0;i<ch.pts.length-1;i++){
    const [ax,ay]=ch.pts[i],[bx,by]=ch.pts[i+1],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
    const t=Math.max(0,Math.min(L,(p.x-ax)*ux+(p.y-ay)*uy)),qx=ax+ux*t,qy=ay+uy*t,d=Math.hypot(p.x-qx,p.y-qy);
    if(!best||d<best.d){const side=Math.sign((p.x-ax)*uy-(p.y-ay)*ux)||1;best={d,off:side*d,s:s0+t,seg:i,h:Math.atan2(ux,uy)/D2R};}
    s0+=L;
  }
  return best;
}
// The point `s` nm along the centreline, moved `off` nm to the starboard side (going in).
function chanAt(ch,s,off=0){
  let s0=0;
  for(let i=0;i<ch.pts.length-1;i++){
    const [ax,ay]=ch.pts[i],[bx,by]=ch.pts[i+1],L=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/L,uy=(by-ay)/L;
    if(s<=s0+L||i===ch.pts.length-2){const t=s-s0;return{x:ax+ux*t+uy*off,y:ay+uy*t-ux*off,h:Math.atan2(ux,uy)/D2R};}
    s0+=L;
  }
}
const chanLen=ch=>ch.pts.slice(1).reduce((a,p,i)=>a+Math.hypot(p[0]-ch.pts[i][0],p[1]-ch.pts[i][1]),0);
// Bends of 25°+ inside the mission: where you sound one prolonged blast on the approach.
function chanBends(ch){
  const out=[];let s=0;
  for(let i=1;i<ch.pts.length-1;i++){
    const [ax,ay]=ch.pts[i-1],[bx,by]=ch.pts[i],[cx,cy]=ch.pts[i+1];s+=Math.hypot(bx-ax,by-ay);
    const turn=norm(Math.atan2(cx-bx,cy-by)/D2R-Math.atan2(bx-ax,by-ay)/D2R);
    if(Math.abs(turn)>=25&&s>0.5)out.push({s,x:bx,y:by,turn,done:false,ok:false,inT:null});
  }
  return out;
}
// Lateral marks along both edges, roughly every 1.2 nm and at each bend.
function chanMarks(ch){
  const out=[],L=chanLen(ch);
  for(let s=0.6;s<L;s+=1.2){const l=chanAt(ch,s,-ch.hw),r=chanAt(ch,s,ch.hw);out.push({x:l.x,y:l.y,id:'port'},{x:r.x,y:r.y,id:'stbd'});}
  return out;
}
function chanInit(m){
  const ch=m.chan;if(!ch)return null;
  // in a channel a waypoint counts once you're abeam of it, whichever side of the channel you're on
  return{wpS:m.wps.map(w=>chanPos(ch,{x:w[0],y:w[1]}).s),bends:chanBends(ch),marks:chanMarks(ch),inT:0,stbdT:0,wrongT:null,warned:false,aground:0,groundT:-9,pts:0};
}

// ---- traffic: an outbound ship coming down the channel on her own starboard side (your port side) ----
function chanSpawn(o){
  const ch=P.m.chan,me=chanPos(ch,o),s=me.s+2.4,p=chanAt(ch,s,-ch.hw*0.45);
  P.nid++;const v=7+Math.random()*3,h=norm(p.h+180);
  const a={id:P.nid,name:'Ship '+'ABCDEFGHJKLMNP'[(P.nid-1)%14],type:'power',x:p.x,y:p.y,h,th:h,h0:h,v,tv:v,trail:[],state:'chan',bh:[],chanS:s};
  P.ais.push(a);newEnc(a);const e=P.encs[P.encs.length-1];e.cl={type:'chan',role:'chan',rule:'Rule 9(a)'};
}
// Channel ships follow their own starboard side of the channel, outbound, then carry on out to sea.
function chanAiTick(a,dt){
  const ch=P.m.chan;a.chanS-=a.v*KN*dt;
  const tg=a.chanS>0.6?chanAt(ch,a.chanS-0.5,-ch.hw*0.45):{x:a.x+Math.sin(a.h*D2R),y:a.y+Math.cos(a.h*D2R)};
  a.th=brg(a,tg);turnTo(a,12,dt);const ve=pvel(a);a.x+=ve.x*dt;a.y+=ve.y*dt;
  a.bh.push({t:P.time,b:brg(P.own,a)});while(a.bh.length&&P.time-a.bh[0].t>2.5)a.bh.shift();
}

// ---- your conduct in the channel, every tick ----
function chanTick(dt){
  const ch=P.m.chan,C=P.chan,o=P.own,q=chanPos(ch,o);
  // aground: outside the dredged channel
  if(Math.abs(q.off)>ch.hw&&P.time-C.groundT>2){
    C.aground++;C.groundT=P.time;P.hull--;
    wkToast(`🪨 Aground! You left the channel (Rule 9(a)). Lost a heart and 100 points.`,'bad');
    const back=chanAt(ch,q.s,ch.hw*0.4);o.x=back.x;o.y=back.y;o.h=o.th=norm(back.h);P.refTh=o.th;o.v=0;o.tele=2;o.tv=TELE[2].v;wkUI();
    return;
  }
  // Rule 9(a): keep to the starboard side
  if(o.v>1){C.inT+=dt;if(q.off>0)C.stbdT+=dt;}
  if(q.off<-0.02&&o.v>1){if(C.wrongT===null)C.wrongT=P.time;else if(!C.warned&&P.time-C.wrongT>2){C.warned=true;wkToast('✗ Rule 9(a): keep to the starboard side of the channel','bad');}}
  else{C.wrongT=null;C.warned=false;}
  // Rules 9(f) & 34(e): one prolonged blast approaching a blind bend
  for(const b of C.bends){
    if(b.done)continue;
    if(b.inT===null&&q.s>b.s-1.0&&q.s<b.s)b.inT=P.time;
    if(q.s>=b.s){b.done=true;b.ok=b.inT!==null&&P.horn.some(h=>h.p==='L'&&h.t>=b.inT-1&&h.t<=P.time);
      const p=b.ok?15:-10;C.pts+=p;P.score+=p;
      wkToast(b.ok?`✓ Prolonged blast approaching the bend (Rules 9(f) & 34(e)) +15`:`✗ No prolonged blast approaching a blind bend (Rules 9(f) & 34(e)) −10`,b.ok?'ok':'bad');}
  }
}

// ---- grading ----
function chanEncGrade(e,add){
  const ch=P.m.chan,side=e.cpaOff??chanPos(ch,P.own).off;
  if(side>0.02)add(60,true,'Kept to the starboard side of the channel as you met her (Rule 9(a))');
  else add(-60,false,'You were on the port side of the channel as you met her (Rule 9(a))','In a narrow channel keep to your starboard side, so ships pass port to port.');
  if(!e.collided){if(e.minR<0.12)add(-50,false,`Close quarters: passed only ${e.minR.toFixed(2)} nm off`,'Keep well over to your starboard side so there\'s room to pass.');
    else if(e.minR>=0.2)add(25,true,`Passed port to port, ${e.minR.toFixed(2)} nm apart`);}
}
// Mission end: how well you kept to the starboard side, and groundings.
function chanEndGrade(){
  const C=P.chan;if(!C)return'';
  const pct=C.inT>0?Math.round(100*C.stbdT/C.inT):100,keep=pct>=90?100:pct>=70?40:-50;
  const gr=-100*C.aground;P.score+=keep+gr;C.pts+=keep+gr;
  const bends=C.bends.filter(b=>b.done),ok=bends.filter(b=>b.ok).length;
  const li=(good,txt,p)=>`<li style="color:${good?'#bfeccd':'#ffb3b3'}">${good?'✓':'✗'} ${txt}${p?` (${p>0?'+':''}${p})`:''}</li>`;
  return `<div class="enc"><h4><span>${C.pts>=0?'✅':'❌'} Channel conduct</span><span style="color:${C.pts>=0?'var(--ok)':'var(--bad)'}">${C.pts>=0?'+':''}${C.pts}</span></h4><ul>`+
    li(pct>=90,`On the starboard side of the channel ${pct}% of the time (Rule 9(a))`,keep)+
    li(!C.aground,C.aground?`Ran aground ${C.aground}×`:'Never ran aground',gr||0)+
    (bends.length?li(ok===bends.length,`Prolonged blast at ${ok} of ${bends.length} blind bends (Rules 9(f) & 34(e))`,0):'')+'</ul></div>';
}

// ---- drawing: land, shallows, the dredged channel and its lateral marks ----
function chanDraw(c,S2,k){
  const ch=P.m.chan;if(!ch)return;
  c.fillStyle='#8a9a6a';c.fillRect(0,0,PW,PH); // land
  const line=(w,col)=>{c.strokeStyle=col;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.beginPath();
    ch.pts.forEach((p,i)=>{const s=S2({x:p[0],y:p[1]});i?c.lineTo(s.x,s.y):c.moveTo(s.x,s.y);});c.stroke();};
  line(2*(ch.hw+ch.bank)*k,'#5aa7c9');   // shallows
  line(2*ch.hw*k,'#1b6aa0');             // dredged channel
  c.setLineDash([2,6]);line(1,'rgba(255,255,255,.35)');c.setLineDash([]); // centreline
  c.lineCap='butt';
  for(const b of P.chan.bends){const s=S2(b);c.fillStyle='rgba(255,255,255,.7)';c.font='10px sans-serif';c.textAlign='center';c.fillText('blind bend',s.x,s.y-ch.hw*k-6);}
  for(const m of P.chan.marks){const s=S2(m);if(s.x<-20||s.x>PW+20||s.y<-30||s.y>PH+20)continue;
    const im=getBuoyImg(m.id,'A'),w=14,h=w*118/100;if(im.complete)c.drawImage(im,0,0,100,118,s.x-w/2,s.y-h+3,w,h);}
}
