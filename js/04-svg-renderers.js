// SVG drawing of lights, day shapes and flags.
// ---------- SVG renderers ----------
const LC={w:"#ffffff",r:"#ff3b3b",g:"#2bff6a",y:"#ffd21f",Y:"#ffb21f"};
function lightSVG(it){
  const W=160,H=110,cx=W/2,base=82,u=17;
  let s=`<svg class="lt" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#050b18"/><rect y="${base+10}" width="${W}" height="${H-base-10}" fill="#020409"/><line x1="0" y1="${base+10}" x2="${W}" y2="${base+10}" stroke="#1d2c46"/>`;
  for(const [c,x,y] of it.L)s+=`<circle cx="${cx+x*u}" cy="${base+y*u}" r="4.6" fill="${LC[c]}" filter="url(#glow)" ${c==='y'?'class="blink"':''}/>`;
  return s+'</svg>';
}
function shapeSVG(it){
  const W=160,H=110,cx=W/2;let y=14,s=`<svg class="sh" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#bcd6ea"/><rect y="88" width="${W}" height="22" fill="#2f6f9a"/><path d="M40 88 L120 88 L112 98 L48 98 Z" fill="#555"/><line x1="${cx}" y1="8" x2="${cx}" y2="88" stroke="#333" stroke-width="2"/>`;
  const step=it.k.length>2?24:28;
  for(const k of it.k){
    const yc=y+10;
    if(k==='ball')s+=`<circle cx="${cx}" cy="${yc}" r="9" fill="#111"/>`;
    if(k==='diamond')s+=`<polygon points="${cx},${yc-11} ${cx+9},${yc} ${cx},${yc+11} ${cx-9},${yc}" fill="#111"/>`;
    if(k==='cyl')s+=`<rect x="${cx-8}" y="${yc-12}" width="16" height="26" rx="2" fill="#111"/>`;
    if(k==='coneD')s+=`<polygon points="${cx-10},${yc-9} ${cx+10},${yc-9} ${cx},${yc+9}" fill="#111"/>`;
    if(k==='coneU')s+=`<polygon points="${cx-10},${yc+9} ${cx+10},${yc+9} ${cx},${yc-9}" fill="#111"/>`;
    y+=k==='coneD'&&it.k.length===2?20:step;
  }
  return s+'</svg>';
}
function flagSVG(L){
  const R='#d7262e',Y='#f7c600',U='#1d4fa6',W='#ffffff',K='#111111';
  const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const p=(pts,c)=>`<polygon points="${pts}" fill="${c}"/>`;
  let b='';
  switch(L){
    case'A':b=r(0,0,30,40,W)+p('30,0 60,0 44,20 60,40 30,40',U);break;
    case'B':b=p('0,0 60,0 44,20 60,40 0,40',R);break;
    case'C':b=r(0,0,60,8,U)+r(0,8,60,8,W)+r(0,16,60,8,R)+r(0,24,60,8,W)+r(0,32,60,8,U);break;
    case'D':b=r(0,0,60,10,Y)+r(0,10,60,20,U)+r(0,30,60,10,Y);break;
    case'E':b=r(0,0,60,20,U)+r(0,20,60,20,R);break;
    case'F':b=r(0,0,60,40,W)+p('30,0 60,20 30,40 0,20',R);break;
    case'G':for(let i=0;i<6;i++)b+=r(i*10,0,10,40,i%2?U:Y);break;
    case'H':b=r(0,0,30,40,W)+r(30,0,30,40,R);break;
    case'I':b=r(0,0,60,40,Y)+`<circle cx="30" cy="20" r="10" fill="${K}"/>`;break;
    case'J':b=r(0,0,60,40,U)+r(0,13.3,60,13.4,W);break;
    case'K':b=r(0,0,30,40,Y)+r(30,0,30,40,U);break;
    case'L':b=r(0,0,30,20,Y)+r(30,0,30,20,K)+r(0,20,30,20,K)+r(30,20,30,20,Y);break;
    case'M':b=r(0,0,60,40,U)+`<path d="M0,0L60,40M60,0L0,40" stroke="${W}" stroke-width="8"/>`;break;
    case'N':for(let i=0;i<4;i++)for(let j=0;j<4;j++)b+=r(j*15,i*10,15,10,(i+j)%2?W:U);break;
    case'O':b=p('0,0 60,0 60,40',R)+p('0,0 0,40 60,40',Y);break;
    case'P':b=r(0,0,60,40,U)+r(20,13.3,20,13.4,W);break;
    case'Q':b=r(0,0,60,40,Y);break;
    case'R':b=r(0,0,60,40,R)+r(0,16,60,8,Y)+r(26,0,8,40,Y);break;
    case'S':b=r(0,0,60,40,W)+r(20,13.3,20,13.4,U);break;
    case'T':b=r(0,0,20,40,R)+r(20,0,20,40,W)+r(40,0,20,40,U);break;
    case'U':b=r(0,0,30,20,R)+r(30,0,30,20,W)+r(0,20,30,20,W)+r(30,20,30,20,R);break;
    case'V':b=r(0,0,60,40,W)+`<path d="M0,0L60,40M60,0L0,40" stroke="${R}" stroke-width="8"/>`;break;
    case'W':b=r(0,0,60,40,U)+r(8,6,44,28,W)+r(18,13,24,14,R);break;
    case'X':b=r(0,0,60,40,W)+r(0,16,60,8,U)+r(26,0,8,40,U);break;
    case'Y':b=r(0,0,60,40,Y);for(let k=-40;k<110;k+=13)b+=`<path d="M${k},0L${k-40},40" stroke="${R}" stroke-width="6.5"/>`;break;
    case'Z':b=p('0,0 60,0 30,20',Y)+p('60,0 60,40 30,20',U)+p('0,40 60,40 30,20',R)+p('0,0 0,40 30,20',K);break;
  }
  const edge=(L==='A'||L==='B')?'':`<rect x=".5" y=".5" width="59" height="39" fill="none" stroke="rgba(0,0,0,.25)"/>`;
  return `<svg class="fl" viewBox="0 0 60 40" preserveAspectRatio="xMidYMid meet">${b}${edge}</svg>`;
}
