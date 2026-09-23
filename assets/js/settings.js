// ============================================
// НАСТРОЙКИ ПСИХОЛОГА
// ============================================

console.log('[settings.js] loaded');

function getUser() {
    const data = localStorage.getItem('psyhelp_user');
    if (data) {
        try {
            const u = JSON.parse(data);
            return u || {};
        } catch (e) { return {}; }
    }
    return {};
}

function saveUser(user) {
    localStorage.setItem('psyhelp_user', JSON.stringify(user));
}

// ============================================
// Отрисовка
// ============================================

function renderSettingsForm() {
    const user = getUser();

    const tzEl = document.getElementById('settingsTimezone');
    if (tzEl) tzEl.value = user.timezone || 'Europe/Moscow';

    const langEl = document.getElementById('settingsLanguage');
    if (langEl) langEl.value = user.language || 'ru';

    const emailEl = document.getElementById('notifyEmail');
    if (emailEl) emailEl.checked = user.notifyEmail !== false;

    const smsEl = document.getElementById('notifySms');
    if (smsEl) smsEl.checked = user.notifySms !== false;

    const pushEl = document.getElementById('notifyPush');
    if (pushEl) pushEl.checked = user.notifyPush === true;
}

// ============================================
// Сохранение
// ============================================

function handleSettingsSave(e) {
    e.preventDefault();

    const user = getUser();

    const tzEl = document.getElementById('settingsTimezone');
    const langEl = document.getElementById('settingsLanguage');
    const emailEl = document.getElementById('notifyEmail');
    const smsEl = document.getElementById('notifySms');
    const pushEl = document.getElementById('notifyPush');

    user.timezone = tzEl ? tzEl.value : 'Europe/Moscow';
    user.language = langEl ? langEl.value : 'ru';
    user.notifyEmail = emailEl ? emailEl.checked : true;
    user.notifySms = smsEl ? smsEl.checked : true;
    user.notifyPush = pushEl ? pushEl.checked : false;

    saveUser(user);

    // Сообщение об успехе
    const msg = document.getElementById('settingsMessage');
    if (msg) {
        msg.className = 'form-message success';
        msg.textContent = '✓ Настройки сохранены';
        setTimeout(function () {
            msg.className = 'form-message';
        }, 3000);
    }

    console.log('[settings] сохранено:', user);
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('submit', handleSettingsSave);
    }
});