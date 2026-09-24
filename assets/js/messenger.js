// ============================================
// РАЗДЕЛ «СООБЩЕНИЯ» — личные чаты
// Ключ хранилища — по user.id, не по роли
// ============================================

console.log('[messenger.js] loaded');

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || 'anonymous';
    } catch (e) { return 'anonymous'; }
}

const MESSAGES_KEY = 'psyhelp_messages_' + getCurrentUserId();

const SUPPORT_CHAT_ID = 'chat-support';

function getSupportChat() {
    return {
        id: SUPPORT_CHAT_ID,
        participantName: 'Поддержка PsyHelp',
        participantRole: 'Команда платформы',
        unread: 0,
        messages: [
            {
                id: 'msg-support-hello',
                from: 'them',
                text: 'Здравствуйте! Это чат поддержки PsyHelp. ' +
                      'Если возникнут вопросы по работе платформы — напишите здесь. ' +
                      'Мы отвечаем в течение рабочего дня.',
                time: Date.now()
            }
        ]
    };
}

function getChats() {
    const data = localStorage.getItem(MESSAGES_KEY);
    if (data) {
        try {
            var list = JSON.parse(data);
            if (Array.isArray(list) && list.length > 0) return list;
        } catch (e) { console.error(e); }
    }

    // Первый запуск — создаём только чат поддержки
    var initial = [getSupportChat()];
    saveChats(initial);
    return initial;
}

function saveChats(chats) {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(chats));
}

let currentChatId = null;

// ============================================
// Инициализация чата по ?chat=&psyId=
// ============================================

function initChatFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var chatId = params.get('chat');
    var psyId = params.get('psyId');

    if (!chatId) return;

    var chats = getChats();
    var existing = chats.find(function (c) { return c.id === chatId; });

    if (existing) {
        currentChatId = chatId;
        console.log('[messenger] открыт существующий чат:', chatId);
        return;
    }

    var psyName = 'Новый диалог';
    var psyRole = 'Психолог';

    if (psyId) {
        try {
            var reg = JSON.parse(localStorage.getItem('psyhelp_psychologists_registry')) || [];
            var psy = reg.find(function (p) { return p.id === psyId; });
            if (psy) {
                var f = (psy.firstName || '').trim();
                var m = (psy.middleName || '').trim();
                psyName = (f + ' ' + m).trim() || 'Психолог';
            }
        } catch (e) {}
    }

    var newChat = {
        id: chatId,
        participantName: psyName,
        participantRole: psyRole,
        unread: 0,
        messages: []
    };

    chats.push(newChat);
    saveChats(chats);
    currentChatId = chatId;
    console.log('[messenger] создан новый чат:', chatId, '→', psyName);
}

// ============================================
// Отрисовка
// ============================================

function renderMessenger() {
    console.log('[messenger] renderMessenger, currentChatId =', currentChatId);

    const layoutEl = document.getElementById('messengerLayout');
    if (!layoutEl) return;

    const chats = getChats();
    const listEl = document.getElementById('chatsList');
    if (!listEl) return;

    // Сортировка: чат поддержки всегда сверху, остальные — по времени
    chats.sort(function (a, b) {
        if (a.id === SUPPORT_CHAT_ID) return -1;
        if (b.id === SUPPORT_CHAT_ID) return 1;
        const aLast = a.messages.length > 0 ? a.messages[a.messages.length - 1].time : 0;
        const bLast = b.messages.length > 0 ? b.messages[b.messages.length - 1].time : 0;
        return bLast - aLast;
    });

    listEl.innerHTML = '';
    chats.forEach(function (chat) {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');

        const initials = getInitials(chat.participantName);
        const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
        const preview = lastMsg ? (lastMsg.from === 'me' ? 'Вы: ' : '') + lastMsg.text : 'Нет сообщений';
        const timeStr = lastMsg ? formatChatTime(lastMsg.time) : '';

        item.innerHTML =
            '<div class="chat-avatar' + (chat.id === SUPPORT_CHAT_ID ? ' chat-avatar-support' : '') + '">' + initials + '</div>' +
            '<div class="chat-item-info">' +
                '<div class="chat-item-name">' + escapeHtml(chat.participantName) + '</div>' +
                '<div class="chat-item-preview">' + escapeHtml(preview) + '</div>' +
            '</div>' +
            '<div class="chat-item-time">' + timeStr + '</div>';

        item.addEventListener('click', function () {
            openChat(chat.id);
        });

        listEl.appendChild(item);
    });

    if (currentChatId) {
        const activeChat = chats.find(function (c) { return c.id === currentChatId; });
        if (activeChat) renderChatWindow(activeChat);
        else renderEmptyChat();
    } else {
        renderEmptyChat();
    }
}

function renderChatWindow(chat) {
    const windowEl = document.getElementById('chatWindow');
    if (!windowEl) return;

    const initials = getInitials(chat.participantName);
    const isEmpty = chat.messages.length === 0;
    const isSupport = chat.id === SUPPORT_CHAT_ID;

    let messagesHtml = '';
    if (isEmpty) {
        messagesHtml =
            '<div class="chat-start-hint">' +
                '<div class="chat-start-title">Это начало вашего диалога.</div>' +
                '<div class="chat-start-text">' +
                    'Напишите первое сообщение — начните с приветствия и коротко опишите, с чем хотите работать.' +
                '</div>' +
            '</div>';
    } else {
        chat.messages.forEach(function (m) {
            const cls = m.from === 'me' ? 'me' : 'them';
            messagesHtml +=
                '<div class="message ' + cls + '">' +
                    escapeHtml(m.text) +
                    '<span class="message-time">' + formatChatTime(m.time) + '</span>' +
                '</div>';
        });
    }

    var placeholder;
    if (isSupport) {
        placeholder = 'Опишите вопрос или проблему...';
    } else if (isEmpty) {
        placeholder = 'Здравствуйте! Хотел(а) бы с Вами поработать. Мой запрос: ...';
    } else {
        placeholder = 'Напишите сообщение...';
    }

    windowEl.innerHTML =
        '<div class="chat-window-header">' +
            '<div class="chat-window-avatar' + (isSupport ? ' chat-avatar-support' : '') + '">' + initials + '</div>' +
            '<div>' +
                '<div class="chat-window-name">' + escapeHtml(chat.participantName) + '</div>' +
                '<div class="chat-window-role">' + escapeHtml(chat.participantRole) + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="chat-messages" id="chatMessages">' + messagesHtml + '</div>' +
        '<div class="chat-input-area">' +
            '<input type="text" class="chat-input" id="chatInput" placeholder="' + escapeHtml(placeholder) + '" autocomplete="off">' +
            '<button class="btn-send" id="btnSend">Отправить</button>' +
        '</div>';

    const messagesEl = document.getElementById('chatMessages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('btnSend');

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
        if (isEmpty) input.focus();
    }
}

function renderEmptyChat() {
    const windowEl = document.getElementById('chatWindow');
    if (!windowEl) return;
    windowEl.innerHTML =
        '<div class="chat-empty">' +
            '<div class="chat-empty-icon">💬</div>' +
            '<p>Выберите чат слева, чтобы начать общение</p>' +
        '</div>';
}

function openChat(chatId) {
    currentChatId = chatId;
    const chats = getChats();
    const chat = chats.find(function (c) { return c.id === chatId; });
    if (!chat) return;

    chat.unread = 0;
    saveChats(chats);
    renderMessenger();

    const input = document.getElementById('chatInput');
    if (input) input.focus();
}

// Отправка — без автоответа. В реальности ответит живой человек.
function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const chats = getChats();
    const chat = chats.find(function (c) { return c.id === currentChatId; });
    if (!chat) return;

    chat.messages.push({
        id: 'm-' + Date.now(),
        from: 'me',
        text: text,
        time: Date.now()
    });
    saveChats(chats);

    input.value = '';
    renderMessenger();
}

// ============================================
// Утилиты
// ============================================

function getInitials(name) {
    if (!name) return '?';
    if (typeof name !== 'string') name = String(name);
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatChatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);

    if (diffDays === 0) {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    } else if (diffDays === 1) {
        return 'вчера';
    } else if (diffDays < 7) {
        const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        return days[d.getDay()];
    } else {
        const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        return d.getDate() + ' ' + months[d.getMonth()];
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initChatFromUrl();
});