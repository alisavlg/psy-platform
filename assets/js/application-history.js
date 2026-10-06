// ============================================
// ИСТОРИЯ ЗАЯВКИ НА РОЛЬ ПСИХОЛОГА
// ============================================

console.log('[application-history.js] loaded');

var STATUS_LABELS_HIST = {
    pending: 'Подана на проверку',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    attention: 'Требует внимания'
};

var STATUS_COLORS_HIST = {
    pending: '#4a90e2',
    approved: '#2ecc71',
    rejected: '#e74c3c',
    attention: '#f39c12'
};

function getCurrentUserHist() {
    try {
        return JSON.parse(localStorage.getItem('psyhelp_user')) || {};
    } catch (e) { return {}; }
}

function escapeHtmlHist(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function formatDateTimeHist(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return day + '.' + month + '.' + year + ' ' + h + ':' + m;
}

async function waitForSupaHist(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

async function loadMyApplication() {
    var user = getCurrentUserHist();
    if (!user.id) return null;

    var result = await window.supa
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

    if (result.error || !result.data || result.data.length === 0) {
        return null;
    }
    return result.data[0];
}

async function loadHistory(appId) {
    if (!appId) return [];
    var result = await window.supa
        .from('application_events')
        .select('*')
        .eq('application_id', appId)
        .order('created_at', { ascending: true });

    if (result.error) {
        console.error('[application-history] history error:', result.error);
        return [];
    }
    return result.data || [];
}

function render(app, history) {
    var el = document.getElementById('historyContent');
    if (!el) return;

    if (!app) {
        el.innerHTML =
            '<div class="placeholder" style="text-align:center;padding:60px 20px;">' +
                '<h2 style="color:#333;">Заявок пока нет</h2>' +
                '<p style="color:#777;margin-top:12px;">Вы ещё не подавали заявку на роль психолога.</p>' +
                '<div style="margin-top:24px;">' +
                    '<a href="become-psychologist.html" style="display:inline-block;background:#4a90e2;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">Подать заявку →</a>' +
                '</div>' +
            '</div>';
        return;
    }

    var statusLabel = STATUS_LABELS_HIST[app.status] || app.status;
    var statusColor = STATUS_COLORS_HIST[app.status] || '#999';

    // Текущее состояние заявки
    var html =
        '<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">' +
                '<div>' +
                    '<div style="font-size:13px;color:#888;margin-bottom:4px;">Текущий статус</div>' +
                    '<div style="font-size:20px;font-weight:700;color:' + statusColor + ';">' + escapeHtmlHist(statusLabel) + '</div>' +
                '</div>' +
                '<div style="text-align:right;font-size:13px;color:#888;">' +
                    '<div>Подана: ' + formatDateTimeHist(app.created_at) + '</div>' +
                    (app.reviewed_at ? '<div>Решение: ' + formatDateTimeHist(app.reviewed_at) + '</div>' : '') +
                '</div>' +
            '</div>' +
            (app.moderator_comment
                ? '<div style="margin-top:16px;padding:12px 16px;background:#f8f9fb;border-radius:10px;color:#555;font-size:14px;white-space:pre-wrap;">' +
                    '<strong style="display:block;margin-bottom:6px;color:#333;">Комментарий модератора:</strong>' +
                    escapeHtmlHist(app.moderator_comment) +
                  '</div>'
                : '') +
            '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">' +
                '<div style="font-size:13px;color:#888;margin-bottom:8px;">Данные заявки</div>' +
                '<div style="font-size:14px;color:#333;">' +
                    '<strong>Специализация:</strong> ' + escapeHtmlHist(app.specialty || '—') + '<br>' +
                    '<strong>Стаж:</strong> ' + (app.experience || 0) + ' лет<br>' +
                    '<strong>Цена сессии:</strong> ' + (app.price || 0) + ' ₽' +
                '</div>' +
            '</div>' +
        '</div>';
        // Кнопка «Редактировать» — если статус позволяет
    if (app.status === 'pending' || app.status === 'attention' || app.status === 'rejected') {
        var btnLabel = app.status === 'rejected' ? 'Подать заново' : 'Редактировать заявку';
        html +=
            '<div style="margin-bottom:20px;">' +
                '<a href="become-psychologist.html" style="display:inline-block;background:#4a90e2;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">' +
                    btnLabel + ' →' +
                '</a>' +
            '</div>';
    }


    // Таймлайн
    html +=
        '<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
            '<h2 style="font-size:18px;margin:0 0 20px;color:#333;">Хронология</h2>';

    if (history.length === 0) {
        html += '<p style="color:#888;">События пока не записаны.</p>';
    } else {
        html += '<div style="position:relative;">';
        history.forEach(function (h, i) {
            var lbl = STATUS_LABELS_HIST[h.status] || h.status;
            var col = STATUS_COLORS_HIST[h.status] || '#999';
            var isLast = (i === history.length - 1);

            html +=
                '<div style="position:relative;padding-left:32px;padding-bottom:' + (isLast ? '0' : '24px') + ';">';
            // вертикальная линия
            if (!isLast) {
                html += '<div style="position:absolute;left:9px;top:20px;bottom:0;width:2px;background:#e0e7ef;"></div>';
            }
            // точка
            html += '<div style="position:absolute;left:0;top:2px;width:20px;height:20px;border-radius:50%;background:' + col + ';border:3px solid #fff;box-shadow:0 0 0 1px ' + col + ';"></div>';

            html +=
                    '<div style="font-size:13px;color:#888;">' + formatDateTimeHist(h.created_at) + '</div>' +
                    '<div style="font-size:15px;font-weight:600;color:' + col + ';margin-top:2px;">' + escapeHtmlHist(lbl) + '</div>' +
                    (h.comment
                        ? '<div style="margin-top:8px;padding:10px 14px;background:#f8f9fb;border-radius:8px;color:#555;font-size:14px;white-space:pre-wrap;">' + escapeHtmlHist(h.comment) + '</div>'
                        : '') +
                '</div>';
        });
        html += '</div>';
    }

    html += '</div>';

    el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async function () {
    var ready = await waitForSupaHist(50);
    if (!ready) {
        var el = document.getElementById('historyContent');
        if (el) el.innerHTML = '<div class="placeholder"><p>Ошибка соединения</p></div>';
        return;
    }

    var app = await loadMyApplication();
    var history = app ? await loadHistory(app.id) : [];
    render(app, history);
});