// ============================================
// СООБЩЕНИЯ — реальные чаты через Supabase
// ============================================

console.log('[messenger.js] loaded');

var m_myUser = null;              // { id, role, psyProfileId }
var m_cachedChats = [];           // список чатов
var m_unreadCounts = {};          // { chatId: count }
var m_currentChatId = null;
var m_currentMessages = [];
var m_pollTimer = null;

// ============================================
// Утилиты
// ============================================

function m_waitForSupa(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

function m_escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function m_getInitials(name) {
    if (!name) return '?';
    if (typeof name !== 'string') name = String(name);
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function m_formatChatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diffDays = Math.floor((now - d) / 86400000);

    if (diffDays === 0) {
        var h = String(d.getHours()).padStart(2, '0');
        var mi = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + mi;
    } else if (diffDays === 1) {
        return 'вчера';
    } else if (diffDays < 7) {
        var days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        return days[d.getDay()];
    } else {
        var months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
        return d.getDate() + ' ' + months[d.getMonth()];
    }
}

// ============================================
// Определение текущего пользователя и роли
// ============================================

async function m_loadMyUser() {
    var raw = localStorage.getItem('psyhelp_user');
    if (!raw) return null;
    try {
        var u = JSON.parse(raw);
        if (!u.id) return null;

        var role = window.CURRENT_USER === 'psychologist' ? 'psychologist' : 'client';
        var psyProfileId = null;

        try {
            var r = await window.supa
                .from('psychologist_profiles')
                .select('id')
                .eq('user_id', u.id)
                .limit(1);
            if (r.data && r.data.length > 0) {
                psyProfileId = r.data[0].id;
            }
        } catch (e) {}

        var path = window.location.pathname;
        if (path.indexOf('dashboard') !== -1 && psyProfileId) {
            role = 'psychologist';
        } else if (path.indexOf('client') !== -1) {
            role = 'client';
        }

        return {
            id: u.id,
            role: role,
            psyProfileId: psyProfileId
        };
    } catch (e) {
        return null;
    }
}

// ============================================
// Загрузка списка чатов
// ============================================

async function m_loadChats() {
    if (!m_myUser) return [];

    var query = window.supa.from('chats').select('*');

    if (m_myUser.role === 'psychologist' && m_myUser.psyProfileId) {
        query = query.eq('psychologist_id', m_myUser.psyProfileId);
    } else {
        query = query.eq('client_id', m_myUser.id);
    }

    var result = await query.order('last_message_at', { ascending: false });

    if (result.error) {
        console.error('[messenger] ошибка загрузки чатов:', result.error);
        return [];
    }
    return result.data || [];
}

async function m_loadUnreadCounts() {
    m_unreadCounts = {};
    if (!m_myUser) return;

    var result = await window.supa
        .from('messages')
        .select('chat_id, author_id')
        .eq('is_read', false)
        .neq('author_id', m_myUser.id);

    if (result.error || !result.data) return;

    result.data.forEach(function (m) {
        m_unreadCounts[m.chat_id] = (m_unreadCounts[m.chat_id] || 0) + 1;
    });
}

// ============================================
// Создание чата или поиск существующего
// ============================================

async function m_findOrCreateChat(psyId) {
    if (!m_myUser || !psyId) return null;

    var psyRes = await window.supa
        .from('psychologist_profiles')
        .select('id, user_id, first_name, middle_name')
        .eq('id', psyId)
        .single();

    if (psyRes.error || !psyRes.data) return null;

    var psy = psyRes.data;

    var existRes = await window.supa
        .from('chats')
        .select('*')
        .eq('client_id', m_myUser.id)
        .eq('psychologist_id', psyId)
        .limit(1);

    if (existRes.data && existRes.data.length > 0) {
        return existRes.data[0];
    }

    var me = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
    var c1 = (me.displayFirstName || me.realFirstName || '').trim();
    var c2 = (me.displayMiddleName || me.realMiddleName || '').trim();
    var clientDisplayName = (c1 + ' ' + c2).trim() || 'Клиент';

    var psyName = ((psy.first_name || '') + ' ' + (psy.middle_name || '')).trim() || 'Психолог';

    var insertRes = await window.supa.from('chats').insert({
        client_id: m_myUser.id,
        psychologist_id: psyId,
        client_display_name: clientDisplayName,
        psychologist_display_name: psyName,
        last_message_at: new Date().toISOString()
    }).select().single();

    if (insertRes.error) {
        console.error('[messenger] не удалось создать чат:', insertRes.error);
        return null;
    }
    return insertRes.data;
}

// ============================================
// Загрузка сообщений
// ============================================

async function m_loadMessages(chatId) {
    if (!chatId) return [];

    var result = await window.supa
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(200);

    if (result.error) {
        console.error('[messenger] ошибка загрузки сообщений:', result.error);
        return [];
    }
    return result.data || [];
}

async function m_markChatRead(chatId) {
    if (!chatId || !m_myUser) return;
    await window.supa
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .eq('is_read', false)
        .neq('author_id', m_myUser.id);
    m_unreadCounts[chatId] = 0;
}

// ============================================
// Отрисовка списка чатов
// ============================================

function m_renderChatsList() {
    var listEl = document.getElementById('chatsList');
    if (!listEl) return;

    if (!m_cachedChats.length) {
        listEl.innerHTML =
            '<div class="chats-empty" style="padding:20px;text-align:center;color:#888;font-size:14px;">' +
                'Пока нет диалогов.<br>Начните чат со страницы психолога.' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    m_cachedChats.forEach(function (chat) {
        var isPsyView = m_myUser.role === 'psychologist';
        var name = isPsyView
            ? (chat.client_display_name || 'Клиент')
            : (chat.psychologist_display_name || 'Психолог');

        var initials = m_getInitials(name);
        var preview = chat.last_message_text || 'Нет сообщений';
        var timeStr = m_formatChatTime(chat.last_message_at);
        var unread = m_unreadCounts[chat.id] || 0;

        var item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === m_currentChatId ? ' active' : '');

        item.innerHTML =
            '<div class="chat-avatar">' + initials + '</div>' +
            '<div class="chat-item-info">' +
                '<div class="chat-item-name">' + m_escapeHtml(name) + '</div>' +
                '<div class="chat-item-preview">' + m_escapeHtml(preview) + '</div>' +
            '</div>' +
            '<div class="chat-item-time">' + timeStr +
                (unread > 0 ? '<span class="chat-item-unread">' + unread + '</span>' : '') +
            '</div>';

        item.addEventListener('click', function () { m_openChat(chat.id); });
        listEl.appendChild(item);
    });
}

// ============================================
// Отрисовка окна чата
// ============================================

function m_renderChatWindow() {
    var windowEl = document.getElementById('chatWindow');
    if (!windowEl) return;

    if (!m_currentChatId) {
        windowEl.innerHTML =
            '<div class="chat-empty">' +
                '<div class="chat-empty-icon">💬</div>' +
                '<p>Выберите чат слева, чтобы начать общение</p>' +
            '</div>';
        return;
    }

    var chat = m_cachedChats.find(function (c) { return c.id === m_currentChatId; });
    if (!chat) {
        m_currentChatId = null;
        return m_renderChatWindow();
    }

    var isPsyView = m_myUser.role === 'psychologist';
    var name = isPsyView
        ? (chat.client_display_name || 'Клиент')
        : (chat.psychologist_display_name || 'Психолог');
    var roleLabel = isPsyView ? 'Клиент' : 'Психолог';

    var initials = m_getInitials(name);
    var isEmpty = m_currentMessages.length === 0;

    var messagesHtml = '';
    if (isEmpty) {
        messagesHtml =
            '<div class="chat-start-hint">' +
                '<div class="chat-start-title">Это начало вашего диалога.</div>' +
                '<div class="chat-start-text">' +
                    (isPsyView
                        ? 'Напишите первое сообщение — поприветствуйте клиента и уточните запрос.'
                        : 'Напишите первое сообщение — начните с приветствия и коротко опишите, с чем хотите работать.') +
                '</div>' +
            '</div>';
    } else {
        m_currentMessages.forEach(function (m) {
            var isMine = m.author_id === m_myUser.id;
            var cls = isMine ? 'me' : 'them';
            messagesHtml +=
                '<div class="message ' + cls + '">' +
                    m_escapeHtml(m.text) +
                    '<span class="message-time">' + m_formatChatTime(m.created_at) + '</span>' +
                '</div>';
        });
    }

    var placeholder = isPsyView
        ? 'Напишите клиенту...'
        : (isEmpty
            ? 'Здравствуйте! Хотел(а) бы с Вами поработать. Мой запрос: ...'
            : 'Напишите сообщение...');

    windowEl.innerHTML =
        '<div class="chat-window-header">' +
            '<div class="chat-window-avatar">' + initials + '</div>' +
            '<div>' +
                '<div class="chat-window-name">' + m_escapeHtml(name) + '</div>' +
                '<div class="chat-window-role">' + roleLabel + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="chat-messages" id="chatMessages">' + messagesHtml + '</div>' +
        '<div class="chat-input-area">' +
            '<input type="text" class="chat-input" id="chatInput" placeholder="' + m_escapeHtml(placeholder) + '" autocomplete="off">' +
            '<button class="btn-send" id="btnSend">Отправить</button>' +
        '</div>';

    var messagesEl = document.getElementById('chatMessages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    var input = document.getElementById('chatInput');
    var sendBtn = document.getElementById('btnSend');

    if (sendBtn) sendBtn.addEventListener('click', m_sendMessage);
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                m_sendMessage();
            }
        });
        if (isEmpty) input.focus();
    }
}

// ============================================
// Открытие чата
// ============================================

async function m_openChat(chatId) {
    m_currentChatId = chatId;

    m_currentMessages = await m_loadMessages(chatId);
    await m_markChatRead(chatId);

    m_renderChatsList();
    m_renderChatWindow();

    // Обновляем бейдж в сайдбаре — сообщения прочитаны
    if (typeof m_updateSidebarBadge === 'function') m_updateSidebarBadge();

    // Polling
    if (m_pollTimer) clearInterval(m_pollTimer);
    m_pollTimer = setInterval(m_pollCurrentChat, 5000);
}

async function m_pollCurrentChat() {
    if (!m_currentChatId) return;

    var fresh = await m_loadMessages(m_currentChatId);
    if (fresh.length !== m_currentMessages.length) {
        m_currentMessages = fresh;
        await m_markChatRead(m_currentChatId);
        m_renderChatWindow();
        m_renderChatsList();
        if (typeof m_updateSidebarBadge === 'function') m_updateSidebarBadge();
    }
}

// ============================================
// Отправка сообщения
// ============================================

async function m_sendMessage() {
    var input = document.getElementById('chatInput');
    if (!input) return;

    var text = input.value.trim();
    if (!text) return;
    if (!m_currentChatId || !m_myUser) return;

    input.value = '';
    input.disabled = true;

    try {
        var ins = await window.supa.from('messages').insert({
            chat_id: m_currentChatId,
            author_id: m_myUser.id,
            author_role: m_myUser.role,
            text: text
        }).select().single();

        if (ins.error) {
            console.error('[messenger] ошибка отправки:', ins.error);
            alert('Не удалось отправить сообщение.');
            return;
        }

        await window.supa.from('chats').update({
            last_message_text: text,
            last_message_at: new Date().toISOString()
        }).eq('id', m_currentChatId);

        m_currentMessages = await m_loadMessages(m_currentChatId);
        m_renderChatWindow();

        m_cachedChats = await m_loadChats();
        m_renderChatsList();
    } catch (err) {
        console.error('[messenger] исключение:', err);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// ============================================
// Публичный вход (вызывается из client.js)
// ============================================

async function renderMessenger() {
    console.log('[messenger] renderMessenger');

    var layoutEl = document.getElementById('messengerLayout');
    if (!layoutEl) return;

    if (!m_myUser) {
        m_myUser = await m_loadMyUser();
    }
    if (!m_myUser) {
        console.warn('[messenger] нет пользователя');
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var psyId = params.get('psyId');
    var chatId = params.get('chat');

    if (psyId && !m_currentChatId) {
        var chat = await m_findOrCreateChat(psyId);
        if (chat) {
            m_currentChatId = chat.id;
            var url = new URL(window.location.href);
            url.searchParams.delete('psyId');
            url.searchParams.delete('chat');
            window.history.replaceState({}, '', url);
        }
    } else if (chatId && !m_currentChatId) {
        m_currentChatId = chatId;
    }

    m_cachedChats = await m_loadChats();
    await m_loadUnreadCounts();

    if (m_currentChatId) {
        m_currentMessages = await m_loadMessages(m_currentChatId);
        await m_markChatRead(m_currentChatId);
    }

    m_renderChatsList();
    m_renderChatWindow();

    if (m_pollTimer) clearInterval(m_pollTimer);
    m_pollTimer = setInterval(m_pollCurrentChat, 5000);
}

// ============================================
// Бейдж непрочитанных в сайдбаре — поверх иконки
// ============================================

async function m_updateSidebarBadge() {
    var navMsg = null;
    document.querySelectorAll('.nav-item').forEach(function (n) {
        var href = n.getAttribute('href') || '';
        if (href.indexOf('section=messages') !== -1) {
            navMsg = n;
        }
    });
    if (!navMsg) return;

    // Находим SVG-иконку
    var iconEl = navMsg.querySelector('.nav-icon');
    if (!iconEl) return;

    // Оборачиваем SVG в div — внутрь SVG нельзя класть HTML
    var wrapEl = iconEl.parentNode;
    if (!wrapEl.classList.contains('nav-icon-wrap')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'nav-icon-wrap';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.flexShrink = '0';
        iconEl.parentNode.insertBefore(wrapper, iconEl);
        wrapper.appendChild(iconEl);
        wrapEl = wrapper;
    }

    // Бейдж кладём в обёртку (не в SVG)
    var badge = wrapEl.querySelector('.nav-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        wrapEl.appendChild(badge);
    }

    if (!m_myUser) m_myUser = await m_loadMyUser();
    if (!m_myUser) return;

    await m_loadUnreadCounts();
    var total = 0;
    Object.keys(m_unreadCounts).forEach(function (k) {
        total += m_unreadCounts[k];
    });

    if (total > 0) {
        badge.textContent = total > 9 ? '9+' : total;
        badge.style.cssText =
            'position:absolute;' +
            'top:-6px;' +
            'right:-8px;' +
            'background:#e74c3c;' +
            'color:#fff;' +
            'font-size:10px;' +
            'font-weight:700;' +
            'min-width:16px;' +
            'height:16px;' +
            'line-height:16px;' +
            'border-radius:8px;' +
            'text-align:center;' +
            'padding:0 4px;' +
            'box-sizing:border-box;' +
            'pointer-events:none;' +
            'font-family:inherit;';
    } else {
        badge.textContent = '';
        badge.style.cssText = 'display:none;';
    }
}

// ============================================
// Экспорт и инициализация
// ============================================

window.renderMessenger = renderMessenger;

document.addEventListener('DOMContentLoaded', function () {
    m_waitForSupa(50).then(async function (ok) {
        if (!ok) {
            console.warn('[messenger] Supabase не загрузился');
            return;
        }

        // Бейдж: сразу + раз в 30 сек
        await m_updateSidebarBadge();
        setInterval(m_updateSidebarBadge, 30000);

        // При возврате на вкладку
        window.addEventListener('focus', m_updateSidebarBadge);
    });
});