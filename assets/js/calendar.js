// ============================================
// КАЛЕНДАРЬ — единый планировщик (Supabase)
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
let cachedEvents = [];
let userPsychologistProfileId = null; // id в psychologist_profiles

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
    return u.id || null;
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
    // Если есть профиль психолога — используем его имя
    if (window.__psyProfile) {
        var f = (window.__psyProfile.first_name || '').trim();
        var m = (window.__psyProfile.middle_name || '').trim();
        if (f) return (f + ' ' + m).trim();
    }
    // Иначе — реальное имя пользователя
    var rf = (u.realFirstName || '').trim();
    var rm = (u.realMiddleName || '').trim();
    if (rf) return (rf + ' ' + rm).trim();
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
// Supabase: получить id профиля психолога
// ============================================

async function loadPsychologistProfile() {
    var userId = getCurrentUserId();
    if (!userId || !window.supa) return null;

    try {
        var result = await window.supa
            .from('psychologist_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (result.error || !result.data) {
            console.log('[calendar] профиль психолога не найден');
            return null;
        }

        window.__psyProfile = result.data;
        userPsychologistProfileId = result.data.id;
        console.log('[calendar] профиль психолога:', result.data.first_name, userPsychologistProfileId);
        return result.data;

    } catch (err) {
        console.error('[calendar] ошибка загрузки профиля психолога:', err);
        return null;
    }
}

// ============================================
// Supabase: загрузка событий
// ============================================

async function loadEvents() {
    var userId = getCurrentUserId();
    if (!userId || !window.supa) return [];

    try {
        // Загружаем все события, где owner_id = мой ИЛИ psychologist_id = мой профиль
        var query = window.supa.from('events').select('*');

        if (userPsychologistProfileId) {
            query = query.or('owner_id.eq.' + userId + ',psychologist_id.eq.' + userPsychologistProfileId);
        } else {
            query = query.eq('owner_id', userId);
        }

        var result = await query;

        if (result.error) {
            console.error('[calendar] ошибка загрузки событий:', result.error);
            return [];
        }

        return result.data || [];

    } catch (err) {
        console.error('[calendar] исключение:', err);
        return [];
    }
}

// ============================================
// Supabase: сохранение события
// ============================================

async function saveEvent(event) {
    if (!window.supa) return null;
    var userId = getCurrentUserId();

    try {
        var result = await window.supa
            .from('events')
            .insert({
                owner_id: userId,
                psychologist_id: event.psychologist_id || null,
                title: event.title || '',
                date: event.date,
                hour: event.hour,
                category: event.category || 'personal'
            })
            .select()
            .single();

        if (result.error) {
            console.error('[calendar] ошибка сохранения:', result.error);
            return null;
        }

        return result.data;

    } catch (err) {
        console.error('[calendar] исключение при сохранении:', err);
        return null;
    }
}

async function deleteEventFromSupabase(eventId) {
    if (!window.supa) return false;
    try {
        var result = await window.supa.from('events').delete().eq('id', eventId);
        if (result.error) {
            console.error('[calendar] ошибка удаления:', result.error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[calendar] исключение:', err);
        return false;
    }
}

async function updateEventInSupabase(eventId, data) {
    if (!window.supa) return false;
    try {
        var result = await window.supa.from('events').update(data).eq('id', eventId);
        if (result.error) {
            console.error('[calendar] ошибка обновления:', result.error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[calendar] исключение:', err);
        return false;
    }
}

// ============================================
// Отрисовка календаря
// ============================================

async function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const periodEl = document.getElementById('calendarPeriod');
    if (!grid) return;

    // Загружаем профиль психолога (один раз)
    if (!window.__psyProfile && isPsychologist()) {
        await loadPsychologistProfile();
    }

    // Загружаем события
    cachedEvents = await loadEvents();

    const ownerEl = document.getElementById('calendarOwnerName');
    if (ownerEl) ownerEl.textContent = getCurrentPsychologistName();

    const quickActions = document.querySelector('.calendar-quick-actions');
    if (quickActions) {
        quickActions.style.display = isPsychologist() ? '' : 'none';
    }

    const events = cachedEvents;
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

        // События этого дня — приоритет: session > free > другое
        var dayEvents = events.filter(function (e) { return e.date === dateKey; });
        var byHour = {};
        dayEvents.forEach(function (e) {
            var existing = byHour[e.hour];
            if (!existing) {
                byHour[e.hour] = e;
            } else {
                var priority = { session: 3, free: 2 };
                var curP = priority[existing.category] || 1;
                var newP = priority[e.category] || 1;
                if (newP > curP) byHour[e.hour] = e;
            }
        });

        Object.keys(byHour).forEach(function (hourKey) {
            var ev = byHour[hourKey];
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
            const event = cachedEvents.find(function (x) { return x.id === id; });
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
    const count = cachedEvents.filter(function (e) { return e.category === 'free'; }).length;
    const el = document.getElementById('freeSlotsCount');
    if (el) el.textContent = count;
}

// ============================================
// Детали сессии
// ============================================

function openSessionDetails(event) {
    const overlay = document.getElementById('clientModalOverlay');
    const content = document.getElementById('clientModalContent');
    if (!overlay || !content) return;

    const isPsy = isPsychologist();
    let counterpartHtml = '';

    if (isPsy && event.client_name) {
        counterpartHtml =
            '<div class="session-detail-row"><span>Клиент:</span> <strong>' + escapeHtml(event.client_name) + '</strong></div>' +
            (event.client_code
                ? '<div class="session-detail-row"><span>Код:</span> <strong>' + escapeHtml(event.client_code) + '</strong></div>'
                : '');
    } else if (event.psychologist_name) {
        counterpartHtml =
            '<div class="session-detail-row"><span>Психолог:</span> <strong>' + escapeHtml(event.psychologist_name) + '</strong></div>';
    } else {
        counterpartHtml = '<div class="session-detail-row"><span>Участник:</span> <strong>не указан</strong></div>';
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
    const ev = cachedEvents.find(function (e) { return e.id === id; });
    if (!ev) return;

    if (ev.category === 'session') {
        openSessionDetails(ev);
        return;
    }

    editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать';
    document.getElementById('eventTitle').value = ev.title || '';
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

async function saveEventFromModal() {
    const category = document.getElementById('eventCategory').value;
    let title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const hour = parseInt(document.getElementById('eventHour').value);

    if (category === 'session') {
        alert('Сессии создаются автоматически при бронировании клиентом.');
        return;
    }

    if (category === 'free' && !isPsychologist()) {
        alert('Только психолог может открывать свободные слоты.');
        return;
    }

    if (category === 'free') title = title || 'Свободно';
    if (!title) {
        alert('Введите название события');
        return;
    }

    // Проверка занятости
    const conflict = cachedEvents.some(function (e) {
        if (editingEventId && e.id === editingEventId) return false;
        return e.date === date && e.hour === hour;
    });

    if (conflict) {
        alert('На это время уже есть событие.');
        return;
    }

    if (editingEventId) {
        var ev = cachedEvents.find(function (e) { return e.id === editingEventId; });
        if (ev && ev.category === 'session') {
            alert('Сессии нельзя редактировать.');
            closeModal();
            return;
        }
        await updateEventInSupabase(editingEventId, {
            title: title,
            date: date,
            hour: hour,
            category: category
        });
    } else {
        await saveEvent({
            title: title,
            date: date,
            hour: hour,
            category: category,
            psychologist_id: isPsychologist() ? userPsychologistProfileId : null
        });
    }

    closeModal();
    await renderCalendar();
}

async function removeEvent() {
    if (!editingEventId) return;
    if (!confirm('Удалить это событие?')) return;
    await deleteEventFromSupabase(editingEventId);
    closeModal();
    await renderCalendar();
}

// ============================================
// Быстрые действия
// ============================================

async function fillWeekdays() {
    if (!isPsychologist()) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var userId = getCurrentUserId();
    var added = 0;

    var inserts = [];

    for (var week = 0; week < 4; week++) {
        for (var i = 0; i < 5; i++) {
            var date = new Date(today);
            date.setDate(today.getDate() + week * 7 + i);
            var dateKey = formatDateKey(date);

            for (var h = 10; h < 19; h++) {
                var exists = cachedEvents.some(function (e) {
                    return e.date === dateKey && e.hour === h;
                });
                if (!exists) {
                    inserts.push({
                        owner_id: userId,
                        psychologist_id: userPsychologistProfileId,
                        title: 'Свободно',
                        date: dateKey,
                        hour: h,
                        category: 'free'
                    });
                    added++;
                }
            }
        }
    }

    if (inserts.length > 0 && window.supa) {
        var result = await window.supa.from('events').insert(inserts);
        if (result.error) console.error('[calendar] fillWeekdays:', result.error);
    }

    console.log('[calendar] добавлено слотов:', added);
    await renderCalendar();
}

async function fillWeekend() {
    if (!isPsychologist()) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var userId = getCurrentUserId();
    var added = 0;

    var inserts = [];

    for (var week = 0; week < 4; week++) {
        for (var i = 5; i < 7; i++) {
            var date = new Date(today);
            date.setDate(today.getDate() + week * 7 + i);
            var dateKey = formatDateKey(date);

            for (var h = 11; h < 16; h++) {
                var exists = cachedEvents.some(function (e) {
                    return e.date === dateKey && e.hour === h;
                });
                if (!exists) {
                    inserts.push({
                        owner_id: userId,
                        psychologist_id: userPsychologistProfileId,
                        title: 'Свободно',
                        date: dateKey,
                        hour: h,
                        category: 'free'
                    });
                    added++;
                }
            }
        }
    }

    if (inserts.length > 0 && window.supa) {
        var result = await window.supa.from('events').insert(inserts);
        if (result.error) console.error('[calendar] fillWeekend:', result.error);
    }

    console.log('[calendar] добавлено слотов:', added);
    await renderCalendar();
}

async function clearFreeSlots() {
    if (!isPsychologist()) return;
    if (!confirm('Убрать все свободные слоты?')) return;

    var userId = getCurrentUserId();
    var freeIds = cachedEvents
        .filter(function (e) { return e.category === 'free' && e.owner_id === userId; })
        .map(function (e) { return e.id; });

    if (freeIds.length > 0 && window.supa) {
        var result = await window.supa.from('events').delete().in('id', freeIds);
        if (result.error) console.error('[calendar] clearFreeSlots:', result.error);
    }

    await renderCalendar();
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
    if (saveBtn) saveBtn.addEventListener('click', saveEventFromModal);
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