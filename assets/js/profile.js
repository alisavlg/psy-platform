// ============================================
// РАЗДЕЛ «ЛИЧНАЯ СТРАНИЦА»
// ============================================

console.log('[profile.js] loaded');

const PROFILE_STORAGE_KEY = 'psyhelp_profile';
const USER_STORAGE_KEY = 'psyhelp_user';

const PASSWORD_MAX_AGE_DAYS = 60;

const DEFAULT_USER = {
    firstName: 'Анна',
    middleName: 'Сергеевна',
    lastName: 'Иванова',
    email: 'anna@example.com',
    phone: '+7 900 123-45-67',
    isVerified: true,
    registeredAt: Date.now(),
    passwordChangedAt: Date.now()
};

const DEFAULT_PROFILE = {
    specialty: 'Тревога, отношения, самооценка',
    description: 'Помогаю справляться с тревогой, строить здоровые отношения и повышать самооценку. Работаю в методах КПТ и гештальт-терапии. Онлайн-сессии.',
    experience: 8,
    price: 3000,
    photoUrl: ''
};

function getUser() {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    if (data) {
        try { return Object.assign({}, DEFAULT_USER, JSON.parse(data)); } catch (e) { return DEFAULT_USER; }
    }
    return DEFAULT_USER;
}

function saveUser(user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function getProfile() {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) {
        try { return Object.assign({}, DEFAULT_PROFILE, JSON.parse(data)); } catch (e) { return DEFAULT_PROFILE; }
    }
    return DEFAULT_PROFILE;
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

// ============================================
// Отрисовка формы
// ============================================

function renderProfileForm() {
    const user = getUser();
    const profile = getProfile();

    const fioFirstName = document.getElementById('fioFirstName');
    const fioMiddleName = document.getElementById('fioMiddleName');
    const fioLastName = document.getElementById('fioLastName');
    const verifyBadge = document.getElementById('verifyBadge');

    if (fioFirstName) fioFirstName.textContent = user.firstName || '—';
    if (fioMiddleName) fioMiddleName.textContent = user.middleName || '—';
    if (fioLastName) fioLastName.textContent = user.lastName || '—';

    if (verifyBadge) {
        if (user.isVerified) {
            verifyBadge.className = 'verify-badge verified';
            verifyBadge.textContent = '✓ Проверен';
        } else {
            verifyBadge.className = 'verify-badge pending';
            verifyBadge.textContent = '⏳ На проверке';
        }
    }

    const specialtyEl = document.getElementById('profileSpecialty');
    const descriptionEl = document.getElementById('profileDescription');
    const experienceEl = document.getElementById('profileExperience');
    const priceEl = document.getElementById('profilePrice');
    const photoEl = document.getElementById('profilePhotoPreview');

    if (specialtyEl) specialtyEl.value = profile.specialty || '';
    if (descriptionEl) descriptionEl.value = profile.description || '';
    if (experienceEl) experienceEl.value = profile.experience || '';
    if (priceEl) priceEl.value = profile.price || '';

    if (photoEl && profile.photoUrl) {
        photoEl.style.backgroundImage = `url(${profile.photoUrl})`;
        photoEl.textContent = '';
    }

    renderPasswordStatus(user);
}

// ============================================
// Статус пароля
// ============================================

function renderPasswordStatus(user) {
    const statusEl = document.getElementById('passwordStatus');
    const iconEl = document.getElementById('passwordStatusIcon');
    const titleEl = document.getElementById('passwordStatusTitle');
    const descEl = document.getElementById('passwordStatusDesc');
    const fillEl = document.getElementById('passwordAgeFill');
    const textEl = document.getElementById('passwordAgeText');

    if (!statusEl || !fillEl) return;

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
        descEl.textContent = `Пароль был установлен ${daysPassed} дн. назад.`;
        textEl.textContent = `Осталось ${daysLeft} дн. до рекомендуемой смены`;
    } else if (daysLeft > 0) {
        statusEl.classList.add('warning');
        fillEl.classList.add('warning');
        iconEl.textContent = '⚠️';
        titleEl.textContent = 'Скоро нужно сменить пароль';
        descEl.textContent = `Пароль установлен ${daysPassed} дн. назад.`;
        textEl.textContent = `Осталось ${daysLeft} дн.`;
    } else {
        statusEl.classList.add('expired');
        fillEl.classList.add('expired');
        fillEl.style.width = '100%';
        iconEl.textContent = '🚨';
        titleEl.textContent = 'Пора сменить пароль';
        descEl.textContent = `Пароль не менялся ${daysPassed} дн.`;
        textEl.textContent = `Просрочено на ${Math.abs(daysLeft)} дн.`;
    }
}

// ============================================
// Сохранение профиля
// ============================================

function handleProfileSave(e) {
    e.preventDefault();

    const specialty = document.getElementById('profileSpecialty').value.trim();
    const description = document.getElementById('profileDescription').value.trim();
    const experience = parseInt(document.getElementById('profileExperience').value) || 0;
    const price = parseInt(document.getElementById('profilePrice').value) || 0;

    let isValid = true;

    if (!specialty || specialty.length < 3) { showProfileError('profileSpecialty', 'Введите специализацию'); isValid = false; } else clearProfileError('profileSpecialty');
    if (!description || description.length < 20) { showProfileError('profileDescription', 'Описание должно быть не короче 20 символов'); isValid = false; } else clearProfileError('profileDescription');
    if (!experience || experience < 0) { showProfileError('profileExperience', 'Укажите стаж'); isValid = false; } else clearProfileError('profileExperience');
    if (!price || price < 0) { showProfileError('profilePrice', 'Укажите цену'); isValid = false; } else clearProfileError('profilePrice');

    if (!isValid) return;

    saveProfile({ specialty, description, experience, price, photoUrl: getProfile().photoUrl || '' });

    const msg = document.getElementById('profileMessage');
    if (msg) {
        msg.className = 'form-message success';
        msg.textContent = '✓ Изменения сохранены. Они уже видны на главной странице.';
        setTimeout(() => { msg.className = 'form-message'; }, 4000);
    }
}

function showProfileError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) { const g = inputEl.closest('.form-group'); if (g) g.classList.add('has-error'); }
}

function clearProfileError(fieldId) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) { const g = inputEl.closest('.form-group'); if (g) g.classList.remove('has-error'); }
}

// ============================================
// Смена пароля
// ============================================

function toggleChangePasswordForm() {
    console.log('[profile.js] toggle change password form');
    const form = document.getElementById('changePasswordForm');
    if (!form) {
        console.error('[profile.js] changePasswordForm not found');
        return;
    }
    form.classList.toggle('active');
}

function cancelChangePassword() {
    const form = document.getElementById('changePasswordForm');
    if (form) form.classList.remove('active');

    const cur = document.getElementById('currentPassword');
    const np = document.getElementById('newPassword');
    const np2 = document.getElementById('newPassword2');
    if (cur) cur.value = '';
    if (np) np.value = '';
    if (np2) np2.value = '';

    ['currentPassword', 'newPassword', 'newPassword2'].forEach(clearProfileError);

    const msg = document.getElementById('changePasswordMessage');
    if (msg) msg.className = 'change-password-message';
}

function handleChangePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const newPwd2 = document.getElementById('newPassword2').value;
    const msg = document.getElementById('changePasswordMessage');

    let isValid = true;

    if (!current) { showProfileError('currentPassword', 'Введите текущий пароль'); isValid = false; } else clearProfileError('currentPassword');

    if (!newPwd) {
        showProfileError('newPassword', 'Введите новый пароль'); isValid = false;
    } else if (/[а-яА-ЯёЁ]/.test(newPwd)) {
        showProfileError('newPassword', 'Только латинские буквы, цифры и символы'); isValid = false;
    } else if (newPwd.length < 8) {
        showProfileError('newPassword', 'Минимум 8 символов'); isValid = false;
    } else if (!/[a-zA-Z]/.test(newPwd) || !/\d/.test(newPwd)) {
        showProfileError('newPassword', 'Пароль должен содержать буквы и цифры'); isValid = false;
    } else if (newPwd === current) {
        showProfileError('newPassword', 'Новый пароль должен отличаться от текущего'); isValid = false;
    } else clearProfileError('newPassword');

    if (!newPwd2) {
        showProfileError('newPassword2', 'Повторите новый пароль'); isValid = false;
    } else if (newPwd2 !== newPwd) {
        showProfileError('newPassword2', 'Пароли не совпадают'); isValid = false;
    } else clearProfileError('newPassword2');

    if (!isValid) return;

    const user = getUser();
    user.passwordChangedAt = Date.now();
    saveUser(user);

    if (msg) {
        msg.className = 'change-password-message success';
        msg.textContent = '✓ Пароль успешно изменён.';
    }

    renderPasswordStatus(user);

    setTimeout(() => { cancelChangePassword(); }, 2000);
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[profile.js] DOMContentLoaded');

    const form = document.getElementById('profileForm');
    if (form) form.addEventListener('submit', handleProfileSave);

    const changeBtn = document.getElementById('changePasswordBtn');
    console.log('[profile.js] changePasswordBtn found:', !!changeBtn);
    if (changeBtn) changeBtn.addEventListener('click', toggleChangePasswordForm);

    const confirmBtn = document.getElementById('confirmPasswordBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', handleChangePassword);

    const cancelBtn = document.getElementById('cancelPasswordBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelChangePassword);
});