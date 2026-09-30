// ============================================
// РАЗДЕЛ «МОИ СЕССИИ» — из Supabase
// ============================================

console.log('[sessions.js] loaded');

const STATUS_LABELS = {
    confirmed: 'Подтверждена',
    completed: 'Проведена',
    cancelled: 'Отменена',
    rescheduled: 'Перенесена'
};

let sessionsTab = 'upcoming';
let cachedSessions = [];

async function waitForSupaSess(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || null;
    } catch (e) { return null; }
}

async function loadClientSessions() {
    var userId = getCurrentUserId();
    if (!userId || !window.supa) return [];

    try {
        var result = await window.supa
            .from('sessions')
            .select('*')
            .eq('client_id', userId)
            .order('date', { ascending: true })
            .order('hour', { ascending: true });

        if (result.error) {
            console.error('[sessions] ошибка загрузки:', result.error);
            return [];
        }
        return result.data || [];
    } catch (err) { return []; }
}

function getSessionDateTime(session) {
    var parts = session.date.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), session.hour, 0, 0);
}

function isUpcoming(session) {
    var dt = getSessionDateTime(session);
    var now = new Date();
    // Сессия считается активной в течение часа после начала
    var sessionEnd = new Date(dt.getTime() + 60 * 60000);
    return sessionEnd > now && session.status === 'confirmed';
}

function isPast(session) {
    return !isUpcoming(session);
}

async function renderSessions(tab) {
    if (tab) sessionsTab = tab;

    var listEl = document.getElementById('sessionsList');
    if (!listEl) return;

    document.querySelectorAll('.session-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === sessionsTab);
    });

    listEl.innerHTML = '<div class="sessions-empty">Загрузка...</div>';

    cachedSessions = await loadClientSessions();

    var all = cachedSessions.slice();
    all.sort(function (a, b) {
        return getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime();
    });

    var filtered;
    if (sessionsTab === 'upcoming') {
        filtered = all.filter(isUpcoming);
    } else {
        filtered = all.filter(isPast).reverse();
    }

    var countUpcoming = all.filter(isUpcoming).length;
    var countPast = all.filter(isPast).length;
    var elUpcoming = document.getElementById('countUpcoming');
    var elPast = document.getElementById('countPast');
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
        var card = document.createElement('div');
        card.className = 'session-item';
        card.setAttribute('data-session-id', session.id);

        var dt = getSessionDateTime(session);
        var dateFormatted = formatHumanDate(dt);
        var timeFormatted = String(session.hour).padStart(2, '0') + ':00';
        var statusLabel = STATUS_LABELS[session.status] || session.status;
        var statusClass = session.status;

        var actionsHtml = '';

        if (sessionsTab === 'upcoming' && session.status === 'confirmed') {
            var now = new Date();
            var diffMinutes = (dt.getTime() - now.getTime()) / 60000;
            var canJoin = diffMinutes <= 5 && diffMinutes >= -60;

            actionsHtml +=
                '<a class="session-btn session-btn-join" ' +
                    (canJoin ? '' : 'style="pointer-events:none;opacity:0.5;"') + ' ' +
                    'href="room.html?session=' + session.id + '&role=client" ' +
                    'target="_blank">' +
                    (canJoin ? 'Войти в комнату' : 'Комната откроется за 5 мин') +
                '</a>' +
                '<button class="session-btn session-btn-cancel" data-action="cancel" data-id="' + session.id + '">Отменить</button>' +
                '<a class="session-btn session-btn-profile" href="psychologist.html?id=' + session.psychologist_id + '">Профиль</a>';
        }

        // В Истории — только ссылка на профиль психолога
        if (sessionsTab === 'past' && session.status !== 'cancelled') {
            actionsHtml +=
                '<a class="session-btn session-btn-profile" href="psychologist.html?id=' + session.psychologist_id + '">Профиль психолога</a>';
        }

        card.innerHTML =
            '<div class="session-card-header">' +
                '<div class="session-card-psy">' +
                    '<div class="session-card-avatar">' + getInitials(session.psychologist_name) + '</div>' +
                    '<div>' +
                        '<div class="session-card-psy-name">' + escapeHtml(session.psychologist_name) + '</div>' +
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
                var action = btn.dataset.action;
                var id = btn.dataset.id;
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

var cancellingId = null;

function openCancelModal(id) {
    var session = cachedSessions.find(function (s) { return s.id === id; });
    if (!session) return;

    cancellingId = id;

    var dt = getSessionDateTime(session);
    var hoursLeft = (dt.getTime() - Date.now()) / 3600000;

    var refundPercent = 0;
    var refundText = '';
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

    var refundSum = Math.round(session.price * refundPercent / 100);
    var overlay = document.getElementById('cancelModalOverlay');
    var summaryEl = document.getElementById('cancelSummary');
    var reasonEl = document.getElementById('cancelReason');
    if (!overlay || !summaryEl) return;

    var dateFormatted = formatHumanDate(dt);
    var timeFormatted = String(session.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<div class="cancel-row">' +
            '<span>Сессия с</span>' +
            '<strong>' + escapeHtml(session.psychologist_name) + '</strong>' +
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
    var overlay = document.getElementById('cancelModalOverlay');
    if (overlay) overlay.classList.remove('active');
    cancellingId = null;
}

async function confirmCancel() {
    if (!cancellingId) return;

    var reason = document.getElementById('cancelReason').value.trim();
    var session = cachedSessions.find(function (s) { return s.id === cancellingId; });
    if (!session) return;

    var dt = getSessionDateTime(session);
    var hoursLeft = (dt.getTime() - Date.now()) / 3600000;
    var refundPercent = hoursLeft >= 48 ? 100 : (hoursLeft >= 24 ? 50 : 0);

    try {
        var updateResult = await window.supa
            .from('sessions')
            .update({
                status: 'cancelled',
                cancel_reason: reason,
                cancelled_by: 'client',
                cancelled_at: new Date().toISOString(),
                refund_percent: refundPercent
            })
            .eq('id', cancellingId);

        if (updateResult.error) {
            alert('Ошибка отмены: ' + updateResult.error.message);
            return;
        }
    } catch (err) {
        alert('Ошибка отмены');
        return;
    }

    try {
        await window.supa.from('events').insert({
            owner_id: null,
            psychologist_id: session.psychologist_id,
            title: 'Свободно',
            date: session.date,
            hour: session.hour,
            category: 'free'
        });
    } catch (err) {}

        try {
        await window.supa.from('events').delete().eq('session_id', cancellingId);
    } catch (err) {}

    // Уведомление психологу — в Supabase
    try {
        var psyProf = await window.supa
            .from('psychologist_profiles')
            .select('user_id')
            .eq('id', session.psychologist_id)
            .single();

        if (psyProf.data && psyProf.data.user_id) {
            var me = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
            var c1 = (me.displayFirstName || me.realFirstName || '').trim();
            var c2 = (me.displayMiddleName || me.realMiddleName || '').trim();
            var clientDisplayName = (c1 + ' ' + c2).trim() || 'Клиент';

            await window.supa.from('notifications').insert({
                user_id: psyProf.data.user_id,
                type: 'session_cancelled',
                title: 'Сессия отменена клиентом',
                text: 'Клиент: ' + clientDisplayName + '. Дата: ' + session.date + ' в ' + String(session.hour).padStart(2, '0') + ':00.' +
                      (reason ? ' Причина: ' + reason : ''),
                link: 'dashboard.html?section=sessions&highlight=' + encodeURIComponent(session.id)
            });
            console.log('[sessions] notif psy ok');
        }
    } catch (e) {
        console.warn('[sessions] notif psy error:', e);
    }

    closeCancelModal();
    await renderSessions();
    alert('Сессия отменена.');
}

function formatHumanDate(date) {
    var months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
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
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async function () {
    await waitForSupaSess(50);

    await renderSessions();

    document.querySelectorAll('.session-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            renderSessions(btn.dataset.tab);
        });
    });

    var confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmCancel);

    var cancelBtn = document.getElementById('cancelCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeCancelModal);

    var overlay = document.getElementById('cancelModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'cancelModalOverlay') closeCancelModal();
        });
    }
});