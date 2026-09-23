// ============================================
// Кабинет клиента
// ============================================

console.log('[client.js] loaded');

window.CURRENT_USER = window.CURRENT_USER || 'client';

// ============================================
// Проверка авторизации и роли
// ============================================

function checkClientAccess() {
    var raw = localStorage.getItem('psyhelp_user');

    if (!raw) {
        console.log('[client.js] не авторизован → login.html');
        window.location.href = 'login.html';
        return false;
    }

    var user;
    try {
        user = JSON.parse(raw);
    } catch (e) {
        window.location.href = 'login.html';
        return false;
    }

    var roles = Array.isArray(user.roles) ? user.roles : [];

    // Старый аккаунт без ролей — считаем клиентом
    if (roles.length === 0) {
        user.roles = ['client'];
        user.activeRole = 'client';
        localStorage.setItem('psyhelp_user', JSON.stringify(user));
        roles = ['client'];
    }

    if (roles.indexOf('client') === -1) {
        console.log('[client.js] нет роли клиента → dashboard.html');
        window.location.href = 'dashboard.html?section=calendar';
        return false;
    }

    return true;
}

// ============================================
// Разделы
// ============================================

const clientSections = {
    catalog:  { title: 'Найти психолога', isCatalog: true },
    sessions: { title: 'Мои сессии', isSessions: true },
    messages: { title: 'Сообщения', isMessages: true },
    planner:  { title: 'Планировщик', isPlanner: true },
    profile:  { title: 'Профиль', isProfile: true }
};

function getClientSectionFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || 'catalog';
}

function renderClientSection() {
    if (!document.getElementById('pageTitle')) return;

    const sectionKey = getClientSectionFromURL();
    const section = clientSections[sectionKey];

    if (!section) {
        window.location.href = 'client.html?section=catalog';
        return;
    }

    document.getElementById('pageTitle').textContent = section.title;
    document.title = section.title + ' | PsyHelp';

    document.querySelectorAll('.nav-item').forEach(function (item) {
        item.classList.remove('active');
        if (item.href.indexOf('section=' + sectionKey) !== -1) {
            item.classList.add('active');
        }
    });

    const ids = ['catalogSection', 'sessionsSection', 'messagesSection',
                 'plannerSection', 'profileSection'];

    const elements = {};
    ids.forEach(function (id) {
        elements[id] = document.getElementById(id);
        if (elements[id]) elements[id].style.display = 'none';
    });

    if (section.isCatalog) {
        elements.catalogSection.style.display = 'block';
        renderCatalog();
    } else if (section.isSessions) {
        elements.sessionsSection.style.display = 'block';
        if (typeof renderSessions === 'function') renderSessions();
    } else if (section.isMessages) {
        elements.messagesSection.style.display = 'block';
        if (typeof renderMessenger === 'function') renderMessenger();
    } else if (section.isPlanner) {
        elements.plannerSection.style.display = 'block';
        if (typeof renderCalendar === 'function') {
            renderCalendar();
            if (typeof scrollToCurrentHour === 'function') scrollToCurrentHour();
        }
    } else if (section.isProfile) {
        elements.profileSection.style.display = 'block';
        if (typeof renderClientProfile === 'function') renderClientProfile();
    }
}

// ============================================
// КАТАЛОГ ПСИХОЛОГОВ
// ============================================

const PSY_REGISTRY_KEY = 'psyhelp_psychologists_registry';

function getPsychologists() {
    const data = localStorage.getItem(PSY_REGISTRY_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { console.error(e); }
    }

    const demo = [
        {
            id: 'psy-1',
            firstName: 'Анна',
            middleName: 'Сергеевна',
            specialty: 'Тревога, отношения, самооценка',
            description: 'Помогаю справляться с тревогой, строить здоровые отношения и повышать самооценку.',
            experience: 8,
            price: 3000,
            rating: 4.8,
            reviewsCount: 42,
            isVerified: true,
            photoUrl: ''
        },
        {
            id: 'psy-2',
            firstName: 'Иван',
            middleName: 'Сергеевич',
            specialty: 'Семейная терапия',
            description: 'Работаю с парами и семьями. Помогаю наладить коммуникацию и вернуть доверие.',
            experience: 12,
            price: 4500,
            rating: 4.9,
            reviewsCount: 87,
            isVerified: true,
            photoUrl: ''
        },
        {
            id: 'psy-3',
            firstName: 'Мария',
            middleName: 'Петровна',
            specialty: 'Детская психология',
            description: 'Работаю с детьми и подростками. Помогаю справляться с тревогой, адаптацией, поведением.',
            experience: 6,
            price: 2500,
            rating: 4.7,
            reviewsCount: 31,
            isVerified: true,
            photoUrl: ''
        },
        {
            id: 'psy-4',
            firstName: 'Ольга',
            middleName: 'Викторовна',
            specialty: 'Депрессия, самооценка',
            description: 'КПТ-подход. Работаю с депрессивными состояниями, выгоранием, потерей смысла.',
            experience: 15,
            price: 5000,
            rating: 5.0,
            reviewsCount: 124,
            isVerified: true,
            photoUrl: ''
        },
        {
            id: 'psy-5',
            firstName: 'Дмитрий',
            middleName: 'Андреевич',
            specialty: 'Отношения, тревога',
            description: 'Гештальт-подход. Помогаю разобраться в себе и построить гармоничные отношения.',
            experience: 4,
            price: 2000,
            rating: 4.5,
            reviewsCount: 18,
            isVerified: true,
            photoUrl: ''
        }
    ];
    savePsychologists(demo);
    return demo;
}

function savePsychologists(list) {
    localStorage.setItem(PSY_REGISTRY_KEY, JSON.stringify(list));
}

let catalogSearchQuery = '';
let catalogSpecialty = '';
let catalogMaxPrice = 0;

function renderCatalog() {
    const listEl = document.getElementById('catalogList');
    const countEl = document.getElementById('catalogCount');
    if (!listEl) return;

    const all = getPsychologists();

    const filtered = all.filter(function (p) {
        if (catalogSearchQuery) {
            const q = catalogSearchQuery.toLowerCase();
            const hay = (p.firstName + ' ' + p.middleName + ' ' + p.specialty).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        if (catalogSpecialty && p.specialty.indexOf(catalogSpecialty) === -1) return false;
        if (catalogMaxPrice && p.price > catalogMaxPrice) return false;
        return true;
    });

    if (countEl) countEl.textContent = 'Найдено: ' + filtered.length;

    if (filtered.length === 0) {
        listEl.innerHTML =
            '<div class="catalog-empty">' +
                '<div class="catalog-empty-icon">🔍</div>' +
                '<p>Ничего не найдено. Попробуйте изменить фильтры.</p>' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (psy) {
        const card = document.createElement('div');
        card.className = 'psy-card';

        const initials = getInitials(psy.firstName + ' ' + psy.middleName);
        const fullName = psy.firstName + ' ' + psy.middleName;
        const stars = '★'.repeat(Math.round(psy.rating)) + '☆'.repeat(5 - Math.round(psy.rating));

        card.innerHTML =
            '<div class="psy-card-avatar">' + initials + '</div>' +
            '<div class="psy-card-body">' +
                '<div class="psy-card-header">' +
                    '<h3 class="psy-card-name">' + escapeHtml(fullName) + '</h3>' +
                    (psy.isVerified ? '<span class="psy-card-badge">✓ Проверен</span>' : '') +
                '</div>' +
                '<div class="psy-card-specialty">' + escapeHtml(psy.specialty) + '</div>' +
                '<div class="psy-card-description">' + escapeHtml(psy.description) + '</div>' +
                '<div class="psy-card-meta">' +
                    '<span class="psy-card-stat">Стаж: <strong>' + psy.experience + ' лет</strong></span>' +
                    '<span class="psy-card-stat">Сессия: <strong>' + psy.price.toLocaleString('ru-RU') + ' ₽</strong></span>' +
                '</div>' +
                '<div class="psy-card-rating">' +
                    '<span class="psy-card-stars">' + stars + '</span>' +
                    '<span class="psy-card-reviews">' + psy.rating + ' · ' + psy.reviewsCount + ' отзывов</span>' +
                '</div>' +
                '<button class="psy-card-btn">Записаться</button>' +
            '</div>';

        card.querySelector('.psy-card-btn').addEventListener('click', function () {
            window.location.href = 'psychologist.html?id=' + psy.id;
        });

        listEl.appendChild(card);
    });
}

function getInitials(name) {
    if (!name) return '?';
    if (typeof name !== 'string') name = String(name);
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Проверка доступа
    if (!checkClientAccess()) return;

    renderClientSection();

    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            catalogSearchQuery = e.target.value.trim();
            renderCatalog();
        });
    }

    const specFilter = document.getElementById('filterSpecialty');
    if (specFilter) {
        specFilter.addEventListener('change', function (e) {
            catalogSpecialty = e.target.value;
            renderCatalog();
        });
    }

    const priceFilter = document.getElementById('filterPrice');
    if (priceFilter) {
        priceFilter.addEventListener('change', function (e) {
            catalogMaxPrice = parseInt(e.target.value) || 0;
            renderCatalog();
        });
    }
});