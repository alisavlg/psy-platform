// ============================================
// СТРАНИЦА «СТАТЬ ПСИХОЛОГОМ» — заявка в Supabase
// ============================================

console.log('[become-psychologist.js] loaded');

var BECOME_USER_KEY = 'psyhelp_user';
var existingApp = null;

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

function getUser() {
    try { return JSON.parse(localStorage.getItem(BECOME_USER_KEY)) || {}; } catch (e) { return {}; }
}

function saveUser(user) {
    localStorage.setItem(BECOME_USER_KEY, JSON.stringify(user));
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

async function loadExistingApp(userId) {
    console.log('[become] ищу заявку для user_id:', userId);

    var result = await window.supa
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

    console.log('[become] результат запроса:', result);

    if (result.error) {
        console.error('[become] ошибка загрузки:', result.error);
        return null;
    }
    if (!result.data || result.data.length === 0) {
        console.log('[become] заявок нет');
        return null;
    }
    console.log('[become] заявка найдена:', result.data[0]);
    return result.data[0];
}

function showBanner(app) {
    var banner = document.getElementById('becomeStatusBanner');
    var header = document.getElementById('becomeHeader');
    if (!banner) return;

    if (!app || app.status === 'pending') {
        banner.style.display = 'none';
        if (header) header.style.display = '';
        return;
    }

    var html = '';
    if (app.status === 'attention') {
        html =
            '<div style="background:#fff3cd;border-left:4px solid #f0ad4e;padding:20px;border-radius:10px;margin-bottom:20px;">' +
                '<h3 style="margin:0 0 10px;color:#856404;">⚠️ Требует внимания</h3>' +
                (app.moderator_comment
                    ? '<div style="color:#856404;white-space:pre-wrap;">' + escapeHtml(app.moderator_comment) + '</div>'
                    : '<div style="color:#856404;">Посмотрите комментарий модератора и исправьте заявку.</div>') +
                '<div style="margin-top:12px;font-size:14px;color:#856404;">' +
                    'Внесите правки в форму ниже и отправьте заново.' +
                '</div>' +
            '</div>';
    } else if (app.status === 'rejected') {
        html =
            '<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:20px;border-radius:10px;margin-bottom:20px;">' +
                '<h3 style="margin:0 0 10px;color:#721c24;">❌ Заявка отклонена</h3>' +
                (app.moderator_comment
                    ? '<div style="color:#721c24;white-space:pre-wrap;">' + escapeHtml(app.moderator_comment) + '</div>'
                    : '<div style="color:#721c24;">Посмотрите комментарий модератора.</div>') +
                '<div style="margin-top:12px;font-size:14px;color:#721c24;">' +
                    'Вы можете подать заявку заново, учтя замечания.' +
                '</div>' +
            '</div>';
    }

    banner.innerHTML = html;
    banner.style.display = '';

    if (header) header.style.display = 'none';
}

function fillForm(app) {
    if (!app) return;
    console.log('[become] заполняю форму из заявки');

    var spec = document.getElementById('psySpecialty');
    var exp = document.getElementById('psyExperience');
    var desc = document.getElementById('psyDescription');
    var about = document.getElementById('psyAbout');
    var price = document.getElementById('psyPrice');

    if (spec) spec.value = app.specialty || '';
    if (exp) exp.value = app.experience || '';
    if (desc) desc.value = app.description || '';
    if (about) about.value = app.about || '';
    if (price) price.value = app.price || '';

    var submitBtn = document.getElementById('submitBecomeBtn');
    if (submitBtn) submitBtn.textContent = 'Отправить на проверку заново';
}

function showError(fieldId, message) {
    var errEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errEl) errEl.textContent = message;
    if (inputEl) {
        var group = inputEl.closest('.form-group');
        if (group) group.classList.add('has-error');
    }
}

function clearError(fieldId) {
    var errEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errEl) errEl.textContent = '';
    if (inputEl) {
        var group = inputEl.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }
}

function validateForm() {
    var isValid = true;

    var specialty = document.getElementById('psySpecialty').value.trim();
    if (!specialty || specialty.length < 3) {
        showError('psySpecialty', 'Укажите специализацию (минимум 3 символа)');
        isValid = false;
    } else clearError('psySpecialty');

    var experience = parseInt(document.getElementById('psyExperience').value);
    if (isNaN(experience) || experience < 0 || experience > 60) {
        showError('psyExperience', 'Укажите стаж от 0 до 60 лет');
        isValid = false;
    } else clearError('psyExperience');

    var description = document.getElementById('psyDescription').value.trim();
    if (!description || description.length < 50) {
        showError('psyDescription', 'Описание минимум 50 символов. Сейчас: ' + description.length);
        isValid = false;
    } else clearError('psyDescription');

    var about = document.getElementById('psyAbout').value.trim();
    if (!about || about.length < 30) {
        showError('psyAbout', 'Расскажите о себе (минимум 30 символов). Сейчас: ' + about.length);
        isValid = false;
    } else clearError('psyAbout');

    var price = parseInt(document.getElementById('psyPrice').value);
    if (isNaN(price) || price < 500) {
        showError('psyPrice', 'Минимальная цена — 500 ₽');
        isValid = false;
    } else clearError('psyPrice');

    var agreeRules = document.getElementById('agreeRules').checked;
    var agreeRulesError = document.getElementById('agreeRulesError');
    if (!agreeRules) {
        if (agreeRulesError) agreeRulesError.textContent = 'Необходимо согласие';
        isValid = false;
    } else if (agreeRulesError) agreeRulesError.textContent = '';

    var agreeInterview = document.getElementById('agreeInterview').checked;
    var agreeInterviewError = document.getElementById('agreeInterviewError');
    if (!agreeInterview) {
        if (agreeInterviewError) agreeInterviewError.textContent = 'Необходимо согласие';
        isValid = false;
    } else if (agreeInterviewError) agreeInterviewError.textContent = '';

    return isValid;
}

async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        var firstError = document.querySelector('.form-error:not(:empty)');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    var user = getUser();
    var submitBtn = document.getElementById('submitBecomeBtn');
    var messageEl = document.getElementById('becomeMessage');

    var originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    messageEl.className = 'form-message';
    messageEl.textContent = '';

    var specialty = document.getElementById('psySpecialty').value.trim();
    var experience = parseInt(document.getElementById('psyExperience').value);
    var description = document.getElementById('psyDescription').value.trim();
    var about = document.getElementById('psyAbout').value.trim();
    var price = parseInt(document.getElementById('psyPrice').value);

    try {
        var result;

        if (existingApp) {
            console.log('[become] UPDATE через RPC');
            result = await window.supa.rpc('resubmit_application', {
                app_id: existingApp.id,
                p_specialty: specialty,
                p_experience: experience,
                p_description: description,
                p_about: about,
                p_price: price
            });
        } else {
            console.log('[become] INSERT');
            var userName = 'Клиент';
            if (user.realFirstName) {
                userName = user.realFirstName + (user.realMiddleName ? ' ' + user.realMiddleName : '');
            }

            result = await window.supa.from('applications').insert({
                user_id: user.id,
                user_name: userName,
                user_code: user.code || '',
                specialty: specialty,
                experience: experience,
                description: description,
                about: about,
                price: price,
                status: 'pending'
            }).select().single();
        }

        if (result.error) {
            console.error('[become] error:', result.error);
            messageEl.className = 'form-message error';
            messageEl.textContent = result.error.message || 'Ошибка отправки';
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }

        existingApp = await loadExistingApp(user.id);

        user.psychologistStatus = 'pending';
        saveUser(user);

        messageEl.className = 'form-message success';
        messageEl.innerHTML =
            '✓ Заявка отправлена на проверку!<br>' +
            '<span style="font-size:14px;">Мы проверим данные и свяжемся с вами в течение 1–3 рабочих дней.</span>';
        submitBtn.textContent = 'Отправлено';

        setTimeout(function () {
            window.location.href = 'client.html?section=profile';
        }, 2500);

    } catch (err) {
        console.error('[become] exception:', err);
        messageEl.className = 'form-message error';
        messageEl.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[become] DOMContentLoaded');

    var ready = await waitForSupa(50);
    console.log('[become] supa ready:', ready);
    if (!ready) {
        alert('Не удалось подключиться к серверу. Обновите страницу.');
        return;
    }

    var user = getUser();
    console.log('[become] user:', user);
    if (!user.id) {
        window.location.href = 'login.html';
        return;
    }

    var profileResult = await window.supa
        .from('profiles')
        .select('psychologist_status, roles')
        .eq('id', user.id)
        .single();

    console.log('[become] profile:', profileResult);

    if (profileResult.data) {
        var roles = Array.isArray(profileResult.data.roles) ? profileResult.data.roles : [];
        if (roles.indexOf('psychologist') !== -1 || profileResult.data.psychologist_status === 'approved') {
            window.location.href = 'dashboard.html?section=calendar';
            return;
        }
    }

    existingApp = await loadExistingApp(user.id);

    if (existingApp && existingApp.status === 'pending') {
        var main = document.getElementById('becomeMain');
        if (main) {
            main.innerHTML =
                '<div class="become-header">' +
                    '<h1>Заявка на проверке</h1>' +
                    '<p>Мы проверяем данные и свяжемся с вами в течение 1–3 рабочих дней.</p>' +
                '</div>' +
                '<div class="become-actions" style="margin-top:30px;">' +
                    '<a href="client.html?section=profile" class="btn-back" style="text-decoration:none;">Вернуться в профиль</a>' +
                '</div>';
        }
        return;
    }

    if (existingApp) {
        showBanner(existingApp);
        fillForm(existingApp);
    }

    var form = document.getElementById('becomeForm');
    if (form) form.addEventListener('submit', handleSubmit);
});