// Boot: start on the home screen, run the animation loop, load the leaderboard, register the service worker.
show('home');
requestAnimationFrame(loop);
initCloud();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
