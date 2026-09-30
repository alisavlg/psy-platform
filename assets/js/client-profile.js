// ============================================
// ПРОФИЛЬ КЛИЕНТА — данные из Supabase
// ============================================

console.log('[client-profile.js] loaded');

var CLIENT_USER_KEY = 'psyhelp_user';
var PASSWORD_MAX_AGE_DAYS = 60;

// ============================================
// Хранилище (localStorage — кеш)
// ============================================

function getClientUser() {
    var data = localStorage.getItem(CLIENT_USER_KEY);
    if (!data) return {};
    try {
        var u = JSON.parse(data);
        return u || {};
    } catch (e) { return {}; }
}

function saveClientUser(user) {
    localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
}

// ============================================
// Supabase helper
// ============================================

function waitForSupa(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

// ============================================
// Загрузка профиля из Supabase
// ============================================

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

        // Проверяем активную заявку на психолога
        var appStatus = null;
        try {
            var appResult = await window.supa
                .from('applications')
                .select('status')
                .eq('user_id', userId)
                .in('status', ['pending', 'attention'])
                .order('created_at', { ascending: false })
                .limit(1);
            if (appResult.data && appResult.data.length > 0) {
                appStatus = appResult.data[0].status;
            }
        } catch (e) {
            console.warn('[client-profile] не удалось проверить заявку:', e);
        }

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
            roles: Array.isArray(p.roles) ? p.roles : ['client'],
            activeRole: 'client',
            psychologistStatus: (p.psychologist_status && p.psychologist_status !== 'none')
                ? p.psychologist_status
                : (appStatus || 'none'),
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
    var user = getClientUser();

    var realF = document.getElementById('clientRealFirstName');
    var realM = document.getElementById('clientRealMiddleName');
    var realL = document.getElementById('clientRealLastName');

    if (realF) realF.textContent = user.realFirstName || '—';
    if (realM) realM.textContent = user.realMiddleName || '—';
    if (realL) realL.textContent = user.realLastName || '—';

    var badge = document.getElementById('clientVerifyBadge');
    if (badge) {
        var status = user.psychologistStatus || 'none';
        if (status === 'pending') {
            badge.className = 'verify-badge pending';
            badge.textContent = '⏳ Заявка на психолога';
        } else {
            badge.className = 'verify-badge';
            badge.textContent = '👤 Клиент';
        }
    }

    var dispF = document.getElementById('displayFirstName');
    var dispM = document.getElementById('displayMiddleName');
    if (dispF) dispF.value = user.displayFirstName || '';
    if (dispM) dispM.value = user.displayMiddleName || '';

    var preview = document.getElementById('displayNamePreview');
    if (preview) preview.textContent = getDisplayName(user);

    var avatarEl = document.getElementById('clientAvatarPreview');
    if (avatarEl) {
        if (user.avatarUrl) {
            avatarEl.style.backgroundImage = 'url(' + user.avatarUrl + ')';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.textContent = 'Фото';
        }
    }

    var codeEl = document.getElementById('clientUserCode');
    if (codeEl) codeEl.textContent = user.code || 'CL-0000';

    var emailEl = document.getElementById('clientEmail');
    if (emailEl) emailEl.value = user.email || '';

    var phoneEl = document.getElementById('clientPhone');
    if (phoneEl) phoneEl.value = user.phone || '';

    var tzEl = document.getElementById('clientTimezone');
    if (tzEl) tzEl.value = user.timezone || 'Europe/Moscow';

    // Блок «Стать психологом» ведёт become-block.js — не трогаем отсюда

    renderClientPasswordStatus(user);
}

// ============================================
// Статус пароля
// ============================================

function renderClientPasswordStatus(user) {
    var statusEl = document.getElementById('clientPasswordStatus');
    var iconEl = document.getElementById('clientPasswordStatusIcon');
    var titleEl = document.getElementById('clientPasswordStatusTitle');
    var descEl = document.getElementById('clientPasswordStatusDesc');
    var fillEl = document.getElementById('clientPasswordAgeFill');
    var textEl = document.getElementById('clientPasswordAgeText');

    if (!statusEl) return;

    var changedAt = user.passwordChangedAt || user.registeredAt || Date.now();
    var daysPassed = Math.floor((Date.now() - changedAt) / 86400000);
    var daysLeft = PASSWORD_MAX_AGE_DAYS - daysPassed;
    var percent = Math.min(100, Math.max(0, (daysPassed / PASSWORD_MAX_AGE_DAYS) * 100));

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

    var user = getClientUser();

    var dispF = document.getElementById('displayFirstName');
    var dispM = document.getElementById('displayMiddleName');
    var phoneEl = document.getElementById('clientPhone');
    var tzEl = document.getElementById('clientTimezone');
    var msgEl = document.getElementById('clientProfileMessage');

    var displayFirstName = dispF ? dispF.value.trim() : '';
    var displayMiddleName = dispM ? dispM.value.trim() : '';
    var phone = phoneEl ? phoneEl.value.trim() : '';
    var timezone = tzEl ? tzEl.value : 'Europe/Moscow';

    var isValid = true;

    var phoneError = document.getElementById('clientPhoneError');
    var cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
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
        msgEl.style.display = 'block';
    }

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

    user.displayFirstName = displayFirstName;
    user.displayMiddleName = displayMiddleName;
    user.phone = phone;
    user.timezone = timezone;
    saveClientUser(user);

    var preview = document.getElementById('displayNamePreview');
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
        var oldMenu = document.getElementById('userMenu');
        if (oldMenu) oldMenu.remove();
        renderUserMenu();
    }
}

// ============================================
// Копирование кода
// ============================================

function copyClientCode() {
    var codeEl = document.getElementById('clientUserCode');
    var btn = document.getElementById('copyCodeBtn');
    if (!codeEl || !btn) return;

    var code = codeEl.textContent;
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
// Загрузка аватара
// ============================================

async function handleAvatarUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Файл больше 5 МБ. Выберите меньший.');
        e.target.value = '';
        return;
    }

    var allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) {
        alert('Только JPG, PNG или WebP.');
        e.target.value = '';
        return;
    }

    var user = getClientUser();
    if (!user.id) return;

    var ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    var path = user.id + '/avatar-' + Date.now() + '.' + ext;

    var avatarEl = document.getElementById('clientAvatarPreview');
    if (avatarEl) avatarEl.style.opacity = '0.5';

    try {
        var upRes = await window.supa.storage
            .from('avatars')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (upRes.error) {
            console.error('[client-profile] storage error:', upRes.error);
            alert('Ошибка загрузки: ' + upRes.error.message);
            if (avatarEl) avatarEl.style.opacity = '';
            return;
        }

        var urlRes = window.supa.storage.from('avatars').getPublicUrl(path);
        var publicUrl = urlRes.data.publicUrl;

        var updRes = await window.supa
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);

        if (updRes.error) {
            console.error('[client-profile] update error:', updRes.error);
            alert('Не удалось сохранить ссылку: ' + updRes.error.message);
            if (avatarEl) avatarEl.style.opacity = '';
            return;
        }

        user.avatarUrl = publicUrl;
        saveClientUser(user);

        if (avatarEl) {
            avatarEl.style.backgroundImage = 'url(' + publicUrl + ')';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
            avatarEl.style.opacity = '';
        }

        if (typeof renderUserMenu === 'function') {
            var oldMenu = document.getElementById('userMenu');
            if (oldMenu) oldMenu.remove();
            renderUserMenu();
        }

    } catch (err) {
        console.error('[client-profile] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
        if (avatarEl) avatarEl.style.opacity = '';
    }

    e.target.value = '';
}

// ============================================
// Смена пароля через Supabase
// ============================================

function toggleClientPasswordForm() {
    var form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.toggle('active');
}

function cancelClientPasswordChange() {
    var form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.remove('active');

    var cur = document.getElementById('clientCurrentPassword');
    var np = document.getElementById('clientNewPassword');
    var np2 = document.getElementById('clientNewPassword2');
    if (cur) cur.value = '';
    if (np) np.value = '';
    if (np2) np2.value = '';

    ['clientCurrentPassword', 'clientNewPassword', 'clientNewPassword2'].forEach(function (id) {
        var errEl = document.getElementById(id + 'Error');
        if (errEl) errEl.textContent = '';
    });

    var msg = document.getElementById('clientChangePasswordMessage');
    if (msg) msg.className = 'change-password-message';
}

async function handleClientPasswordChange() {
    var current = document.getElementById('clientCurrentPassword').value;
    var newPwd = document.getElementById('clientNewPassword').value;
    var newPwd2 = document.getElementById('clientNewPassword2').value;
    var msg = document.getElementById('clientChangePasswordMessage');

    var isValid = true;

    function showErr(id, text) {
        var el = document.getElementById(id + 'Error');
        if (el) el.textContent = text;
    }
    function clearErr(id) {
        var el = document.getElementById(id + 'Error');
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

        var checkResult = await window.supa.auth.signInWithPassword({
            email: email,
            password: current
        });

        if (checkResult.error) {
            showErr('clientCurrentPassword', 'Неверный текущий пароль');
            return;
        }

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

        var user = getClientUser();
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
// Инициализация
// ============================================

function bindClientProfileHandlers() {
    console.log('[client-profile] bind handlers');

    var form = document.getElementById('clientProfileForm');
    if (form && !form.__bound) {
        form.addEventListener('submit', handleClientProfileSave);
        form.__bound = true;
    }

    var copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn && !copyBtn.__bound) {
        copyBtn.addEventListener('click', copyClientCode);
        copyBtn.__bound = true;
    }

    var avatarInput = document.getElementById('clientAvatarInput');
    var avatarBtn = document.getElementById('clientAvatarBtn');

    if (avatarBtn && avatarInput && !avatarBtn.__bound) {
        avatarBtn.onclick = function (e) {
            e.preventDefault();
            avatarInput.click();
        };
        avatarInput.onchange = handleAvatarUpload;
        avatarBtn.__bound = true;
        console.log('[client-profile] avatar btn bound');
    }

    var changeBtn = document.getElementById('clientChangePasswordBtn');
    if (changeBtn && !changeBtn.__bound) {
        changeBtn.addEventListener('click', toggleClientPasswordForm);
        changeBtn.__bound = true;
    }

    var confirmBtn = document.getElementById('clientConfirmPasswordBtn');
    if (confirmBtn && !confirmBtn.__bound) {
        confirmBtn.addEventListener('click', handleClientPasswordChange);
        confirmBtn.__bound = true;
    }

    var cancelBtn = document.getElementById('clientCancelPasswordBtn');
    if (cancelBtn && !cancelBtn.__bound) {
        cancelBtn.addEventListener('click', cancelClientPasswordChange);
        cancelBtn.__bound = true;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    var ready = await waitForSupa(50);
    if (ready) {
        await loadProfileFromSupabase();
    } else {
        console.warn('[client-profile] Supabase не загрузился, работаем с кешем');
    }

    renderClientProfile();
    bindClientProfileHandlers();
});