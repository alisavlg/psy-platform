// ============================================
// ПРОФИЛЬ КЛИЕНТА — данные из Supabase
// ============================================

console.log('[client-profile.js] loaded');

const CLIENT_USER_KEY = 'psyhelp_user';
const PASSWORD_MAX_AGE_DAYS = 60;

// ============================================
// Хранилище (localStorage — кеш)
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
// Supabase — загрузка и сохранение
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

async function loadProfileFromSupabase() {
    try {
        var sessionResult = await window.supa.auth.getSession();
        if (sessionResult.error || !sessionResult.data.session) {
            console.warn('[client-profile] нет сессии');
            return null;
        }

        var userId = sessionResult.data.session.user.id;
        var authEmail = sessionResult.data.session.user.email;

        var result = await window.supa
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (result.error || !result.data) {
            console.error('[client-profile] не удалось загрузить профиль:', result.error);
            return null;
        }

        var p = result.data;
        var userData = {
            id: userId,
            code: p.code || '',
            email: p.email || authEmail,
            realFirstName: p.real_first_name || '',
            realMiddleName: p.real_middle_name || '',
            realLastName: p.real_last_name || '',
            displayFirstName: p.display_first_name || '',
            displayMiddleName: p.display_middle_name || '',
            phone: p.phone || '',
            timezone: p.timezone || 'Europe/Moscow',
            avatarUrl: p.avatar_url || '',
            roles:  Array.isArray(p.roles) ? p.roles : ['client'],
            activeRole: 'client',
            psychologistStatus: p.psychologist_status || 'none',
            isVerified: false,
            registeredAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            passwordChangedAt: Date.now()
        };

        saveClientUser(userData);
        return userData;

    } catch (err) {
        console.error('[client-profile] исключение при загрузке:', err);
        return null;
    }
}

async function saveProfileToSupabase(data) {
    try {
        var sessionResult = await window.supa.auth.getSession();
        if (sessionResult.error || !sessionResult.data.session) {
            return { success: false, error: 'Нет активной сессии' };
        }

        var userId = sessionResult.data.session.user.id;

        var result = await window.supa
            .from('profiles')
            .update({
                display_first_name: data.displayFirstName || '',
                display_middle_name: data.displayMiddleName || '',
                phone: data.phone || '',
                timezone: data.timezone || 'Europe/Moscow'
            })
            .eq('id', userId);

        if (result.error) {
            console.error('[client-profile] update error:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true };

    } catch (err) {
        console.error('[client-profile] exception:', err);
        return { success: false, error: err.message || 'Ошибка' };
    }
}

// ============================================
// Транслируемое имя
// ============================================

function getDisplayName(user) {
    var f = (user.displayFirstName || '').trim();
    var m = (user.displayMiddleName || '').trim();
    if (f && m) return f + ' ' + m;
    if (f) return f;
    var rf = (user.realFirstName || '').trim();
    var rm = (user.realMiddleName || '').trim();
    if (rf && rm) return rf + ' ' + rm;
    if (rf) return rf;
    return '—';
}

// ============================================
// Отрисовка
// ============================================

function renderClientProfile() {
    const user = getClientUser();

    const realF = document.getElementById('clientRealFirstName');
    const realM = document.getElementById('clientRealMiddleName');
    const realL = document.getElementById('clientRealLastName');

    if (realF) realF.textContent = user.realFirstName || '—';
    if (realM) realM.textContent = user.realMiddleName || '—';
    if (realL) realL.textContent = user.realLastName || '—';

    const badge = document.getElementById('clientVerifyBadge');
    if (badge) {
        const status = user.psychologistStatus || 'none';
        if (status === 'pending') {
            badge.className = 'verify-badge pending';
            badge.textContent = '⏳ Заявка на психолога';
        } else {
            badge.className = 'verify-badge';
            badge.textContent = '👤 Клиент';
        }
    }

    const dispF = document.getElementById('displayFirstName');
    const dispM = document.getElementById('displayMiddleName');
    if (dispF) dispF.value = user.displayFirstName || '';
    if (dispM) dispM.value = user.displayMiddleName || '';

    const preview = document.getElementById('displayNamePreview');
    if (preview) preview.textContent = getDisplayName(user);

    const avatarEl = document.getElementById('clientAvatarPreview');
    if (avatarEl) {
        if (user.avatarUrl) {
            avatarEl.style.backgroundImage = 'url(' + user.avatarUrl + ')';
            avatarEl.textContent = '';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.textContent = 'Фото';
        }
    }

    const codeEl = document.getElementById('clientUserCode');
    if (codeEl) codeEl.textContent = user.code || 'CL-0000';

    const emailEl = document.getElementById('clientEmail');
    if (emailEl) emailEl.value = user.email || '';

    const phoneEl = document.getElementById('clientPhone');
    if (phoneEl) phoneEl.value = user.phone || '';

    const tzEl = document.getElementById('clientTimezone');
    if (tzEl) tzEl.value = user.timezone || 'Europe/Moscow';

    const becomeBlock = document.getElementById('becomePsychologistBlock');
    if (becomeBlock) {
        const status = user.psychologistStatus || 'none';
        const hasPsyRole = Array.isArray(user.roles) && user.roles.indexOf('psychologist') !== -1;

        if (hasPsyRole) {
            becomeBlock.style.display = 'none';
        } else if (status === 'pending') {
            becomeBlock.innerHTML =
                '<div class="become-psy-pending">' +
                    '⏳ <strong>Заявка на роль психолога отправлена.</strong><br>' +
                    '<small>Мы проверяем документы. Это занимает 1–3 дня.</small>' +
                '</div>';
            becomeBlock.style.display = 'block';
        } else {
            becomeBlock.style.display = 'block';
        }
    }

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

async function handleClientProfileSave(e) {
    e.preventDefault();

    const user = getClientUser();

    const dispF = document.getElementById('displayFirstName');
    const dispM = document.getElementById('displayMiddleName');
    const phoneEl = document.getElementById('clientPhone');
    const tzEl = document.getElementById('clientTimezone');
    const msgEl = document.getElementById('clientProfileMessage');

    const displayFirstName = dispF ? dispF.value.trim() : '';
    const displayMiddleName = dispM ? dispM.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const timezone = tzEl ? tzEl.value : 'Europe/Moscow';

    let isValid = true;

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

    if (msgEl) {
        msgEl.className = 'form-message';
        msgEl.textContent = 'Сохранение...';
        msgEl.className = 'form-message';
        msgEl.style.display = 'block';
    }

    // Сохраняем в Supabase
    var result = await saveProfileToSupabase({
        displayFirstName: displayFirstName,
        displayMiddleName: displayMiddleName,
        phone: phone,
        timezone: timezone
    });

    if (!result.success) {
        if (msgEl) {
            msgEl.className = 'form-message error';
            msgEl.textContent = 'Ошибка: ' + result.error;
        }
        return;
    }

    // Обновляем кеш localStorage
    user.displayFirstName = displayFirstName;
    user.displayMiddleName = displayMiddleName;
    user.phone = phone;
    user.timezone = timezone;
    saveClientUser(user);

    const preview = document.getElementById('displayNamePreview');
    if (preview) preview.textContent = getDisplayName(user);

    if (msgEl) {
        msgEl.className = 'form-message success';
        msgEl.textContent = '✓ Изменения сохранены';
        setTimeout(function () {
            msgEl.className = 'form-message';
            msgEl.style.display = '';
        }, 3000);
    }

    if (typeof renderUserMenu === 'function') {
        const oldMenu = document.getElementById('userMenu');
        if (oldMenu) oldMenu.remove();
        renderUserMenu();
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
// Загрузка аватара (пока base64 в localStorage)
// ============================================

function handleAvatarUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('Файл больше 2 МБ. Выберите меньший.\n\n(Загрузка больших фото появится позже — через хранилище файлов.)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
        const dataUrl = ev.target.result;
        const user = getClientUser();
        user.avatarUrl = dataUrl;
        saveClientUser(user);

        const avatarEl = document.getElementById('clientAvatarPreview');
        if (avatarEl) {
            avatarEl.style.backgroundImage = 'url(' + dataUrl + ')';
            avatarEl.textContent = '';
        }

        if (typeof renderUserMenu === 'function') {
            const oldMenu = document.getElementById('userMenu');
            if (oldMenu) oldMenu.remove();
            renderUserMenu();
        }
    };
    reader.readAsDataURL(file);
}

// ============================================
// Смена пароля через Supabase
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

async function handleClientPasswordChange() {
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
        showErr('clientNewPassword', 'Новый пароль должен отличаться'); isValid = false;
    } else clearErr('clientNewPassword');

    if (!newPwd2) {
        showErr('clientNewPassword2', 'Повторите новый пароль'); isValid = false;
    } else if (newPwd2 !== newPwd) {
        showErr('clientNewPassword2', 'Пароли не совпадают'); isValid = false;
    } else clearErr('clientNewPassword2');

    if (!isValid) return;

    // Проверяем текущий пароль через signInWithPassword
    try {
        var sessionResult = await window.supa.auth.getSession();
        if (!sessionResult.data.session) {
            if (msg) {
                msg.className = 'change-password-message error';
                msg.textContent = 'Нет активной сессии';
            }
            return;
        }

        var email = sessionResult.data.session.user.email;

        // Проверка текущего пароля
        var checkResult = await window.supa.auth.signInWithPassword({
            email: email,
            password: current
        });

        if (checkResult.error) {
            showErr('clientCurrentPassword', 'Неверный текущий пароль');
            return;
        }

        // Обновляем пароль
        var updateResult = await window.supa.auth.updateUser({
            password: newPwd
        });

        if (updateResult.error) {
            if (msg) {
                msg.className = 'change-password-message error';
                msg.textContent = 'Ошибка: ' + updateResult.error.message;
            }
            return;
        }

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

    } catch (err) {
        console.error('[client-profile] пароль — исключение:', err);
        if (msg) {
            msg.className = 'change-password-message error';
            msg.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз');
        }
    }
}

// ============================================
// Кнопка «Стать психологом»
// ============================================

function handleBecomePsychologist() {
    window.location.href = 'become-psychologist.html';
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    // Сначала — загружаем свежий профиль из Supabase
    var ready = await waitForSupa(50);
    if (ready) {
        await loadProfileFromSupabase();
    } else {
        console.warn('[client-profile] Supabase не загрузился, работаем с кешем');
    }

    // Рендер
    renderClientProfile();

    // Обработчики
    const form = document.getElementById('clientProfileForm');
    if (form) form.addEventListener('submit', handleClientProfileSave);

    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyClientCode);

    const avatarInput = document.getElementById('clientAvatarInput');
    if (avatarInput) avatarInput.addEventListener('change', handleAvatarUpload);

    const avatarBtn = document.getElementById('clientAvatarBtn');
    if (avatarBtn && avatarInput) {
        avatarBtn.addEventListener('click', function () {
            avatarInput.click();
        });
    }

    const changeBtn = document.getElementById('clientChangePasswordBtn');
    if (changeBtn) changeBtn.addEventListener('click', toggleClientPasswordForm);

    const confirmBtn = document.getElementById('clientConfirmPasswordBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', handleClientPasswordChange);

    const cancelBtn = document.getElementById('clientCancelPasswordBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelClientPasswordChange);

    const becomeBtn = document.getElementById('becomePsychologistBtn');
    if (becomeBtn) becomeBtn.addEventListener('click', handleBecomePsychologist);
});