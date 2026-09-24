// ============================================
// УВЕДОМЛЕНИЯ — единый модуль
// ============================================

console.log('[notifications.js] loaded');

(function () {
    'use strict';

    function getUserId() {
        try {
            var u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
            return u.id || 'anonymous';
        } catch (e) { return 'anonymous'; }
    }

    function getKey() {
        return 'psyhelp_notifications_' + getUserId();
    }

    function getAll() {
        try {
            var raw = localStorage.getItem(getKey());
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    }

    function saveAll(list) {
        localStorage.setItem(getKey(), JSON.stringify(list));
    }

    function add(data) {
        if (!data || !data.type) return;
        var list = getAll();
        list.unshift({
            id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            type: data.type,
            title: data.title || 'Уведомление',
            text: data.text || '',
            link: data.link || '',
            createdAt: Date.now(),
            isRead: false
        });
        saveAll(list);
        render();
    }

    function markAllRead() {
        var list = getAll();
        list.forEach(function (n) { n.isRead = true; });
        saveAll(list);
        render();
    }

    function markRead(id) {
        var list = getAll();
        var n = list.find(function (x) { return x.id === id; });
        if (n) n.isRead = true;
        saveAll(list);
        render();
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function timeAgo(ts) {
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'только что';
        if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
        if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
        if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
        return new Date(ts).toLocaleDateString('ru-RU');
    }

    function iconFor(type) {
        var icons = {
            application_approved: '✅',
            application_rejected: '❌',
            application_needs_changes: '✏️',
            application_needs_documents: '📄',
            session_booked: '📅',
            session_cancelled: '🚫',
            session_reminder_24: '⏰',
            session_reminder_1: '🔔'
        };
        return icons[type] || '🔔';
    }

    function mountWidget() {
        var actionsEl = document.querySelector('.topbar-actions');
        if (!actionsEl) return;

        var oldBtn = actionsEl.querySelector('.icon-btn[aria-label="Уведомления"]');
        if (oldBtn) oldBtn.remove();

        var oldWidget = actionsEl.querySelector('.notif-widget');
        if (oldWidget) oldWidget.remove();

        var html =
            '<div class="notif-widget" id="notifWidget">' +
                '<button class="icon-btn notif-trigger" id="notifTrigger" type="button" aria-label="Уведомления">' +
                    '🔔' +
                    '<span class="notif-badge" id="notifBadge"></span>' +
                '</button>' +
                '<div class="notif-dropdown" id="notifDropdown">' +
                    '<div class="notif-header">' +
                        '<span>Уведомления</span>' +
                        '<button type="button" class="notif-mark-all" id="notifMarkAll">Прочитать все</button>' +
                    '</div>' +
                    '<div class="notif-list" id="notifList"></div>' +
                '</div>' +
            '</div>';

        actionsEl.insertAdjacentHTML('afterbegin', html);

        var trigger = document.getElementById('notifTrigger');
        var widget = document.getElementById('notifWidget');
        var markAllBtn = document.getElementById('notifMarkAll');

        if (trigger && widget) {
            trigger.addEventListener('click', function (e) {
                e.stopPropagation();
                widget.classList.toggle('open');
            });
        }

        document.addEventListener('click', function (e) {
            if (widget && !widget.contains(e.target)) widget.classList.remove('open');
        });

        if (markAllBtn) {
            markAllBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                markAllRead();
            });
        }
    }

    function render() {
        var badge = document.getElementById('notifBadge');
        var listEl = document.getElementById('notifList');
        if (!badge || !listEl) return;

        var list = getAll();
        var unread = list.filter(function (n) { return !n.isRead; }).length;

        badge.textContent = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
        badge.style.display = unread > 0 ? '' : 'none';

        if (list.length === 0) {
            listEl.innerHTML = '<div class="notif-empty">Уведомлений пока нет</div>';
            return;
        }

        var html = '';
        list.forEach(function (n) {
            var cls = 'notif-item' + (n.isRead ? '' : ' notif-unread');
            html += '<div class="' + cls + '" data-id="' + escapeHtml(n.id) + '" data-link="' + escapeHtml(n.link) + '">' +
                '<div class="notif-icon">' + iconFor(n.type) + '</div>' +
                '<div class="notif-body">' +
                    '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
                    (n.text ? '<div class="notif-text">' + escapeHtml(n.text) + '</div>' : '') +
                    '<div class="notif-time">' + timeAgo(n.createdAt) + '</div>' +
                '</div>' +
            '</div>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.notif-item').forEach(function (item) {
            item.addEventListener('click', function () {
                markRead(item.dataset.id);
                if (item.dataset.link) window.location.href = item.dataset.link;
            });
        });
    }

    // ============================================
    // НАПОМИНАНИЯ О СЕССИЯХ
    // за 24 часа и за 1 час
    // ============================================

    function addNotifForUser(userId, notif) {
        var key = 'psyhelp_notifications_' + userId;
        try {
            var list = JSON.parse(localStorage.getItem(key)) || [];
            if (!Array.isArray(list)) list = [];
            list.unshift({
                id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                type: notif.type,
                title: notif.title,
                text: notif.text || '',
                link: notif.link || '',
                createdAt: Date.now(),
                isRead: false
            });
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
    }

    function checkReminders() {
        var userId = getUserId();
        if (!userId || userId === 'anonymous') return;

        var sessionsKey = 'psyhelp_sessions_' + userId;
        var data = localStorage.getItem(sessionsKey);
        if (!data) return;

        var sessions;
        try {
            sessions = JSON.parse(data);
            if (!Array.isArray(sessions)) return;
        } catch (e) { return; }

        var changed = false;
        var now = Date.now();

        sessions.forEach(function (s) {
            if (s.status !== 'confirmed') return;
            if (!s.date || s.hour === undefined) return;

            var parts = s.date.split('-');
            var sessionDate = new Date(
                parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
                s.hour, 0, 0
            ).getTime();

            var hoursLeft = (sessionDate - now) / 3600000;

            // За 24 часа (24 >= hoursLeft > 1)
            if (hoursLeft <= 24 && hoursLeft > 1 && !s.remind24Sent) {
                var isClient = s.psychologistName && !s.clientName;
                var who = '';
                if (s.psychologistName) who = 'с ' + s.psychologistName;
                else if (s.clientName) who = 'с ' + s.clientName;

                addNotifForUser(userId, {
                    type: 'session_reminder_24',
                    title: 'Напоминание: сессия завтра',
                    text: (who ? 'Сессия ' + who + ' — ' : 'Сессия — ') +
                          formatDateHuman(s.date) + ' в ' + String(s.hour).padStart(2, '0') + ':00. ' +
                          'Отмена менее чем за 24 часа — возврат 50%.',
                    link: 'client.html?section=sessions&highlight=' + encodeURIComponent(s.id)
                });
                s.remind24Sent = true;
                changed = true;
            }

            // За 1 час (1 >= hoursLeft > -1)
            if (hoursLeft <= 1 && hoursLeft > -1 && !s.remind1Sent) {
                addNotifForUser(userId, {
                    type: 'session_reminder_1',
                    title: 'Сессия через час',
                    text: formatDateHuman(s.date) + ' в ' + String(s.hour).padStart(2, '0') + ':00. ' +
                          'Отмена менее чем за час — без возврата.',
                    link: 'client.html?section=sessions&highlight=' + encodeURIComponent(s.id)
                });
                s.remind1Sent = true;
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
            render();
        }
    }

    function formatDateHuman(dateStr) {
        var months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
        var parts = dateStr.split('-');
        var d = parseInt(parts[2]);
        var m = parseInt(parts[1]) - 1;
        return d + ' ' + months[m];
    }

    window.Notifications = {
        add: add,
        getAll: getAll,
        markAllRead: markAllRead,
        markRead: markRead,
        render: render,
        addForUser: addNotifForUser,
        checkReminders: checkReminders
    };

    function boot() {
        mountWidget();
        render();
        checkReminders();
        setInterval(function () {
            render();
            checkReminders();
        }, 5 * 60 * 1000); // каждые 5 минут
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();