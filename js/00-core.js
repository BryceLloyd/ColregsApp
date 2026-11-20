// Shared helpers: geometry (bearings, velocities), DOM helpers, formatting.
const LINK=location.origin+location.pathname.replace(/index\.html$/,"");
const D2R=Math.PI/180;
const norm=a=>((a+180)%360+360)%360-180;
const vel=(h,v)=>({x:Math.sin(h*D2R)*v,y:Math.cos(h*D2R)*v});
const brg=(f,t)=>Math.atan2(t.x-f.x,t.y-f.y)/D2R;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const NAMES={stbd:"Alter to starboard",port:"Alter to port",stand:"Stand on",slow:"Slow down / stop"};
const $=id=>document.getElementById(id);
const gclock=rs=>{const g=Math.round(rs*20/60);return Math.floor(g/60)+'h '+String(g%60).padStart(2,'0')+'m';};
const fmt=s=>{s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};
const TYPE_LABEL={power:"Power-driven",sail:"Sailing vessel",fishing:"Fishing (trawling)",nuc:"Not under command",ram:"Restricted in ability to manoeuvre",cbd:"Constrained by draught",anchor:"At anchor",fishnt:"Fishing (nets/lines)"};
const STACK={fishing:["#ffffff","#2bff6a"],fishnt:["#ffffff","#ff3b3b"],nuc:["#ff3b3b","#ff3b3b"],ram:["#ff3b3b","#ffffff","#ff3b3b"],cbd:["#ff3b3b","#ff3b3b","#ff3b3b"],anchor:["#ffffff"]};
const MAST={power:1,ram:1,cbd:1};
