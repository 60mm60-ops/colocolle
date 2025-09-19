// Service Worker for Colorful Pro
// PWA対応のためのサービスワーカー

const CACHE_NAME = 'colorful-pro-v2.0.0';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/js/colorful-pro.js',
    '/README.md',
    // CDNリソースは外部なのでキャッシュしない
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// アクティベーション時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
    // GET リクエストのみ処理
    if (event.request.method !== 'GET') {
        return;
    }

    // CDNリソースは通常通りネットワークから取得
    if (event.request.url.includes('cdnjs.cloudflare.com') ||
        event.request.url.includes('cdn.jsdelivr.net') ||
        event.request.url.includes('fonts.googleapis.com') ||
        event.request.url.includes('fonts.gstatic.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュがあればそれを返す
                if (response) {
                    console.log('[SW] Serving from cache:', event.request.url);
                    return response;
                }

                // キャッシュになければネットワークから取得
                console.log('[SW] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        // レスポンスが有効でない場合はそのまま返す
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // レスポンスをクローンしてキャッシュに保存
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        
                        // オフライン時のフォールバック
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// メッセージイベントの処理（将来の拡張用）
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// プッシュ通知の処理（将来の拡張用）
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');
    
    const options = {
        body: event.data ? event.data.text() : 'カラフラ からお知らせがあります',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '開く',
                icon: '/icon-explore.png'
            },
            {
                action: 'close',
                title: '閉じる',
                icon: '/icon-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('カラフラ', options)
    );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event received:', event.tag);
    
    if (event.tag === 'background-palette-sync') {
        event.waitUntil(
            // バックグラウンドでパレット同期処理
            console.log('Background palette sync completed')
        );
    }
});
