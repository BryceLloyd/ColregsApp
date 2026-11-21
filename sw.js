// Offline support: cache the app shell, serve cache-first, refresh in the background.
// Bump CACHE whenever you deploy so phones pick up the new version.
const CACHE='colregs-v17';
const FILES=['./', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'js/00-core.js', 'js/01-scenarios.js', 'js/02-levels-and-rules-questions.js', 'js/03-reference-data.js', 'js/04-svg-renderers.js', 'js/05-audio.js', 'js/06-buoyage.js', 'js/07-views-and-sections.js', 'js/08-question-formats.js', 'js/09-variants.js', 'js/10-quiz.js', 'js/11-sim-engine.js', 'js/12-sim-draw.js', 'js/13-sim-flow.js', 'js/14-leaderboard.js', 'js/15-watchkeeper.js', 'js/16-watchkeeper-draw.js', 'js/17-watchkeeper-controls.js', 'js/18-watchkeeper-channel.js', 'js/19-watchkeeper-night.js', 'js/20-watchkeeper-fog.js', 'js/21-watchkeeper-feedback.js', 'js/22-watchkeeper-home.js', 'js/23-study.js', 'js/24-review.js', 'js/25-records.js', 'js/99-boot.js', 'js/config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));}); // bypass the HTTP cache so a new version never mixes old files
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // leaderboard API calls go straight to the network
  e.respondWith(caches.match(e.request,{ignoreSearch:e.request.mode==='navigate'}).then(hit=>{
    const net=fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>hit);
    return hit||net;
  }));
});
