// sw.js (সংশোধিত সংস্করণ)

const CACHE_NAME_STATIC = 'static-cache-v2';
const CACHE_NAME_DYNAMIC = 'dynamic-cache-v2';
const CACHE_NAME_AUDIO = 'audio-cache-v1';

const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/images/icon-512x512.png'
];

// ১. Install Event: অ্যাপ শেল ফাইলগুলো ক্যাশ করা
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME_STATIC).then(cache => {
            console.log('Precaching App Shell');
            return cache.addAll(APP_SHELL_FILES);
        })
    );
});

// ২. Activate Event: পুরনো ক্যাশ মুছে ফেলা
self.addEventListener('activate', e => {
    const cacheWhitelist = [CACHE_NAME_STATIC, CACHE_NAME_DYNAMIC, CACHE_NAME_AUDIO];
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (!cacheWhitelist.includes(key)) {
                    console.log('Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// ৩. Fetch Event: নেটওয়ার্ক রিকোয়েস্ট নিয়ন্ত্রণ করা
self.addEventListener('fetch', e => {
    const { request } = e;
    const url = new URL(request.url);

    // স্ট্র্যাটেজি ১: অডিও ফাইল (Cache-First)
    // গুরুতর সংশোধন: '||' অপারেটর যোগ করা হয়েছে
    if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav') || url.pathname.endsWith('.ogg')) {
        e.respondWith(
            caches.match(request).then(cachedResponse => {
                return cachedResponse || fetch(request);
            })
        );
        return;
    }

    // স্ট্র্যাটেজি ২: database.json (Network First, then Cache)
    if (url.pathname.endsWith('/database.json')) {
        e.respondWith(
            caches.open(CACHE_NAME_DYNAMIC).then(cache => {
                return fetch(request)
                    .then(res => {
                        cache.put(request, res.clone());
                        return res;
                    })
                    .catch(() => cache.match(request));
            })
        );
        return;
    }

    // স্ট্র্যাটেজি ৩: অ্যাপ শেল ও অন্যান্য সব রিকোয়েস্ট (Cache First, then Network)
    e.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then(networkResponse => {
                return caches.open(CACHE_NAME_DYNAMIC).then(cache => {
                    if (request.method === 'GET') {
                         cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            });
        })
    );
});
