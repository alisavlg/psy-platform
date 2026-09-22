// ============================================
// РАСПИСАНИЕ — свободные слоты психолога
// ============================================
// Ключ привязан к id психолога.
// Психолог пишет, клиент читает.

console.log('[slots.js] loaded');

const SLOTS_KEY_PREFIX = 'psyhelp_slots_';
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 22;

// Демо: текущий психолог = psy-1.
// Когда будет реальная авторизация — брать из psyhelp_user.id.
function getCurrentPsychologistId() {
    const user = localStorage.getItem('psyhelp_user');
    if (user) {
        try {
            const u = JSON.parse(user);
            if (u.id) return u.id;
        } catch (e) {}
    }
    return 'psy-1';  // demo
}

function getSlotsKey() {
    return SLOTS_KEY_PREFIX + getCurrentPsychologistId();
}

function getSlots() {
    const key = getSlotsKey();
    const data = localStorage.getItem(key);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) { return {}; }
    }
    // Демо-слоты
    return {
        '2-10': true, '2-11': true, '2-12': true,
        '4-14': true, '4-15': true, '4-16': true,
        '5-10': true, '5-11': true
    };
}

function saveSlots(slots) {
    localStorage.setItem(getSlotsKey(), JSON.stringify(slots));
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
// Отрисовка (для кабинета психолога)
// ============================================

function renderSchedule() {
    const grid = document.getElementById('scheduleGrid');
    if (!grid) return;

    const slots = getSlots();
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const today = new Date().getDay();
    const todayIso = today === 0 ? 7 : today;

    let html = '';
    html += '<div class="schedule-header corner"></div>';

    for (let i = 1; i <= 7; i++) {
        const isToday = i === todayIso ? 'today' : '';
        html += '<div class="schedule-header ' + isToday + '">' + days[i - 1] + '</div>';
    }

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

    grid.querySelectorAll('.schedule-slot').forEach(function (btn) {
        btn.addEventListener('click', function () {
            toggleSlot(parseInt(btn.dataset.day), parseInt(btn.dataset.hour));
        });
    });

    updateStats(slots);
}

function updateStats(slots) {
    const count = Object.keys(slots).length;
    const el = document.getElementById('scheduleCount');
    if (el) el.textContent = count;
    const elHours = document.getElementById('scheduleHours');
    if (elHours) elHours.textContent = count;
}

// ============================================
// Быстрые действия
// ============================================

function fillWeekdays() {
    const slots = getSlots();
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
// Инициализация (только для страницы психолога)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const fillWeekdaysBtn = document.getElementById('fillWeekdaysBtn');
    if (fillWeekdaysBtn) fillWeekdaysBtn.addEventListener('click', fillWeekdays);

    const fillWeekendBtn = document.getElementById('fillWeekendBtn');
    if (fillWeekendBtn) fillWeekendBtn.addEventListener('click', fillWeekend);

    const clearBtn = document.getElementById('clearSlotsBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllSlots);
});