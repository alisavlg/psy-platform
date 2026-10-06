// ============================================
// СТРАНИЦА «СТАТЬ ПСИХОЛОГОМ» — заявка в Supabase
// ============================================

console.log('[become-psychologist.js] loaded');

var BECOME_USER_KEY = 'psyhelp_user';
var existingApp = null;
var uploadedPhoto = null;   // { file, dataUrl, name, size }
var uploadedPhotoUrl = null;

// Категории документов: параметры + состояние
var DOC_CATEGORIES = {
    diplomas:     { maxCount: 5,  maxTotalBytes: 5  * 1024 * 1024, maxFileBytes: 3 * 1024 * 1024, required: true  },
    certificates: { maxCount: 10, maxTotalBytes: 10 * 1024 * 1024, maxFileBytes: 3 * 1024 * 1024, required: false },
    practice:     { maxCount: 5,  maxTotalBytes: 10 * 1024 * 1024, maxFileBytes: 3 * 1024 * 1024, required: false },
    other:        { maxCount: 10, maxTotalBytes: 10 * 1024 * 1024, maxFileBytes: 3 * 1024 * 1024, required: false }
};

// Состояние: массив файлов в каждой категории
var docsState = {
    diplomas:     [],   // { file, name, size, dataUrl?, isExisting?, url? }
    certificates: [],
    practice:     [],
    other:        []
};

// ============================================
// Утилиты
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

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
}

function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// Сжатие изображений
// ============================================

function compressImage(file, maxSize, quality) {
    maxSize = maxSize || 1600;
    quality = quality || 0.85;

    return new Promise(function (resolve) {
        // PDF и не-картинки не сжимаем
        if (file.type === 'application/pdf') {
            resolve(file);
            return;
        }
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) {
            resolve(file);
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                if (img.width <= maxSize && img.height <= maxSize) {
                    resolve(file);
                    return;
                }
                var ratio = Math.min(maxSize / img.width, maxSize / img.height);
                var w = Math.round(img.width * ratio);
                var h = Math.round(img.height * ratio);

                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                canvas.toBlob(function (blob) {
                    if (!blob) { resolve(file); return; }
                    var outType = file.type === 'image/png' ? 'image/jpeg' : file.type;
                    var newName = file.name.replace(/\.(png|webp)$/i, '.jpg');
                    var newFile = new File([blob], newName, { type: outType });
                    resolve(newFile);
                }, file.type === 'image/png' ? 'image/jpeg' : file.type, quality);
            };
            img.onerror = function () { resolve(file); };
            img.src = e.target.result;
        };
        reader.onerror = function () { resolve(file); };
        reader.readAsDataURL(file);
    });
}

// ============================================
// Загрузка в Storage
// ============================================

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
// Фото профиля
// ============================================

function renderPhotoPreview() {
    var box = document.getElementById('psyPhotoPreview');
    if (!box) return;

    if (!uploadedPhoto && !uploadedPhotoUrl) {
        box.innerHTML = '';
        return;
    }

    if (uploadedPhoto) {
        box.innerHTML =
            '<div class="uploaded-file" style="align-items:center;">' +
                '<img src="' + uploadedPhoto.dataUrl + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:12px;">' +
                '<span class="uploaded-file-name">' + escapeHtml(uploadedPhoto.name) + '</span>' +
                '<span class="uploaded-file-size">' + formatFileSize(uploadedPhoto.size) + '</span>' +
                '<button type="button" class="btn-remove-file" data-photo-remove="1">✕</button>' +
            '</div>';
    } else if (uploadedPhotoUrl) {
        box.innerHTML =
            '<div class="uploaded-file" style="align-items:center;">' +
                '<img src="' + uploadedPhotoUrl + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:12px;">' +
                '<span class="uploaded-file-name">Текущее фото</span>' +
                '<button type="button" class="btn-remove-file" data-photo-remove="1">✕</button>' +
            '</div>';
    }

    var rm = box.querySelector('[data-photo-remove]');
    if (rm) {
        rm.onclick = function () {
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
        var compressed = await compressImage(file, 1600, 0.85);
        if (compressed.size > 3 * 1024 * 1024) {
            alert('После сжатия файл всё равно больше 3 МБ. Выберите меньший.');
            e.target.value = '';
            return;
        }
        var dataUrl = await readFileAsDataURL(compressed);
        uploadedPhoto = {
            file: compressed,
            dataUrl: dataUrl,
            name: compressed.name,
            size: compressed.size
        };
        renderPhotoPreview();
        var err = document.getElementById('psyPhotoError');
        if (err) err.textContent = '';
    } catch (err) {
        alert('Не удалось обработать файл.');
    }
    e.target.value = '';
}

// ============================================
// Документы
// ============================================

function updateDocsCounter(cat) {
    var el = document.getElementById(cat + 'Counter');
    if (!el) return;
    var cfg = DOC_CATEGORIES[cat];
    var arr = docsState[cat];
    var total = arr.reduce(function (s, f) { return s + (f.size || 0); }, 0);
    el.textContent = arr.length + ' / ' + cfg.maxCount + ' файлов · ' +
        formatFileSize(total) + ' / ' + formatFileSize(cfg.maxTotalBytes);
}

function renderDocsPreview(cat) {
    var box = document.getElementById(cat + 'Preview');
    if (!box) return;
    var arr = docsState[cat];

    if (arr.length === 0) {
        box.innerHTML = '';
        updateDocsCounter(cat);
        return;
    }

    box.innerHTML = arr.map(function (f, i) {
        var preview = '';
        if (f.dataUrl) {
            if (f.file && f.file.type === 'application/pdf') {
                preview = '<div style="width:44px;height:44px;background:#f0f4fa;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-right:12px;font-size:20px;">📄</div>';
            } else {
                preview = '<img src="' + f.dataUrl + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;margin-right:12px;">';
            }
        } else if (f.url) {
            var isPdf = f.name && f.name.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                preview = '<div style="width:44px;height:44px;background:#f0f4fa;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-right:12px;font-size:20px;">📄</div>';
            } else {
                preview = '<img src="' + f.url + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;margin-right:12px;">';
            }
        }
        return '<div class="uploaded-file" style="align-items:center;">' +
            preview +
            '<span class="uploaded-file-name">' + escapeHtml(f.name || 'Документ') + '</span>' +
            '<span class="uploaded-file-size">' + formatFileSize(f.size || 0) + '</span>' +
            '<button type="button" class="btn-remove-file" data-cat="' + cat + '" data-idx="' + i + '">✕</button>' +
        '</div>';
    }).join('');

    box.querySelectorAll('[data-cat]').forEach(function (btn) {
        btn.onclick = function () {
            var c = btn.dataset.cat;
            var i = parseInt(btn.dataset.idx);
            docsState[c].splice(i, 1);
            renderDocsPreview(c);
        };
    });

    updateDocsCounter(cat);
}

async function handleDocsSelect(e, cat) {
    var files = Array.from(e.target.files || []);
    if (!files.length) return;

    var cfg = DOC_CATEGORIES[cat];
    var currentTotal = docsState[cat].reduce(function (s, f) { return s + (f.size || 0); }, 0);

    for (var i = 0; i < files.length; i++) {
        var f = files[i];

        // Тип
        var okType = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].indexOf(f.type) !== -1;
        if (!okType) {
            alert('Файл «' + f.name + '»: только JPG, PNG, WebP или PDF.');
            continue;
        }

        // Количество
        if (docsState[cat].length >= cfg.maxCount) {
            alert('Достигнут максимум файлов для этой категории (' + cfg.maxCount + ').');
            break;
        }

        // Сжимаем если картинка
        var processed = f;
        if (f.type !== 'application/pdf') {
            processed = await compressImage(f, 2000, 0.85);
        }

        // Размер одного файла
        if (processed.size > cfg.maxFileBytes) {
            alert('Файл «' + f.name + '» больше ' + formatFileSize(cfg.maxFileBytes) + ' после обработки. Пропущен.');
            continue;
        }

        // Общий размер
        if (currentTotal + processed.size > cfg.maxTotalBytes) {
            alert('Превышен общий размер для категории (' + formatFileSize(cfg.maxTotalBytes) + '). Файл «' + f.name + '» пропущен.');
            continue;
        }

        var dataUrl = await readFileAsDataURL(processed);
        docsState[cat].push({
            file: processed,
            dataUrl: dataUrl,
            name: processed.name,
            size: processed.size
        });
        currentTotal += processed.size;
    }

    renderDocsPreview(cat);
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

// ============================================
// Баннер статуса
// ============================================

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

// ============================================
// Заполнение формы
// ============================================

function fillForm(app) {
    if (!app) return;

    document.getElementById('psySpecialty').value = app.specialty || '';
    document.getElementById('psyExperience').value = app.experience || '';
    document.getElementById('psyDescription').value = app.description || '';
    document.getElementById('psyAbout').value = app.about || '';
    document.getElementById('psyQualifications').value = app.qualifications || '';
    document.getElementById('psyPrice').value = app.price || '';

    // Фото
    if (app.avatar_url) {
        uploadedPhotoUrl = app.avatar_url;
        renderPhotoPreview();
    }

    // Документы
    if (app.documents && Array.isArray(app.documents)) {
        app.documents.forEach(function (d) {
            if (!DOC_CATEGORIES[d.type]) return;
            docsState[d.type].push({
                name: d.name || 'Документ',
                size: d.size || 0,
                url: d.url
            });
        });
        Object.keys(DOC_CATEGORIES).forEach(function (cat) {
            renderDocsPreview(cat);
        });
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

    // Фото
    var photoError = document.getElementById('psyPhotoError');
    if (!uploadedPhoto && !uploadedPhotoUrl) {
        if (photoError) photoError.textContent = 'Загрузите фото профиля';
        isValid = false;
    } else if (photoError) {
        photoError.textContent = '';
    }

    // Дипломы — обязательны
    var diplErr = document.getElementById('diplomasError');
    if (docsState.diplomas.length === 0) {
        if (diplErr) diplErr.textContent = 'Загрузите хотя бы один диплом об образовании';
        isValid = false;
    } else if (diplErr) {
        diplErr.textContent = '';
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
// Загрузка всех документов в Storage
// ============================================

async function uploadAllDocuments(userId) {
    var allDocs = [];

    for (var cat of Object.keys(DOC_CATEGORIES)) {
        var arr = docsState[cat];
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];

            // Уже загружен — сохраняем ссылку
            if (item.url && !item.file) {
                allDocs.push({
                    type: cat,
                    name: item.name,
                    url: item.url,
                    size: item.size || 0,
                    uploaded_at: new Date().toISOString()
                });
                continue;
            }

            // Загружаем
            var safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var path = userId + '/' + cat + '/' + Date.now() + '-' + safeName;

            var upRes = await uploadToStorage(item.file, 'documents', path);
            if (!upRes.success) {
                return { success: false, error: 'Ошибка загрузки «' + item.file.name + '»: ' + upRes.error };
            }

            allDocs.push({
                type: cat,
                name: item.file.name,
                url: upRes.url,
                size: item.file.size,
                uploaded_at: new Date().toISOString()
            });
        }
    }

    return { success: true, documents: allDocs };
}

// ============================================
// Отправка
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
    messageEl.className = 'form-message';
    messageEl.textContent = '';

    // 1. Фото в Storage
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

    // 2. Документы в Storage
    submitBtn.textContent = 'Загружаем документы...';
    var docsResult = await uploadAllDocuments(user.id);
    if (!docsResult.success) {
        messageEl.className = 'form-message error';
        messageEl.textContent = docsResult.error;
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    var specialty = document.getElementById('psySpecialty').value.trim();
    var experience = parseInt(document.getElementById('psyExperience').value);
    var description = document.getElementById('psyDescription').value.trim();
    var about = document.getElementById('psyAbout').value.trim();
    var qualifications = document.getElementById('psyQualifications').value.trim();
    var price = parseInt(document.getElementById('psyPrice').value);

    submitBtn.textContent = 'Сохраняем...';

    try {
        var result;

        if (existingApp) {
            var rpcResult = await window.supa.rpc('resubmit_application', {
                app_id: existingApp.id,
                p_specialty: specialty,
                p_experience: experience,
                p_description: description,
                p_about: about,
                p_price: price,
                p_avatar_url: uploadedPhotoUrl,
                p_documents: docsResult.documents,
                p_qualifications: qualifications
            });
            result = { data: null, error: rpcResult.error };
        } else {
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
                qualifications: qualifications,
                price: price,
                avatar_url: uploadedPhotoUrl,
                documents: docsResult.documents,
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

        // Если пользователь УЖЕ психолог И У НЕГО НЕТ активной заявки — редирект в кабинет
    var profileResult = await window.supa
        .from('profiles')
        .select('psychologist_status, roles')
        .eq('id', user.id)
        .single();

    var activeApp = await loadExistingApp(user.id);

    if (profileResult.data) {
        var roles = Array.isArray(profileResult.data.roles) ? profileResult.data.roles : [];
        var isPsy = roles.indexOf('psychologist') !== -1 || profileResult.data.psychologist_status === 'approved';
        // Активная заявка — та, которую можно править (pending/attention/rejected)
        var hasEditable = activeApp && ['pending', 'attention', 'rejected'].indexOf(activeApp.status) !== -1;

        if (isPsy && !hasEditable) {
            window.location.href = 'dashboard.html?section=calendar';
            return;
        }
    }

    existingApp = activeApp;

    var form = document.getElementById('becomeForm');
    if (form) form.style.visibility = 'hidden';

    if (existingApp) {
        showBanner(existingApp);
        fillForm(existingApp);
    }

    if (form) form.style.visibility = '';

    // Фото
    var photoBtn = document.getElementById('psyPhotoBtn');
    var photoInput = document.getElementById('psyPhotoInput');
    if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', function () { photoInput.click(); });
        photoInput.addEventListener('change', handlePhotoSelect);
    }

    // Документы — 4 категории
    Object.keys(DOC_CATEGORIES).forEach(function (cat) {
        var btn = document.getElementById(cat + 'Btn');
        var input = document.getElementById(cat + 'Input');
        if (btn && input) {
            btn.addEventListener('click', function () { input.click(); });
            input.addEventListener('change', function (e) { handleDocsSelect(e, cat); });
        }
        renderDocsPreview(cat);
    });

    if (form) form.addEventListener('submit', handleSubmit);
});