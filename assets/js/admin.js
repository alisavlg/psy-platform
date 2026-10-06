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

function waitForSupaAdmin(maxAttempts) {
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

    var avatarHtml = a.avatar_url
        ? '<img src="' + a.avatar_url + '" style="width:96px;height:96px;object-fit:cover;border-radius:12px;margin-bottom:16px;">'
        : '<div style="width:96px;height:96px;border-radius:12px;background:#eee;display:inline-flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin-bottom:16px;">нет фото</div>';

    var body = document.getElementById('appModalBody');
    body.innerHTML =
        avatarHtml +
        '<div class="admin-field">' +
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
                (a.qualifications
            ? '<div class="admin-field">' +
                '<div class="admin-field-label">Квалификация и достижения</div>' +
                '<div class="admin-field-value">' + escapeHtml(a.qualifications) + '</div>' +
              '</div>'
            : '') +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Документы</div>' +
            '<div class="admin-field-value" id="appModalDocs"></div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Комментарий клиенту (обязателен при отклонении / доработке)</div>' +
            '<textarea id="appModalComment" class="admin-reject-reason" placeholder="Что не так, что нужно исправить или догрузить...">' +
                escapeHtml(a.moderator_comment || '') +
            '</textarea>' +
        '</div>';
    
        // История заявки — подгружаем асинхронно
    (async function () {
        var histRes = await window.supa
            .from('application_events')
            .select('status, comment, created_at, author_id')
            .eq('application_id', appId)
            .order('created_at', { ascending: true });

        if (histRes.error || !histRes.data || histRes.data.length <= 1) return;

        var html =
            '<div class="admin-field" style="margin-top:20px;border-top:1px solid #ddd;padding-top:16px;">' +
                '<div class="admin-field-label">История заявки</div>' +
                '<div style="font-size:13px;color:#555;">';

        histRes.data.forEach(function (h) {
            var d = new Date(h.created_at);
            var dateStr = d.toLocaleDateString('ru-RU') + ' ' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0');
            var lbl = {
                pending: 'Подана',
                approved: 'Одобрена',
                rejected: 'Отклонена',
                attention: 'Требует внимания'
            }[h.status] || h.status;
            html +=
                '<div style="padding:8px 0;border-bottom:1px solid #eee;">' +
                    '<div><strong>' + dateStr + '</strong> — ' + escapeHtml(lbl) + '</div>' +
                    (h.comment ? '<div style="color:#777;margin-top:4px;">«' + escapeHtml(h.comment) + '»</div>' : '') +
                '</div>';
        });

        html += '</div></div>';

        var bodyEl = document.getElementById('appModalBody');
        if (bodyEl) bodyEl.insertAdjacentHTML('beforeend', html);
    })(); 
    
        // Документы — рисуем отдельно
    (function renderDocs() {
        var docsEl = document.getElementById('appModalDocs');
        if (!docsEl) return;

        var docs = a.documents;
        if (!Array.isArray(docs)) {
            try { docs = JSON.parse(a.documents || '[]'); } catch (e) { docs = []; }
        }
        if (!docs || docs.length === 0) {
            docsEl.innerHTML = '<span style="color:#999;">Нет документов</span>';
            return;
        }

        var groupLabels = {
            diplomas:     '📜 Дипломы',
            certificates: '🏆 Сертификаты',
            practice:     '🧠 Практика',
            other:        '📎 Другое'
        };

        var grouped = { diplomas: [], certificates: [], practice: [], other: [] };
        docs.forEach(function (d) {
            if (grouped[d.type]) grouped[d.type].push(d);
        });

        var html = '';
        Object.keys(grouped).forEach(function (cat) {
            var arr = grouped[cat];
            if (arr.length === 0) return;
            html += '<div style="margin-bottom:12px;">' +
                '<div style="font-weight:600;font-size:13px;color:#333;margin-bottom:6px;">' +
                    groupLabels[cat] + ' (' + arr.length + ')' +
                '</div>';
            arr.forEach(function (d) {
                var isPdf = (d.name || '').toLowerCase().endsWith('.pdf');
                html +=
                    '<a href="' + d.url + '" target="_blank" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8f9fb;border-radius:8px;margin-bottom:6px;text-decoration:none;color:#333;font-size:13px;">' +
                        '<span style="font-size:18px;">' + (isPdf ? '📄' : '🖼') + '</span>' +
                        '<span style="flex:1;">' + escapeHtml(d.name || 'Документ') + '</span>' +
                        '<span style="color:#999;font-size:12px;">' + ((d.size || 0) / 1024).toFixed(0) + ' КБ</span>' +
                    '</a>';
            });
            html += '</div>';
        });

        docsEl.innerHTML = html;
    })();

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

        // Уведомление клиенту
        var app = currentApps.find(function (x) { return x.id === currentAppId; });
        if (app && app.user_id && typeof window.Notifications !== 'undefined') {
            var notifMap = {
                approve: {
                    type: 'application_approved',
                    title: 'Заявка одобрена',
                    text: 'Ваша заявка на роль психолога одобрена. Кабинет психолога активирован.',
                    link: 'dashboard.html?section=calendar'
                },
                reject: {
                    type: 'application_rejected',
                    title: 'Заявка отклонена',
                    text: comment || 'Посмотрите комментарий в профиле.',
                    link: 'become-psychologist.html'
                },
                attention: {
                    type: 'application_attention',
                    title: 'Требует внимания',
                    text: comment || 'Посмотрите комментарий в профиле.',
                    link: 'become-psychologist.html'
                }
            };
            var notif = notifMap[action];
            if (notif) {
                try {
                    await window.supa.from('notifications').insert({
                        user_id: app.user_id,
                        type: notif.type,
                        title: notif.title,
                        text: notif.text,
                        link: notif.link
                    });
                } catch (e) {
                    console.warn('[admin] notification error:', e);
                }
            }
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
    var ready = await waitForSupaAdmin(50);
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

    // Убедиться, что вкладка «Заявки» активна
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (item) {
        item.classList.toggle('active', item.dataset.tab === 'applications');
    });

    await reload();
});