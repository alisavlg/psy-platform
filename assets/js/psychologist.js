// ============================================
// ПРОФИЛЬ ПСИХОЛОГА + БРОНИРОВАНИЕ
// ============================================

console.log('[psychologist.js] loaded');

window.CURRENT_USER = window.CURRENT_USER || 'client';

const PSY_REGISTRY_KEY = 'psyhelp_psychologists_registry';
const SLOTS_KEY_PREFIX = 'psyhelp_slots_';
const SESSIONS_CLIENT_KEY = 'psyhelp_sessions_client';
const SESSIONS_PSY_KEY = 'psyhelp_sessions_psychologist';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

let currentPsy = null;
let currentSlot = null;
let currentFilterDays = 7;

// ============================================
// Получение данных
// ============================================

function getPsychologists() {
    const data = localStorage.getItem(PSY_REGISTRY_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
}

function getPsychologistById(id) {
    return getPsychologists().find(function (p) { return p.id === id; });
}

function getSlotsFor(psyId) {
    const key = SLOTS_KEY_PREFIX + psyId;
    const data = localStorage.getItem(key);
    if (!data) return {};
    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
}

function saveSlotsFor(psyId, slots) {
    localStorage.setItem(SLOTS_KEY_PREFIX + psyId, JSON.stringify(slots));
}

function getUserId() {
    const user = localStorage.getItem('psyhelp_user');
    if (user) {
        try {
            const u = JSON.parse(user);
            if (u.id) return u.id;
        } catch (e) {}
    }
    return 'demo-client';
}

function getUserCode() {
    const user = localStorage.getItem('psyhelp_user');
    if (user) {
        try {
            const u = JSON.parse(user);
            if (u.code) return u.code;
        } catch (e) {}
    }
    return 'CL-0000';
}

// ============================================
// Отрисовка профиля
// ============================================

function renderProfile() {
    const container = document.getElementById('psychologistProfile');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const psyId = params.get('id') || 'psy-1';

    currentPsy = getPsychologistById(psyId);

    if (!currentPsy) {
        container.innerHTML = '<div class="placeholder"><p>Психолог не найден</p></div>';
        return;
    }

    document.title = currentPsy.firstName + ' ' + currentPsy.middleName + ' | PsyHelp';

    const initials = getInitials(currentPsy.firstName + ' ' + currentPsy.middleName);
    const fullName = currentPsy.firstName + ' ' + currentPsy.middleName;
    const stars = '★'.repeat(Math.round(currentPsy.rating)) + '☆'.repeat(5 - Math.round(currentPsy.rating));

    container.innerHTML =
        '<div class="psy-profile-card">' +
            '<div class="psy-profile-avatar">' + initials + '</div>' +
            '<div class="psy-profile-info">' +
                '<h1 class="psy-profile-name">' + escapeHtml(fullName) + '</h1>' +
                (currentPsy.isVerified ? '<span class="psy-profile-badge">✓ Проверен</span>' : '') +
                '<div class="psy-profile-specialty">' + escapeHtml(currentPsy.specialty) + '</div>' +
                '<div class="psy-profile-meta">' +
                    '<div class="psy-profile-stat">Стаж: <strong>' + currentPsy.experience + ' лет</strong></div>' +
                    '<div class="psy-profile-stat">Сессия: <strong>' + currentPsy.price.toLocaleString('ru-RU') + ' ₽</strong></div>' +
                '</div>' +
                '<div class="psy-profile-rating">' +
                    '<span class="psy-profile-stars">' + stars + '</span>' +
                    '<span class="psy-profile-reviews">' + currentPsy.rating + ' · ' + currentPsy.reviewsCount + ' отзывов</span>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div class="psy-profile-section">' +
            '<h3>О специалисте</h3>' +
            '<p class="psy-profile-description">' + escapeHtml(currentPsy.description) + '</p>' +
        '</div>' +

        '<div class="psy-profile-section">' +
            '<h3>Свободные слоты</h3>' +
            '<div class="psy-slots-toolbar">' +
                '<div class="psy-slots-filters">' +
                    '<button class="psy-slot-filter active" data-days="7">Неделя</button>' +
                    '<button class="psy-slot-filter" data-days="14">2 недели</button>' +
                    '<button class="psy-slot-filter" data-days="30">Месяц</button>' +
                '</div>' +
            '</div>' +
            '<div class="psy-slots-grid" id="psySlotsGrid"></div>' +
        '</div>';

    // Обработчики фильтров
    container.querySelectorAll('.psy-slot-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentFilterDays = parseInt(btn.dataset.days);
            container.querySelectorAll('.psy-slot-filter').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            renderSlots();
        });
    });

    renderSlots();
}

function renderSlots() {
    const grid = document.getElementById('psySlotsGrid');
    if (!grid || !currentPsy) return;

    const slots = getSlotsFor(currentPsy.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Находим ближайшие даты для каждого дня недели в рамках фильтра
    const available = [];

    for (let i = 0; i < currentFilterDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const jsDay = date.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;

        // Проверяем все часы этого дня
        for (let h = 8; h < 22; h++) {
            const key = isoDay + '-' + h;
            if (slots[key]) {
                available.push({
                    date: date,
                    hour: h,
                    isoDay: isoDay
                });
            }
        }
    }

    if (available.length === 0) {
        grid.innerHTML = '<div class="psy-slots-empty">Свободных слотов нет в выбранном периоде</div>';
        return;
    }

    // Сортируем по дате и часу
    available.sort(function (a, b) {
        if (a.date.getTime() !== b.date.getTime()) {
            return a.date.getTime() - b.date.getTime();
        }
        return a.hour - b.hour;
    });

    // Показываем первые 20 слотов
    const toShow = available.slice(0, 20);

    grid.innerHTML = '';
    toShow.forEach(function (slot) {
        const btn = document.createElement('button');
        btn.className = 'psy-slot';
        btn.type = 'button';

        const dayLabel = DAYS_RU[slot.isoDay - 1] + ', ' + slot.date.getDate() + ' ' + MONTHS_RU[slot.date.getMonth()];
        const timeLabel = String(slot.hour).padStart(2, '0') + ':00';

        btn.innerHTML =
            '<span class="psy-slot-day">' + dayLabel + '</span>' +
            '<span class="psy-slot-time">' + timeLabel + '</span>';

        btn.addEventListener('click', function () {
            openBookingModal(slot);
        });

        grid.appendChild(btn);
    });
}

// ============================================
// Бронирование
// ============================================

function openBookingModal(slot) {
    currentSlot = slot;

    const overlay = document.getElementById('bookingModalOverlay');
    const summaryEl = document.getElementById('bookingSummary');
    const topicEl = document.getElementById('bookingTopic');

    if (!overlay) return;

    const fullName = currentPsy.firstName + ' ' + currentPsy.middleName;
    const dayLabel = DAYS_RU[slot.isoDay - 1] + ', ' + slot.date.getDate() + ' ' + MONTHS_RU[slot.date.getMonth()];
    const timeLabel = String(slot.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<strong>' + escapeHtml(fullName) + '</strong><br>' +
        dayLabel + ' в ' + timeLabel + '<br>' +
        'Стоимость: <strong>' + currentPsy.price.toLocaleString('ru-RU') + ' ₽</strong>';

    topicEl.value = '';
    overlay.classList.add('active');
}

function closeBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) overlay.classList.remove('active');
    currentSlot = null;
}

function confirmBooking() {
    if (!currentSlot || !currentPsy) return;

    const topic = document.getElementById('bookingTopic').value.trim() || 'Консультация';

    const clientId = getUserId();
    const clientCode = getUserCode();

    const booking = {
        id: 's-' + Date.now(),
        psychologistId: currentPsy.id,
        psychologistName: currentPsy.firstName + ' ' + currentPsy.middleName,
        clientId: clientId,
        clientCode: clientCode,
        date: formatDateKey(currentSlot.date),
        hour: currentSlot.hour,
        topic: topic,
        price: currentPsy.price,
        status: 'confirmed',
        createdAt: Date.now()
    };

    // 1. Сохраняем в сессии клиента
    const clientSessions = getClientSessions();
    clientSessions.push(booking);
    saveClientSessions(clientSessions);

    // 2. Сохраняем в сессии психолога
    const psySessions = getPsySessions();
    psySessions.push({
        id: booking.id,
        clientId: clientId,
        clientCode: clientCode,
        date: booking.date,
        hour: booking.hour,
        topic: topic,
        price: booking.price,
        status: 'confirmed',
        createdAt: booking.createdAt
    });
    savePsySessions(psySessions);

    // 3. Помечаем слот занятым (убираем из расписания)
    const slots = getSlotsFor(currentPsy.id);
    const slotKey = currentSlot.isoDay + '-' + currentSlot.hour;
    delete slots[slotKey];
    saveSlotsFor(currentPsy.id, slots);

    // 4. Добавляем событие в личный календарь клиента
    addEventForClient({
        title: 'Сессия: ' + currentPsy.firstName,
        date: booking.date,
        hour: booking.hour,
        category: 'session'
    });

    closeBookingModal();
    renderSlots();

    // 5. Уведомление
    alert('✓ Запись подтверждена!\n\n' +
          'Дата: ' + formatHumanDate(currentSlot.date) + '\n' +
          'Время: ' + String(currentSlot.hour).padStart(2, '0') + ':00\n' +
          'Стоимость: ' + currentPsy.price.toLocaleString('ru-RU') + ' ₽\n\n' +
          'Сессия добавлена в ваш планировщик.');
}

function getClientSessions() {
    const data = localStorage.getItem(SESSIONS_CLIENT_KEY);
    if (!data) return [];
    try { const p = JSON.parse(data); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}

function saveClientSessions(list) {
    localStorage.setItem(SESSIONS_CLIENT_KEY, JSON.stringify(list));
}

function getPsySessions() {
    const data = localStorage.getItem(SESSIONS_PSY_KEY);
    if (!data) return [];
    try { const p = JSON.parse(data); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}

function savePsySessions(list) {
    localStorage.setItem(SESSIONS_PSY_KEY, JSON.stringify(list));
}

// Событие в личном календаре клиента
function addEventForClient(event) {
    const key = 'psyhelp_events_client';
    const data = localStorage.getItem(key);
    let events = [];
    if (data) {
        try { const p = JSON.parse(data); events = Array.isArray(p) ? p : []; } catch (e) {}
    }
    event.id = Date.now().toString();
    events.push(event);
    localStorage.setItem(key, JSON.stringify(events));
}

// ============================================
// Утилиты
// ============================================

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function formatHumanDate(date) {
    return date.getDate() + ' ' + MONTHS_RU[date.getMonth()] + ' ' + date.getFullYear();
}

function getInitials(name) {
    if (!name) return '?';
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
    renderProfile();

    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmBooking);

    const cancelBtn = document.getElementById('cancelBookingBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeBookingModal);

    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'bookingModalOverlay') closeBookingModal();
        });
    }
});