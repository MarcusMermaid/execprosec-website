/* Reading measurement for the pages we send peers to (hol-briefing, lying-in-politics).
   Sits beside the MJB unified analytics snippet and posts to the same Central endpoint, under the
   same session id. Kept deliberately light, because Central allows 900 events an hour from one
   address and many readers share the Parliament network:
     read_30s, read_2min       visible on screen that long (once each)
     scroll_50, scroll_90      read that far down the page (once each)
     engagement                one summary, re-sent only when it has changed, whenever the page is
                               hidden or closed: meta = {"s":seconds visible,"sc":furthest scroll %,
                               "h":[headings reached, by position],"v":{video:[seconds watched,furthest %]}} */
(function(){
  var EP = 'https://central-2-mcp-production.up.railway.app/public/analytics';
  function sid(){ try{ return localStorage.getItem('mjb_sid') || ''; }catch(e){ return ''; } }
  function send(ev, d){
    try{
      var b = JSON.stringify(Object.assign({site:'execprosec', event:ev, page:(location.pathname+location.hash).slice(0,300),
        session_id:sid(), referrer:(document.referrer||'').slice(0,300)}, d||{}));
      if(navigator.sendBeacon){ navigator.sendBeacon(EP, new Blob([b], {type:'text/plain'})); }
      else { fetch(EP, {method:'POST', headers:{'Content-Type':'text/plain'}, body:b, keepalive:true}); }
    }catch(e){}
  }

  /* time actually on screen */
  var shown = 0, since = document.visibilityState === 'visible' ? Date.now() : 0;
  function secs(){ return Math.round((shown + (since ? Date.now() - since : 0)) / 1000); }

  /* furthest point read */
  var far = 0;
  function measure(){
    var h = document.documentElement, b = document.body;
    var total = Math.max(h.scrollHeight, b ? b.scrollHeight : 0, 1);
    var p = Math.min(100, Math.round(100 * ((window.pageYOffset || h.scrollTop) + window.innerHeight) / total));
    if(p > far) far = p;
  }
  window.addEventListener('scroll', measure, {passive:true});

  /* headings reached, by their position on the page */
  var heads = [], reached = {};
  function watchHeads(){
    heads = Array.prototype.slice.call(document.querySelectorAll('h2, h3'));
    if(!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ reached[heads.indexOf(e.target) + 1] = 1; io.unobserve(e.target); } });
    }, {threshold: 0.6});
    heads.forEach(function(h){ io.observe(h); });
  }

  /* how much of each video was watched */
  var vids = {};
  function watchVids(){
    Array.prototype.forEach.call(document.querySelectorAll('video'), function(v){
      if(v.__eng) return; v.__eng = 1;
      var name = (v.getAttribute('data-slug') || (v.currentSrc || v.getAttribute('src') || 'video').split('/').pop()).slice(0, 24);
      var last = null;
      v.addEventListener('timeupdate', function(){
        var r = vids[name] || (vids[name] = [0, 0]), t = v.currentTime;
        if(last !== null && t > last && t - last < 2) r[0] += t - last;   /* skips and seeks do not count */
        last = t;
        if(v.duration) r[1] = Math.max(r[1], Math.round(100 * t / v.duration));
      });
      v.addEventListener('seeking', function(){ last = null; });
      v.addEventListener('pause', function(){ last = null; });
    });
  }

  /* milestones, checked every few seconds */
  var done = {};
  function once(ev, cond){ if(cond && !done[ev]){ done[ev] = 1; send(ev); } }
  setInterval(function(){
    measure();
    once('read_30s', secs() >= 30);
    once('read_2min', secs() >= 120);
    once('scroll_50', far >= 50);
    once('scroll_90', far >= 90);
  }, 5000);

  /* the summary, whenever the reader leaves or switches away */
  var lastSent = '';
  function summary(){
    measure();
    var v = {};
    for(var k in vids){ v[k] = [Math.round(vids[k][0]), vids[k][1]]; }
    var m = JSON.stringify({s:secs(), sc:far, h:Object.keys(reached).map(Number), v:v});
    if(m === lastSent) return;
    lastSent = m;
    send('engagement', {meta: m.slice(0, 500)});
  }
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){ if(since){ shown += Date.now() - since; since = 0; } summary(); }
    else { since = Date.now(); }
  });
  window.addEventListener('pagehide', summary);

  function start(){ watchHeads(); watchVids(); measure(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  try{ new MutationObserver(watchVids).observe(document.documentElement, {childList:true, subtree:true}); }catch(e){}
})();
