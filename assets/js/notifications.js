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
            session_reminder: '⏰'
        };
        return icons[type] || '🔔';
    }

    function mountWidget() {
        var actionsEl = document.querySelector('.topbar-actions');
        if (!actionsEl) return;

        // Удаляем старую кнопку уведомлений
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

    window.Notifications = {
        add: add,
        getAll: getAll,
        markAllRead: markAllRead,
        markRead: markRead,
        render: render
    };

    function boot() {
        mountWidget();
        render();
        setInterval(render, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();