// ============================================
// КАЛЕНДАРЬ-ПЛАНИРОВЩИК
// ============================================

console.log('[calendar.js] loaded');

const CATEGORIES = {
    session:  { name: 'Сессия',   color: '#4a90e2' },
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
// Работа с датами
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
// Хранение событий (user-scoped + защита)
// ============================================

function getEventsKey() {
    return 'psyhelp_events_' + (window.CURRENT_USER || 'anonymous');
}

function getEvents() {
    const key = getEventsKey();
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('[calendar] ошибка парсинга событий:', e);
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
// Отрисовка календаря
// ============================================

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const periodEl = document.getElementById('calendarPeriod');
    if (!grid) {
        console.log('[calendar] calendarGrid не найден — рендер пропущен');
        return;
    }

    const events = getEvents() || [];
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
            html +=
                '<div class="event" style="top: ' + top + 'px; background: ' + cat.color + ';" data-id="' + ev.id + '">' +
                    '<span class="event-title">' + ev.title + '</span>' +
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
            openModalForEdit(ev.dataset.id);
        });
    });
}

// ============================================
// Автопрокрутка календаря
// ============================================

function scrollToCurrentHour() {
    const wrapper = document.querySelector('.calendar-wrapper');
    if (!wrapper) return;

    const now = new Date();
    const currentHour = now.getHours();
    const targetHour = currentHour < 6 ? DEFAULT_SCROLL_HOUR : Math.max(0, currentHour - 1);
    wrapper.scrollTop = targetHour * 60;
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
    document.getElementById('eventCategory').value = 'personal';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('active');
}

function openModalForEdit(id) {
    const events = getEvents();
    const ev = events.find(function (e) { return e.id === id; });
    if (!ev) return;

    editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать событие';
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
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const hour = parseInt(document.getElementById('eventHour').value);
    const category = document.getElementById('eventCategory').value;

    if (!title) {
        alert('Введите название события');
        return;
    }

    if (editingEventId) {
        const events = getEvents();
        const ev = events.find(function (e) { return e.id === editingEventId; });
        if (ev) {
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
    scrollToCurrentHour();

    // Если есть пользовательская панель «Сегодня» — обновить
    if (typeof renderTodayPanel === 'function') renderTodayPanel();
}

function removeEvent() {
    if (!editingEventId) return;
    if (confirm('Удалить это событие?')) {
        deleteEvent(editingEventId);
        closeModal();
        renderCalendar();
        if (typeof renderTodayPanel === 'function') renderTodayPanel();
    }
}

// ============================================
// Навигация
// ============================================

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
});