const CACHE_NAME = 'bike-itau-cache-v1'; // Nome do cache atualizado

// URLs que serão cacheadas no momento da instalação
const urlsToCache = [
    '/',
    '/index.html', // Caching do HTML principal
    '/app.js',     // Caching do script principal
    '/style.css',  // Caching dos estilos
    '/manifest.json', // Caching do Manifest
    'https://cdn.tailwindcss.com', // Caching da biblioteca Tailwind
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' // Caching da fonte
];

// Evento de Instalação: Ocorre quando o Service Worker é instalado pela primeira vez
self.addEventListener('install', event => {
    // Força o novo Service Worker a assumir o controle imediatamente
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cache aberto e populado com recursos estáticos.');
                // Adiciona todos os recursos estáticos ao cache
                return cache.addAll(urlsToCache).catch(err => console.error('Cache error:', err));
            })
    );
});

// Evento de Ativação: Ocorre quando o Service Worker é ativado
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Remove caches antigos que não estão na lista branca
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Evento de Fetch: Intercepta todas as requisições de rede
self.addEventListener('fetch', event => {
    // Estratégia Cache-Only para API (para não cachear a API de dados dinâmicos de estações)
    // O CityBikes API (citybik.es) será usado para buscar as estações
    if (event.request.url.startsWith('https://api.citybik.es/')) {
        // Deixa a requisição passar para a rede para obter dados frescos
        event.respondWith(fetch(event.request));
        return;
    }

    // Estratégia Cache-First para recursos estáticos
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se encontrar no cache, retorna a versão cacheadada
                if (response) {
                    return response;
                }
                // Se não estiver no cache, faz a busca na rede
                return fetch(event.request).catch(error => {
                    console.error('Service Worker: Falha na busca de recurso estático:', error);
                    // Aqui você poderia retornar um fallback (e.g., página offline)
                });
            })
    );
});
