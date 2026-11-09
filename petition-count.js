/* The live signature count on the petition banners across execprosec.org (Marcus, 9 Nov 2026).
   Same rule as /what-the-public-think/: it opens on the total at midnight, adds today's signers one by one
   until it reaches the real total, then rises only when someone new signs. Totals only. */
(function(){
  var banners = document.querySelectorAll('.pet-banner'); if (!banners.length) return;
  var FEED = 'https://central-2-mcp-production.up.railway.app/public/petition/today', BEAT = 450;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var st = document.createElement('style');
  st.textContent = '.pet-n{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;font:400 15px/1.2 "DM Sans",sans-serif;color:rgba(255,255,255,.85)}' +
    '.pet-n[hidden]{display:none}' +
    '.pet-n b{font:700 22px/1 "DM Sans",sans-serif;color:#ddbc66;font-variant-numeric:tabular-nums;letter-spacing:.01em}' +
    '.pet-n b.t{animation:petT .45s ease-out}' +
    '@keyframes petT{0%{color:#fff;text-shadow:0 0 14px rgba(221,188,102,.9)}100%{color:#ddbc66;text-shadow:none}}' +
    '.pet-dot{width:9px;height:9px;border-radius:50%;background:#2fa36b;flex:0 0 9px;box-shadow:0 0 0 0 rgba(47,163,107,.6);animation:petP 1.6s infinite}' +
    '@keyframes petP{0%{box-shadow:0 0 0 0 rgba(47,163,107,.6)}70%{box-shadow:0 0 0 9px rgba(47,163,107,0)}100%{box-shadow:0 0 0 0 rgba(47,163,107,0)}}' +
    '@media(max-width:600px){.pet-n{width:100%}}' +
    '@media(prefers-reduced-motion:reduce){.pet-dot,.pet-n b.t{animation:none}}';
  document.head.appendChild(st);
  var nums = [].map.call(banners, function(b){
    var s = document.createElement('span'); s.className = 'pet-n'; s.hidden = true;
    s.innerHTML = '<i class="pet-dot" aria-hidden="true"></i><b>0</b><span>people have signed</span>';
    var btn = b.querySelector('.pet-b'); b.insertBefore(s, btn || null);
    return s;
  });
  var shown = null, target = 0, running = false;
  function draw(){
    var txt = shown.toLocaleString('en-GB');
    nums.forEach(function(s){
      var b = s.firstChild.nextSibling; b.textContent = txt; s.hidden = false;
      if (!reduce){ b.classList.remove('t'); void b.offsetWidth; b.classList.add('t'); }
    });
  }
  function step(){
    if (shown < target){ shown++; draw(); setTimeout(step, BEAT); } else running = false;
  }
  function go(){ if (!running && shown < target){ running = true; setTimeout(step, BEAT); } }
  function load(){
    fetch(FEED, {cache: 'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(D){
      if (!D || !D.ok || !D.before) return;
      var total = (+D.before.signers || 0) + (+D.today || 0); if (!total) return;
      if (shown === null){ shown = reduce ? total : (+D.before.signers || total); draw(); }
      if (total > target) target = total;
      go();
    }).catch(function(){});
  }
  load(); setInterval(function(){ if (!document.hidden) load(); }, 30000);
})();
