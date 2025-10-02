document.addEventListener('DOMContentLoaded', () => {
    const statusMessage = document.getElementById('status-message');
    const findButton = document.getElementById('find-button');
    const resultsList = document.getElementById('results-list');
    const coordsDisplay = document.getElementById('coords-display');
    
    // Configuração de Teste: Mude para 'false' para usar a geolocalização real do seu dispositivo.
    const TESTING_MODE = false; 
    const TEST_LAT = -23.5613; // Exemplo: Avenida Paulista, São Paulo (usado apenas se TESTING_MODE for true)
    const TEST_LON = -46.6561; // Exemplo: Avenida Paulista, São Paulo (usado apenas se TESTING_MODE for true)

    // API CityBikes, usando o endpoint específico para São Paulo (Bike Sampa/Itaú).
    const BIKE_API_URL = 'https://api.citybik.es/v2/networks/bikesampa'; 
    const MAX_DISTANCE_KM = 5; // Limite de estações a 5km

    // --- FUNÇÕES AUXILIARES DE UI E CÁLCULO ---

    /**
     * Calcula a distância entre dois pontos de coordenadas (Haversine).
     * @param {number} lat1 Latitude do ponto 1.
     * @param {number} lon1 Longitude do ponto 1.
     * @param {number} lat2 Latitude do ponto 2.
     * @param {number} lon2 Longitude do ponto 2.
     * @returns {number} Distância em quilômetros.
     */
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distância em km
    };

    /**
     * Atualiza a mensagem de status na tela e no console.
     * @param {string} message A mensagem a ser exibida.
     * @param {boolean} isError Indica se é uma mensagem de erro.
     */
    const updateStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        if (isError) {
            statusMessage.classList.remove('bg-orange-100', 'text-orange-700');
            statusMessage.classList.add('bg-red-100', 'text-red-700');
            console.error('ERRO:', message);
        } else {
            statusMessage.classList.remove('bg-red-100', 'text-red-700');
            statusMessage.classList.add('bg-orange-100', 'text-orange-700');
            console.log('STATUS:', message);
        }
    };

    /**
     * Habilita/Desabilita o botão e mostra/esconde o loader.
     * @param {boolean} isLoading Se o aplicativo está carregando.
     */
    const setButtonLoading = (isLoading) => {
        findButton.disabled = isLoading;
        if (isLoading) {
            findButton.innerHTML = '<div class="loader"></div> Buscando...';
            findButton.classList.add('opacity-75');
        } else {
            findButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354C12 4.354 15.55 6.05 18 8.5v5.5a4 4 0 01-4 4h-4a4 4 0 01-4-4v-5.5c2.45-2.45 6-4.146 6-4.146zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Buscar Estações Agora
            `;
            findButton.classList.remove('opacity-75');
        }
    };
    
    // --- FUNÇÃO PARA INICIALIZAR E RENDERIZAR A LISTA ---
    
    /**
     * Renderiza a lista de estações.
     * @param {Array<Object>} stations A lista de estações.
     */
    const renderStations = (stations) => {
        resultsList.innerHTML = '';
        
        // Garante que a lista está visível.
        resultsList.classList.remove('hidden'); 

        if (stations.length === 0) {
            resultsList.innerHTML = '<p class="text-center text-gray-500 p-4">Nenhuma estação Bike Itaú encontrada no raio de 5 km.</p>';
            return;
        }

        stations.forEach(station => {
            // Cores e ícones baseados na disponibilidade
            const bikesAvailable = station.free_bikes;
            const docksAvailable = station.empty_slots;
            const statusColor = bikesAvailable > 0 && docksAvailable > 0 ? 'border-green-500' : 
                                bikesAvailable > 0 ? 'border-orange-500' : 
                                docksAvailable > 0 ? 'border-blue-500' : 'border-red-500';

            const bikeIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600 mr-1 inline" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 011 1v1h3a1 1 0 110 2H9.868l-2.6-3.794a1 1 0 111.664-1.156L10.5 4H8v1h3v2H8a1 1 0 01-1-1V4a1 1 0 011-1z" /><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 00-2 0v5.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V5z" clip-rule="evenodd" /></svg>`;
            const dockIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`;
            
            const card = `
                <div class="station-card bg-gray-50 p-4 rounded-xl shadow-md border-l-4 ${statusColor}">
                    <h2 class="text-xl font-bold text-orange-800">${station.name}</h2>
                    <p class="text-sm text-gray-700 mt-1">Distância: <span class="font-semibold">${station.distance.toFixed(2)} km</span></p>
                    <div class="mt-2 flex space-x-4">
                        <p class="text-sm text-gray-800 flex items-center">
                            ${bikeIcon} Bicicletas disponíveis: <span class="font-bold ml-1 ${bikesAvailable > 0 ? 'text-green-600' : 'text-red-600'}">${bikesAvailable}</span>
                        </p>
                        <p class="text-sm text-gray-800 flex items-center">
                            ${dockIcon} Vagas livres: <span class="font-bold ml-1 ${docksAvailable > 0 ? 'text-blue-600' : 'text-red-600'}">${docksAvailable}</span>
                        </p>
                    </div>
                </div>
            `;
            resultsList.innerHTML += card;
        });
    };

    // --- FUNÇÃO DE BUSCA DE ESTAÇÕES (API) ---

    /**
     * Busca estações usando a API, filtrando por coordenadas.
     * @param {number} userLat Latitude do usuário.
     * @param {number} userLon Longitude do usuário.
     */
    const fetchStations = async (userLat, userLon) => {
        updateStatus('2. Coordenadas obtidas! Buscando a rede de estações Bike Itaú...');
        coordsDisplay.textContent = `Coordenadas: Lat ${userLat.toFixed(4)}, Lon ${userLon.toFixed(4)}`;

        try {
            const response = await fetch(BIKE_API_URL);
            if (!response.ok) {
                throw new Error(`Erro na API (${BIKE_API_URL}): ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            const allStations = data.network.stations || [];

            // 1. Calcular distância e filtrar por proximidade
            let nearbyStations = allStations.map(station => {
                const distance = calculateDistance(userLat, userLon, station.latitude, station.longitude);
                return { ...station, distance: distance };
            }).filter(station => station.distance <= MAX_DISTANCE_KM);

            // 2. Ordenar por distância
            nearbyStations.sort((a, b) => a.distance - b.distance);
            
            renderStations(nearbyStations);
            
            updateStatus(`3. Sucesso! Encontradas ${nearbyStations.length} estações no raio de ${MAX_DISTANCE_KM} km.`);
        } catch (error) {
            updateStatus(`Erro ao buscar estações: ${error.message}. Verifique a conexão ou se o ID da rede está correto.`, true);
            resultsList.innerHTML = '';
        }
        setButtonLoading(false);
    };

    // --- FUNÇÃO DE GEOLOCALIZAÇÃO (HARDWARE/TESTE) ---

    /**
     * Pede a geolocalização do usuário (ou usa coordenadas de teste).
     */
    const getGeolocation = () => {
        setButtonLoading(true);
        resultsList.innerHTML = '';
        coordsDisplay.textContent = '';
        
        if (TESTING_MODE) {
            // Este bloco agora é pulado
            updateStatus('1. Modo de teste ativo! Usando coordenadas de São Paulo (Av. Paulista)...');
            fetchStations(TEST_LAT, TEST_LON);
            return;
        }

        updateStatus('1. Solicitando sua geolocalização real...');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Sucesso na obtenção da localização
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    fetchStations(lat, lon);
                },
                (error) => {
                    // Erro na geolocalização
                    setButtonLoading(false);
                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Permissão negada. Por favor, permita o acesso à localização.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Localização indisponível. Tente novamente mais tarde.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Tempo esgotado ao tentar obter a localização.";
                            break;
                        default:
                            errorMessage = "Erro desconhecido ao obter a localização.";
                    }
                    updateStatus(`Erro na geolocalização: ${errorMessage}`, true);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setButtonLoading(false);
            updateStatus("Geolocalização não é suportada por este navegador/dispositivo.", true);
        }
    };

    // --- REGISTRO DO SERVICE WORKER (PWA) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Registra o Service Worker no arquivo separado service-worker.js
            navigator.serviceWorker.register('service-worker.js', { scope: './' })
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration.scope);
                    updateStatus('PWA pronto! Service Worker ativo. Clique para buscar.', false);
                })
                .catch(err => {
                    console.error('Falha no registro do Service Worker:', err);
                    updateStatus('Atenção: Falha ao carregar o modo offline (PWA).', true);
                });
        });
    } else {
        updateStatus('Atenção: Seu navegador não suporta Service Workers.', false);
    }

    // --- LISTENERS ---
    findButton.addEventListener('click', getGeolocation);
});
