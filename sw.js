// ============================================================================
// Service Worker — deixa o sistema instalável e disponível offline
// Só funciona quando o site estiver publicado em HTTPS (GitHub Pages, por exemplo).
// Abrindo o index.html direto do computador (file://), o navegador ignora este arquivo.
// ============================================================================

var CACHE = 'saatendimentos-v3';
var PREFIXO = 'saatendimentos-';

var ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './assets/logo.jpeg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './js/config.js',
  './js/cripto.js',
  './js/data.js',
  './js/backend.js',
  './js/meses.js',
  './js/hoje.js',
  './js/seguranca.js',
  './js/app.js',
  './js/pacientes.js',
  './js/fontes.js',
  './js/lancamentos.js',
  './js/situacao.js',
  './js/resumos.js',
  './js/backup.js',
  './js/agenda.js',
  './js/prontuario.js',
  './js/whatsapp.js',
  './js/recibos.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ARQUIVOS.map(function(url) {
        // um arquivo ausente não pode impedir a instalação do restante
        return cache.add(url).catch(function() {});
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(chaves) {
      return Promise.all(chaves.map(function(chave) {
        if (chave.indexOf(PREFIXO) === 0 && chave !== CACHE) {
          return caches.delete(chave);
        }
        return null;
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // WhatsApp, gov.br, etc.

  if (req.mode === 'navigate') {
    // Página: tenta a rede primeiro; sem internet, abre o index salvo
    event.respondWith(
      fetch(req).then(function(resposta) {
        var copia = resposta.clone();
        caches.open(CACHE).then(function(cache) { cache.put('./index.html', copia); });
        return resposta;
      }).catch(function() {
        return caches.match('./index.html').then(function(cacheada) {
          return cacheada || Response.error();
        });
      })
    );
    return;
  }

  // Arquivos: tenta a rede primeiro para sempre pegar a versão mais recente
  // (importante quando a configuração da nuvem for preenchida depois da
  // publicação). Sem internet, usa o que estiver salvo no cache.
  event.respondWith(
    fetch(req).then(function(resposta) {
      if (resposta && resposta.status === 200) {
        var copia = resposta.clone();
        caches.open(CACHE).then(function(cache) { cache.put(req, copia); });
      }
      return resposta;
    }).catch(function() {
      return caches.match(req);
    })
  );
});
