// sw.js (Improved Version)

const CACHE_NAME_STATIC = 'static-cache-v2'; // সংস্করণ পরিবর্তন করুন
const CACHE_NAME_DYNAMIC = 'dynamic-cache-v2'; // ডাইনামিক কন্টেন্টের জন্য নতুন ক্যাশ
const CACHE_NAME_AUDIO = 'audio-cache-v2';   // অডিও ফাইলের জন্য ক্যাশ

// অ্যাপের মূল ফাইল (App Shell)
const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/images/fallback.png' // একটি ফলব্যাক ইমেজ যোগ করতে পারেন
];

// 1. Install Event: অ্যাপ শেল ফাইলগুলো ক্যাশ করা
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME_STATIC).then(cache => {
            console.log('Precaching App Shell');
            return cache.addAll(APP_SHELL_FILES);
        })
    );
});

// 2. Activate Event: পুরনো ক্যাশ মুছে ফেলা
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

// 3. Fetch Event: নেটওয়ার্ক রিকোয়েস্ট নিয়ন্ত্রণ করা
self.addEventListener('fetch', e => {
    const { request } = e;
    const url = new URL(request.url);

    // স্ট্র্যাটেজি ১: অডিও ফাইল (Cache First, then Network & Update Cache)
    if (url.pathname.endsWith('.mp3')  url.pathname.endsWith('.wav')  url.pathname.endsWith('.ogg')) {
        e.respondWith(
            caches.open(CACHE_NAME_AUDIO).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    const fetchPromise = fetch(request).then(networkResponse => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                    // ক্যাশ থেকে রেসপন্স দিন অথবা নেটওয়ার্ক থেকে আনুন
                    return cachedResponse || fetchPromise;
                });
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

    // স্ট্র্যাটেজি ৩: অ্যাপ শেল ও অন্যান্য সব রিকোয়েস্ট (Cache First, then Network & Update Dynamic Cache)
    e.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // যদি ক্যাশে থাকে, সরাসরি দিন
            }
            // যদি ক্যাশে না থাকে, নেটওয়ার্ক থেকে আনুন এবং ডাইনামিক ক্যাশে সেভ করুন
            return fetch(request).then(networkResponse => {
                return caches.open(CACHE_NAME_DYNAMIC).then(cache => {
                    // শুধুমাত্র সফল GET রিকোয়েস্ট ক্যাশ করুন
                    if (request.method === 'GET') {
                         cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => {
                // নেটওয়ার্ক ও ক্যাশ উভয়ই ফেইল করলে একটি ফলব্যাক পেজ বা ইমেজ দেখাতে পারেন
                // return caches.match('/images/fallback.png');
            });
        })
    );
});
