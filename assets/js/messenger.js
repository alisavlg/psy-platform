// ============================================
// РАЗДЕЛ «СООБЩЕНИЯ» — личные чаты
// ============================================

console.log('[messenger.js] loaded');

const MESSAGES_KEY = 'psyhelp_messages_' + (window.CURRENT_USER || 'anonymous');

function getChats() {
    const data = localStorage.getItem(MESSAGES_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { console.error(e); }
    }

    const now = Date.now();
    let demo;

    if (window.CURRENT_USER === 'psychologist') {
        demo = [
            {
                id: 'chat-1',
                participantName: 'Дмитрий Петрович',
                participantRole: 'Клиент',
                unread: 0,
                messages: [
                    { id: 'm1', from: 'them', text: 'Здравствуйте! Хотел бы записаться на сессию на следующей неделе.', time: now - 3600000 * 24 * 2 },
                    { id: 'm2', from: 'me', text: 'Здравствуйте! Конечно. У меня есть свободные слоты во вторник и четверг.', time: now - 3600000 * 24 * 2 + 600000 },
                    { id: 'm3', from: 'them', text: 'Отлично, давайте во вторник в 14:00.', time: now - 3600000 * 24 },
                    { id: 'm4', from: 'me', text: 'Договорились. Добавлю в расписание.', time: now - 3600000 * 20 }
                ]
            },
            {
                id: 'chat-2',
                participantName: 'Елена Александровна',
                participantRole: 'Клиент',
                unread: 1,
                messages: [
                    { id: 'm1', from: 'me', text: 'Здравствуйте, Елена! Как ваши дела после последней сессии?', time: now - 3600000 * 30 },
                    { id: 'm2', from: 'them', text: 'Здравствуйте! Стало значительно легче. Спасибо вам большое.', time: now - 3600000 * 28 },
                    { id: 'm3', from: 'them', text: 'Можно записаться на следующую неделю?', time: now - 3600000 * 5 }
                ]
            },
            {
                id: 'chat-3',
                participantName: 'Иван Сергеевич',
                participantRole: 'Психолог',
                unread: 0,
                messages: [
                    { id: 'm1', from: 'me', text: 'Иван, добрый день. Хотел бы записаться к вам на супервизию.', time: now - 3600000 * 72 },
                    { id: 'm2', from: 'them', text: 'Добрый! Да, конечно. Есть окно в пятницу в 16:00.', time: now - 3600000 * 70 },
                    { id: 'm3', from: 'me', text: 'Отлично, подходит.', time: now - 3600000 * 68 }
                ]
            }
        ];
    } else {
        demo = [
            {
                id: 'chat-1',
                participantName: 'Анна Сергеевна',
                participantRole: 'Психолог',
                unread: 0,
                messages: [
                    { id: 'm1', from: 'me', text: 'Здравствуйте! Хотела бы записаться к вам на консультацию.', time: now - 3600000 * 24 * 2 },
                    { id: 'm2', from: 'them', text: 'Здравствуйте! Рада вас слышать. У меня есть окно в среду в 15:00.', time: now - 3600000 * 24 * 2 + 600000 },
                    { id: 'm3', from: 'me', text: 'Отлично, подходит.', time: now - 3600000 * 24 }
                ]
            },
            {
                id: 'chat-2',
                participantName: 'Иван Сергеевич',
                participantRole: 'Психолог',
                unread: 1,
                messages: [
                    { id: 'm1', from: 'them', text: 'Как ваши успехи на этой неделе?', time: now - 3600000 * 5 }
                ]
            }
        ];
    }

    saveChats(demo);
    return demo;
}

function saveChats(chats) {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(chats));
}

let currentChatId = null;

function renderMessenger() {
    console.log('[messenger] renderMessenger, currentChatId =', currentChatId);

    const layoutEl = document.getElementById('messengerLayout');
    if (!layoutEl) return;

    const chats = getChats();
    const listEl = document.getElementById('chatsList');
    if (!listEl) return;

    chats.sort(function (a, b) {
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
            '<div class="chat-avatar">' + initials + '</div>' +
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

    let messagesHtml = '';
    chat.messages.forEach(function (m) {
        const cls = m.from === 'me' ? 'me' : 'them';
        messagesHtml +=
            '<div class="message ' + cls + '">' +
                escapeHtml(m.text) +
                '<span class="message-time">' + formatChatTime(m.time) + '</span>' +
            '</div>';
    });

    windowEl.innerHTML =
        '<div class="chat-window-header">' +
            '<div class="chat-window-avatar">' + initials + '</div>' +
            '<div>' +
                '<div class="chat-window-name">' + escapeHtml(chat.participantName) + '</div>' +
                '<div class="chat-window-role">' + escapeHtml(chat.participantRole) + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="chat-messages" id="chatMessages">' + messagesHtml + '</div>' +
        '<div class="chat-input-area">' +
            '<input type="text" class="chat-input" id="chatInput" placeholder="Напишите сообщение..." autocomplete="off">' +
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

    const currentId = currentChatId;
    setTimeout(function () {
        const freshChats = getChats();
        const freshChat = freshChats.find(function (c) { return c.id === currentId; });
        if (!freshChat) return;
        freshChat.messages.push({
            id: 'm-' + Date.now(),
            from: 'them',
            text: 'Спасибо, я увидел(а) ваше сообщение. Отвечу чуть позже.',
            time: Date.now()
        });
        saveChats(freshChats);
        if (currentChatId === currentId) renderMessenger();
    }, 1500);
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