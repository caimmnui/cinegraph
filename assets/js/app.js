/**
 * CINE GRAPH - SCRIPT FINAL (Com Empty State Melhorado)
 */
const API_BASE = 'https://api.tvmaze.com';
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

const els = {
    search: document.getElementById('movie-search'),
    grid: document.getElementById('movie-grid'),
    modal: document.getElementById('detailModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    closeModal: document.getElementById('closeModal'),
    themeToggle: document.getElementById('themeToggle'),
    langSelect: document.getElementById('langSelect'),
    loader: document.getElementById('searchLoader'),
    modalDetails: {
        img: document.getElementById('modalPosterImg'),
        title: document.getElementById('modalTitle'),
        year: document.getElementById('modalYear'),
        type: document.getElementById('modalType'),
        rating: document.getElementById('modalRating'),
        genres: document.getElementById('modalGenres'),
        desc: document.getElementById('modalDescription'),
        meta: document.getElementById('modalDetails')
    }
};

let debounceTimer;
let currentResults = [];
let currentLang = localStorage.getItem('lang') || 'pt';
let isDarkMode = localStorage.getItem('theme') !== 'light';

const i18n = {
    pt: {
        searchPlaceholder: 'Procure filmes, séries...',
        emptyState: 'Digite para começar a busca',
        noResults: 'Não encontramos nada com esse nome.',
        oops: 'Ops!',
        tryAgain: 'Tente buscar outro título.',
        error: 'Erro de conexão.',
        searchLabel: 'Buscar',
        synopsis: 'Sinopse',
        status: 'Status',
        language: 'Idioma original',
        network: 'Emissora',
        rating: 'Nota',
        noData: 'N/A',
        translating: 'Traduzindo sinopse...',
        visitSite: 'Visitar Site Oficial',
        status_Ended: 'Finalizada',
        status_Running: 'Em Exibição',
        type_Scripted: 'Série',
        type_Animation: 'Animação',
        type_Movie: 'Filme',
        genre_Action: 'Ação', genre_Adventure: 'Aventura', genre_Comedy: 'Comédia', genre_Crime: 'Crime',
        genre_Drama: 'Drama', genre_Fantasy: 'Fantasia', genre_Horror: 'Terror', genre_Mystery: 'Mistério',
        genre_Romance: 'Romance', genre_ScienceFiction: 'Ficção Científica', genre_Thriller: 'Suspense'
    },
    en: {
        searchPlaceholder: 'Search movies, shows...',
        emptyState: 'Start typing to search',
        noResults: 'We couldn\'t find anything.',
        oops: 'Oops!',
        tryAgain: 'Try searching for another title.',
        error: 'Connection error.',
        searchLabel: 'Search',
        synopsis: 'Synopsis',
        status: 'Status',
        language: 'Original Language',
        network: 'Network',
        rating: 'Rating',
        noData: 'N/A',
        translating: 'Loading synopsis...',
        visitSite: 'Visit Official Site',
        status_Ended: 'Ended', status_Running: 'Running',
        type_Scripted: 'Scripted', type_Animation: 'Animation', type_Movie: 'Movie'
    },
    es: {
        searchPlaceholder: 'Buscar películas, series...',
        emptyState: 'Escribe para buscar',
        noResults: 'No encontramos nada.',
        oops: '¡Vaya!',
        tryAgain: 'Intenta buscar otro título.',
        error: 'Error de conexión.',
        searchLabel: 'Buscar',
        synopsis: 'Sinopsis',
        status: 'Estado',
        language: 'Idioma original',
        network: 'Cadena',
        rating: 'Puntuación',
        noData: 'N/A',
        translating: 'Traduciendo sinopsis...',
        visitSite: 'Visitar Sitio Oficial',
        status_Ended: 'Finalizada', status_Running: 'En Emisión',
        type_Scripted: 'Serie', type_Animation: 'Animación', type_Movie: 'Película',
        genre_Action: 'Acción', genre_Adventure: 'Aventura', genre_Comedy: 'Comedia',
        genre_Fantasy: 'Fantasía', genre_Horror: 'Terror'
    }
};

function init() {
    if (isDarkMode) document.body.classList.remove('light-mode');
    else document.body.classList.add('light-mode');
    updateThemeIcon();
    els.langSelect.value = currentLang;
    updateLanguage();

    els.themeToggle.addEventListener('click', toggleTheme);
    els.langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('lang', currentLang);
        updateLanguage();
    });

    els.search.addEventListener('input', handleSearch);
    els.closeModal.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function t(key, fallback) {
    if (i18n[currentLang] && i18n[currentLang][key]) return i18n[currentLang][key];
    return fallback || key;
}

function translateData(prefix, value) {
    if (!value) return t('noData');
    const cleanKey = value.replace(/[^a-zA-Z0-9]/g, '');
    const dictKey = prefix + '_' + cleanKey;
    return t(dictKey, value);
}

async function fetchTranslation(text, targetLang) {
    if (!text) return '';
    if (targetLang === 'en') return text;
    try {
        const encodedText = encodeURIComponent(text);
        const pair = `en|${targetLang}`;
        const res = await fetch(`${TRANSLATE_API}?q=${encodedText}&langpair=${pair}`);
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return text;
    } catch (e) {
        console.error("Erro na tradução:", e);
        return text;
    }
}

function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    els.search.placeholder = t('searchPlaceholder');
    const modalBtn = document.querySelector('.btn-primary-modal');
    if (modalBtn) modalBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> ${t('visitSite')}`;

    // Se estiver mostrando erro, atualiza o texto do erro também
    const emptyState = document.querySelector('.empty-state.no-results');
    if (emptyState) {
        emptyState.querySelector('h3').textContent = t('oops');
        emptyState.querySelector('p').textContent = t('noResults');
        emptyState.querySelector('span').textContent = t('tryAgain');
    }

    if (currentResults.length > 0) renderMovies(currentResults);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    els.themeToggle.querySelector('i').className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

function handleSearch(e) {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length === 0) {
        currentResults = [];
        els.grid.innerHTML = `<div class="empty-state"><i class="fas fa-film"></i><p>${t('emptyState')}</p></div>`;
        els.loader.classList.remove('active');
        return;
    }
    els.loader.classList.add('active');
    debounceTimer = setTimeout(() => searchApi(query), 500);
}

async function searchApi(query) {
    try {
        const res = await fetch(`${API_BASE}/search/shows?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        currentResults = data.map(item => item.show).filter(show => show.image);
        els.loader.classList.remove('active');
        renderMovies(currentResults);
    } catch (error) {
        els.grid.innerHTML = `<div class="empty-state"><p>${t('error')}</p></div>`;
        els.loader.classList.remove('active');
    }
}

function renderMovies(shows) {
    // --- MUDANÇA AQUI: TELA DE ERRO PERSONALIZADA ---
    if (!shows || shows.length === 0) {
        els.grid.innerHTML = `
            <div class="empty-state no-results" style="animation: fadeUp 0.5s forwards;">
                <i class="fas fa-ghost"></i>
                <h3>${t('oops')}</h3>
                <p>${t('noResults')}</p>
                <span style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.5rem; display: block;">${t('tryAgain')}</span>
            </div>
        `;
        return;
    }
    // ------------------------------------------------

    els.grid.innerHTML = shows.map((show, index) => {
        const year = show.premiered ? show.premiered.split('-')[0] : t('noData');
        const rating = show.rating?.average || '-';
        const targetLink = show.officialSite || show.url;

        return `
            <div class="movie-card" onclick="openDetail(${index})" style="opacity:0; animation: fadeUp 0.5s forwards ${index * 0.05}s">
                <div class="card-image-wrapper">
                    <img src="${show.image.medium}" loading="lazy" alt="${show.name}">
                    <div class="floating-rating">
                        <i class="fas fa-star"></i> ${rating}
                    </div>
                    <div class="card-overlay">
                        <div class="card-actions">
                             <button class="card-action-btn view-btn"><i class="fas fa-info"></i></button>
                            ${targetLink ? `<button class="card-action-btn link-btn"><i class="fas fa-external-link-alt"></i></button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="movie-info-content">
                    <h3>${show.name}</h3>
                    <div class="movie-meta-tags">
                        <span class="meta-year">${year}</span>
                        <span class="meta-type">${translateData('type', show.type)}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.openDetail = (index) => {
    const show = currentResults[index];
    if (!show) return;

    const imageUrl = show.image?.original || show.image?.medium;
    if (els.modalBackdrop) els.modalBackdrop.style.backgroundImage = `url('${imageUrl}')`;

    els.modalDetails.img.src = imageUrl;
    els.modalDetails.title.textContent = show.name;
    els.modalDetails.year.innerHTML = `<i class="far fa-calendar"></i> ${show.premiered ? show.premiered.split('-')[0] : 'N/A'}`;
    els.modalDetails.rating.innerHTML = `<i class="fas fa-star"></i> ${show.rating?.average || '-'}`;
    els.modalDetails.type.innerHTML = `<i class="fas fa-tv"></i> ${translateData('type', show.type)}`;

    els.modalDetails.genres.innerHTML = show.genres.map(g => `<span class="genre-tag">${translateData('genre', g)}</span>`).join('');

    const existingBtn = document.querySelector('.modal-actions');
    if (existingBtn) existingBtn.remove();

    const targetLink = show.officialSite || show.url;
    let buttonHTML = '';

    if (targetLink) {
        buttonHTML = `
            <div class="modal-actions">
                <a href="${targetLink}" target="_blank" class="btn-primary-modal">
                    <i class="fas fa-external-link-alt"></i> ${t('visitSite')}
                </a>
            </div>
        `;
    }

    els.modalDetails.meta.innerHTML = `
        <div class="detail-item"><span class="label">${t('status')}</span><span>${translateData('status', show.status)}</span></div>
        <div class="detail-item"><span class="label">${t('network')}</span><span>${show.network?.name || show.webChannel?.name || 'N/A'}</span></div>
        <div class="detail-item"><span class="label">${t('language')}</span><span>${show.language}</span></div>
    `;

    const synopsisBox = document.querySelector('.synopsis-box');
    if (synopsisBox) {
        const oldBtn = synopsisBox.nextElementSibling;
        if (oldBtn && oldBtn.classList.contains('modal-actions')) oldBtn.remove();
        synopsisBox.insertAdjacentHTML('afterend', buttonHTML);
    }

    els.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const originalDesc = show.summary ? show.summary.replace(/<\/?[^>]+(>|$)/g, "") : '';
    if (originalDesc && currentLang !== 'en') {
        els.modalDetails.desc.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${t('translating')}`;
        fetchTranslation(originalDesc, currentLang).then(translated => {
            els.modalDetails.desc.textContent = translated;
        });
    } else {
        els.modalDetails.desc.textContent = originalDesc || t('noData');
    }
};

function closeModal() {
    els.modal.classList.remove('active');
    document.body.style.overflow = '';
}

const style = document.createElement('style');
style.innerHTML = `@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(style);

init();