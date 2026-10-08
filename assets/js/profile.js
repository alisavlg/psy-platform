// ============================================
// ЛИЧНАЯ СТРАНИЦА ПСИХОЛОГА — Supabase
// ============================================

console.log('[profile.js] loaded');

var PROFILE_USER_KEY = 'psyhelp_user';
var PASSWORD_MAX_AGE_DAYS = 60;

var psyProfileId = null;

// ============================================
// Утилиты
// ============================================

function getUser() {
    var data = localStorage.getItem(PROFILE_USER_KEY);
    if (!data) return {};
    try { return JSON.parse(data) || {}; } catch (e) { return {}; }
}
function saveUser(user) {
    localStorage.setItem(PROFILE_USER_KEY, JSON.stringify(user));
}

function waitForSupaProfile(maxAttempts) {
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
// Загрузка профиля психолога
// ============================================

async function loadPsyProfile() {
    var user = getUser();
    if (!user.id) return null;

    var result = await window.supa
        .from('psychologist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (result.error || !result.data) {
        console.warn('[profile] psychologist_profiles не найден:', result.error);
        return null;
    }

    psyProfileId = result.data.id;
    return result.data;
}

// ============================================
// Отрисовка
// ============================================

async function renderProfileForm() {
    var user = getUser();
    var psy = await loadPsyProfile();

    // ФИО
    var fioF = document.getElementById('fioFirstName');
    var fioM = document.getElementById('fioMiddleName');
    var fioL = document.getElementById('fioLastName');
    if (fioF) fioF.textContent = user.realFirstName || '—';
    if (fioM) fioM.textContent = user.realMiddleName || '—';
    if (fioL) fioL.textContent = user.realLastName || '—';

    // Бейдж
    var verifyBadge = document.getElementById('verifyBadge');
    if (verifyBadge) {
        var status = user.psychologistStatus || 'none';
        if (status === 'approved') {
            verifyBadge.className = 'verify-badge verified';
            verifyBadge.textContent = '✓ Проверен';
        } else if (status === 'rejected') {
            verifyBadge.className = 'verify-badge';
            verifyBadge.style.background = '#f8d7da';
            verifyBadge.style.color = '#721c24';
            verifyBadge.textContent = '✗ Отклонён';
        } else {
            verifyBadge.className = 'verify-badge pending';
            verifyBadge.textContent = '⏳ На проверке';
        }
    }

    // Поля профиля — из psychologist_profiles
    var specialtyEl = document.getElementById('profileSpecialty');
    var descriptionEl = document.getElementById('profileDescription');
    var experienceEl = document.getElementById('profileExperience');
    var priceEl = document.getElementById('profilePrice');
    var photoEl = document.getElementById('profilePhotoPreview');

    if (specialtyEl) specialtyEl.value = (psy && psy.specialty) || '';
    if (descriptionEl) descriptionEl.value = (psy && psy.description) || '';
    if (experienceEl) experienceEl.value = (psy && psy.experience) || '';
    if (priceEl) priceEl.value = (psy && psy.price) || '';

    if (photoEl) {
        if (psy && psy.avatar_url) {
            photoEl.style.backgroundImage = 'url(' + psy.avatar_url + ')';
            photoEl.style.backgroundSize = 'cover';
            photoEl.style.backgroundPosition = 'center';
            photoEl.textContent = '';
        } else {
            photoEl.style.backgroundImage = '';
            photoEl.textContent = 'Фото';
        }
    }

    renderPasswordStatus(user);
}

// ============================================
// Статус пароля
// ============================================

function renderPasswordStatus(user) {
    var statusEl = document.getElementById('passwordStatus');
    var iconEl = document.getElementById('passwordStatusIcon');
    var titleEl = document.getElementById('passwordStatusTitle');
    var descEl = document.getElementById('passwordStatusDesc');
    var fillEl = document.getElementById('passwordAgeFill');
    var textEl = document.getElementById('passwordAgeText');

    if (!statusEl) return;

    var changedAt = user.passwordChangedAt || user.registeredAt || Date.now();
    var daysPassed = Math.floor((Date.now() - changedAt) / 86400000);
    var daysLeft = PASSWORD_MAX_AGE_DAYS - daysPassed;
    var percent = Math.min(100, Math.max(0, (daysPassed / PASSWORD_MAX_AGE_DAYS) * 100));

    statusEl.className = 'password-status';
    if (fillEl) {
        fillEl.className = 'password-age-fill';
        fillEl.style.width = percent + '%';
    }

    if (daysLeft > 14) {
        statusEl.classList.add('ok');
        if (iconEl) iconEl.textContent = '✓';
        if (titleEl) titleEl.textContent = 'Пароль в порядке';
        if (descEl) descEl.textContent = 'Пароль был установлен ' + daysPassed + ' дн. назад.';
        if (textEl) textEl.textContent = 'Осталось ' + daysLeft + ' дн. до рекомендуемой смены';
    } else if (daysLeft > 0) {
        statusEl.classList.add('warning');
        if (fillEl) fillEl.classList.add('warning');
        if (iconEl) iconEl.textContent = '⚠️';
        if (titleEl) titleEl.textContent = 'Скоро нужно сменить пароль';
        if (descEl) descEl.textContent = 'Пароль установлен ' + daysPassed + ' дн. назад.';
        if (textEl) textEl.textContent = 'Осталось ' + daysLeft + ' дн.';
    } else {
        statusEl.classList.add('expired');
        if (fillEl) {
            fillEl.classList.add('expired');
            fillEl.style.width = '100%';
        }
        if (iconEl) iconEl.textContent = '🚨';
        if (titleEl) titleEl.textContent = 'Пора сменить пароль';
        if (descEl) descEl.textContent = 'Пароль не менялся ' + daysPassed + ' дн.';
        if (textEl) textEl.textContent = 'Просрочено на ' + Math.abs(daysLeft) + ' дн.';
    }
}

// ============================================
// Сохранение профиля → psychologist_profiles
// ============================================

async function handleProfileSave(e) {
    e.preventDefault();

    var specialty = document.getElementById('profileSpecialty').value.trim();
    var description = document.getElementById('profileDescription').value.trim();
    var experience = parseInt(document.getElementById('profileExperience').value) || 0;
    var price = parseInt(document.getElementById('profilePrice').value) || 0;

    var isValid = true;

    if (!specialty || specialty.length < 3) { showProfileError('profileSpecialty', 'Введите специализацию'); isValid = false; } else clearProfileError('profileSpecialty');
    if (!description || description.length < 20) { showProfileError('profileDescription', 'Описание минимум 20 символов'); isValid = false; } else clearProfileError('profileDescription');
    if (!experience || experience < 0) { showProfileError('profileExperience', 'Укажите стаж'); isValid = false; } else clearProfileError('profileExperience');
    if (!price || price < 0) { showProfileError('profilePrice', 'Укажите цену'); isValid = false; } else clearProfileError('profilePrice');

    if (!isValid) return;

    if (!psyProfileId) {
        var psy = await loadPsyProfile();
        if (!psy) {
            alert('Профиль психолога не найден. Обратитесь в поддержку.');
            return;
        }
    }

    var result = await window.supa
        .from('psychologist_profiles')
        .update({
            specialty: specialty,
            description: description,
            experience: experience,
            price: price
        })
        .eq('id', psyProfileId);

    var msg = document.getElementById('profileMessage');
    if (result.error) {
        console.error('[profile] update error:', result.error);
        if (msg) {
            msg.className = 'form-message error';
            msg.textContent = 'Ошибка: ' + result.error.message;
        }
        return;
    }

    if (msg) {
        msg.className = 'form-message success';
        msg.textContent = '✓ Изменения сохранены.';
        setTimeout(function () { msg.className = 'form-message'; }, 3000);
    }
}

function showProfileError(fieldId, message) {
    var errorEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) {
        var g = inputEl.closest('.form-group');
        if (g) g.classList.add('has-error');
    }
}
function clearProfileError(fieldId) {
    var errorEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) {
        var g = inputEl.closest('.form-group');
        if (g) g.classList.remove('has-error');
    }
}

// ============================================
// Загрузка фото психолога
// ============================================

async function handlePsyPhotoUpload(e) {
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

    var user = getUser();
    if (!user.id) return;

    if (!psyProfileId) {
        var psy = await loadPsyProfile();
        if (!psy) {
            alert('Профиль психолога не найден.');
            return;
        }
    }

    var ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    var path = user.id + '/psy-avatar-' + Date.now() + '.' + ext;

    var photoEl = document.getElementById('profilePhotoPreview');
    if (photoEl) photoEl.style.opacity = '0.5';

    try {
        var upRes = await window.supa.storage
            .from('avatars')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (upRes.error) {
            console.error('[profile] storage error:', upRes.error);
            alert('Ошибка загрузки: ' + upRes.error.message);
            if (photoEl) photoEl.style.opacity = '';
            return;
        }

        var urlRes = window.supa.storage.from('avatars').getPublicUrl(path);
        var publicUrl = urlRes.data.publicUrl;

        var updRes = await window.supa
            .from('psychologist_profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', psyProfileId);

        if (updRes.error) {
            console.error('[profile] update error:', updRes.error);
            alert('Не удалось сохранить ссылку: ' + updRes.error.message);
            if (photoEl) photoEl.style.opacity = '';
            return;
        }

        if (photoEl) {
            photoEl.style.backgroundImage = 'url(' + publicUrl + ')';
            photoEl.style.backgroundSize = 'cover';
            photoEl.style.backgroundPosition = 'center';
            photoEl.textContent = '';
            photoEl.style.opacity = '';
        }

        if (typeof renderUserMenu === 'function') {
            var oldMenu = document.getElementById('userMenu');
            if (oldMenu) oldMenu.remove();
            renderUserMenu();
        }

    } catch (err) {
        console.error('[profile] exception:', err);
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
        if (photoEl) photoEl.style.opacity = '';
    }

    e.target.value = '';
}

// ============================================
// Смена пароля — Supabase
// ============================================

function toggleChangePasswordForm() {
    var form = document.getElementById('changePasswordForm');
    if (form) form.classList.toggle('active');
}

function cancelChangePassword() {
    var form = document.getElementById('changePasswordForm');
    if (form) form.classList.remove('active');

    var cur = document.getElementById('currentPassword');
    var np = document.getElementById('newPassword');
    var np2 = document.getElementById('newPassword2');
    if (cur) cur.value = '';
    if (np) np.value = '';
    if (np2) np2.value = '';

    ['currentPassword', 'newPassword', 'newPassword2'].forEach(clearProfileError);

    var msg = document.getElementById('changePasswordMessage');
    if (msg) msg.className = 'change-password-message';
}

async function handleChangePassword() {
    var current = document.getElementById('currentPassword').value;
    var newPwd = document.getElementById('newPassword').value;
    var newPwd2 = document.getElementById('newPassword2').value;
    var msg = document.getElementById('changePasswordMessage');

    var isValid = true;

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
        showProfileError('newPassword', 'Новый пароль должен отличаться'); isValid = false;
    } else clearProfileError('newPassword');

    if (!newPwd2) {
        showProfileError('newPassword2', 'Повторите новый пароль'); isValid = false;
    } else if (newPwd2 !== newPwd) {
        showProfileError('newPassword2', 'Пароли не совпадают'); isValid = false;
    } else clearProfileError('newPassword2');

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
            showProfileError('currentPassword', 'Неверный текущий пароль');
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

        var user = getUser();
        user.passwordChangedAt = Date.now();
        saveUser(user);

        if (msg) {
            msg.className = 'change-password-message success';
            msg.textContent = '✓ Пароль успешно изменён.';
        }

        renderPasswordStatus(user);

        setTimeout(function () { cancelChangePassword(); }, 2000);

    } catch (err) {
        console.error('[profile] пароль — исключение:', err);
        if (msg) {
            msg.className = 'change-password-message error';
            msg.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз');
        }
    }
}

// ============================================
// Инициализация
// ============================================

function bindProfileHandlers() {
    var form = document.getElementById('profileForm');
    if (form && !form.__bound) {
        form.addEventListener('submit', handleProfileSave);
        form.__bound = true;
    }

    var photoBtn = document.getElementById('profilePhotoBtn');
    var photoInput = document.getElementById('profilePhotoInput');
    if (photoBtn && photoInput && !photoBtn.__bound) {
        photoBtn.onclick = function (e) {
            e.preventDefault();
            photoInput.click();
        };
        photoInput.onchange = handlePsyPhotoUpload;
        photoBtn.__bound = true;
    }

    var changeBtn = document.getElementById('changePasswordBtn');
    if (changeBtn && !changeBtn.__bound) {
        changeBtn.addEventListener('click', toggleChangePasswordForm);
        changeBtn.__bound = true;
    }

    var confirmBtn = document.getElementById('confirmPasswordBtn');
    if (confirmBtn && !confirmBtn.__bound) {
        confirmBtn.addEventListener('click', handleChangePassword);
        confirmBtn.__bound = true;
    }

    var cancelBtn = document.getElementById('cancelPasswordBtn');
    if (cancelBtn && !cancelBtn.__bound) {
        cancelBtn.addEventListener('click', cancelChangePassword);
        cancelBtn.__bound = true;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await waitForSupaProfile(50);
    bindProfileHandlers();
});