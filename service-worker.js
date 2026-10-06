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

function guardarNoCache(request, resposta) {
  // clona ANTES de devolver a resposta pro navegador (depois disso o corpo já foi consumido)
  const copia = resposta.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copia)).catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const mesmaOrigem = new URL(req.url).origin === self.location.origin;

  // Página e arquivos do app: REDE PRIMEIRO. Assim, quando o código é atualizado, o aparelho já abre
  // a versão nova (antes abria a antiga e só atualizava na abertura seguinte — e um aparelho com código
  // antigo podia continuar sobrescrevendo os dados do outro). Sem internet, usa o cache.
  if (mesmaOrigem || req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.ok) guardarNoCache(req, resp);
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Bibliotecas externas (Firebase, KaTeX): cache primeiro, atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((cache) => {
      const rede = fetch(req)
        .then((resp) => {
          if (resp && (resp.ok || resp.type === 'opaque')) guardarNoCache(req, resp);
          return resp;
        })
        .catch(() => cache);
      return cache || rede;
    })
  );
});
