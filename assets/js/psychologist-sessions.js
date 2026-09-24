// ============================================
// СЕССИИ — список (единый для роли клиента и психолога)
// ============================================

console.log('[psychologist-sessions.js] loaded');

const STATUS_LABELS_PSY = {
    confirmed: 'Подтверждена',
    completed: 'Проведена',
    cancelled: 'Отменена',
    rescheduled: 'Перенесена'
};

let psySessionsTab = 'upcoming';

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

function getSessionsKey() {
    return 'psyhelp_sessions_' + getCurrentUserId();
}

function getEventsKey() {
    return 'psyhelp_events_' + getCurrentUserId();
}

// ============================================
// Хранилище
// ============================================

function getPsySessionsList() {
    const data = localStorage.getItem(getSessionsKey());
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
}

function savePsySessionsList(list) {
    localStorage.setItem(getSessionsKey(), JSON.stringify(list));
}

// ============================================
// Разделение
// ============================================

function getSessionDateTime(session) {
    const parts = session.date.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), session.hour, 0, 0);
}

function isUpcomingPsy(session) {
    const dt = getSessionDateTime(session);
    return dt > new Date() && session.status === 'confirmed';
}

function isPastPsy(session) {
    return !isUpcomingPsy(session);
}

// ============================================
// Отрисовка
// ============================================

function renderPsySessions(tab) {
    if (tab) psySessionsTab = tab;

    const listEl = document.getElementById('psySessionsList');
    if (!listEl) return;

    document.querySelectorAll('.psy-session-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === psySessionsTab);
    });

    const all = getPsySessionsList();

    all.sort(function (a, b) {
        return getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime();
    });

    let filtered;
    if (psySessionsTab === 'upcoming') {
        filtered = all.filter(isUpcomingPsy);
    } else {
        filtered = all.filter(isPastPsy).reverse();
    }

    const countUpcoming = all.filter(isUpcomingPsy).length;
    const countPast = all.filter(isPastPsy).length;
    const elUpcoming = document.getElementById('psyCountUpcoming');
    const elPast = document.getElementById('psyCountPast');
    if (elUpcoming) elUpcoming.textContent = countUpcoming;
    if (elPast) elPast.textContent = countPast;

    if (filtered.length === 0) {
        listEl.innerHTML =
            '<div class="sessions-empty">' +
                '<div class="sessions-empty-icon">📅</div>' +
                '<p>' + (psySessionsTab === 'upcoming' ? 'Нет предстоящих сессий' : 'История пуста') + '</p>' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (session) {
        const card = document.createElement('div');
        card.className = 'session-item';
        card.setAttribute('data-session-id', session.id);

        const dt = getSessionDateTime(session);
        const dateFormatted = formatHumanDate(dt);
        const timeFormatted = String(session.hour).padStart(2, '0') + ':00';
        const statusLabel = STATUS_LABELS_PSY[session.status] || session.status;
        const statusClass = session.status;

        const clientName = session.clientName || 'Клиент';
        const clientCode = session.clientCode || '—';

        let actionsHtml = '';

        if (psySessionsTab === 'upcoming' && session.status === 'confirmed') {
            const now = new Date();
            const diffMinutes = (now.getTime() - dt.getTime()) / 60000;
            const canComplete = diffMinutes >= 0;
            const canJoin = diffMinutes <= 5 && diffMinutes >= -120;

            actionsHtml +=
                '<a class="session-btn session-btn-join" ' +
                    (canJoin ? '' : 'style="pointer-events:none;opacity:0.5;"') + ' ' +
                    'href="room.html?session=' + session.id + '&role=psychologist" ' +
                    'target="_blank">' +
                    (canJoin ? 'Войти в комнату' : 'Комната откроется за 5 мин') +
                '</a>';

            actionsHtml +=
                '<button class="session-btn session-btn-complete" ' +
                        (canComplete ? '' : 'disabled') + ' ' +
                        'data-action="complete" data-id="' + session.id + '">' +
                    (canComplete ? 'Проведена' : 'Начнётся ' + timeFormatted) +
                '</button>';
        }

        actionsHtml +=
            '<button class="session-btn session-btn-chat" data-action="chat" data-id="' + session.id + '">Написать в чат</button>';

        card.innerHTML =
            '<div class="session-card-header">' +
                '<div class="session-card-psy">' +
                    '<div class="session-card-avatar">' + getInitials(clientName) + '</div>' +
                    '<div>' +
                        '<div class="session-card-psy-name">' + escapeHtml(clientName) + '</div>' +
                        '<div class="session-card-psy-role">Код: ' + escapeHtml(clientCode) + '</div>' +
                    '</div>' +
                '</div>' +
                '<span class="session-status ' + statusClass + '">' + statusLabel + '</span>' +
            '</div>' +

            '<div class="session-card-body">' +
                '<div class="session-card-info">' +
                    '<span class="session-info-label">Дата и время</span>' +
                    '<span class="session-info-value">' + dateFormatted + ', ' + timeFormatted + '</span>' +
                '</div>' +
                '<div class="session-card-info">' +
                    '<span class="session-info-label">Тема</span>' +
                    '<span class="session-info-value">' + escapeHtml(session.topic) + '</span>' +
                '</div>' +
                '<div class="session-card-info">' +
                    '<span class="session-info-label">Стоимость</span>' +
                    '<span class="session-info-value">' + session.price.toLocaleString('ru-RU') + ' ₽</span>' +
                '</div>' +
            '</div>' +

            (actionsHtml ? '<div class="session-card-actions">' + actionsHtml + '</div>' : '');

        card.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'complete') completeSession(id);
                if (action === 'chat') chatWithClient(id);
            });
        });

        listEl.appendChild(card);
    });

    // Подсветка по ?highlight=
    var urlParams = new URLSearchParams(window.location.search);
    var highlightId = urlParams.get('highlight');
    if (highlightId) {
        var targetCard = listEl.querySelector('[data-session-id="' + highlightId + '"]');
        if (targetCard) {
            targetCard.classList.add('notif-highlight');
            setTimeout(function () { targetCard.classList.remove('notif-highlight'); }, 2600);
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// ============================================
// Действия
// ============================================

function completeSession(id) {
    if (!confirm('Отметить сессию как проведённую?')) return;

    const sessions = getPsySessionsList();
    const session = sessions.find(function (s) { return s.id === id; });
    if (!session) return;

    session.status = 'completed';
    session.completedAt = Date.now();
    savePsySessionsList(sessions);

    removeSessionEventFromCalendar(getEventsKey(), session);

    renderPsySessions();
    alert('Сессия отмечена как проведённая.');
}

function removeSessionEventFromCalendar(key, session) {
    if (!session) return;
    let events = [];
    try {
        const d = localStorage.getItem(key);
        events = d ? JSON.parse(d) : [];
        if (!Array.isArray(events)) events = [];
    } catch (e) { events = []; }

    events = events.filter(function (e) {
        if (e.category !== 'session') return true;
        return !(e.date === session.date && e.hour === session.hour);
    });
    localStorage.setItem(key, JSON.stringify(events));
}

function chatWithClient(id) {
    alert('💬 Чат появится в следующих обновлениях.\n\nДля связи используйте раздел «Сообщения».');
}

// ============================================
// Очистка истории
// ============================================

function clearOldHistory() {
    if (!confirm('Очистить историю? Все отменённые и завершённые сессии будут удалены.')) return;

    const sessions = getPsySessionsList();

    const toRemove = sessions.filter(function (s) {
        return s.status === 'cancelled' || s.status === 'completed';
    });

    const clean = sessions.filter(function (s) {
        return s.status !== 'cancelled' && s.status !== 'completed';
    });

    const key = getEventsKey();
    let events = [];
    try {
        const d = localStorage.getItem(key);
        events = d ? JSON.parse(d) : [];
        if (!Array.isArray(events)) events = [];
    } catch (e) { events = []; }

    const cleanedEvents = events.filter(function (e) {
        if (e.category !== 'session') return true;
        const removed = toRemove.find(function (s) {
            return s.date === e.date && s.hour === e.hour;
        });
        return !removed;
    });
    localStorage.setItem(key, JSON.stringify(cleanedEvents));

    savePsySessionsList(clean);

    renderPsySessions();
    alert('История очищена.');
}

// ============================================
// Утилиты
// ============================================

function formatHumanDate(date) {
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
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
    renderPsySessions();

    document.querySelectorAll('.psy-session-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            renderPsySessions(btn.dataset.tab);
        });
    });

    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearOldHistory);
});