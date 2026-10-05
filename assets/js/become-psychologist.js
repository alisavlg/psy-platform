// ============================================
// СТРАНИЦА «СТАТЬ ПСИХОЛОГОМ» — заявка в Supabase
// ============================================

console.log('[become-psychologist.js] loaded');

var BECOME_USER_KEY = 'psyhelp_user';
var existingApp = null;
var uploadedPhoto = null;   // { file, dataUrl, name, size }
var uploadedPhotoUrl = null; // URL в Storage после загрузки

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

// ============================================
// Загрузка файла
// ============================================

function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
}

async function uploadToStorage(file, bucket, path) {
    var result = await window.supa.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });

    if (result.error) {
        console.error('[become] storage error:', result.error);
        return { success: false, error: result.error.message };
    }

    var urlRes = window.supa.storage.from(bucket).getPublicUrl(path);
    return { success: true, url: urlRes.data.publicUrl };
}

// ============================================
// Превью фото
// ============================================

function renderPhotoPreview() {
    var box = document.getElementById('psyPhotoPreview');
    if (!box) return;

    if (!uploadedPhoto) {
        box.innerHTML = '';
        return;
    }

    box.innerHTML =
        '<div class="uploaded-file" style="align-items:center;">' +
            '<img src="' + uploadedPhoto.dataUrl + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:12px;">' +
            '<span class="uploaded-file-name">' + escapeHtml(uploadedPhoto.name) + '</span>' +
            '<span class="uploaded-file-size">' + formatFileSize(uploadedPhoto.size) + '</span>' +
            '<button type="button" class="btn-remove-file" id="removePhotoBtn" title="Удалить">✕</button>' +
        '</div>';

    var rmBtn = document.getElementById('removePhotoBtn');
    if (rmBtn) {
        rmBtn.onclick = function () {
            uploadedPhoto = null;
            uploadedPhotoUrl = null;
            renderPhotoPreview();
        };
    }
}

async function handlePhotoSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Файл больше 5 МБ. Выберите меньший.');
        e.target.value = '';
        return;
    }

    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) {
        alert('Только JPG, PNG или WebP.');
        e.target.value = '';
        return;
    }

    try {
        var dataUrl = await readFileAsDataURL(file);
        uploadedPhoto = {
            file: file,
            dataUrl: dataUrl,
            name: file.name,
            size: file.size
        };
        renderPhotoPreview();
        var err = document.getElementById('psyPhotoError');
        if (err) err.textContent = '';
    } catch (err) {
        alert('Не удалось прочитать файл.');
    }
    e.target.value = '';
}

// ============================================
// Загрузка существующей заявки
// ============================================

async function loadExistingApp(userId) {
    var result = await window.supa
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

    if (result.error) {
        console.error('[become] ошибка загрузки заявки:', result.error);
        return null;
    }
    if (!result.data || result.data.length === 0) return null;
    return result.data[0];
}

async function loadAppHistory(appId) {
    if (!appId || !window.supa) return [];
    try {
        var result = await window.supa
            .from('application_events')
            .select('status, comment, created_at')
            .eq('application_id', appId)
            .order('created_at', { ascending: true });
        if (result.error) return [];
        return result.data || [];
    } catch (e) { return []; }
}

function renderHistoryBlock(history) {
    if (!history || history.length <= 1) return '';

    var html =
        '<div class="become-block" style="margin-top:20px;">' +
            '<h2>История заявки</h2>' +
            '<div style="font-size:14px;">';

    history.forEach(function (h) {
        var d = new Date(h.created_at);
        var dateStr = d.toLocaleDateString('ru-RU') + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
        var lbl = {
            pending: 'Подана на проверку',
            approved: 'Одобрена',
            rejected: 'Отклонена',
            attention: 'Требует внимания'
        }[h.status] || h.status;
        html +=
            '<div style="padding:10px 0;border-bottom:1px solid #eee;">' +
                '<div><span style="color:#4a90e2;font-weight:600;">' + dateStr + '</span> — ' + escapeHtml(lbl) + '</div>' +
                (h.comment ? '<div style="color:#666;margin-top:4px;">«' + escapeHtml(h.comment) + '»</div>' : '') +
            '</div>';
    });

    html += '</div></div>';
    return html;
}

function showBanner(app) {
    var banner = document.getElementById('becomeStatusBanner');
    var header = document.getElementById('becomeHeader');
    if (!banner) return;

        if (!app) {
        banner.style.display = 'none';
        if (header) header.style.display = '';
        return;
    }

    if (app.status === 'pending') {
        banner.innerHTML =
            '<div style="background:#e7f1ff;border-left:4px solid #4a90e2;padding:16px 20px;border-radius:10px;margin-bottom:20px;">' +
                '<h3 style="margin:0 0 8px;color:#2c5f9a;">⏳ Заявка на проверке</h3>' +
                '<div style="color:#2c5f9a;font-size:14px;">' +
                    'Мы проверяем данные в течение 1–3 рабочих дней.<br>' +
                    'Если хотите что-то поправить — измените ниже и отправьте заново.' +
                '</div>' +
            '</div>';
        banner.style.display = '';
        if (header) header.style.display = 'none';
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

    // Существующее фото в Storage — показываем превью
    if (app.avatar_url) {
        uploadedPhotoUrl = app.avatar_url;
        var box = document.getElementById('psyPhotoPreview');
        if (box) {
            box.innerHTML =
                '<div class="uploaded-file" style="align-items:center;">' +
                    '<img src="' + app.avatar_url + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:12px;">' +
                    '<span class="uploaded-file-name">Текущее фото</span>' +
                    '<button type="button" class="btn-remove-file" id="removePhotoBtn" title="Удалить">✕</button>' +
                '</div>';
            var rmBtn = document.getElementById('removePhotoBtn');
            if (rmBtn) rmBtn.onclick = function () {
                uploadedPhoto = null;
                uploadedPhotoUrl = null;
                renderPhotoPreview();
            };
        }
    }

        var submitBtn = document.getElementById('submitBecomeBtn');
    if (submitBtn) {
        submitBtn.textContent = app.status === 'pending'
            ? 'Сохранить изменения'
            : 'Отправить на проверку заново';
    }
}

// ============================================
// Валидация
// ============================================

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

    // Фото — обязательно
    var photoError = document.getElementById('psyPhotoError');
    if (!uploadedPhoto && !uploadedPhotoUrl) {
        if (photoError) photoError.textContent = 'Загрузите фото профиля';
        isValid = false;
    } else if (photoError) {
        photoError.textContent = '';
    }

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

// ============================================
// Отправка (INSERT или UPDATE через RPC)
// ============================================

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

    // Если выбрано новое фото — загружаем в Storage
    if (uploadedPhoto) {
        submitBtn.textContent = 'Загружаем фото...';
        var ext = uploadedPhoto.file.name.split('.').pop().toLowerCase() || 'jpg';
        var path = user.id + '/application-' + Date.now() + '.' + ext;

        var upRes = await uploadToStorage(uploadedPhoto.file, 'avatars', path);
        if (!upRes.success) {
            messageEl.className = 'form-message error';
            messageEl.textContent = 'Ошибка загрузки фото: ' + upRes.error;
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        uploadedPhotoUrl = upRes.url;
    }

    var specialty = document.getElementById('psySpecialty').value.trim();
    var experience = parseInt(document.getElementById('psyExperience').value);
    var description = document.getElementById('psyDescription').value.trim();
    var about = document.getElementById('psyAbout').value.trim();
    var price = parseInt(document.getElementById('psyPrice').value);

    submitBtn.textContent = 'Сохраняем...';

    try {
                var result;

        if (existingApp) {
            // Обновление существующей заявки — только через RPC
            var rpcResult = await window.supa.rpc('resubmit_application', {
                app_id: existingApp.id,
                p_specialty: specialty,
                p_experience: experience,
                p_description: description,
                p_about: about,
                p_price: price,
                p_avatar_url: uploadedPhotoUrl
            });
            result = { data: null, error: rpcResult.error };
        } else {
            // INSERT
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
                avatar_url: uploadedPhotoUrl,
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

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    var ready = await waitForSupa(50);
    if (!ready) {
        alert('Не удалось подключиться к серверу. Обновите страницу.');
        return;
    }

    var user = getUser();
    if (!user.id) {
        window.location.href = 'login.html';
        return;
    }

    // Уже психолог?
    var profileResult = await window.supa
        .from('profiles')
        .select('psychologist_status, roles')
        .eq('id', user.id)
        .single();

    if (profileResult.data) {
        var roles = Array.isArray(profileResult.data.roles) ? profileResult.data.roles : [];
        if (roles.indexOf('psychologist') !== -1 || profileResult.data.psychologist_status === 'approved') {
            window.location.href = 'dashboard.html?section=calendar';
            return;
        }
    }

        existingApp = await loadExistingApp(user.id);

    // Скрываем форму до готовности
    var form = document.getElementById('becomeForm');
    if (form) form.style.visibility = 'hidden';

        if (existingApp) {
        showBanner(existingApp);
        fillForm(existingApp);

        // История заявки — внизу страницы
        var history = await loadAppHistory(existingApp.id);
        var main = document.getElementById('becomeMain');
        if (main && history.length > 1) {
            main.insertAdjacentHTML('beforeend', renderHistoryBlock(history));
        }
    }

    // Показываем форму
    if (form) form.style.visibility = '';

    // Обработчик загрузки фото
    var photoBtn = document.getElementById('psyPhotoBtn');
    var photoInput = document.getElementById('psyPhotoInput');
    if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', function () { photoInput.click(); });
        photoInput.addEventListener('change', handlePhotoSelect);
    }

    var form = document.getElementById('becomeForm');
    if (form) form.addEventListener('submit', handleSubmit);
});