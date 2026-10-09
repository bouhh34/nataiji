const CACHE = "nataiji-shell-v109";
const ASSETS = [
  "/",
  "/privacy.html",
  "/delete-account.html",
  "/info-pages.css?v=1",
  "/terms.html",
  "/download.html",
  "/class-report-print-v2.js?v=3",
  "/1280px-National_Seal_of_Mauritania.svg.png",
  "/manifest.webmanifest?v=2",
  "/nataiji-brand-mark.png",
  "/style.css?v=4",
  "/auth.css?v=3",
  "/print-fixes.css?v=9",
  "/luxury-ui-v1.css?v=3",
  "/nataiji-design-system-v2.css?v=1",
  "/nataiji-visual-lab-v1.css?v=1",
  "/nataiji-refinement-v4.css?v=2",
  "/workflow-polish.css?v=1",
  "/release-100-v1.css?v=1",
  "/nataiji-final-visual-v1.css?v=2",
  "/nataiji-premium-v2.css?v=2",
  "/nataiji-home-reference-v1.css?v=4",
  "/more-page-v1.css?v=4",
  "/professor-v1.css?v=1",
  "/professor-v2.css?v=47",
  "/accessibility.css?v=5",
  "/vendor/feather.min.js",
  "/luxury-ui-v1.js?v=6",
  "/school-grade-journal.js?v=1",
  "/app.js?v=49",
  "/app-stability-v1.js?v=5",
  "/structure-manager.js?v=24",
  "/onboarding-v1.js?v=7",
  "/professor-v1.js?v=1",
  "/grade-journal.js?v=1",
  "/professor-v2.js?v=74",
  "/auth-access-v2.js?v=45",
  "/owner-staff-v1.js?v=3",
  "/account-isolation.js?v=4",
  "/scoring-model-v2.js?v=8",
  "/annual-results-v1.js?v=23",
  "/final-grade-entry.js?v=11",
  "/bilingual-data-editor-v1.js?v=24",
  "/official-bilingual-v1.js?v=14",
  "/class-report-layout-v2.js?v=10",
  "/two-students-a4-v1.js?v=18",
  "/app-power-v1.js?v=14",
  "/student-mobile-cards-v1.js?v=3",
  "/grade-mobile-ui-v1.js?v=12",
  "/report-mobile-preview-v1.js?v=3",
  "/report-final-polish-v1.js?v=11",
  "/student-pdf-number-direction-v1.js?v=1",
  "/admin-ux-polish-v1.js?v=8",
  "/interface-language-fix.js?v=12",
  "/premium-subject-locale-v1.js?v=5",
  "/commercial-foundation-v1.js?v=2",
  "/workflow-polish.js?v=3",
  "/nataiji-premium-v2.js?v=5",
  "/nataiji-home-reference-v1.js?v=2",
  "/more-page-v1.js?v=7"
];
const shellPages = new Set(['/', '/index.html', '/privacy.html', '/delete-account.html', '/terms.html', '/download.html']);
const assetPaths = new Set(ASSETS.map(p=>new URL(p,location.origin).pathname));
self.addEventListener('install', event=>{
  // An incomplete release must not replace the working offline shell.
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate', event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('nataiji-shell-') && key!==CACHE)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin) return;
  if(url.pathname.startsWith('/api/')||url.pathname==='/health') return;
  const navigation=request.mode==='navigate' && shellPages.has(url.pathname);
  if(!navigation&&!assetPaths.has(url.pathname)) return;
  const cachePromise=caches.open(CACHE);
  const cachedPromise=cachePromise.then(cache=>cache.match(request));
  let networkPromise;
  function network(){
    return networkPromise ||= fetch(request).then(async response=>{
      const type=response.headers.get('Content-Type')||'';
      // Missing scripts must never be cached as the server's HTML fallback.
      if(response.ok&&response.type!=='opaque'&&
        (navigation||!type.includes('text/html'))){
        const cache=await cachePromise;
        await cache.put(request,response.clone()).catch(()=>{});
      }
      return response;
    });
  }
  const responsePromise=(async()=>{
    const cached=await cachedPromise;
    if(!navigation&&cached) return cached; // Exact release URL: zero network bytes.
    if(navigation&&cached){
      let timer;
      const deadline=new Promise(resolve=>{timer=setTimeout(()=>resolve(cached),2500)});
      try { return await Promise.race([network().then(r=>r.ok?r:cached).catch(()=>cached),deadline]); }
      finally {clearTimeout(timer)}
    }
    try {return await network()}
    catch {
      if(navigation&&['/','/index.html'].includes(url.pathname)){
        return await (await cachePromise).match('/')||Response.error();
      }
      return Response.error();
    }
  })();
  event.respondWith(responsePromise);
  event.waitUntil(responsePromise.then(()=>networkPromise).catch(()=>{}));
});
