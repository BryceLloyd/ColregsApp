// Watchkeeper controls: helm, engine, horn, range, pause, navigation.
// ---------- controls ----------
let helmTimer=null;
document.querySelectorAll('.helm [data-dh]').forEach(b=>{
  const step=()=>{if(!P||P.over)return;const o=P.own,lead=Math.max(-170,Math.min(170,norm(o.th-o.h)+(+b.dataset.dh)));o.th=norm(o.h+lead);wkUI();}; // capped at 170° ahead so holding the helm keeps turning the same way
  b.addEventListener('pointerdown',e=>{e.preventDefault();step();clearInterval(helmTimer);helmTimer=setInterval(step,320);});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearInterval(helmTimer)));
});
document.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>{if(!P)return;sound(b.dataset.hp);P.horn.push({t:P.time,p:b.dataset.hp});wkToast('Horn: '+patHTML(b.dataset.hp),'info');});
$('pRange').onclick=()=>{if(!P)return;P.range=P.range===1.5?3:P.range===3?6:1.5;wkUI();};
$('pPause').onclick=()=>{if(!P)return;P.paused=!P.paused;if(!P.paused){P.mistakePause=false;$('pResult').style.display='none';$('pHint').dataset.k='';}$('pPause').textContent=P.paused?'▶':'⏸';};
$('pcv').addEventListener('click',ev=>{if(!P)return;const r=$('pcv').getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
  const o=P.own,k=(PH*0.6)/P.range,ca=Math.cos(o.h*D2R),sa=Math.sin(o.h*D2R);let best=null,bd=34;
  for(const a of P.ais){const dx=a.x-o.x,dy=a.y-o.y,sx=PW/2+(dx*ca-dy*sa)*k,sy=PH*0.66-(dx*sa+dy*ca)*k,d=Math.hypot(sx-mx,sy-my);if(d<bd){bd=d;best=a;}}
  P.sel=best?best.id:null;wkUI();});
let pHomeArmed=false;
$('pHome').onclick=()=>{if(P&&!P.over&&!pHomeArmed){pHomeArmed=true;wkToast('Tap 🏠 again to abandon the mission','info');setTimeout(()=>pHomeArmed=false,2500);return;}pHomeArmed=false;P=null;show('home');};
$('dbRetry').onclick=()=>{const m=P.m;closeOv('ovDebrief');wkStart(m);};
$('dbMis').onclick=()=>{closeOv('ovDebrief');P=null;show('home');};
$('dbHome').onclick=()=>{closeOv('ovDebrief');P=null;show('home');};
$('goPlay').onclick=wkOpen;
