// Watchkeeper night missions (Mission 4): the chart works like radar (anonymous echoes, no hull or heading),
// and a bridge view strip shows each ship's lights as you'd see them. A mission opts in with `night:true`.
let bctx2=null,BW2=360,BH2=88;
const NIGHT_VIEW=90,NIGHT_RANGE=5; // the bridge view spans 90° either side of your bow, out to 5 nm

function nightResize(){const c=$('pBridge'),dpr=window.devicePixelRatio||1;BW2=c.clientWidth;BH2=c.clientHeight;if(!BW2||!BH2)return;
  c.width=BW2*dpr;c.height=BH2*dpr;bctx2=c.getContext('2d');bctx2.setTransform(dpr,0,0,dpr,0,0);}

// What lights she shows you, in words, and what they mean (for the result card).
const LIGHT_WORD={'#ffffff':'white','#2bff6a':'green','#ff3b3b':'red'};
const LIGHT_MEANS={fishing:'a vessel engaged in trawling',nuc:'a vessel not under command',ram:'a vessel restricted in her ability to manoeuvre',cbd:'a vessel constrained by her draught'};
function lightsWords(b,viewer){
  const a=norm(brg(b,viewer)-b.h),st=(STACK[b.type]||[]).slice().reverse().map(c=>LIGHT_WORD[c]),parts=[];
  if(st.length)parts.push(`${st.join(' over ')} all-round lights`);
  if(MAST[b.type]&&Math.abs(a)<=112.5)parts.push('a white masthead light');
  const g=a>=-4&&a<=112.5,r=a<=4&&a>=-112.5;
  if(g&&r)parts.push('both sidelights');else if(g)parts.push('a green sidelight');else if(r)parts.push('a red sidelight');
  if(Math.abs(a)>112.5)parts.push('a white stern light');
  const aspect=g&&r?'she was heading straight at you':g?'you were seeing her starboard side':r?'you were seeing her port side':'you were astern of her';
  const what=st.length?`That's ${LIGHT_MEANS[b.type]}, and `:b.type==='sail'&&Math.abs(a)<=112.5?'No masthead light means a sailing vessel, and ':'';
  const list=parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts[parts.length-1]:parts[0];
  return `${list}. ${what?what+aspect:aspect[0].toUpperCase()+aspect.slice(1)}.`;
}

// Chart echo for a ship at night: position only, no hull or heading.
function nightEcho(c,s){c.save();c.shadowColor='#ffcf6e';c.shadowBlur=8;c.fillStyle='#ffcf6e';c.beginPath();c.arc(s.x,s.y,4,0,7);c.fill();c.restore();}

// The bridge view: dark sky, horizon, bearing ticks, and each ship's lights at her relative bearing.
function nightBridge(){
  if(!bctx2)nightResize();if(!bctx2)return;const c=bctx2,o=P.own,hy=BH2*0.6,m=18;
  const g=c.createLinearGradient(0,0,0,BH2);g.addColorStop(0,'#03050c');g.addColorStop(.59,'#0b1530');g.addColorStop(.6,'#02040a');g.addColorStop(1,'#02040a');
  c.fillStyle=g;c.fillRect(0,0,BW2,BH2);
  c.strokeStyle='rgba(120,150,200,.25)';c.beginPath();c.moveTo(0,hy);c.lineTo(BW2,hy);c.stroke();
  c.fillStyle='rgba(160,180,210,.65)';c.font='bold 9px sans-serif';c.textAlign='left';c.fillText('👁 BRIDGE VIEW',6,11);
  const X=rb=>BW2/2+rb/NIGHT_VIEW*(BW2/2-m);
  c.font='9px sans-serif';c.textAlign='center';
  for(const d of[-90,-45,0,45,90]){const x=X(d);c.fillRect(x-.5,BH2-12,1,5);c.fillText(d===0?'ahead':(d<0?'port ':'stbd ')+Math.abs(d)+'°',Math.max(16,Math.min(BW2-16,x)),BH2-2);}
  let abaft=0;
  for(const a of P.ais){const d=dist(o,a);if(d>NIGHT_RANGE)continue;const rb=norm(brg(o,a)-o.h);
    if(Math.abs(rb)>NIGHT_VIEW){abaft++;continue;}
    const x=X(rb),r=Math.max(1.6,Math.min(3.2,4-d*0.6)),k=Math.max(.5,Math.min(1.05,1.6/Math.max(d,0.1)))*0.9; // closer = brighter and further apart
    for(const l of lightsSeen(a,o))light(l.c,x+l.dx*k,hy-4+l.dy*k,r,c);
    if(P.sel===a.id){c.strokeStyle='#ffd98a';c.lineWidth=1;c.beginPath();c.moveTo(x-9,hy+4);c.lineTo(x-9,hy+7);c.lineTo(x+9,hy+7);c.lineTo(x+9,hy+4);c.stroke();}
    c.fillStyle='rgba(200,210,230,.55)';c.fillText(a.name.replace('Ship ',''),x,hy+17);}
  if(abaft){c.fillStyle='rgba(160,180,210,.65)';c.textAlign='right';c.fillText(`${abaft} abaft the beam`,BW2-6,11);}
}
