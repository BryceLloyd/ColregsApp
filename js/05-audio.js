// Horn and bell synthesis with Web Audio.
// ---------- audio ----------
let actx=null,muted=false;try{muted=localStorage.getItem('colregsMute')==='1';}catch(e){}
function audioCtx(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state!=='running')actx.resume();}catch(e){}return actx;}
// iOS only starts audio inside a user gesture: unlock it on the first touch with a silent buffer.
function unlockAudio(){const c=audioCtx();if(!c)return;try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);}catch(e){}
  if(c.state==='running')['pointerdown','touchend','click'].forEach(ev=>document.removeEventListener(ev,unlockAudio,true));}
['pointerdown','touchend','click'].forEach(ev=>document.addEventListener(ev,unlockAudio,true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&actx&&actx.state!=='running')try{actx.resume();}catch(e){}});
function chime(){if(muted||!audioCtx())return;const t0=actx.currentTime+0.05;
  [523,659,784,1047].forEach((fr,i)=>{const o=actx.createOscillator(),g=actx.createGain(),at=t0+i*0.11;o.type='triangle';o.frequency.value=fr;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.16,at+0.02);g.gain.exponentialRampToValueAtTime(0.001,at+0.6);o.connect(g);g.connect(actx.destination);o.start(at);o.stop(at+0.65);});}
function sound(p,vol=1){
  if(muted)return;
  if(!audioCtx())return;
  let tt=actx.currentTime+0.05;
  const horn=(at,d)=>{const g=actx.createGain(),f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.22*vol,at+0.04);g.gain.setValueAtTime(0.22*vol,at+d-0.06);g.gain.linearRampToValueAtTime(0,at+d);
    for(const fr of[138,207]){const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=fr;o.connect(f);o.start(at);o.stop(at+d+0.02);}
    f.connect(g);g.connect(actx.destination);};
  const bell=at=>{for(const [fr,a] of[[1650,.18],[2470,.08]]){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=fr;
    g.gain.setValueAtTime(a,at);g.gain.exponentialRampToValueAtTime(0.001,at+0.7);o.connect(g);g.connect(actx.destination);o.start(at);o.stop(at+0.75);}};
  for(const c of p){
    if(c==='S'){horn(tt,0.5);tt+=0.95;}
    else if(c==='L'){horn(tt,2.0);tt+=2.45;}
    else if(c==='b'){bell(tt);tt+=0.55;}
    else if(c==='B'){for(let i=0;i<16;i++){bell(tt);tt+=0.12;}tt+=0.5;}
  }
}
