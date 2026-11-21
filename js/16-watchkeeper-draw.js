// Watchkeeper chart rendering and HUD updates.
// ---------- drawing ----------
// Rule 18 day shapes, drawn upright beside the ship on a patch of sky so they're readable on a phone.
function wkShapes(c,type,x,y){
  const S={nuc:['ball','ball'],ram:['ball','diamond','ball'],cbd:['cyl'],fishing:['coneD','coneU']}[type];if(!S)return;
  const g=9,top=y-(S.length-1)*g/2,hh=(S.length-1)*g+16;
  c.fillStyle='#dcebf5';c.beginPath();rrect(c,x-7,top-8,14,hh,4);c.fill();c.strokeStyle='#0b2340';c.lineWidth=1;c.stroke();
  c.strokeStyle='#555';c.lineWidth=1;c.beginPath();c.moveTo(x,top-6);c.lineTo(x,top+hh-10);c.stroke();
  S.forEach((k,i)=>{const cy=top+i*g;c.beginPath();
    if(k==='ball')c.arc(x,cy,3.4,0,7);
    else if(k==='diamond'){c.moveTo(x,cy-4);c.lineTo(x+3.4,cy);c.lineTo(x,cy+4);c.lineTo(x-3.4,cy);c.closePath();}
    else if(k==='cyl')c.rect(x-2.8,cy-5,5.6,10);
    else if(k==='coneD'){c.moveTo(x-3.6,cy-3.6);c.lineTo(x+3.6,cy-3.6);c.lineTo(x,cy+3.6);c.closePath();}
    else {c.moveTo(x,cy-3.6);c.lineTo(x+3.6,cy+3.6);c.lineTo(x-3.6,cy+3.6);c.closePath();}
    c.fillStyle='#111';c.fill();});
}
function wkDraw(){
  if(!pctx)return;const c=pctx,o=P.own,k=(PH*0.6)/P.range,cy0=PH*0.66,ang=o.h*D2R,ca=Math.cos(ang),sa=Math.sin(ang);
  const S2=p=>{const dx=p.x-o.x,dy=p.y-o.y;return{x:PW/2+(dx*ca-dy*sa)*k,y:cy0-(dx*sa+dy*ca)*k};};
  c.fillStyle=P.m.night?'#0b1a2e':P.m.fog?'#26333f':'#1b6aa0';c.fillRect(0,0,PW,PH);
  if(P.chan)chanDraw(c,S2,k);
  // range rings + compass
  c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=1;c.fillStyle='rgba(255,255,255,.45)';c.font='10px sans-serif';c.textAlign='left';
  for(let i=1;i<=3;i++){const r=P.range/3*i*k;c.beginPath();c.arc(PW/2,cy0,r,0,7);c.stroke();c.fillText((P.range/3*i).toFixed(1)+' nm',PW/2+r*0.72+3,cy0+r*0.72-3);}
  const R=P.range*k;c.textAlign='center';c.textBaseline='middle';
  for(let b=0;b<360;b+=30){const a=(b-o.h)*D2R,x=PW/2+Math.sin(a)*R,y=cy0-Math.cos(a)*R;
    c.strokeStyle='rgba(255,255,255,.4)';c.beginPath();c.moveTo(PW/2+Math.sin(a)*(R-6),cy0-Math.cos(a)*(R-6));c.lineTo(x,y);c.stroke();
    c.fillStyle=b===0?'#ff8080':'rgba(255,255,255,.6)';c.font=b===0?'bold 12px sans-serif':'10px sans-serif';c.fillText(b===0?'N':String(b).padStart(3,'0'),PW/2+Math.sin(a)*(R+10),cy0-Math.cos(a)*(R+10));}
  c.textBaseline='alphabetic';
  // heading line
  c.setLineDash([5,6]);c.strokeStyle='rgba(255,255,255,.45)';c.beginPath();c.moveTo(PW/2,cy0);c.lineTo(PW/2,0);c.stroke();c.setLineDash([]);
  // waypoint
  const wp=P.m.wps[Math.min(P.wpi,P.m.wps.length-1)],w=S2({x:wp[0],y:wp[1]});
  c.strokeStyle='#ffd21f';c.setLineDash([3,5]);c.beginPath();c.moveTo(PW/2,cy0);c.lineTo(w.x,w.y);c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(w.x,w.y,9,0,7);c.stroke();c.fillStyle='#ffd21f';c.font='bold 11px sans-serif';c.fillText('⚑ WP'+(P.wpi+1),w.x,w.y-14);
  // trails
  const tr=(arr,col)=>{c.fillStyle=col;for(const p of arr){const s=S2(p);c.beginPath();c.arc(s.x,s.y,1.4,0,7);c.fill();}};
  tr(o.trail,'rgba(255,255,255,.45)');if(!radarOnly())for(const a of P.ais)tr(a.trail,'rgba(255,200,160,.5)');
  // ships
  const ship=(b,col,isOwn)=>{const s=S2(b);
    const vk=b.v*KN*WK_TS*0+b.v*(3/60);// 3-minute vector (nm)
    const e2=S2({x:b.x+Math.sin(b.h*D2R)*vk,y:b.y+Math.cos(b.h*D2R)*vk});
    c.strokeStyle=isOwn?'rgba(160,210,255,.9)':'rgba(255,190,140,.9)';c.lineWidth=1.5;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(e2.x,e2.y);c.stroke();
    c.save();c.translate(s.x,s.y);c.rotate((b.h-o.h)*D2R);
    if(b.type==='fishing'){c.strokeStyle='rgba(255,255,255,.75)';c.setLineDash([3,3]);c.lineWidth=1;c.beginPath();c.moveTo(-3,9);c.lineTo(-7,28);c.lineTo(7,28);c.lineTo(3,9);c.stroke();c.setLineDash([]);}
    c.beginPath();c.moveTo(0,-11);c.quadraticCurveTo(6,-4,5,9);c.lineTo(-5,9);c.quadraticCurveTo(-6,-4,0,-11);c.closePath();
    c.fillStyle=col;c.fill();c.strokeStyle='#0b2340';c.lineWidth=1;c.stroke();
    if(b.type==='sail'){c.fillStyle='#fff';c.beginPath();c.moveTo(0,-7);c.lineTo(7,7);c.lineTo(0,7);c.closePath();c.fill();c.strokeStyle='#333';c.beginPath();c.moveTo(0,-7);c.lineTo(0,7);c.stroke();}
    else{c.fillStyle='#f2f2f2';c.fillRect(-3,1,6,4);}
    c.restore();if(!isOwn)wkShapes(c,b.type,s.x+31,s.y-4);return s;};
  for(const a of P.ais){const s=radarOnly()?S2(a):ship(a,'#e8742c',false);if(radarOnly())nightEcho(c,s);c.fillStyle='#fff';c.font='10.5px sans-serif';c.textAlign='center';c.fillText(a.name,s.x,s.y+22);
    const e=P.encs.find(x=>x.id===a.id&&!x.done&&x.announced);if(e||a.warnUntil>P.time){c.strokeStyle='rgba(255,90,90,.9)';c.lineWidth=1.5;c.beginPath();c.arc(s.x,s.y,16,0,7);c.stroke();}
    if(P.sel===a.id){c.strokeStyle='#ffd98a';c.lineWidth=2;c.setLineDash([4,3]);c.beginPath();c.arc(s.x,s.y,20,0,7);c.stroke();c.setLineDash([]);}}
  ship(o,'#2b7de9',true);
  // compass badge
  c.save();c.translate(20,22);c.fillStyle='rgba(5,12,24,.5)';c.beginPath();c.arc(0,0,15,0,7);c.fill();c.rotate(-o.h*D2R);
  c.fillStyle='#ff6b6b';c.beginPath();c.moveTo(0,-12);c.lineTo(4,0);c.lineTo(-4,0);c.fill();c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.moveTo(0,12);c.lineTo(4,0);c.lineTo(-4,0);c.fill();c.restore();
  if(P.fog)fogDraw(c,cy0,R);
  if(P.m.night)nightBridge();
  for(const b of P.booms){const age=P.time-b.t;if(age>4)continue;const s=S2(b);c.globalAlpha=Math.max(0,1-age/4);c.font='26px sans-serif';c.textAlign='center';c.fillText('💥',s.x,s.y+9);c.globalAlpha=1;}
  popsDraw(c,PW/2,cy0);
  if(P.paused&&!P.mistakePause){c.fillStyle='rgba(0,0,0,.45)';c.fillRect(0,0,PW,PH);c.fillStyle='#fff';c.font='bold 20px sans-serif';c.textAlign='center';c.fillText('⏸ Paused',PW/2,PH/2);}
}
let wkUIt=0;
function wkUI(){
  const o=P.own,wp=P.m.wps[Math.min(P.wpi,P.m.wps.length-1)],d=Math.hypot(wp[0]-o.x,wp[1]-o.y),b=(brg(o,{x:wp[0],y:wp[1]})+360)%360;
  $('pScore').textContent=P.score;$('pHull').textContent='❤️'.repeat(Math.max(0,P.hull))+'🤍'.repeat(Math.max(0,3-P.hull));
  $('pWp').textContent=`⚑ WP ${P.wpi+1}/${P.m.wps.length} · ${d.toFixed(1)} nm · brg ${String(Math.round(b)%360).padStart(3,'0')}°`;
  $('pTime').textContent=`⏱ ${gclock(P.time)} at sea`;
  $('pHdg').textContent=String(Math.round((o.h+360)%360)%360).padStart(3,'0')+'°';$('pSet').textContent='set '+String(Math.round((o.th+360)%360)%360).padStart(3,'0')+'°';
  $('pSpd').textContent=o.v.toFixed(1)+' kn';$('pRange').textContent=P.range+' nm';
  $('pTele').querySelectorAll('button').forEach((x,i)=>x.classList.toggle('on',i===o.tele));
  // target card
  let a=P.ais.find(x=>x.id===P.sel);
  if(!a){let best=null;for(const x of P.ais){const c=cpaOf(o,x);if(c.tcpa>0&&(!best||c.cpa<best.c.cpa))best={x,c};}a=best&&best.c.range<4?best.x:null;}
  const card=$('pCard');
  if(!a){card.style.display='none';}
  else{card.style.display='block';const c=cpaOf(o,a),bb=(brg(o,a)+360)%360;
    let trend='—';if(a.bh.length>3){const db=norm(a.bh[a.bh.length-1].b-a.bh[0].b);trend=Math.abs(db)<1.2?(cpaOf(o,a).tcpa>0?'<span style="color:#ff9a9a">steady ⚠</span>':'steady (opening)'):db>0?'drawing right':'drawing left';}
    const risk=c.cpa<(P.chan?0.12:0.4)&&c.tcpa>0&&c.range<3.5, /* in a channel, passing 0.2 nm off port to port is normal */e=P.encs.find(x=>x.id===a.id&&!x.done&&x.announced);
    card.innerHTML=`<b>${a.name}</b> · ${P.m.night?'Lights: see the bridge view':P.m.fog?'Radar contact only':WK_TYPES[wkType(a)].look||'No day shapes'}<br>Brg ${String(Math.round(bb)%360).padStart(3,'0')}° · ${trend}<br>Range ${c.range.toFixed(2)} nm<br>`+
      (c.tcpa>0?`CPA ${c.cpa.toFixed(2)} nm in ${Math.max(0,c.tcpa*WK_TS/60).toFixed(1)} min`:'Opening — past CPA')+
      (risk?`<br><span style="color:#ff9a9a;font-weight:700">Risk of collision</span>`:'');}
  // hint bar
  const act=P.encs.filter(e=>!e.done&&e.announced),h=$('pHint');
  if(fbHintBar(h))return renderToasts();
  if(act.length){const e=act[0];
    const key=e.id+(e.hinted?'h':'n')+P.hints;if(h.dataset.k===key)return renderToasts();h.dataset.k=key;
    if(e.hinted){h.className='';h.textContent='💡 '+encHint(e);}
    else{h.className='risk';h.innerHTML=esc(encAlert(e))+(P.hints?` <button id="pHintBtn" style="margin-left:auto;flex:none;border:none;border-radius:8px;background:#5a4a12;color:#ffd98a;font-weight:700;padding:4px 8px;font-size:12px">💡 Hint −20</button>`:'');
      const hb=$('pHintBtn');if(hb)hb.onclick=()=>{e.hinted=true;P.score-=20;e.hintCost=true;popText('−20 hint',false);wkUI();};}}
  else{h.dataset.k='';h.className='calm';h.textContent=P.wpi<P.m.wps.length?`Steer for waypoint ${P.wpi+1}: ${String(Math.round(b)%360).padStart(3,'0')}°, ${d.toFixed(1)} nm.`:'';}
  renderToasts();
}
function wkFrame(dt){
  if(!P)return;if(!pctx)wkResize();
  if(!P.paused&&!P.over)wkTick(dt);
  wkDraw();wkUIt+=dt;if(wkUIt>0.2){wkUIt=0;if(!P.over)wkUI();}
}
