// ============================================
// ПРОФИЛЬ КЛИЕНТА — данные, код, безопасность
// ============================================

console.log('[client-profile.js] loaded');

const CLIENT_USER_KEY = 'psyhelp_user';
const PASSWORD_MAX_AGE_DAYS = 60;

// ============================================
// Хранилище
// ============================================

function getClientUser() {
    const data = localStorage.getItem(CLIENT_USER_KEY);
    if (!data) return {};
    try {
        const u = JSON.parse(data);
        return u || {};
    } catch (e) { return {}; }
}

function saveClientUser(user) {
    localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
}

// ============================================
// Отрисовка
// ============================================

function renderClientProfile() {
    const user = getClientUser();

    // ФИО
    const fioF = document.getElementById('clientFioFirstName');
    const fioM = document.getElementById('clientFioMiddleName');
    const fioL = document.getElementById('clientFioLastName');

    if (fioF) fioF.textContent = user.firstName || '—';
    if (fioM) fioM.textContent = user.middleName || '—';
    if (fioL) fioL.textContent = user.lastName || '—';

    // Бейдж верификации
    const badge = document.getElementById('clientVerifyBadge');
    if (badge) {
        if (user.isVerified) {
            badge.className = 'verify-badge verified';
            badge.textContent = '✓ Проверен';
        } else {
            badge.className = 'verify-badge pending';
            badge.textContent = '⏳ Ожидает проверки';
        }
    }

    // Код
    const codeEl = document.getElementById('clientUserCode');
    if (codeEl) codeEl.textContent = user.code || 'CL-0000';

    // Email
    const emailEl = document.getElementById('clientEmail');
    if (emailEl) emailEl.value = user.email || '';

    // Телефон
    const phoneEl = document.getElementById('clientPhone');
    if (phoneEl) phoneEl.value = user.phone || '';

    // Часовой пояс
    const tzEl = document.getElementById('clientTimezone');
    if (tzEl) tzEl.value = user.timezone || 'Europe/Moscow';

    // Статус пароля
    renderClientPasswordStatus(user);
}

// ============================================
// Статус пароля
// ============================================

function renderClientPasswordStatus(user) {
    const statusEl = document.getElementById('clientPasswordStatus');
    const iconEl = document.getElementById('clientPasswordStatusIcon');
    const titleEl = document.getElementById('clientPasswordStatusTitle');
    const descEl = document.getElementById('clientPasswordStatusDesc');
    const fillEl = document.getElementById('clientPasswordAgeFill');
    const textEl = document.getElementById('clientPasswordAgeText');

    if (!statusEl) return;

    const changedAt = user.passwordChangedAt || user.registeredAt || Date.now();
    const daysPassed = Math.floor((Date.now() - changedAt) / 86400000);
    const daysLeft = PASSWORD_MAX_AGE_DAYS - daysPassed;
    const percent = Math.min(100, Math.max(0, (daysPassed / PASSWORD_MAX_AGE_DAYS) * 100));

    statusEl.className = 'password-status';
    fillEl.className = 'password-age-fill';
    fillEl.style.width = percent + '%';

    if (daysLeft > 14) {
        statusEl.classList.add('ok');
        iconEl.textContent = '✓';
        titleEl.textContent = 'Пароль в порядке';
        descEl.textContent = 'Пароль был установлен ' + daysPassed + ' дн. назад.';
        textEl.textContent = 'Осталось ' + daysLeft + ' дн. до рекомендуемой смены';
    } else if (daysLeft > 0) {
        statusEl.classList.add('warning');
        fillEl.classList.add('warning');
        iconEl.textContent = '⚠️';
        titleEl.textContent = 'Скоро нужно сменить пароль';
        descEl.textContent = 'Пароль установлен ' + daysPassed + ' дн. назад.';
        textEl.textContent = 'Осталось ' + daysLeft + ' дн.';
    } else {
        statusEl.classList.add('expired');
        fillEl.classList.add('expired');
        fillEl.style.width = '100%';
        iconEl.textContent = '🚨';
        titleEl.textContent = 'Пора сменить пароль';
        descEl.textContent = 'Пароль не менялся ' + daysPassed + ' дн.';
        textEl.textContent = 'Просрочено на ' + Math.abs(daysLeft) + ' дн.';
    }
}

// ============================================
// Сохранение профиля
// ============================================

function handleClientProfileSave(e) {
    e.preventDefault();

    const emailEl = document.getElementById('clientEmail');
    const phoneEl = document.getElementById('clientPhone');
    const tzEl = document.getElementById('clientTimezone');
    const msgEl = document.getElementById('clientProfileMessage');

    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const timezone = tzEl ? tzEl.value : 'Europe/Moscow';

    let isValid = true;

    // Email
    const emailError = document.getElementById('clientEmailError');
    if (!email) {
        if (emailError) emailError.textContent = 'Введите email';
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailError) emailError.textContent = 'Неверный формат email';
        isValid = false;
    } else if (emailError) {
        emailError.textContent = '';
    }

    // Телефон
    const phoneError = document.getElementById('clientPhoneError');
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!phone) {
        if (phoneError) phoneError.textContent = 'Введите телефон';
        isValid = false;
    } else if (!/^(\+7|8)\d{10}$/.test(cleanedPhone)) {
        if (phoneError) phoneError.textContent = 'Неверный формат телефона';
        isValid = false;
    } else if (phoneError) {
        phoneError.textContent = '';
    }

    if (!isValid) return;

    const user = getClientUser();
    user.email = email;
    user.phone = phone;
    user.timezone = timezone;
    saveClientUser(user);

    if (msgEl) {
        msgEl.className = 'form-message success';
        msgEl.textContent = '✓ Изменения сохранены';
        setTimeout(function () {
            msgEl.className = 'form-message';
        }, 3000);
    }
}

// ============================================
// Копирование кода
// ============================================

function copyClientCode() {
    const codeEl = document.getElementById('clientUserCode');
    const btn = document.getElementById('copyCodeBtn');
    if (!codeEl || !btn) return;

    const code = codeEl.textContent;
    navigator.clipboard.writeText(code).then(function () {
        btn.classList.add('copied');
        btn.textContent = '✓ Скопировано';
        setTimeout(function () {
            btn.classList.remove('copied');
            btn.textContent = '📋 Скопировать';
        }, 2000);
    }).catch(function () {
        prompt('Скопируйте код:', code);
    });
}

// ============================================
// Смена пароля
// ============================================

function toggleClientPasswordForm() {
    const form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.toggle('active');
}

function cancelClientPasswordChange() {
    const form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.remove('active');

    const cur = document.getElementById('clientCurrentPassword');
    const np = document.getElementById('clientNewPassword');
    const np2 = document.getElementById('clientNewPassword2');
    if (cur) cur.value = '';
    if (np) np.value = '';
    if (np2) np2.value = '';

    ['clientCurrentPassword', 'clientNewPassword', 'clientNewPassword2'].forEach(function (id) {
        const errEl = document.getElementById(id + 'Error');
        if (errEl) errEl.textContent = '';
    });

    const msg = document.getElementById('clientChangePasswordMessage');
    if (msg) msg.className = 'change-password-message';
}

function handleClientPasswordChange() {
    const current = document.getElementById('clientCurrentPassword').value;
    const newPwd = document.getElementById('clientNewPassword').value;
    const newPwd2 = document.getElementById('clientNewPassword2').value;
    const msg = document.getElementById('clientChangePasswordMessage');

    let isValid = true;

    function showErr(id, text) {
        const el = document.getElementById(id + 'Error');
        if (el) el.textContent = text;
    }
    function clearErr(id) {
        const el = document.getElementById(id + 'Error');
        if (el) el.textContent = '';
    }

    if (!current) { showErr('clientCurrentPassword', 'Введите текущий пароль'); isValid = false; }
    else clearErr('clientCurrentPassword');

    if (!newPwd) {
        showErr('clientNewPassword', 'Введите новый пароль'); isValid = false;
    } else if (/[а-яА-ЯёЁ]/.test(newPwd)) {
        showErr('clientNewPassword', 'Только латинские буквы, цифры и символы'); isValid = false;
    } else if (newPwd.length < 8) {
        showErr('clientNewPassword', 'Минимум 8 символов'); isValid = false;
    } else if (!/[a-zA-Z]/.test(newPwd) || !/\d/.test(newPwd)) {
        showErr('clientNewPassword', 'Пароль должен содержать буквы и цифры'); isValid = false;
    } else if (newPwd === current) {
        showErr('clientNewPassword', 'Новый пароль должен отличаться от текущего'); isValid = false;
    } else clearErr('clientNewPassword');

    if (!newPwd2) {
        showErr('clientNewPassword2', 'Повторите новый пароль'); isValid = false;
    } else if (newPwd2 !== newPwd) {
        showErr('clientNewPassword2', 'Пароли не совпадают'); isValid = false;
    } else clearErr('clientNewPassword2');

    if (!isValid) return;

    const user = getClientUser();
    user.passwordChangedAt = Date.now();
    saveClientUser(user);

    if (msg) {
        msg.className = 'change-password-message success';
        msg.textContent = '✓ Пароль успешно изменён.';
    }

    renderClientPasswordStatus(user);

    setTimeout(function () {
        cancelClientPasswordChange();
    }, 2000);
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('clientProfileForm');
    if (form) form.addEventListener('submit', handleClientProfileSave);

    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyClientCode);

    const changeBtn = document.getElementById('clientChangePasswordBtn');
    if (changeBtn) changeBtn.addEventListener('click', toggleClientPasswordForm);

    const confirmBtn = document.getElementById('clientConfirmPasswordBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', handleClientPasswordChange);

    const cancelBtn = document.getElementById('clientCancelPasswordBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelClientPasswordChange);
});