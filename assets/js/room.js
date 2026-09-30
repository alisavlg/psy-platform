// ============================================
// КОМНАТА — Jitsi Meet + Supabase
// ============================================

console.log('[room.js] loaded');

var currentSession = null;
var currentRole = 'client';
var jitsiApi = null;

// ============================================
// Утилиты
// ============================================

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

function getMyUser() {
    try {
        return JSON.parse(localStorage.getItem('psyhelp_user')) || {};
    } catch (e) { return {}; }
}

function getMyDisplayName() {
    var u = getMyUser();
    if (currentRole === 'client') {
        var f = (u.displayFirstName || u.realFirstName || '').trim();
        var m = (u.displayMiddleName || u.realMiddleName || '').trim();
        return (f + ' ' + m).trim() || 'Клиент';
    } else {
        var rf = (u.realFirstName || '').trim();
        var rm = (u.realMiddleName || '').trim();
        return (rf + ' ' + rm).trim() || 'Психолог';
    }
}

// ============================================
// Загрузка сессии из Supabase
// ============================================

async function loadSession(sessionId) {
    var result = await window.supa
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (result.error || !result.data) {
        console.error('[room] сессия не найдена:', result.error);
        return null;
    }
    return result.data;
}

// ============================================
// Определение отображаемых имён
// ============================================

function getPeerInfo(session) {
    if (currentRole === 'client') {
        return {
            name: session.psychologist_name || 'Психолог',
            role: 'Психолог'
        };
    } else {
        return {
            name: session.client_name || 'Клиент',
            role: 'Клиент'
        };
    }
}

// ============================================
// Jitsi
// ============================================

function buildRoomName(sessionId) {
    // Безопасное имя комнаты — с префиксом psyhelp
    return 'psyhelp-' + sessionId.replace(/[^a-zA-Z0-9-]/g, '');
}

function startJitsi(roomName, displayName) {
    var container = document.getElementById('jitsiContainer');
    if (!container) return;

    var options = {
        roomName: roomName,
        parentNode: container,
        width: '100%',
        height: '100%',
        userInfo: {
            displayName: displayName
        },
        configOverwrite: {
            prejoinConfig: { enabled: false },
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            requireDisplayName: false,
            toolbarButtons: [
                'microphone',
                'camera',
                'desktop',
                'chat',
                'raisehand',
                'tileview',
                'settings',
                'hangup'
            ],
            notifications: [],
            disableThirdPartyRequests: true
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#0f172a',
            TOOLBAR_ALWAYS_VISIBLE: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_VIDEO_BACKGROUND: true
        }
    };

    try {
        jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', options);
        window.__jitsi = jitsiApi;

        jitsiApi.addEventListener('videoConferenceJoined', function () {
            console.log('[room] подключение к Jitsi установлено');
            hideLoading();
            setStatus('Подключено', true);
        });

        jitsiApi.addEventListener('videoConferenceLeft', function () {
            console.log('[room] выход из Jitsi');
            leaveRoom(true);
        });

        jitsiApi.addEventListener('readyToClose', function () {
            leaveRoom(true);
        });

    } catch (err) {
        console.error('[room] ошибка Jitsi:', err);
        setStatus('Ошибка подключения', false);
        hideLoading();
    }
}

function hideLoading() {
    var el = document.getElementById('roomLoading');
    if (el) el.style.display = 'none';
}

function setStatus(text, connected) {
    var dot = document.getElementById('roomStatusDot');
    var status = document.getElementById('roomStatus');
    if (status) status.textContent = text;
    if (dot) {
        if (connected) dot.classList.add('connected');
        else dot.classList.remove('connected');
    }
}

// ============================================
// Выход
// ============================================

function leaveRoom(silent) {
    if (!silent && !confirm('Завершить сессию?')) return;

    try {
        if (jitsiApi) jitsiApi.dispose();
    } catch (e) {}

    if (currentRole === 'psychologist') {
        window.location.href = 'dashboard.html?section=sessions';
    } else {
        window.location.href = 'client.html?section=sessions';
    }
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    var ready = await waitForSupa(50);
    if (!ready) {
        setStatus('Ошибка соединения', false);
        hideLoading();
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var sessionId = params.get('session');
    var role = params.get('role');

    if (!sessionId || (role !== 'client' && role !== 'psychologist')) {
        setStatus('Не указана сессия', false);
        hideLoading();
        return;
    }

    currentRole = role;

    // Загружаем сессию
    currentSession = await loadSession(sessionId);
    if (!currentSession) {
        setStatus('Сессия не найдена', false);
        hideLoading();
        return;
    }

    // Проверка: сессия отменена?
    if (currentSession.status === 'cancelled') {
        setStatus('Сессия отменена', false);
        hideLoading();
        return;
    }

    // Заполняем шапку
    var peer = getPeerInfo(currentSession);
    var peerNameEl = document.getElementById('roomPeerName');
    var peerRoleEl = document.getElementById('roomPeerRole');
    var myNameEl = document.getElementById('roomMyName');

    if (peerNameEl) peerNameEl.textContent = peer.name;
    if (peerRoleEl) peerRoleEl.textContent = peer.role;
    if (myNameEl) myNameEl.textContent = 'Вы: ' + getMyDisplayName();

    document.title = 'Сессия с ' + peer.name + ' | PsyHelp';

    setStatus('Подключение...', false);

    // Запускаем Jitsi
    var roomName = buildRoomName(sessionId);
    var displayName = getMyDisplayName();

    console.log('[room] комната:', roomName, '| я:', displayName, '| роль:', currentRole);

    startJitsi(roomName, displayName);

    // Кнопка «Завершить»
    var leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            leaveRoom(false);
        });
    }
});