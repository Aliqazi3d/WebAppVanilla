const CACHE = "alderbrook-v1";
const ASSETS = ["./", "index.html", "animals.html", "animal-detail.html", "kids.html", "map.html", "favourites.html",
  "css/style.css", "js/main.js", "data/animals.json", "manifest.json", "icon-192.png", "icon-512.png"];

// Cache the app shell on install
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Drop old caches when the version changes
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});

// Cache first, network second, home page if both fail
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match("index.html")))
  );
});
