// IALA buoyage data (Region A standard), buoy SVGs, light timing, buoy quiz.
// ================= BUOYAGE (IALA) =================
const BC={R:'#d7262e',G:'#1f9e4a',K:'#151515',Y:'#f7c600',W:'#ffffff',U:'#1d4fa6'};
const BL={R:'#ff3b3b',G:'#2bff6a',W:'#ffffff',Y:'#ffd21f',U:'#3d7bff'};
const FL2=[500,500,500,1500,500,6500];
const Qn=n=>{const a=[];for(let i=0;i<n;i++)a.push(300,700);return a;};
const BUOYS=[
 {id:'port',grp:'lat',s:'Port-hand lateral mark',shape:'can',bands:[['R',1]],top:['can','R'],lc:'R',seq:[500,3500],light:'Red, any rhythm (e.g. Fl R 4s)',
  note:'Entering harbour (direction of buoyage), keep it on your PORT side.',act:'Leave it to port when entering harbour'},
 {id:'stbd',grp:'lat',s:'Starboard-hand lateral mark',shape:'cone',bands:[['G',1]],top:['cone','G'],lc:'G',seq:[500,3500],light:'Green, any rhythm (e.g. Fl G 4s)',
  note:'Entering harbour, keep it on your STARBOARD side.',act:'Leave it to starboard when entering harbour'},
 {id:'pcs',grp:'lat',s:'Preferred channel to starboard',shape:'can',bands:[['R',.36],['G',.28],['R',.36]],top:['can','R'],lc:'R',seq:FL2,light:'Fl(2+1) R',
  note:'Where the channel splits, the main channel is to STARBOARD. Treat it like a port-hand mark.',act:'Main channel to starboard — leave it to port'},
 {id:'pcp',grp:'lat',s:'Preferred channel to port',shape:'cone',bands:[['G',.36],['R',.28],['G',.36]],top:['cone','G'],lc:'G',seq:FL2,light:'Fl(2+1) G',
  note:'Where the channel splits, the main channel is to PORT. Treat it like a starboard-hand mark.',act:'Main channel to port — leave it to starboard'},
 {id:'N',grp:'card',s:'North cardinal',shape:'pillar',bands:[['K',.5],['Y',.5]],top:['N'],lc:'W',seq:Qn(1),light:'Q or VQ — continuous quick flashes',
  note:'Safe water lies to the NORTH. Both cones point up (north). Black is where the cones point: on top.',act:'Pass to the north of it'},
 {id:'E',grp:'card',s:'East cardinal',shape:'pillar',bands:[['K',.33],['Y',.34],['K',.33]],top:['E'],lc:'W',seq:Qn(3).slice(0,5).concat(7700),light:'Q(3) 10s or VQ(3) 5s',
  note:'Safe water to the EAST. Cones base to base (an "egg"). 3 flashes — 3 o\'clock on a clock face.',act:'Pass to the east of it'},
 {id:'S',grp:'card',s:'South cardinal',shape:'pillar',bands:[['Y',.5],['K',.5]],top:['S'],lc:'W',seq:Qn(6).slice(0,11).concat(700,2000,7000),light:'Q(6)+LFl 15s or VQ(6)+LFl 10s',
  note:'Safe water to the SOUTH. Both cones point down. 6 flashes + a long one — 6 o\'clock.',act:'Pass to the south of it'},
 {id:'W',grp:'card',s:'West cardinal',shape:'pillar',bands:[['Y',.33],['K',.34],['Y',.33]],top:['W'],lc:'W',seq:Qn(9).slice(0,17).concat(6700),light:'Q(9) 15s or VQ(9) 10s',
  note:'Safe water to the WEST. Cones point to point (a wine glass). 9 flashes — 9 o\'clock.',act:'Pass to the west of it'},
 {id:'iso',grp:'other',s:'Isolated danger mark',shape:'pillar',bands:[['K',.36],['R',.28],['K',.36]],top:['balls2'],lc:'W',seq:[500,500,500,3500],light:'Fl(2) white',
  note:'A small danger (rock, wreck) with navigable water all round. Don\'t pass close.',act:'Danger right below it — give it a wide berth'},
 {id:'safe',grp:'other',s:'Safe water mark',shape:'pillar',vs:['R','W'],top:['ball'],lc:'W',seq:[2000,8000],light:'Iso, Oc, LFl 10s or Morse "A" — white',
  note:'Safe water all round: mid-channel or landfall buoy. Pass either side.',act:'Safe water all round it'},
 {id:'spec',grp:'other',s:'Special mark',shape:'pillar',bands:[['Y',1]],top:['X'],lc:'Y',seq:[500,4500],light:'Yellow, any rhythm',
  note:'Marks a special area or feature: spoil ground, cable, outfall, racing or exercise area. Check the chart.',act:'Special area — check the chart'},
 {id:'wreck',grp:'other',s:'Emergency wreck marking',shape:'pillar',vs:['U','Y'],top:['cross'],lc:'U',seq:[1000,500,1000,500],cols:['U','Y'],light:'Alternating blue and yellow',
  note:'A new wreck not yet on the charts. Keep well clear; often laid in pairs or groups.',act:'New danger not yet charted — keep well clear'}
];
let buoyRegion='A',bid=0;
function regionView(b){
  if(buoyRegion==='A'||b.grp!=='lat')return b;
  const sw=c=>c==='R'?'G':c==='G'?'R':c;
  return Object.assign({},b,{bands:b.bands.map(([c,f])=>[sw(c),f]),top:[b.top[0],sw(b.top[1])],lc:sw(b.lc),light:b.light.replace(/\bR\b|Red|\bG\b|Green/g,m=>({R:'G',G:'R',Red:'Green',Green:'Red'})[m])});
}
function buoySVG(b0,night){
  const b=regionView(b0),id='bc'+(bid++),wl=118,top={can:74,cone:66,pillar:50}[b.shape];
  let shape='';
  if(b.shape==='can')shape=`<rect x="31" y="${top}" width="38" height="${wl-top+8}" rx="2"/>`;
  if(b.shape==='cone')shape=`<path d="M27 ${wl+8} L73 ${wl+8} L66 84 Q50 ${top-6} 34 84 Z"/>`;
  if(b.shape==='pillar')shape=`<path d="M25 ${wl+8} L75 ${wl+8} L71 100 L58 100 L56 ${top} L44 ${top} L42 100 L29 100 Z"/>`;
  let fill='';
  if(b.vs){for(let i=0;i<9;i++)fill+=`<rect x="${22+i*7}" y="${top-8}" width="7" height="${wl-top+20}" fill="${BC[b.vs[i%2]]}"/>`;}
  else{let y=top-8;const hh=wl-top+8;for(const [c,f] of b.bands){const h=f*hh+(y===top-8?8:0);fill+=`<rect x="20" y="${y}" width="60" height="${h+0.5}" fill="${BC[c]}"/>`;y+=h;}}
  const tm=b.top[0],tc=BC[b.top[1]||'K'],K=BC.K;let T='';
  if(tm==='can')T=`<rect x="43" y="27" width="14" height="14" fill="${tc}"/>`;
  if(tm==='cone')T=`<polygon points="42,41 58,41 50,25" fill="${tc}"/>`;
  if(tm==='N')T=`<polygon points="42,33 58,33 50,22" fill="${K}"/><polygon points="42,45 58,45 50,34" fill="${K}"/>`;
  if(tm==='S')T=`<polygon points="42,22 58,22 50,33" fill="${K}"/><polygon points="42,34 58,34 50,45" fill="${K}"/>`;
  if(tm==='E')T=`<polygon points="42,33 58,33 50,22" fill="${K}"/><polygon points="42,35 58,35 50,46" fill="${K}"/>`;
  if(tm==='W')T=`<polygon points="42,22 58,22 50,33" fill="${K}"/><polygon points="42,45 58,45 50,34" fill="${K}"/>`;
  if(tm==='balls2')T=`<circle cx="50" cy="28" r="5.5" fill="${K}"/><circle cx="50" cy="41" r="5.5" fill="${K}"/>`;
  if(tm==='ball')T=`<circle cx="50" cy="34" r="7.5" fill="${BC.R}"/>`;
  if(tm==='X')T=`<path d="M43 27L57 41M57 27L43 41" stroke="${BC.Y}" stroke-width="4"/>`;
  if(tm==='cross')T=`<path d="M50 23V45M41 33H59" stroke="${BC.Y}" stroke-width="4"/>`;
  const sky=night?'#050b18':'#bcd6ea',sea=night?'#020409':'#2f6f9a';
  return `<svg class="sh" viewBox="0 0 100 140"><defs><clipPath id="${id}">${shape}</clipPath></defs>
  <rect width="100" height="140" fill="${sky}"/><line x1="50" y1="16" x2="50" y2="${top}" stroke="${night?'#222':'#333'}" stroke-width="3"/>
  <g opacity="${night?0.18:1}"><g clip-path="url(#${id})">${fill}</g>${T}</g>
  <circle cx="50" cy="12" r="5" fill="#333" data-seq="${b.seq.join(',')}" data-c="${(b.cols||[b.lc]).join(',')}" filter="url(#glow)"/>
  <rect y="${wl}" width="100" height="${140-wl}" fill="${sea}"/><path d="M0 ${wl}q12-4 25 0t25 0t25 0t25 0" fill="none" stroke="rgba(255,255,255,.35)"/></svg>`;
}
function tickLights(now){
  document.querySelectorAll('[data-seq]').forEach(el=>{
    const seq=el.dataset.seq.split(',').map(Number),cols=el.dataset.c.split(','),per=seq.reduce((a,b)=>a+b,0);
    let tt=now%per,i=0;while(tt>=seq[i]){tt-=seq[i];i++;}
    const on=i%2===0,col=cols[(i/2|0)%cols.length];
    el.setAttribute('fill',on?BL[col]:'#2a2f38');
  });
}
function renderBuoyLearn(body){
  const grp=(g,title)=>`<div class="secH">${title}</div><div class="cards">`+BUOYS.filter(b=>b.grp===g).map(b=>{const v=regionView(b);
    return `<div class="card">${buoySVG(b,false)}<b>${esc(b.s)}</b><span>${esc(b.note)}</span><span style="color:#e8d9a8">💡 ${esc(v.light)}</span></div>`}).join('')+'</div>';
  body.innerHTML=`<div class="note">🌍 <b>Region A</b> (Europe, Africa incl. South Africa, most of Asia, Australia): <b>red to port</b> entering harbour.<br><b>Region B</b> (the Americas, Japan, Korea, Philippines): "<b>red right returning</b>" — colours swapped.</div>
   <div class="tabs" style="margin-top:8px"><button class="tab ${buoyRegion==='A'?'on':''}" data-r="A">Region A</button><button class="tab ${buoyRegion==='B'?'on':''}" data-r="B">Region B</button></div>`+
   grp('lat','Lateral marks · Region '+buoyRegion)+grp('card','Cardinal marks — pass on the named side')+
   '<p class="small" style="margin:6px 2px">Cardinal lights are white and work like a clock face: East 3 flashes, South 6 (+ long), West 9, North continuous.</p>'+grp('other','Other marks');
  body.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{buoyRegion=b.dataset.r;const st=body.scrollTop;renderBuoyLearn(body);body.scrollTop=st;});
}
function lightOnlySVG(b){
  return `<svg class="lt" viewBox="0 0 160 110"><rect width="160" height="110" fill="#050b18"/><rect y="92" width="160" height="18" fill="#020409"/><circle cx="80" cy="60" r="6" fill="#333" data-seq="${b.seq.join(',')}" data-c="${(b.cols||[b.lc]).join(',')}" filter="url(#glow)"/></svg>`;
}
function buoyQs(n){
  const qs=[];buoyRegion='A';
  for(let k=0;k<n;k++){
    const type=k%3,b=BUOYS[Math.floor(Math.random()*BUOYS.length)];
    const others=shuffle(BUOYS.filter(o=>o!==b)).slice(0,3);
    if(type===0)qs.push({vis:`<div class="w" style="width:34%">${buoySVG(b,false)}</div>`,prompt:"What mark is this? (Region A)",opts:shuffle([b,...others]).map(o=>({h:esc(o.s),ok:o===b})),explain:`${b.s}. ${b.note}`});
    else if(type===1)qs.push({vis:`<div class="w" style="width:34%">${buoySVG(b,false)}</div>`,prompt:"You're entering harbour in Region A. What does this mark tell you?",opts:shuffle([b,...others]).map(o=>({h:esc(o.act),ok:o===b})),explain:`${b.s}: ${b.note}`});
    else{const pool=b.id==='port'||b.id==='stbd'?shuffle(BUOYS.filter(o=>o.lc!==b.lc&&o.id!=='port'&&o.id!=='stbd')).slice(0,3):others;
      qs.push({vis:`<div class="w">${lightOnlySVG(b)}</div>`,prompt:`At night you see this light: ${b.light}. Which mark is it?`,opts:shuffle([b,...pool]).map(o=>({h:esc(o.s),ok:o===b})),explain:`${b.s}: ${b.light}.`});}
  }
  return qs;
}
