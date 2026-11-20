// Horn and bell synthesis with Web Audio.
// ---------- audio ----------
let actx=null;
function sound(p){
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch(e){return;}
  let tt=actx.currentTime+0.05;
  const horn=(at,d)=>{const g=actx.createGain(),f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.22,at+0.04);g.gain.setValueAtTime(0.22,at+d-0.06);g.gain.linearRampToValueAtTime(0,at+d);
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
