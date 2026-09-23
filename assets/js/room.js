// ============================================
// КОМНАТА — видеосессия (заглушка)
// ============================================

console.log('[room.js] loaded');

// ============================================
// Определяем роль из URL
// ============================================

function getRoleFromURL() {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    if (role === 'psychologist' || role === 'client') return role;
    return 'client'; // fallback
}

window.CURRENT_USER = getRoleFromURL();

let micOn = true;
let camOn = true;
let sessionStartTime = null;
let timerInterval = null;

// ============================================
// Данные сессии
// ============================================

function getSessionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
}

function findSessionById(id) {
    let data = localStorage.getItem('psyhelp_sessions_client');
    if (data) {
        try {
            const sessions = JSON.parse(data);
            const s = sessions.find(function (x) { return x.id === id; });
            if (s) return s;
        } catch (e) {}
    }
    data = localStorage.getItem('psyhelp_sessions_psychologist');
    if (data) {
        try {
            const sessions = JSON.parse(data);
            const s = sessions.find(function (x) { return x.id === id; });
            if (s) return s;
        } catch (e) {}
    }
    return null;
}

// ============================================
// Определение собеседника
// ============================================

function getRemoteInfo(session) {
    if (window.CURRENT_USER === 'client') {
        return {
            name: session.psychologistName || 'Психолог',
            role: 'Психолог'
        };
    } else {
        return {
            name: session.clientName || 'Клиент',
            role: 'Клиент'
        };
    }
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// ============================================
// Инициализация
// ============================================

function initRoom() {
    const sessionId = getSessionIdFromURL();

    if (!sessionId) {
        document.getElementById('remoteName').textContent = 'Сессия не найдена';
        document.getElementById('roomStatus').textContent = 'Ошибка';
        return;
    }

    const session = findSessionById(sessionId);
    if (!session) {
        document.getElementById('remoteName').textContent = 'Сессия не найдена';
        document.getElementById('roomStatus').textContent = 'Ошибка';
        return;
    }

    const remote = getRemoteInfo(session);

    document.getElementById('remoteName').textContent = remote.name;
    document.getElementById('remoteRole').textContent = remote.role;
    document.getElementById('remoteAvatar').textContent = getInitials(remote.name);

    setTimeout(function () {
        document.getElementById('roomStatusDot').classList.add('connected');
        document.getElementById('roomStatus').textContent = 'Подключено';
    }, 1500);

    sessionStartTime = Date.now();
    startTimer();

    document.title = 'Сессия с ' + remote.name + ' | PsyHelp';
}

// ============================================
// Таймер
// ============================================

function startTimer() {
    const el = document.getElementById('roomTimer');
    if (!el) return;

    timerInterval = setInterval(function () {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const sec = String(elapsed % 60).padStart(2, '0');
        el.textContent = min + ':' + sec;
    }, 1000);
}

// ============================================
// Управление
// ============================================

function toggleMic() {
    micOn = !micOn;
    const btn = document.getElementById('micBtn');
    const label = document.getElementById('micLabel');
    btn.classList.toggle('off', !micOn);
    label.textContent = micOn ? 'Микрофон' : 'Выкл.';
}

function toggleCam() {
    camOn = !camOn;
    const btn = document.getElementById('camBtn');
    const label = document.getElementById('camLabel');
    const local = document.getElementById('videoLocal');
    btn.classList.toggle('off', !camOn);
    label.textContent = camOn ? 'Камера' : 'Выкл.';
    local.classList.toggle('cam-off', !camOn);
    local.classList.toggle('cam-on', camOn);
}

function leaveRoom() {
    if (!confirm('Завершить сессию?')) return;

    if (timerInterval) clearInterval(timerInterval);

    // Возврат в кабинет по роли
    if (window.CURRENT_USER === 'psychologist') {
        window.location.href = 'dashboard.html?section=sessions';
    } else {
        window.location.href = 'client.html?section=sessions';
    }
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(function () {
        const btn = document.getElementById('copyLinkBtn');
        const original = btn.textContent;
        btn.textContent = '✓';
        setTimeout(function () { btn.textContent = original; }, 1500);
    }).catch(function () {
        prompt('Скопируйте ссылку:', url);
    });
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initRoom();

    const micBtn = document.getElementById('micBtn');
    const camBtn = document.getElementById('camBtn');
    const chatBtn = document.getElementById('chatBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const leaveTopBtn = document.getElementById('leaveTopBtn');
    const copyBtn = document.getElementById('copyLinkBtn');

    if (micBtn) micBtn.addEventListener('click', toggleMic);
    if (camBtn) camBtn.addEventListener('click', toggleCam);
    if (chatBtn) chatBtn.addEventListener('click', function () {
        alert('💬 Чат внутри сессии появится в следующих версиях.\n\nСейчас для переписки используйте раздел «Сообщения».');
    });
    if (leaveBtn) leaveBtn.addEventListener('click', leaveRoom);
    if (leaveTopBtn) leaveTopBtn.addEventListener('click', function (e) {
        e.preventDefault();
        leaveRoom();
    });
    if (copyBtn) copyBtn.addEventListener('click', copyLink);
});