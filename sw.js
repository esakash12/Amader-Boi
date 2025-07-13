const CACHE_NAME_STATIC = 'static-cache-v1';
const CACHE_NAME_AUDIO = 'audio-cache-v1';

const APP_SHELL_FILES = [ '/', '/index.html', '/style.css', '/app.js', '/manifest.json' ];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME_STATIC).then(c => c.addAll(APP_SHELL_FILES))));

self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => {
    if (key !== CACHE_NAME_STATIC && key !== CACHE_NAME_AUDIO) return caches.delete(key);
}))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
    const { request } = e;
    const url = new URL(request.url);

    if (url.pathname.endsWith('/database.json')) {
        e.respondWith(caches.open(CACHE_NAME_STATIC).then(cache => fetch(request).then(res => {
            cache.put(request, res.clone());
            return res;
        }).catch(() => cache.match(request))));
        return;
    }
    
    e.respondWith(caches.match(request).then(res => res || fetch(request)));
});