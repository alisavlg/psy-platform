// ============================================
// БЛОК «СТАТЬ ПСИХОЛОГОМ» В ПРОФИЛЕ КЛИЕНТА
// ============================================

console.log('[become-block.js] loaded');

(function () {

    function getUser() {
        try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function formatDate(ts) {
        if (!ts) return '';
        var d = new Date(ts);
        return d.toLocaleDateString('ru-RU');
    }

    function statusLabelOf(s) {
        return {
            approved: 'Одобрена',
            rejected: 'Отклонена',
            needs_changes: 'Нужны изменения',
            needs_documents: 'Нужны документы'
        }[s] || s;
    }

    function renderBlock() {
        var block = document.getElementById('becomePsychologistBlock');
        if (!block) return;

        var user = getUser();
        var roles = Array.isArray(user.roles) ? user.roles : [];
        var status = user.psychologistStatus || 'none';
        var history = Array.isArray(user.psychologistHistory) ? user.psychologistHistory : [];

        // Уже психолог — блок скрыт
        if (roles.indexOf('psychologist') !== -1) {
            block.style.display = 'none';
            block.dataset.becomeKey = 'hidden';
            return;
        }

        block.style.display = '';

        // Ключ состояния — чтобы не перерисовывать без необходимости
        var app = user.psychologistApplication || {};
        var key = [status, history.length, app.finalDecisionReason || ''].join('|');
        if (block.dataset.becomeKey === key && block.querySelector('.become-psy-content')) {
            return;
        }
        block.dataset.becomeKey = key;

        var mainHtml = '';
        var actionHref = 'become-psychologist.html';

        if (status === 'pending' || status === 'in_review' || status === 'awaiting_decision') {
            mainHtml =
                '<div class="become-psy-content">' +
                    '<h3>⏳ Заявка на проверке</h3>' +
                    '<p>Мы проверяем документы. Это занимает 1–3 рабочих дня.</p>' +
                '</div>';
        } else if (status === 'rejected' || status === 'needs_changes' || status === 'needs_documents') {
            var reason = app.finalDecisionReason || '';
            var title = status === 'rejected' ? '❌ Заявка отклонена'
                       : status === 'needs_documents' ? '📄 Нужны документы'
                       : '✏️ Нужны изменения';
            var btnLabel = status === 'rejected' ? 'Подать заново' : 'Исправить и подать';

            mainHtml =
                '<div class="become-psy-content">' +
                    '<h3>' + title + '</h3>' +
                    (reason
                        ? '<div class="become-reason">' + escapeHtml(reason) + '</div>'
                        : '<p>Посмотрите историю заявок ниже.</p>') +
                    '<button type="button" class="btn-become-psy" data-become-go="1">' + btnLabel + ' →</button>' +
                '</div>';
        } else {
            mainHtml =
                '<div class="become-psy-content">' +
                    '<h3>Хотите помогать другим?</h3>' +
                    '<p>Подайте заявку на роль психолога. Мы проверим документы и проведём собеседование.</p>' +
                    '<button type="button" class="btn-become-psy" data-become-go="1">Стать психологом →</button>' +
                '</div>';
        }

        var historyHtml = '';
        if (history.length > 0) {
            historyHtml =
                '<div class="become-history">' +
                    '<div class="become-history-title">История заявок</div>' +
                    history.slice().reverse().map(function (h) {
                        return '<div class="become-history-item">' +
                            '<div class="become-history-row">' +
                                '<span class="become-history-status ' + escapeHtml(h.status) + '">' +
                                    escapeHtml(statusLabelOf(h.status)) +
                                '</span>' +
                                '<span class="become-history-date">' +
                                    formatDate(h.decidedAt || h.submittedAt) +
                                '</span>' +
                            '</div>' +
                            (h.specialty ? '<div class="become-history-spec">' + escapeHtml(h.specialty) + '</div>' : '') +
                            (h.reason ? '<div class="become-history-reason">' + escapeHtml(h.reason) + '</div>' : '') +
                        '</div>';
                    }).join('') +
                '</div>';
        }

        block.innerHTML = mainHtml + historyHtml;

        var btn = block.querySelector('[data-become-go]');
        if (btn) {
            btn.onclick = function () { window.location.href = actionHref; };
        }
    }

    // Отрисовка: сразу + поллинг (на случай, если profile.js перезапишет блок)
    function boot() {
        renderBlock();
        setTimeout(renderBlock, 200);
        setTimeout(renderBlock, 600);
        setInterval(renderBlock, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();