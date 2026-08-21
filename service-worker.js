const CACHE_NAME = 'revisao-espacada-v2';
const ARQUIVOS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// index.html: network-first — sempre tenta buscar a versão mais nova primeiro (evita
// ficar preso numa versão antiga do app), só usa o cache se estiver offline.
// Outros arquivos (ícones, manifest): cache-first, já que raramente mudam.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const ehHTML = event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url.endsWith('/');

  if (ehHTML) {
    event.respondWith(
      fetch(event.request)
        .then((respostaRede) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaRede.clone()));
          return respostaRede;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      const buscaRede = fetch(event.request)
        .then((respostaRede) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaRede.clone()));
          return respostaRede;
        })
        .catch(() => respostaCache);
      return respostaCache || buscaRede;
    })
  );
});
