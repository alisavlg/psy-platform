// ============================================
// РАЗДЕЛ «РАСПИСАНИЕ» — свободные слоты психолога
// ============================================
// Психолог отмечает часы, когда готов принимать клиентов.
// Эти слоты будут видны клиентам для бронирования.
//
// Структура хранения: { "деньНедели-час": true }
// Дни недели: 1 = Пн, 2 = Вт, ..., 7 = Вс
// Часы: 8–21 (рабочий день)

const SLOTS_KEY = 'psyhelp_slots';
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 22;

function getSlots() {
    const data = localStorage.getItem(SLOTS_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { return {}; }
    }
    // Демо: немного готовых слотов для примера
    return {
        '2-10': true, '2-11': true, '2-12': true,
        '4-14': true, '4-15': true, '4-16': true,
        '5-10': true, '5-11': true
    };
}

function saveSlots(slots) {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

function toggleSlot(dayOfWeek, hour) {
    const slots = getSlots();
    const key = dayOfWeek + '-' + hour;
    if (slots[key]) {
        delete slots[key];
    } else {
        slots[key] = true;
    }
    saveSlots(slots);
    renderSchedule();
}

// ============================================
// Отрисовка
// ============================================

function renderSchedule() {
    const grid = document.getElementById('scheduleGrid');
    if (!grid) return;

    const slots = getSlots();
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const today = new Date().getDay();
    // JS: 0 = Вс, 1 = Пн, ... Переводим в наш формат 1-7 (1 = Пн)
    const todayIso = today === 0 ? 7 : today;

    let html = '';

    // Угол шапки
    html += '<div class="schedule-header corner"></div>';

    // Шапка дней недели
    for (let i = 1; i <= 7; i++) {
        const isToday = i === todayIso ? 'today' : '';
        html += '<div class="schedule-header ' + isToday + '">' + days[i - 1] + '</div>';
    }

    // Строки часов
    for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        html += '<div class="schedule-time-cell">' + String(h).padStart(2, '0') + ':00</div>';

        for (let d = 1; d <= 7; d++) {
            const key = d + '-' + h;
            const isFree = slots[key];
            const cls = isFree ? 'schedule-slot free' : 'schedule-slot';
            html += '<button class="' + cls + '" data-day="' + d + '" data-hour="' + h + '"></button>';
        }
    }

    grid.innerHTML = html;

    // Обработчики
    grid.querySelectorAll('.schedule-slot').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const day = parseInt(btn.dataset.day);
            const hour = parseInt(btn.dataset.hour);
            toggleSlot(day, hour);
        });
    });

    updateStats(slots);
}

function updateStats(slots) {
    const count = Object.keys(slots).length;
    const el = document.getElementById('scheduleCount');
    if (el) el.textContent = count;

    // Сколько часов в неделю
    const hoursPerWeek = count;
    const elHours = document.getElementById('scheduleHours');
    if (elHours) elHours.textContent = hoursPerWeek;
}

// ============================================
// Быстрые действия
// ============================================

function fillWeekdays() {
    const slots = getSlots();
    // Пн-Пт, часы 10-19
    for (let d = 1; d <= 5; d++) {
        for (let h = 10; h < 19; h++) {
            slots[d + '-' + h] = true;
        }
    }
    saveSlots(slots);
    renderSchedule();
}

function fillWeekend() {
    const slots = getSlots();
    // Сб-Вс, часы 11-16
    for (let d = 6; d <= 7; d++) {
        for (let h = 11; h < 16; h++) {
            slots[d + '-' + h] = true;
        }
    }
    saveSlots(slots);
    renderSchedule();
}

function clearAllSlots() {
    if (!confirm('Снять все свободные слоты? Клиенты не смогут записаться.')) return;
    saveSlots({});
    renderSchedule();
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const fillWeekdaysBtn = document.getElementById('fillWeekdaysBtn');
    if (fillWeekdaysBtn) fillWeekdaysBtn.addEventListener('click', fillWeekdays);

    const fillWeekendBtn = document.getElementById('fillWeekendBtn');
    if (fillWeekendBtn) fillWeekendBtn.addEventListener('click', fillWeekend);

    const clearBtn = document.getElementById('clearSlotsBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllSlots);
});