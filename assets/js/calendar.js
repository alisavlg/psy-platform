// ============================================
// КАЛЕНДАРЬ — единый планировщик
// ============================================

console.log('[calendar.js] loaded');

const CATEGORIES = {
    free:     { name: 'Свободно', color: '#4a90e2' },
    session:  { name: 'Сессия',   color: '#357abd' },
    personal: { name: 'Личное',   color: '#2ecc71' },
    work:     { name: 'Работа',   color: '#f39c12' },
    health:   { name: 'Здоровье', color: '#e74c3c' },
    study:    { name: 'Учёба',    color: '#9b59b6' }
};

const START_HOUR = 0;
const END_HOUR = 24;
const DEFAULT_SCROLL_HOUR = 8;

let currentWeekStart = getMonday(new Date());

// ============================================
// Пользователь
// ============================================

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('psyhelp_user')) || {};
    } catch (e) { return {}; }
}

function getCurrentUserId() {
    var u = getCurrentUser();
    return u.id || 'anonymous';
}

function getCurrentUserRoles() {
    var u = getCurrentUser();
    return Array.isArray(u.roles) ? u.roles : [];
}

function isPsychologist() {
    return getCurrentUserRoles().indexOf('psychologist') !== -1;
}

function getCurrentPsychologistName() {
    var u = getCurrentUser();
    var f = (u.realFirstName || '').trim();
    var m = (u.realMiddleName || '').trim();
    if (f) return (f + ' ' + m).trim();
    return 'Пользователь';
}

// ============================================
// Даты
// ============================================

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function formatPeriod(start) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[start.getMonth()] + ' ' + start.getFullYear();
}

function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// ============================================
// ЕДИНОЕ хранилище — по user.id
// ============================================

function getEventsKey() {
    return 'psyhelp_events_' + getCurrentUserId();
}

function getSessionsKey() {
    return 'psyhelp_sessions_' + getCurrentUserId();
}

function getEvents() {
    const key = getEventsKey();
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveEvents(events) {
    if (!Array.isArray(events)) events = [];
    localStorage.setItem(getEventsKey(), JSON.stringify(events));
}

function addEvent(event) {
    const events = getEvents();
    event.id = Date.now().toString();
    events.push(event);
    saveEvents(events);
}

function deleteEvent(id) {
    const events = getEvents().filter(function (e) { return e.id !== id; });
    saveEvents(events);
}

// ============================================
// Автоочистка старых сессий
// ============================================

function cleanupOldSessions() {
    const events = getEvents();
    if (events.length === 0) return;

    let sessions = [];
    try {
        const d = localStorage.getItem(getSessionsKey());
        sessions = d ? JSON.parse(d) : [];
        if (!Array.isArray(sessions)) sessions = [];
    } catch (e) { sessions = []; }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);

    const cleaned = events.filter(function (e) {
        if (e.category !== 'session') return true;

        const session = sessions.find(function (s) {
            return s.date === e.date && s.hour === e.hour;
        });

        if (!session) return false;
        if (session.status === 'cancelled') return false;
        if (session.status === 'completed') return false;

        const parts = e.date.split('-');
        const eventDate = new Date(
            parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
            e.hour, 0, 0
        );
        if (eventDate < twoHoursAgo) return false;

        return true;
    });

    if (cleaned.length !== events.length) {
        saveEvents(cleaned);
        console.log('[calendar] автоочистка:', events.length - cleaned.length, 'событий удалено');
    }
}

// ============================================
// Миграция старых слотов
// ============================================

function migrateOldSlots() {
    if (!isPsychologist()) return;

    const uid = getCurrentUserId();
    const oldKey = 'psyhelp_slots_' + uid;
    const oldData = localStorage.getItem(oldKey);
    if (!oldData) return;
    if (localStorage.getItem('psyhelp_migration_done_' + uid)) return;

    let oldSlots = {};
    try { oldSlots = JSON.parse(oldData) || {}; } catch (e) { return; }

    const events = getEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week < 4; week++) {
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + week * 7 + i);
            const jsDay = date.getDay();
            const isoDay = jsDay === 0 ? 7 : jsDay;

            for (let h = 8; h < 22; h++) {
                const slotKey = isoDay + '-' + h;
                if (oldSlots[slotKey]) {
                    events.push({
                        id: 'mig-' + week + '-' + i + '-' + h,
                        title: 'Свободно',
                        date: formatDateKey(date),
                        hour: h,
                        category: 'free'
                    });
                }
            }
        }
    }

    saveEvents(events);
    localStorage.setItem('psyhelp_migration_done_' + uid, '1');
}

// ============================================
// Отрисовка календаря
// ============================================

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const periodEl = document.getElementById('calendarPeriod');
    if (!grid) return;

    cleanupOldSessions();

    const ownerEl = document.getElementById('calendarOwnerName');
    if (ownerEl) ownerEl.textContent = getCurrentPsychologistName();

    const quickActions = document.querySelector('.calendar-quick-actions');
    if (quickActions) {
        quickActions.style.display = isPsychologist() ? '' : 'none';
    }

    const events = getEvents();
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    if (periodEl) periodEl.textContent = formatPeriod(currentWeekStart);

    let html = '';
    html += '<div class="calendar-header corner"></div>';

    for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        const todayClass = isToday(day) ? 'today' : '';
        html +=
            '<div class="calendar-header ' + todayClass + '">' +
                days[i] +
                '<span class="day-number">' + day.getDate() + '</span>' +
            '</div>';
    }

    html += '<div class="time-column">';
    for (let h = START_HOUR; h < END_HOUR; h++) {
        html += '<div class="time-slot-label">' + String(h).padStart(2, '0') + ':00</div>';
    }
    html += '</div>';

    for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        const dateKey = formatDateKey(day);
        html += '<div class="day-column" data-date="' + dateKey + '">';

        for (let h = START_HOUR; h < END_HOUR; h++) {
            html += '<div class="hour-cell" data-date="' + dateKey + '" data-hour="' + h + '"></div>';
        }

        const dayEvents = events.filter(function (e) { return e.date === dateKey; });
        dayEvents.forEach(function (ev) {
            const cat = CATEGORIES[ev.category] || CATEGORIES.personal;
            const top = (ev.hour - START_HOUR) * 60;
            const isFree = ev.category === 'free';
            const isSession = ev.category === 'session';

            let cls = 'event';
            if (isFree) cls += ' event-free';
            if (isSession) cls += ' event-session';

            html +=
                '<div class="' + cls + '" ' +
                     'style="top: ' + top + 'px; background: ' + (isFree ? 'rgba(74,144,226,0.15)' : cat.color) + '; ' +
                     (isFree ? 'border: 2px dashed #4a90e2; color: #357abd;' : '') + '" ' +
                     'data-id="' + ev.id + '">' +
                    '<span class="event-title">' + escapeHtml(ev.title) + '</span>' +
                    '<span class="event-time">' + String(ev.hour).padStart(2, '0') + ':00</span>' +
                '</div>';
        });

        html += '</div>';
    }

    grid.innerHTML = html;

    document.querySelectorAll('.hour-cell').forEach(function (cell) {
        cell.addEventListener('click', function (e) {
            if (e.target.closest('.event')) return;
            openModal(cell.dataset.date, parseInt(cell.dataset.hour));
        });
    });

    document.querySelectorAll('.event').forEach(function (ev) {
        ev.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = ev.dataset.id;
            const events = getEvents();
            const event = events.find(function (x) { return x.id === id; });
            if (!event) return;

            if (event.category === 'session') {
                openSessionDetails(event);
                return;
            }
            openModalForEdit(id);
        });
    });

    updateFreeSlotsCount();
}

function updateFreeSlotsCount() {
    const events = getEvents();
    const count = events.filter(function (e) { return e.category === 'free'; }).length;
    const el = document.getElementById('freeSlotsCount');
    if (el) el.textContent = count;
}

// ============================================
// Детали сессии — универсально для обеих ролей
// ============================================

function openSessionDetails(event) {
    const overlay = document.getElementById('clientModalOverlay');
    const content = document.getElementById('clientModalContent');
    if (!overlay || !content) {
        console.warn('[calendar] clientModalOverlay не найден в HTML');
        return;
    }

    const isPsy = isPsychologist();

    // Логика: если это психолог — показываем клиента.
    // Если клиент — показываем психолога + ссылку на его страницу.
    let counterpartHtml = '';
    let counterpartName = '';
    let counterpartCode = '';

    if (isPsy && event.clientName) {
        counterpartName = event.clientName;
        counterpartCode = event.clientCode || '';
        counterpartHtml =
            '<div class="session-detail-row"><span>Клиент:</span> <strong>' + escapeHtml(counterpartName) + '</strong></div>' +
            (counterpartCode
                ? '<div class="session-detail-row"><span>Код:</span> <strong>' + escapeHtml(counterpartCode) + '</strong></div>'
                : '');
    } else if (event.psychologistName) {
        counterpartName = event.psychologistName;
        counterpartHtml =
            '<div class="session-detail-row"><span>Психолог:</span> <strong>' + escapeHtml(counterpartName) + '</strong></div>';
        if (event.psychologistId) {
            counterpartHtml +=
                '<div class="session-detail-row"><span>Профиль:</span> ' +
                    '<a href="psychologist.html?id=' + encodeURIComponent(event.psychologistId) + '" class="session-detail-link">Открыть страницу →</a>' +
                '</div>';
        }
    } else {
        counterpartHtml =
            '<div class="session-detail-row"><span>Участник:</span> <strong>не указан</strong></div>';
    }

    content.innerHTML =
        '<div class="session-detail">' +
            counterpartHtml +
            '<div class="session-detail-row"><span>Дата:</span> <strong>' + escapeHtml(event.date) + '</strong></div>' +
            '<div class="session-detail-row"><span>Время:</span> <strong>' + String(event.hour).padStart(2, '0') + ':00</strong></div>' +
            '<div class="session-detail-note">Для связи используйте раздел «Сообщения». Обмен личными контактами запрещён.</div>' +
        '</div>';

    overlay.classList.add('active');
}

// ============================================
// Модальное окно
// ============================================

let editingEventId = null;

function openModal(date, hour) {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Новое событие';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDate').value = date;
    document.getElementById('eventHour').value = hour;
    document.getElementById('eventCategory').value = isPsychologist() ? 'free' : 'personal';
    document.getElementById('deleteBtn').style.display = 'none';

    var catSelect = document.getElementById('eventCategory');
    if (catSelect) {
        var freeOption = catSelect.querySelector('option[value="free"]');
        if (freeOption) freeOption.style.display = isPsychologist() ? '' : 'none';
    }

    document.getElementById('modalOverlay').classList.add('active');
}

function openModalForEdit(id) {
    const events = getEvents();
    const ev = events.find(function (e) { return e.id === id; });
    if (!ev) return;

    if (ev.category === 'session') {
        openSessionDetails(ev);
        return;
    }

    editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать';
    document.getElementById('eventTitle').value = ev.title;
    document.getElementById('eventDate').value = ev.date;
    document.getElementById('eventHour').value = ev.hour;
    document.getElementById('eventCategory').value = ev.category;
    document.getElementById('deleteBtn').style.display = 'block';
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    editingEventId = null;
}

function saveEvent() {
    const category = document.getElementById('eventCategory').value;
    let title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const hour = parseInt(document.getElementById('eventHour').value);

    if (category === 'session') {
        alert('Сессии создаются автоматически при бронировании клиентом.\n\nЧтобы принять клиента — отметьте свободный слот в календаре.');
        return;
    }

    if (category === 'free' && !isPsychologist()) {
        alert('Только психолог может открывать свободные слоты для записи.');
        return;
    }

    if (category === 'free') {
        title = title || 'Свободно';
    }

    if (!title) {
        alert('Введите название события');
        return;
    }

    if (editingEventId) {
        const events = getEvents();
        const ev = events.find(function (e) { return e.id === editingEventId; });
        if (ev) {
            if (ev.category === 'session') {
                alert('Сессии нельзя редактировать вручную — они связаны с клиентом и оплатой.');
                closeModal();
                return;
            }
            ev.title = title;
            ev.date = date;
            ev.hour = hour;
            ev.category = category;
            saveEvents(events);
        }
    } else {
        addEvent({ title: title, date: date, hour: hour, category: category });
    }

    closeModal();
    renderCalendar();
}

function removeEvent() {
    if (!editingEventId) return;
    if (confirm('Удалить это событие?')) {
        deleteEvent(editingEventId);
        closeModal();
        renderCalendar();
    }
}

// ============================================
// Быстрые действия
// ============================================

function fillWeekdays() {
    if (!isPsychologist()) return;

    const events = getEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week < 4; week++) {
        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + week * 7 + i);
            const dateKey = formatDateKey(date);

            for (let h = 10; h < 19; h++) {
                const exists = events.some(function (e) {
                    return e.date === dateKey && e.hour === h;
                });
                if (!exists) {
                    events.push({
                        id: 'fill-' + week + '-' + i + '-' + h,
                        title: 'Свободно',
                        date: dateKey,
                        hour: h,
                        category: 'free'
                    });
                }
            }
        }
    }

    saveEvents(events);
    renderCalendar();
}

function fillWeekend() {
    if (!isPsychologist()) return;

    const events = getEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week < 4; week++) {
        for (let i = 5; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + week * 7 + i);
            const dateKey = formatDateKey(date);

            for (let h = 11; h < 16; h++) {
                const exists = events.some(function (e) {
                    return e.date === dateKey && e.hour === h;
                });
                if (!exists) {
                    events.push({
                        id: 'fill-' + week + '-' + i + '-' + h,
                        title: 'Свободно',
                        date: dateKey,
                        hour: h,
                        category: 'free'
                    });
                }
            }
        }
    }

    saveEvents(events);
    renderCalendar();
}

function clearFreeSlots() {
    if (!isPsychologist()) return;
    if (!confirm('Убрать все свободные слоты? Клиенты не смогут записаться.')) return;
    const events = getEvents().filter(function (e) { return e.category !== 'free'; });
    saveEvents(events);
    renderCalendar();
}

function goToPrevWeek() {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderCalendar();
}

function goToNextWeek() {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderCalendar();
}

function goToToday() {
    currentWeekStart = getMonday(new Date());
    renderCalendar();
    scrollToCurrentHour();
}

function scrollToCurrentHour() {
    const wrapper = document.querySelector('.calendar-wrapper');
    if (!wrapper) return;
    const currentHour = new Date().getHours();
    const targetHour = currentHour < 6 ? DEFAULT_SCROLL_HOUR : Math.max(0, currentHour - 1);
    wrapper.scrollTop = targetHour * 60;
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
    migrateOldSlots();

    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    const todayBtn = document.getElementById('todayBtn');
    const addBtn = document.getElementById('addEventBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const overlay = document.getElementById('modalOverlay');
    const fillWeekdaysBtn = document.getElementById('fillWeekdaysBtn');
    const fillWeekendBtn = document.getElementById('fillWeekendBtn');
    const clearFreeSlotsBtn = document.getElementById('clearFreeSlotsBtn');

    if (prevBtn) prevBtn.addEventListener('click', goToPrevWeek);
    if (nextBtn) nextBtn.addEventListener('click', goToNextWeek);
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
    if (addBtn) addBtn.addEventListener('click', function () {
        openModal(formatDateKey(new Date()), new Date().getHours());
    });
    if (saveBtn) saveBtn.addEventListener('click', saveEvent);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (deleteBtn) deleteBtn.addEventListener('click', removeEvent);
    if (overlay) overlay.addEventListener('click', function (e) {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    if (fillWeekdaysBtn) fillWeekdaysBtn.addEventListener('click', fillWeekdays);
    if (fillWeekendBtn) fillWeekendBtn.addEventListener('click', fillWeekend);
    if (clearFreeSlotsBtn) clearFreeSlotsBtn.addEventListener('click', clearFreeSlots);

    const clientCancelBtn = document.getElementById('clientCancelBtn');
    const clientOverlay = document.getElementById('clientModalOverlay');
    if (clientCancelBtn) clientCancelBtn.addEventListener('click', function () {
        clientOverlay.classList.remove('active');
    });
    if (clientOverlay) clientOverlay.addEventListener('click', function (e) {
        if (e.target.id === 'clientModalOverlay') clientOverlay.classList.remove('active');
    });
});