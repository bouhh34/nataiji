const CACHE = "nataiji-shell-v57";
const ASSETS = [
  "/workflow-polish.css",
  "/release-100-v1.css",
  "/nataiji-final-visual-v1.css",
  "/nataiji-premium-v2.css",
  "/nataiji-premium-v2.js",
  "/nataiji-home-reference-v1.css",
  "/nataiji-home-reference-v1.js",
  "/professor-v2.css",
  "/professor-v2.js",
  "/workflow-polish.js",
  "/terms.html",
  "/",
  "/download.html",
  "/style.css",
  "/auth.css",
  "/luxury-ui-v1.css",
  "/luxury-ui-v1.js",
  "/interface-language-fix.js",
  "/premium-subject-locale-v1.js",
  "/commercial-foundation-v1.js",
  "/nataiji-design-system-v2.css",
  "/nataiji-visual-lab-v1.css",
  "/nataiji-refinement-v4.css",
  "/vendor/feather.min.js",
  "/nataiji-brand-mark.png",
  "/manifest.webmanifest",
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const r = e.request,
    u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/")) return;
  // Never cache health checks, downloads or arbitrary authenticated routes.
  const navigation = r.mode === "navigate";
  const asset = /\.(?:js|css|png|svg|jpg|jpeg|webp|ico|woff2?|webmanifest)$/i.test(u.pathname);
  if (!navigation && !asset) return;
  e.respondWith(
    fetch(r, { cache: "no-store" })
      .then((res) => {
        if (res.ok && res.type !== "opaque") {
          e.waitUntil(caches.open(CACHE).then((c) => c.put(r, res.clone())).catch(() => {}));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(r) || await caches.match(r, { ignoreSearch: true });
        if (cached) return cached;
        // A script must never receive HTML as its offline fallback.
        if (navigation) return await caches.match("/") || Response.error();
        return Response.error();
      }),
  );
});
