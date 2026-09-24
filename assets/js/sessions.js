// ============================================
// РАЗДЕЛ «МОИ СЕССИИ» — кабинет клиента
// ============================================

console.log('[sessions.js] loaded');

const STATUS_LABELS = {
    confirmed: 'Подтверждена',
    completed: 'Проведена',
    cancelled: 'Отменена',
    rescheduled: 'Перенесена'
};

let sessionsTab = 'upcoming';

// ============================================
// Единые ключи по user.id
// ============================================

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || 'demo-client';
    } catch (e) { return 'demo-client'; }
}

function getSessionsKeyFor(userId) {
    return 'psyhelp_sessions_' + userId;
}

function getEventsKeyFor(userId) {
    return 'psyhelp_events_' + userId;
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

function getClientSessions() {
    return readSessions(getSessionsKeyFor(getCurrentUserId()));
}

function saveClientSessions(list) {
    writeSessions(getSessionsKeyFor(getCurrentUserId()), list);
}

// ============================================
// Разделение
// ============================================

function getSessionDateTime(session) {
    const parts = session.date.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), session.hour, 0, 0);
}

function isUpcoming(session) {
    const dt = getSessionDateTime(session);
    return dt > new Date() && session.status === 'confirmed';
}

function isPast(session) {
    return !isUpcoming(session);
}

// ============================================
// Отрисовка
// ============================================

function renderSessions(tab) {
    if (tab) sessionsTab = tab;

    const listEl = document.getElementById('sessionsList');
    if (!listEl) return;

    document.querySelectorAll('.session-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === sessionsTab);
    });

    const all = getClientSessions();
    all.sort(function (a, b) {
        return getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime();
    });

    let filtered;
    if (sessionsTab === 'upcoming') {
        filtered = all.filter(isUpcoming);
    } else {
        filtered = all.filter(isPast).reverse();
    }

    const countUpcoming = all.filter(isUpcoming).length;
    const countPast = all.filter(isPast).length;
    const elUpcoming = document.getElementById('countUpcoming');
    const elPast = document.getElementById('countPast');
    if (elUpcoming) elUpcoming.textContent = countUpcoming;
    if (elPast) elPast.textContent = countPast;

    if (filtered.length === 0) {
        listEl.innerHTML =
            '<div class="sessions-empty">' +
                '<div class="sessions-empty-icon">📅</div>' +
                '<p>' + (sessionsTab === 'upcoming' ? 'Нет предстоящих сессий' : 'История пуста') + '</p>' +
                (sessionsTab === 'upcoming' ? '<a href="client.html?section=catalog" class="sessions-empty-link">Найти психолога</a>' : '') +
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
        const statusLabel = STATUS_LABELS[session.status] || session.status;
        const statusClass = session.status;

        let actionsHtml = '';
        if (sessionsTab === 'upcoming') {
            const now = new Date();
            const diffMinutes = (dt.getTime() - now.getTime()) / 60000;
            const canJoin = diffMinutes <= 5 && diffMinutes >= -60;

            actionsHtml +=
                '<a class="session-btn session-btn-join" ' +
                    (canJoin ? '' : 'style="pointer-events:none;opacity:0.5;"') + ' ' +
                    'href="room.html?session=' + session.id + '&role=client" ' +
                    'target="_blank">' +
                    (canJoin ? 'Войти в комнату' : 'Комната откроется за 5 мин') +
                '</a>' +
                '<button class="session-btn session-btn-cancel" data-action="cancel" data-id="' + session.id + '">Отменить</button>' +
                '<a class="session-btn session-btn-profile" href="psychologist.html?id=' + session.psychologistId + '">Профиль</a>';
        }

        card.innerHTML =
            '<div class="session-card-header">' +
                '<div class="session-card-psy">' +
                    '<div class="session-card-avatar">' + getInitials(session.psychologistName) + '</div>' +
                    '<div>' +
                        '<div class="session-card-psy-name">' + escapeHtml(session.psychologistName) + '</div>' +
                        '<div class="session-card-psy-role">Психолог</div>' +
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
                if (action === 'cancel') openCancelModal(id);
            });
        });

        listEl.appendChild(card);
    });

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
// Отмена сессии
// ============================================

let cancellingId = null;

function openCancelModal(id) {
    const sessions = getClientSessions();
    const session = sessions.find(function (s) { return s.id === id; });
    if (!session) return;

    cancellingId = id;

    const dt = getSessionDateTime(session);
    const hoursLeft = (dt.getTime() - Date.now()) / 3600000;

    let refundPercent = 0;
    let refundText = '';
    if (hoursLeft >= 48) {
        refundPercent = 100;
        refundText = 'Возврат 100% — отмена более чем за 48 часов.';
    } else if (hoursLeft >= 24) {
        refundPercent = 50;
        refundText = 'Возврат 50% — отмена менее чем за 48 часов.';
    } else {
        refundPercent = 0;
        refundText = 'Возврат не производится — отмена менее чем за 24 часа.';
    }

    const refundSum = Math.round(session.price * refundPercent / 100);
    const overlay = document.getElementById('cancelModalOverlay');
    const summaryEl = document.getElementById('cancelSummary');
    const reasonEl = document.getElementById('cancelReason');
    if (!overlay || !summaryEl) return;

    const dateFormatted = formatHumanDate(dt);
    const timeFormatted = String(session.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<div class="cancel-row">' +
            '<span>Сессия с</span>' +
            '<strong>' + escapeHtml(session.psychologistName) + '</strong>' +
        '</div>' +
        '<div class="cancel-row">' +
            '<span>Дата и время</span>' +
            '<strong>' + dateFormatted + ', ' + timeFormatted + '</strong>' +
        '</div>' +
        '<div class="cancel-row">' +
            '<span>Стоимость</span>' +
            '<strong>' + session.price.toLocaleString('ru-RU') + ' ₽</strong>' +
        '</div>' +
        '<div class="cancel-divider"></div>' +
        '<div class="cancel-refund ' + (refundPercent === 100 ? 'full' : (refundPercent === 50 ? 'half' : 'none')) + '">' +
            refundText +
            (refundSum > 0 ? '<br><strong>К возврату: ' + refundSum.toLocaleString('ru-RU') + ' ₽</strong>' : '') +
        '</div>';

    if (reasonEl) reasonEl.value = '';
    overlay.classList.add('active');
}

function closeCancelModal() {
    const overlay = document.getElementById('cancelModalOverlay');
    if (overlay) overlay.classList.remove('active');
    cancellingId = null;
}

function confirmCancel() {
    if (!cancellingId) return;

    const reason = document.getElementById('cancelReason').value.trim();
    const clientUserId = getCurrentUserId();

    const clientSessions = readSessions(getSessionsKeyFor(clientUserId));
    const clientSession = clientSessions.find(function (s) { return s.id === cancellingId; });

    // Расчёт возврата
    let refundPercent = 0;
    if (clientSession) {
        const sDT = getSessionDateTime(clientSession);
        const hoursLeft = (sDT.getTime() - Date.now()) / 3600000;
        if (hoursLeft >= 48) refundPercent = 100;
        else if (hoursLeft >= 24) refundPercent = 50;
        else refundPercent = 0;
    }

    const psyUserId = clientSession && (clientSession.psychologistUserId || clientSession.psychologistId);
    const isSamePerson = (clientUserId === psyUserId);
    const psyName = (clientSession && clientSession.psychologistName) || 'Психолог';

    if (clientSession) {
        clientSession.status = 'cancelled';
        clientSession.cancelReason = reason;
        clientSession.cancelledBy = 'client';
        clientSession.cancelledAt = Date.now();
        clientSession.refundPercent = refundPercent;
        writeSessions(getSessionsKeyFor(clientUserId), clientSessions);
    }

    if (psyUserId) {
        const psySessions = readSessions(getSessionsKeyFor(psyUserId));
        const psySession = psySessions.find(function (s) { return s.id === cancellingId; });
        if (psySession) {
            psySession.status = 'cancelled';
            psySession.cancelReason = reason;
            psySession.cancelledBy = 'client';
            psySession.cancelledAt = Date.now();
            psySession.refundPercent = refundPercent;
            writeSessions(getSessionsKeyFor(psyUserId), psySessions);
        }

        restoreFreeSlotForPsy(psyUserId, clientSession);
        removeSessionEventFromCalendar(psyUserId, clientSession);
    }

    removeSessionEventFromCalendar(clientUserId, clientSession);

    closeCancelModal();
    setTimeout(function () { renderSessions(); }, 50);

    if (clientSession) {
        var dateLabel = clientSession.date + ' в ' + String(clientSession.hour).padStart(2, '0') + ':00';
        var refundText = refundPercent > 0
            ? 'Возврат: ' + refundPercent + '%.'
            : 'Возврат не производится.';

        if (typeof window.Notifications !== 'undefined') {
            // Себе — одно уведомление
            window.Notifications.add({
                type: 'session_cancelled',
                title: 'Вы отменили сессию',
                text: 'Психолог: ' + psyName + '. ' + dateLabel + '. ' + refundText +
                      (reason ? ' Причина: ' + reason : ''),
                link: 'client.html?section=sessions&highlight=' + encodeURIComponent(clientSession.id)
            });

            // Психологу — только если это другой человек
            if (psyUserId && !isSamePerson) {
                window.Notifications.addForUser(psyUserId, {
                    type: 'session_cancelled',
                    title: 'Сессия отменена клиентом',
                    text: 'Клиент: ' + (clientSession.clientName || 'Клиент') + '. ' +
                          dateLabel + '. ' + refundText +
                          (reason ? ' Причина: ' + reason : ''),
                    link: 'dashboard.html?section=sessions&highlight=' + encodeURIComponent(clientSession.id)
                });
            }
        }
    }

    alert('Сессия отменена.');
}

function restoreFreeSlotForPsy(psyUserId, session) {
    if (!session) return;
    const key = getEventsKeyFor(psyUserId);
    const data = localStorage.getItem(key);
    let events = [];
    if (data) {
        try {
            const p = JSON.parse(data);
            events = Array.isArray(p) ? p : [];
        } catch (e) {}
    }

    const already = events.some(function (e) {
        return e.category === 'free' && e.date === session.date && e.hour === session.hour;
    });
    if (already) return;

    events.push({
        id: 'restored-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        title: 'Свободно',
        date: session.date,
        hour: session.hour,
        category: 'free'
    });
    localStorage.setItem(key, JSON.stringify(events));
}

function removeSessionEventFromCalendar(userId, session) {
    if (!session) return;
    const key = getEventsKeyFor(userId);
    const data = localStorage.getItem(key);
    if (!data) return;
    try {
        let events = JSON.parse(data);
        if (!Array.isArray(events)) return;
        events = events.filter(function (e) {
            return !(e.date === session.date && e.hour === session.hour && e.category === 'session');
        });
        localStorage.setItem(key, JSON.stringify(events));
    } catch (e) {}
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
    renderSessions();

    document.querySelectorAll('.session-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            renderSessions(btn.dataset.tab);
        });
    });

    const confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmCancel);

    const cancelBtn = document.getElementById('cancelCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeCancelModal);

    const overlay = document.getElementById('cancelModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'cancelModalOverlay') closeCancelModal();
        });
    }
});