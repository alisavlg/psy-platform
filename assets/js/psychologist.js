// ============================================
// ПРОФИЛЬ ПСИХОЛОГА + БРОНИРОВАНИЕ
// ============================================

console.log('[psychologist.js] loaded');

window.CURRENT_USER = window.CURRENT_USER || 'client';

const PSY_REGISTRY_KEY = 'psyhelp_psychologists_registry';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

let currentPsy = null;
let currentSlot = null;
let currentFilterDays = 7;

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || 'demo-client';
    } catch (e) { return 'demo-client'; }
}

function getPsychologistUserId(psy) {
    if (psy && psy.userId) return psy.userId;
    const uid = getCurrentUserId();
    if (psy && psy.id === uid) return uid;
    return (psy && psy.id) || 'psy-1';
}

function getSessionsKeyFor(userId) { return 'psyhelp_sessions_' + userId; }
function getEventsKeyFor(userId) { return 'psyhelp_events_' + userId; }

function getUserCode() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        if (u.code) return u.code;
    } catch (e) {}
    return 'CL-0000';
}

function getPrefilledClientName() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        const f = (u.displayFirstName || u.realFirstName || '').trim();
        const m = (u.displayMiddleName || u.realMiddleName || '').trim();
        if (f && m) return capitalizeWords(f + ' ' + m);
        if (f) return capitalizeWords(f);
    } catch (e) {}
    return '';
}

function getShortName(firstName, middleName) {
    const f = (firstName || '').charAt(0).toUpperCase();
    const m = (middleName || '').charAt(0).toUpperCase();
    if (!f) return 'Клиент';
    return m ? f + '.' + m + '.' : f + '.';
}

function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
}

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

function getSlotsFor(psy) {
    const psyUserId = getPsychologistUserId(psy);
    const key = getEventsKeyFor(psyUserId);
    const data = localStorage.getItem(key);

    let events = [];
    if (data) {
        try {
            const parsed = JSON.parse(data);
            events = Array.isArray(parsed) ? parsed : [];
        } catch (e) {}
    }
    if (!Array.isArray(events)) events = [];

    const busy = {};
    events.forEach(function (e) {
        if (e.category === 'session') busy[e.date + '-' + e.hour] = true;
    });

    const freeKeys = {};
    events.forEach(function (e) {
        if (e.category !== 'free') return;
        const k = e.date + '-' + e.hour;
        if (busy[k]) return;
        freeKeys[k] = true;
    });
    return freeKeys;
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

                '<div class="psy-profile-actions">' +
                    '<button type="button" class="psy-action-btn psy-action-write" id="writeToPsyBtn">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
                        '</svg>' +
                        'Написать' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div class="psy-profile-section">' +
            '<h3>О специалисте</h3>' +
            '<p class="psy-profile-description">' + escapeHtml(currentPsy.description) + '</p>' +
        '</div>' +

        '<div class="psy-profile-section psy-how-to">' +
            '<h3>Как записаться на сессию</h3>' +
            '<ol class="how-to-steps">' +
                '<li>' +
                    '<strong>Напишите психологу</strong> и обсудите запрос — ' +
                    'расскажите, с чем хотите работать, узнайте, работает ли специалист с этим, ' +
                    'обсудите формат и подход. Это поможет понять, комфортно ли вам.' +
                '</li>' +
                '<li>' +
                    '<strong>Если вам комфортно</strong> и психолог готов — ' +
                    'выберите свободный слот ниже.' +
                '</li>' +
                '<li>' +
                    '<strong>Забронируйте и оплатите</strong> — сессия закреплена. ' +
                    'Оплата резервирует время за вами.' +
                '</li>' +
            '</ol>' +
        '</div>' +

        '<div class="psy-profile-section" id="slotsSection">' +
            '<h3>Свободные слоты</h3>' +
            '<div class="slots-toolbar">' +
                '<div class="slots-filters">' +
                    '<button class="slot-filter active" data-days="7">Неделя</button>' +
                    '<button class="slot-filter" data-days="14">2 недели</button>' +
                    '<button class="slot-filter" data-days="30">Месяц</button>' +
                '</div>' +
            '</div>' +
            '<div class="slots-container" id="psySlotsGrid"></div>' +
        '</div>';

    container.querySelectorAll('.slot-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentFilterDays = parseInt(btn.dataset.days);
            container.querySelectorAll('.slot-filter').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            renderSlots();
        });
    });

    const writeBtn = document.getElementById('writeToPsyBtn');
    if (writeBtn) {
        writeBtn.addEventListener('click', function () {
            if (!currentPsy) return;
            const chatId = 'chat-' + getCurrentUserId() + '-' + currentPsy.id;
            window.location.href = 'client.html?section=messages&chat=' + encodeURIComponent(chatId);
        });
    }

    renderSlots();
}

// ============================================
// Отрисовка слотов
// ============================================

function renderSlots() {
    const grid = document.getElementById('psySlotsGrid');
    if (!grid || !currentPsy) return;

    const slots = getSlotsFor(currentPsy);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = {};
    const dateOrder = [];

    for (let i = 0; i < currentFilterDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = formatDateKey(date);
        const isoDay = date.getDay() === 0 ? 7 : date.getDay();

        for (let h = 8; h < 22; h++) {
            if (slots[dateKey + '-' + h]) {
                if (!groups[dateKey]) {
                    groups[dateKey] = { date: date, isoDay: isoDay, hours: [] };
                    dateOrder.push(dateKey);
                }
                groups[dateKey].hours.push(h);
            }
        }
    }

    if (dateOrder.length === 0) {
        grid.innerHTML = '<div class="slots-empty">Свободных слотов нет в выбранном периоде</div>';
        return;
    }

    let total = 0;
    const limitedKeys = [];
    for (let k = 0; k < dateOrder.length && total < 40; k++) {
        const key = dateOrder[k];
        const g = groups[key];
        g.hours.sort(function (a, b) { return a - b; });
        const take = Math.min(g.hours.length, 40 - total);
        g.hours = g.hours.slice(0, take);
        total += g.hours.length;
        limitedKeys.push(key);
    }

    let html = '';
    limitedKeys.forEach(function (dateKey) {
        const g = groups[dateKey];
        const dayLabel = DAYS_RU[g.isoDay - 1] + ', ' + g.date.getDate() + ' ' + MONTHS_RU[g.date.getMonth()];

        html += '<div class="slots-line">';
        g.hours.forEach(function (h) {
            html += '<button type="button" class="slot-card" ' +
                'data-date="' + dateKey + '" ' +
                'data-hour="' + h + '">' +
                '<span class="slot-card-day">' + escapeHtml(dayLabel) + '</span>' +
                '<span class="slot-card-time">' + String(h).padStart(2, '0') + ':00</span>' +
            '</button>';
        });
        html += '</div>';
    });

    grid.innerHTML = html;

    grid.querySelectorAll('.slot-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const dateStr = btn.dataset.date;
            const hour = parseInt(btn.dataset.hour);
            const parts = dateStr.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const isoDay = date.getDay() === 0 ? 7 : date.getDay();
            openBookingModal({ date: date, hour: hour, isoDay: isoDay });
        });
    });
}

// ============================================
// Модалка бронирования
// ============================================

function openBookingModal(slot) {
    currentSlot = slot;

    const overlay = document.getElementById('bookingModalOverlay');
    const summaryEl = document.getElementById('bookingSummary');
    const topicEl = document.getElementById('bookingTopic');
    const nameEl = document.getElementById('bookingClientName');
    const errEl = document.getElementById('bookingClientNameError');
    const agreeEl = document.getElementById('agreeCancelRules');
    const agreeErrEl = document.getElementById('agreeCancelRulesError');

    if (!overlay) return;

    const fullName = currentPsy.firstName + ' ' + currentPsy.middleName;
    const dayLabel = DAYS_RU[slot.isoDay - 1] + ', ' + slot.date.getDate() + ' ' + MONTHS_RU[slot.date.getMonth()];
    const timeLabel = String(slot.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<strong>' + escapeHtml(fullName) + '</strong><br>' +
        dayLabel + ' в ' + timeLabel + '<br>' +
        'Стоимость: <strong>' + currentPsy.price.toLocaleString('ru-RU') + ' ₽</strong>';

    topicEl.value = '';
    if (nameEl) nameEl.value = getPrefilledClientName();
    if (errEl) errEl.textContent = '';
    if (agreeEl) agreeEl.checked = false;
    if (agreeErrEl) agreeErrEl.textContent = '';

    overlay.classList.add('active');
}

function closeBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function confirmBooking() {
    if (!currentSlot || !currentPsy) return;

    const clientUserId = getCurrentUserId();
    const psyUserId = getPsychologistUserId(currentPsy);

    if (clientUserId === psyUserId) {
        alert('Нельзя записаться к самому себе.\n\nВыберите другого психолога в каталоге.');
        closeBookingModal();
        return;
    }

    const agreeEl = document.getElementById('agreeCancelRules');
    const agreeErrEl = document.getElementById('agreeCancelRulesError');
    if (!agreeEl || !agreeEl.checked) {
        if (agreeErrEl) agreeErrEl.textContent = 'Подтвердите согласие с правилами отмены';
        return;
    } else if (agreeErrEl) {
        agreeErrEl.textContent = '';
    }

    const bookedDate = new Date(currentSlot.date);
    const bookedHour = currentSlot.hour;
    const bookedDateStr = formatDateKey(bookedDate);

    const psyEventsKey = getEventsKeyFor(psyUserId);
    let psyEvents = [];
    try {
        const d = localStorage.getItem(psyEventsKey);
        psyEvents = d ? JSON.parse(d) : [];
        if (!Array.isArray(psyEvents)) psyEvents = [];
    } catch (e) { psyEvents = []; }

    const slotTaken = psyEvents.some(function (e) {
        return e.category === 'session'
            && e.date === bookedDateStr
            && e.hour === bookedHour;
    });

    if (slotTaken) {
        alert('Этот слот уже занят. Выберите другой.');
        closeBookingModal();
        renderSlots();
        return;
    }

    const nameEl = document.getElementById('bookingClientName');
    const clientFullName = nameEl ? capitalizeWords(nameEl.value.trim()) : '';
    const errEl = document.getElementById('bookingClientNameError');

    if (!clientFullName) {
        if (errEl) errEl.textContent = 'Введите имя и отчество';
        return;
    } else if (errEl) {
        errEl.textContent = '';
    }

    const topic = document.getElementById('bookingTopic').value.trim() || 'Консультация';
    const clientCode = getUserCode();

    const nameParts = clientFullName.split(' ');
    const shortClientName = getShortName(nameParts[0] || '', nameParts[1] || '');
    const shortPsyName = getShortName(currentPsy.firstName, currentPsy.middleName);

    const bookingId = 's-' + Date.now();

    const booking = {
        id: bookingId,
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        psychologistName: currentPsy.firstName + ' ' + currentPsy.middleName,
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        date: bookedDateStr,
        hour: bookedHour,
        topic: topic,
        price: currentPsy.price,
        status: 'confirmed',
        createdAt: Date.now(),
        remind24Sent: false,
        remind1Sent: false
    };

    const clientSessions = readSessions(getSessionsKeyFor(clientUserId));
    clientSessions.push(booking);
    writeSessions(getSessionsKeyFor(clientUserId), clientSessions);

    const psySessions = readSessions(getSessionsKeyFor(psyUserId));
    psySessions.push({
        id: bookingId,
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        date: booking.date,
        hour: booking.hour,
        topic: topic,
        price: booking.price,
        status: 'confirmed',
        createdAt: booking.createdAt,
        remind24Sent: false,
        remind1Sent: false
    });
    writeSessions(getSessionsKeyFor(psyUserId), psySessions);

    psyEvents = psyEvents.filter(function (e) {
        if (e.category !== 'free') return true;
        return !(e.date === bookedDateStr && e.hour === bookedHour);
    });
    psyEvents.push({
        id: 'sess-' + bookingId,
        title: 'Сессия: ' + shortClientName,
        date: bookedDateStr,
        hour: bookedHour,
        category: 'session',
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        sessionId: bookingId
    });
    localStorage.setItem(psyEventsKey, JSON.stringify(psyEvents));

    addEventForUser(clientUserId, {
        title: 'Сессия: ' + shortPsyName,
        date: booking.date,
        hour: booking.hour,
        category: 'session',
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        psychologistName: currentPsy.firstName + ' ' + currentPsy.middleName,
        sessionId: bookingId
    });

    closeBookingModal();
    currentSlot = null;
    renderSlots();

    // ============================================
    // УВЕДОМЛЕНИЯ — напрямую в localStorage
    // ============================================

    var dateTimeLabel = formatHumanDate(bookedDate) + ' в ' + String(bookedHour).padStart(2, '0') + ':00';
    var priceLabel = currentPsy.price.toLocaleString('ru-RU') + ' ₽';
    var psyName = currentPsy.firstName + ' ' + currentPsy.middleName;

    // 1. Клиенту — в его ведро
    try {
        var clientNotifKey = 'psyhelp_notifications_' + clientUserId;
        var clientNotifList = JSON.parse(localStorage.getItem(clientNotifKey)) || [];
        if (!Array.isArray(clientNotifList)) clientNotifList = [];
        clientNotifList.unshift({
            id: 'notif-' + Date.now() + '-book-client',
            type: 'session_booked',
            title: 'Сессия подтверждена',
            text: psyName + ' — ' + dateTimeLabel + '. Стоимость: ' + priceLabel + '. ' +
                  'Правила отмены: ≥48 ч — возврат 100%, 24–48 ч — 50%, <24 ч — без возврата.',
            link: 'client.html?section=sessions&highlight=' + encodeURIComponent(bookingId),
            createdAt: Date.now(),
            isRead: false
        });
        localStorage.setItem(clientNotifKey, JSON.stringify(clientNotifList));
        console.log('[psychologist] уведомление клиенту создано');
    } catch (e) { console.error('[psychologist] ошибка клиенту:', e); }

    // 2. Психологу — в его ведро (только если разные люди)
    if (psyUserId !== clientUserId) {
        try {
            var psyNotifKey = 'psyhelp_notifications_' + psyUserId;
            var psyNotifList = JSON.parse(localStorage.getItem(psyNotifKey)) || [];
            if (!Array.isArray(psyNotifList)) psyNotifList = [];
            psyNotifList.unshift({
                id: 'notif-' + Date.now() + '-book-psy',
                type: 'session_booked',
                title: 'Новая сессия',
                text: clientFullName + ' записался на ' + dateTimeLabel + '. Тема: ' + topic + '.',
                link: 'dashboard.html?section=sessions&highlight=' + encodeURIComponent(bookingId),
                createdAt: Date.now(),
                isRead: false
            });
            localStorage.setItem(psyNotifKey, JSON.stringify(psyNotifList));
            console.log('[psychologist] уведомление психологу создано');
        } catch (e) { console.error('[psychologist] ошибка психологу:', e); }
    }

    alert('✓ Запись подтверждена!\n\n' +
          'Психолог: ' + booking.psychologistName + '\n' +
          'Дата: ' + formatHumanDate(bookedDate) + '\n' +
          'Время: ' + String(bookedHour).padStart(2, '0') + ':00\n' +
          'Стоимость: ' + currentPsy.price.toLocaleString('ru-RU') + ' ₽\n\n' +
          'Сессия добавлена в ваш планировщик и в раздел «Мои сессии».');
}

// ============================================
// Хранилище
// ============================================

function readSessions(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
        const p = JSON.parse(data);
        return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
}

function writeSessions(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

function addEventForUser(userId, event) {
    const key = getEventsKeyFor(userId);
    const data = localStorage.getItem(key);
    let events = [];
    if (data) {
        try {
            const p = JSON.parse(data);
            events = Array.isArray(p) ? p : [];
        } catch (e) {}
    }
    event.id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
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