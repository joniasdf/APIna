const C='tfa-v4',A=['./','tessie.js','guide.js','index.html','app.js','data.js','info.js','ui.js','cost.js','manifest.webmanifest','vendor/chart.umd.min.js','vendor/leaflet.js','vendor/leaflet.css','vendor/fonts/inter.woff2','icons/icon-192.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!='GET'||new URL(e.request.url).origin!=location.origin)return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
