// ============================================
// СЕССИИ ПСИХОЛОГА — из Supabase
// ============================================

console.log('[psychologist-sessions.js] loaded');

const STATUS_LABELS_PSY = {
    confirmed: 'Подтверждена',
    completed: 'Проведена',
    cancelled: 'Отменена',
    rescheduled: 'Перенесена'
};

let psySessionsTab = 'upcoming';
let cachedPsySessions = [];
let myPsyProfileId = null;

// ============================================
// Supabase helper
// ============================================

async function waitForSupaPS(maxAttempts) {
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

// ============================================
// Найти мой профиль психолога
// ============================================

async function loadMyPsychologistProfile() {
    var userId = getCurrentUserId();
    if (!userId || !window.supa) return null;

    try {
        var result = await window.supa
            .from('psychologist_profiles')
            .select('id, first_name, middle_name')
            .eq('user_id', userId)
            .single();

        if (result.error || !result.data) {
            console.log('[psy-sessions] профиль психолога не найден');
            return null;
        }

        myPsyProfileId = result.data.id;
        return result.data;
    } catch (err) {
        console.error('[psy-sessions] ошибка загрузки профиля:', err);
        return null;
    }
}

// ============================================
// Загрузка сессий психолога
// ============================================

async function loadPsySessions() {
    if (!myPsyProfileId || !window.supa) return [];

    try {
        var result = await window.supa
            .from('sessions')
            .select('*')
            .eq('psychologist_id', myPsyProfileId)
            .order('date', { ascending: true })
            .order('hour', { ascending: true });

        if (result.error) {
            console.error('[psy-sessions] ошибка загрузки:', result.error);
            return [];
        }

        return result.data || [];
    } catch (err) {
        console.error('[psy-sessions] исключение:', err);
        return [];
    }
}

// ============================================
// Разделение
// ============================================

function getSessionDateTime(session) {
    var parts = session.date.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), session.hour, 0, 0);
}

function isUpcomingPsy(session) {
    var dt = getSessionDateTime(session);
    return dt > new Date() && session.status === 'confirmed';
}

function isPastPsy(session) {
    return !isUpcomingPsy(session);
}

// ============================================
// Отрисовка
// ============================================

async function renderPsySessions(tab) {
    if (tab) psySessionsTab = tab;

    var listEl = document.getElementById('psySessionsList');
    if (!listEl) return;

    document.querySelectorAll('.psy-session-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === psySessionsTab);
    });

    listEl.innerHTML = '<div class="sessions-empty">Загрузка...</div>';

    if (!myPsyProfileId) {
        var profile = await loadMyPsychologistProfile();
        if (!profile) {
            listEl.innerHTML =
                '<div class="sessions-empty">' +
                    '<div class="sessions-empty-icon">👤</div>' +
                    '<p>У вас нет профиля психолога</p>' +
                '</div>';
            return;
        }
    }

    cachedPsySessions = await loadPsySessions();

    var all = cachedPsySessions.slice();
    all.sort(function (a, b) {
        return getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime();
    });

    var filtered;
    if (psySessionsTab === 'upcoming') {
        filtered = all.filter(isUpcomingPsy);
    } else {
        filtered = all.filter(isPastPsy).reverse();
    }

    var countUpcoming = all.filter(isUpcomingPsy).length;
    var countPast = all.filter(isPastPsy).length;
    var elUpcoming = document.getElementById('psyCountUpcoming');
    var elPast = document.getElementById('psyCountPast');
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
        var card = document.createElement('div');
        card.className = 'session-item';
        card.setAttribute('data-session-id', session.id);

        var dt = getSessionDateTime(session);
        var dateFormatted = formatHumanDate(dt);
        var timeFormatted = String(session.hour).padStart(2, '0') + ':00';
        var statusLabel = STATUS_LABELS_PSY[session.status] || session.status;
        var statusClass = session.status;

        var clientName = session.client_name || 'Клиент';
        var clientCode = session.client_code || '—';

        var actionsHtml = '';

        if (psySessionsTab === 'upcoming' && session.status === 'confirmed') {
            var now = new Date();
            var diffMinutes = (now.getTime() - dt.getTime()) / 60000;
            var canComplete = diffMinutes >= 0;
            var canJoin = diffMinutes <= 5 && diffMinutes >= -120;

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

            actionsHtml +=
                '<button class="session-btn session-btn-cancel" ' +
                    'data-action="cancel" data-id="' + session.id + '">Отменить</button>';
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
                var action = btn.dataset.action;
                var id = btn.dataset.id;
                if (action === 'complete') completeSession(id);
                if (action === 'chat') chatWithClient(id);
                if (action === 'cancel') openPsyCancelModal(id);
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
// Действия
// ============================================

async function completeSession(id) {
    if (!confirm('Отметить сессию как проведённую?')) return;

    try {
        var result = await window.supa
            .from('sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (result.error) {
            console.error('[psy-sessions] complete error:', result.error);
            alert('Ошибка: ' + result.error.message);
            return;
        }

        // Убираем session-событие из календаря психолога
        await window.supa
            .from('events')
            .delete()
            .eq('session_id', id)
            .eq('owner_id', getCurrentUserId());

        await renderPsySessions();
        alert('Сессия отмечена как проведённая.');
    } catch (err) {
        console.error('[psy-sessions] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
    }
}

function chatWithClient(id) {
    alert('💬 Чат появится в следующих обновлениях.\n\nДля связи используйте раздел «Сообщения».');
}

// ============================================
// Отмена сессии психологом
// ============================================

var psyCancellingId = null;

function openPsyCancelModal(id) {
    var session = cachedPsySessions.find(function (s) { return s.id === id; });
    if (!session) return;

    psyCancellingId = id;

    var dt = getSessionDateTime(session);
    var overlay = document.getElementById('cancelModalOverlay');
    var summaryEl = document.getElementById('cancelSummary');
    var reasonEl = document.getElementById('cancelReason');
    if (!overlay || !summaryEl) return;

    var dateFormatted = formatHumanDate(dt);
    var timeFormatted = String(session.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<div class="cancel-row">' +
            '<span>Сессия с клиентом</span>' +
            '<strong>' + escapeHtml(session.client_name || 'Клиент') + '</strong>' +
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
        '<div class="cancel-refund full">' +
            'Отмена со стороны психолога — <strong>клиенту возврат 100%</strong>, ' +
            'независимо от срока. Так правильно.' +
        '</div>';

    if (reasonEl) reasonEl.value = '';
    overlay.classList.add('active');
}

function closePsyCancelModal() {
    var overlay = document.getElementById('cancelModalOverlay');
    if (overlay) overlay.classList.remove('active');
    psyCancellingId = null;
}

async function confirmPsyCancel() {
    if (!psyCancellingId) return;

    var reason = document.getElementById('cancelReason').value.trim();
    var session = cachedPsySessions.find(function (s) { return s.id === psyCancellingId; });
    if (!session) return;

    var clientUserId = session.client_id;

    // 1. Обновляем сессию
    try {
        var updateResult = await window.supa
            .from('sessions')
            .update({
                status: 'cancelled',
                cancel_reason: reason,
                cancelled_by: 'psychologist',
                cancelled_at: new Date().toISOString(),
                refund_percent: 100
            })
            .eq('id', psyCancellingId);

        if (updateResult.error) {
            console.error('[psy-sessions] cancel error:', updateResult.error);
            alert('Ошибка: ' + updateResult.error.message);
            return;
        }
    } catch (err) {
        console.error('[psy-sessions] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
        return;
    }

    // 2. Возвращаем free-слот в календарь психолога
    try {
        await window.supa.from('events').insert({
            owner_id: null,
            psychologist_id: session.psychologist_id,
            title: 'Свободно',
            date: session.date,
            hour: session.hour,
            category: 'free'
        });
    } catch (err) {
        console.warn('[psy-sessions] restore slot error:', err);
    }

    // 3. Удаляем события из календарей — своего и клиента
    try {
        await window.supa.from('events').delete().eq('session_id', psyCancellingId);
    } catch (err) {
        console.warn('[psy-sessions] delete events error:', err);
    }

    // 4. Уведомление клиенту
    if (clientUserId) {
        try {
            var me = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
            var psyName = ((me.realFirstName || '') + ' ' + (me.realMiddleName || '')).trim() || 'Психолог';
            var notifKey = 'psyhelp_notifications_' + clientUserId;
            var notifList = JSON.parse(localStorage.getItem(notifKey)) || [];
            if (!Array.isArray(notifList)) notifList = [];
            notifList.unshift({
                id: 'notif-' + Date.now() + '-cancel-psy',
                type: 'session_cancelled',
                title: 'Сессия отменена психологом',
                text: 'Психолог: ' + psyName + '. Дата: ' + session.date + ' в ' + String(session.hour).padStart(2, '0') + ':00. Возврат: 100%.' +
                      (reason ? ' Причина: ' + reason : ''),
                link: 'client.html?section=sessions&highlight=' + encodeURIComponent(session.id),
                createdAt: Date.now(),
                isRead: false
            });
            localStorage.setItem(notifKey, JSON.stringify(notifList));
        } catch (e) {
            console.warn('[psy-sessions] notif client error:', e);
        }
    }

    closePsyCancelModal();
    await renderPsySessions();
    alert('Сессия отменена. Клиенту возврат 100%.');
}

// ============================================
// Очистка истории
// ============================================

async function clearOldHistory() {
    if (!confirm('Очистить историю? Все отменённые и завершённые сессии будут удалены.')) return;

    if (!myPsyProfileId) return;

    var toRemoveIds = cachedPsySessions
        .filter(function (s) { return s.status === 'cancelled' || s.status === 'completed'; })
        .map(function (s) { return s.id; });

    if (toRemoveIds.length === 0) {
        alert('История пуста.');
        return;
    }

    try {
        var result = await window.supa.from('sessions').delete().in('id', toRemoveIds);
        if (result.error) {
            console.error('[psy-sessions] clear error:', result.error);
            alert('Ошибка: ' + result.error.message);
            return;
        }

        await renderPsySessions();
        alert('История очищена.');
    } catch (err) {
        console.error('[psy-sessions] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
    }
}

// ============================================
// Утилиты
// ============================================

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

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    await waitForSupaPS(50);

    // Загружаем профиль психолога и сессии
    await renderPsySessions();

    document.querySelectorAll('.psy-session-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            renderPsySessions(btn.dataset.tab);
        });
    });

    var clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearOldHistory);

    var confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmPsyCancel);

    var cancelBtn = document.getElementById('cancelCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closePsyCancelModal);

    var overlay = document.getElementById('cancelModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'cancelModalOverlay') closePsyCancelModal();
        });
    }
});