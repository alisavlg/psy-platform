// ============================================
// АДМИНКА — заявки на роль психолога (Supabase)
// ============================================

console.log('[admin.js] loaded');

var currentApps = [];
var currentAppId = null;

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function formatDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s) {
    return {
        pending: 'На проверке',
        approved: 'Одобрена',
        rejected: 'Отклонена',
        attention: 'Требует внимания'
    }[s] || s;
}

async function waitForSupa(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

async function loadApplications() {
    try {
        var result = await window.supa
            .from('applications')
            .select('*')
            .in('status', ['pending', 'attention'])
            .order('created_at', { ascending: false });

        if (result.error) {
            console.error('[admin] ошибка загрузки:', result.error);
            return [];
        }
        return result.data || [];
    } catch (err) {
        console.error('[admin] исключение:', err);
        return [];
    }
}

function render() {
    var listEl = document.getElementById('mainContent');
    if (!listEl) return;

    var badge = document.getElementById('appsBadge');
    if (badge) {
        var pending = currentApps.filter(function (a) { return a.status === 'pending'; }).length;
        badge.textContent = pending || '';
    }

    if (currentApps.length === 0) {
        listEl.innerHTML = '<div class="admin-empty">Активных заявок нет.</div>';
        return;
    }

    var html = '<div class="admin-list">';
    currentApps.forEach(function (a) {
        html +=
            '<div class="admin-card ' + a.status + '">' +
                '<div class="admin-card-main">' +
                    '<div class="admin-card-name">' + escapeHtml(a.user_name || 'Клиент') + '</div>' +
                    '<div class="admin-card-meta">' +
                        '<span class="admin-card-code">' + escapeHtml(a.user_code || '') + '</span>' +
                        '<span>' + escapeHtml(a.specialty || '') + '</span>' +
                        '<span>' + (a.experience || 0) + ' лет</span>' +
                        '<span>' + (a.price || 0) + ' ₽</span>' +
                        '<span class="admin-card-date">' + formatDate(a.created_at) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="admin-card-actions">' +
                    '<span class="admin-card-status ' + a.status + '">' + statusLabel(a.status) + '</span>' +
                    '<button class="admin-btn admin-btn-approve" data-action="open" data-id="' + a.id + '">Открыть →</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    listEl.innerHTML = html;

    listEl.querySelectorAll('[data-action="open"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            openAppModal(btn.dataset.id);
        });
    });
}

function openAppModal(appId) {
    var a = currentApps.find(function (x) { return x.id === appId; });
    if (!a) return;
    currentAppId = appId;

    var overlay = document.getElementById('appModal');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend',
            '<div class="admin-modal-overlay" id="appModal">' +
                '<div class="admin-modal">' +
                    '<div class="admin-modal-header">' +
                        '<h3>Заявка на роль психолога</h3>' +
                        '<button class="admin-modal-close" id="appModalClose">✕</button>' +
                    '</div>' +
                    '<div class="admin-modal-body" id="appModalBody"></div>' +
                    '<div class="admin-modal-actions" id="appModalActions"></div>' +
                '</div>' +
            '</div>');
        overlay = document.getElementById('appModal');

        document.getElementById('appModalClose').addEventListener('click', closeAppModal);
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'appModal') closeAppModal();
        });
    }

    var body = document.getElementById('appModalBody');
    body.innerHTML =
        '<div class="admin-field">' +
            var avatarHtml = a.avatar_url
        ? '<img src="' + a.avatar_url + '" style="width:80px;height:80px;object-fit:cover;border-radius:12px;margin-bottom:12px;">'
        : '<div style="width:80px;height:80px;border-radius:12px;background:#eee;display:inline-flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin-bottom:12px;">нет фото</div>';

    var body = document.getElementById('appModalBody');
    body.innerHTML =
        avatarHtml +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Клиент</div>' +
            '<div class="admin-field-label">Клиент</div>' +
            '<div class="admin-field-value">' + escapeHtml(a.user_name || 'Клиент') +
                ' <span style="color:#999;font-size:13px;">' + escapeHtml(a.user_code || '') + '</span></div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Специализация</div>' +
            '<div class="admin-field-value">' + escapeHtml(a.specialty || '—') + '</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Стаж</div>' +
            '<div class="admin-field-value">' + (a.experience || 0) + ' лет</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Цена за сессию</div>' +
            '<div class="admin-field-value">' + (a.price || 0) + ' ₽</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Описание для каталога</div>' +
            '<div class="admin-field-value">' + escapeHtml(a.description || '—') + '</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">О себе (для модератора)</div>' +
            '<div class="admin-field-value">' + escapeHtml(a.about || '—') + '</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Комментарий клиенту (обязателен при отклонении / доработке)</div>' +
            '<textarea id="appModalComment" class="admin-reject-reason" placeholder="Что не так, что нужно исправить или догрузить...">' +
                escapeHtml(a.moderator_comment || '') +
            '</textarea>' +
        '</div>';

    var actions = document.getElementById('appModalActions');
    actions.innerHTML =
        '<button class="admin-btn admin-btn-cancel" id="appBtnAttention">Требует внимания</button>' +
        '<button class="admin-btn admin-btn-cancel" id="appBtnReject" style="background:#e74c3c;color:#fff;">Отклонить</button>' +
        '<button class="admin-btn admin-btn-approve" id="appBtnApprove">Одобрить</button>';

    document.getElementById('appBtnApprove').addEventListener('click', function () { handleDecision('approve'); });
    document.getElementById('appBtnReject').addEventListener('click', function () { handleDecision('reject'); });
    document.getElementById('appBtnAttention').addEventListener('click', function () { handleDecision('attention'); });

    overlay.classList.add('open');
}

function closeAppModal() {
    var overlay = document.getElementById('appModal');
    if (overlay) overlay.classList.remove('open');
    currentAppId = null;
}

async function handleDecision(action) {
    if (!currentAppId) return;

    var commentEl = document.getElementById('appModalComment');
    var comment = commentEl ? commentEl.value.trim() : '';

    if ((action === 'reject' || action === 'attention') && !comment) {
        alert('Напишите комментарий клиенту.');
        return;
    }

    var rpcName = action === 'approve' ? 'approve_application'
                : action === 'reject'  ? 'reject_application'
                :                        'request_attention';

    try {
        var result = await window.supa.rpc(rpcName, {
            app_id: currentAppId,
            moderator_comment: comment || null
        });

        if (result.error) {
            console.error('[admin] rpc error:', result.error);
            alert('Ошибка: ' + result.error.message);
            return;
        }

        closeAppModal();
        await reload();
    } catch (err) {
        console.error('[admin] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
    }
}

async function reload() {
    currentApps = await loadApplications();
    render();
}

document.addEventListener('DOMContentLoaded', async function () {
    var ready = await waitForSupa(50);
    if (!ready) {
        alert('Не удалось подключиться к серверу.');
        return;
    }

    // Скрыть вкладки «Мои задачи» и «Решения»
    var hideTabs = ['tasks', 'decisions'];
    hideTabs.forEach(function (t) {
        var el = document.querySelector('[data-tab="' + t + '"]');
        if (el) el.style.display = 'none';
    });

    // Скрыть role-switcher
    var rs = document.querySelector('.role-switcher');
    if (rs) rs.style.display = 'none';

    await reload();
});