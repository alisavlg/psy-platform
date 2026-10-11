// ============================================
// РАЗДЕЛ «КЛИЕНТЫ» — из Supabase
// ============================================
// ПРАВИЛО ПЛАТФОРМЫ:
// Психолог НЕ видит телефон, email и фамилию клиента.
// Общение — только через внутренний чат платформы.

console.log('[clients.js] loaded');

var currentClients = [];
var currentClientId = null;
var myPsyProfileId = null;
var clientsFilter = '';

// ============================================
// Supabase helper
// ============================================

function cl_waitForSupa(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

function cl_getCurrentUserId() {
    try {
        var u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || null;
    } catch (e) { return null; }
}

async function cl_loadMyProfile() {
    var userId = cl_getCurrentUserId();
    if (!userId) return null;

    var result = await window.supa
        .from('psychologist_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (result.error || !result.data) return null;
    myPsyProfileId = result.data.id;
    return result.data;
}

// ============================================
// Загрузка клиентов — из sessions + chats
// ============================================

async function cl_loadClients() {
    if (!myPsyProfileId) return [];

    // 1. Все сессии психолога
    var sessRes = await window.supa
        .from('sessions')
        .select('*')
        .eq('psychologist_id', myPsyProfileId)
        .order('date', { ascending: false })
        .order('hour', { ascending: false });

    if (sessRes.error || !sessRes.data) return [];

    // 2. Группируем по client_id
    var groups = {};
    sessRes.data.forEach(function (s) {
        if (!s.client_id) return;
        if (!groups[s.client_id]) {
            groups[s.client_id] = {
                client_id: s.client_id,
                sessions: []
            };
        }
        groups[s.client_id].sessions.push(s);
    });

    var clientIds = Object.keys(groups);
    if (clientIds.length === 0) return [];

    // 3. Имена и аватары — из chats
    var chatsRes = await window.supa
        .from('chats')
        .select('client_id, client_display_name, client_avatar')
        .eq('psychologist_id', myPsyProfileId)
        .in('client_id', clientIds);

    var namesMap = {};
    if (chatsRes.data) {
        chatsRes.data.forEach(function (c) {
            namesMap[c.client_id] = {
                name: c.client_display_name || '',
                avatar: c.client_avatar || ''
            };
        });
    }

    // 4. Заметки — из client_notes
    var notesRes = await window.supa
        .from('client_notes')
        .select('client_id, notes')
        .eq('psychologist_id', myPsyProfileId)
        .in('client_id', clientIds);

    var notesMap = {};
    if (notesRes.data) {
        notesRes.data.forEach(function (n) {
            notesMap[n.client_id] = n.notes || '';
        });
    }

    // 5. Собираем объекты
    var clients = clientIds.map(function (cid) {
        var g = groups[cid];
        var meta = namesMap[cid] || {};
        var firstSession = g.sessions[0];

        // Имя — приоритет: транслируемое из чата, потом из сессии
        var displayName = (meta.name || '').trim() ||
                          (firstSession.client_name || '').trim() ||
                          'Клиент';

        return {
            client_id: cid,
            name: displayName,
            avatar: meta.avatar || '',
            notes: notesMap[cid] || '',
            sessions: g.sessions,
            lastDate: firstSession.date,
            lastHour: firstSession.hour,
            count: g.sessions.length
        };
    });

    // Сортируем — последняя сессия сверху
    clients.sort(function (a, b) {
        var ak = a.lastDate + '-' + String(a.lastHour).padStart(2, '0');
        var bk = b.lastDate + '-' + String(b.lastHour).padStart(2, '0');
        return bk.localeCompare(ak);
    });

    return clients;
}

// ============================================
// Отрисовка списка
// ============================================

function cl_getInitials(name) {
    if (!name) return '?';
    if (typeof name !== 'string') name = String(name);
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function cl_escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function cl_formatDate(dateKey) {
    var parts = dateKey.split('-');
    var months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}

async function renderClients() {
    var listEl = document.getElementById('clientsList');
    var countEl = document.getElementById('clientsCount');
    if (!listEl) return;

    listEl.innerHTML = '<div class="clients-empty"><p>Загрузка...</p></div>';

    if (!myPsyProfileId) {
        await cl_loadMyProfile();
    }
    if (!myPsyProfileId) {
        listEl.innerHTML =
            '<div class="clients-empty">' +
                '<div class="clients-empty-icon">👤</div>' +
                '<p>У вас нет профиля психолога</p>' +
            '</div>';
        return;
    }

    currentClients = await cl_loadClients();

    if (countEl) countEl.textContent = 'Всего: ' + currentClients.length;

    var filtered = clientsFilter
        ? currentClients.filter(function (c) {
            return c.name.toLowerCase().indexOf(clientsFilter.toLowerCase()) !== -1;
        })
        : currentClients;

    if (filtered.length === 0) {
        listEl.innerHTML =
            '<div class="clients-empty">' +
                '<div class="clients-empty-icon">👥</div>' +
                '<p>' + (clientsFilter ? 'Ничего не найдено' : 'Пока нет клиентов. Они появятся, когда запишутся к вам на сессию.') + '</p>' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (client) {
        var card = document.createElement('div');
        card.className = 'client-card';

        var initials = cl_getInitials(client.name);
        var avatarHtml;
        if (client.avatar) {
            avatarHtml = '<div class="client-avatar" style="background-image:url(' + client.avatar + ');background-size:cover;background-position:center;"></div>';
        } else {
            avatarHtml = '<div class="client-avatar">' + initials + '</div>';
        }

        var lastFormatted = cl_formatDate(client.lastDate);

        card.innerHTML =
            avatarHtml +
            '<div class="client-info">' +
                '<div class="client-name">' + cl_escapeHtml(client.name) + '</div>' +
                '<div class="client-stats">' +
                    '<span class="client-stat">Сессий: <strong>' + client.count + '</strong></span>' +
                    '<span class="client-stat">Последняя: <strong>' + lastFormatted + '</strong></span>' +
                '</div>' +
            '</div>';

        card.addEventListener('click', function () { openClientModal(client.client_id); });
        listEl.appendChild(card);
    });
}

// ============================================
// Модалка клиента
// ============================================

function openClientModal(clientId) {
    var client = currentClients.find(function (c) { return c.client_id === clientId; });
    if (!client) return;

    currentClientId = clientId;

    var overlay = document.getElementById('clientModalOverlay');
    var titleEl = document.getElementById('clientModalTitle');
    var contentEl = document.getElementById('clientModalContent');

    if (!overlay || !titleEl || !contentEl) return;

    titleEl.textContent = client.name;

    var initials = cl_getInitials(client.name);
    var avatarHtml;
    if (client.avatar) {
        avatarHtml = '<div class="client-detail-avatar" style="background-image:url(' + client.avatar + ');background-size:cover;background-position:center;"></div>';
    } else {
        avatarHtml = '<div class="client-detail-avatar">' + initials + '</div>';
    }

    var lastFormatted = cl_formatDate(client.lastDate);

    var sessionsHtml = '';
    if (client.sessions && client.sessions.length > 0) {
        sessionsHtml = client.sessions.map(function (s) {
            var dtStr = cl_formatDate(s.date) + ', ' + String(s.hour).padStart(2, '0') + ':00';
            var statusLabel = {
                confirmed: 'Подтверждена',
                completed: 'Проведена',
                cancelled: 'Отменена'
            }[s.status] || s.status;
            return '<div class="session-history-item">' +
                '<span class="session-history-date">' + dtStr + '</span>' +
                '<span class="session-history-topic">' + cl_escapeHtml(s.topic || '') + ' · ' + statusLabel + '</span>' +
            '</div>';
        }).join('');
    } else {
        sessionsHtml = '<p class="empty-state">Сессий пока не было</p>';
    }

    contentEl.innerHTML =
        '<div class="client-detail-header">' +
            avatarHtml +
            '<div class="client-detail-info">' +
                '<h4>' + cl_escapeHtml(client.name) + '</h4>' +
                '<p style="color: var(--color-primary); font-weight: 600; margin-top: 8px;">' +
                    'Сессий: ' + client.count + ' · Последняя: ' + lastFormatted +
                '</p>' +
            '</div>' +
        '</div>' +

        '<div class="client-section-title">История сессий</div>' +
        '<div class="sessions-history">' + sessionsHtml + '</div>' +

        '<div class="client-section-title">Заметки</div>' +
        '<textarea class="client-notes" id="clientNotes" placeholder="Ваши заметки о клиенте...">' + cl_escapeHtml(client.notes) + '</textarea>' +

        '<div class="client-chat-hint">' +
            '📩 Для связи с клиентом используйте внутренний чат платформы.' +
        '</div>' +

        '<div class="modal-actions">' +
            '<button class="btn-save" id="saveNotesBtn">Сохранить заметки</button>' +
            '<button class="btn-chat" id="chatWithClientBtn" type="button">Написать в чат</button>' +
        '</div>';

    var saveBtn = document.getElementById('saveNotesBtn');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveClientNotes(client.client_id); });

    var chatBtn = document.getElementById('chatWithClientBtn');
    if (chatBtn) {
        chatBtn.addEventListener('click', function () {
            window.location.href = 'dashboard.html?section=messages&clientId=' + encodeURIComponent(client.client_id);
        });
    }

    overlay.classList.add('active');
}

// ============================================
// Сохранение заметок
// ============================================

async function saveClientNotes(clientId) {
    if (!clientId || !myPsyProfileId) return;

    var notesEl = document.getElementById('clientNotes');
    if (!notesEl) return;

    var text = notesEl.value;

    // Проверим, есть ли уже запись
    var existRes = await window.supa
        .from('client_notes')
        .select('id')
        .eq('psychologist_id', myPsyProfileId)
        .eq('client_id', clientId)
        .limit(1);

    var result;
    if (existRes.data && existRes.data.length > 0) {
        result = await window.supa
            .from('client_notes')
            .update({ notes: text, updated_at: new Date().toISOString() })
            .eq('id', existRes.data[0].id);
    } else {
        result = await window.supa
            .from('client_notes')
            .insert({
                psychologist_id: myPsyProfileId,
                client_id: clientId,
                notes: text
            });
    }

    var btn = document.getElementById('saveNotesBtn');

    if (result.error) {
        console.error('[clients] save error:', result.error);
        if (btn) {
            btn.textContent = 'Ошибка';
            btn.style.backgroundColor = '#e74c3c';
            setTimeout(function () {
                btn.textContent = 'Сохранить заметки';
                btn.style.backgroundColor = '';
            }, 2000);
        }
        return;
    }

    // Обновляем локальный кеш
    var c = currentClients.find(function (x) { return x.client_id === clientId; });
    if (c) c.notes = text;

    if (btn) {
        btn.textContent = '✓ Сохранено';
        btn.style.backgroundColor = '#2ecc71';
        setTimeout(function () {
            btn.textContent = 'Сохранить заметки';
            btn.style.backgroundColor = '';
        }, 1500);
    }
}

function closeClientModal() {
    var overlay = document.getElementById('clientModalOverlay');
    if (overlay) overlay.classList.remove('active');
    currentClientId = null;
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    var searchInput = document.getElementById('clientsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            clientsFilter = e.target.value.trim();
            renderClients();
        });
    }

    var closeBtn = document.getElementById('clientCancelBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeClientModal);

    var overlay = document.getElementById('clientModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'clientModalOverlay') closeClientModal();
        });
    }
});

// Экспорт для script.js
window.renderClients = renderClients;