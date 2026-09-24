// ============================================
// СТРАНИЦА «СТАТЬ ПСИХОЛОГОМ» — заявка
// ============================================

console.log('[become-psychologist.js] loaded');

const BECOME_USER_KEY = 'psyhelp_user';
const BECOME_APPS_KEY = 'psyhelp_applications';

let uploadedDiploma = [];
let uploadedCertificates = [];

// ---------- Storage ----------
function getBecomeUser() {
    const data = localStorage.getItem(BECOME_USER_KEY);
    if (!data) return {};
    try { return JSON.parse(data) || {}; } catch (e) { return {}; }
}
function saveBecomeUser(user) { localStorage.setItem(BECOME_USER_KEY, JSON.stringify(user)); }

function escapeHtmlBecome(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

// ---------- Проверка доступа ----------
function checkBecomeAccess() {
    var user = getBecomeUser();
    if (!user.id) { window.location.href = 'login.html'; return false; }

    var roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.indexOf('psychologist') !== -1) {
        window.location.href = 'dashboard.html?section=calendar';
        return false;
    }

    // Блокируем только когда заявка в процессе
    if (user.psychologistStatus === 'pending' ||
        user.psychologistStatus === 'in_review' ||
        user.psychologistStatus === 'awaiting_decision') {
        showAlreadySubmitted();
        return false;
    }

    return true;
}

function showAlreadySubmitted() {
    var main = document.querySelector('.become-main');
    if (!main) return;
    main.innerHTML =
        '<div class="become-header">' +
            '<h1>Заявка на проверке</h1>' +
            '<p>Ваша заявка уже отправлена. Мы проверим документы и свяжемся с вами в течение 1–3 рабочих дней.</p>' +
        '</div>' +
        '<div class="become-actions" style="margin-top:30px;">' +
            '<a href="client.html?section=profile" class="btn-submit-become" style="text-decoration:none;text-align:center;display:inline-block;">Вернуться в профиль</a>' +
        '</div>';
}

// ---------- Предзаполнение из прошлой заявки ----------
function prefillFromPrevious() {
    var user = getBecomeUser();
    var status = user.psychologistStatus;
    if (status !== 'rejected' && status !== 'needs_changes' && status !== 'needs_documents') return;

    var app = user.psychologistApplication;
    if (!app) return;

    // Комментарий от собственника — сверху страницы
    if (app.finalDecisionReason) {
        var header = document.querySelector('.become-header');
        if (header) {
            var title = status === 'rejected' ? 'Заявка отклонена'
                       : status === 'needs_documents' ? 'Нужны документы'
                       : 'Нужны изменения';
            var note = document.createElement('div');
            note.className = 'become-decision-note';
            note.innerHTML =
                '<strong>' + escapeHtmlBecome(title) + '</strong>' +
                '<p>' + escapeHtmlBecome(app.finalDecisionReason) + '</p>' +
                '<p class="become-decision-hint">Исправьте данные ниже и отправьте заявку заново.</p>';
            header.parentNode.insertBefore(note, header.nextSibling);
        }
    }

    // Заполняем поля
    function setVal(id, value) {
        var el = document.getElementById(id);
        if (el && value != null) el.value = value;
    }
    setVal('psySpecialty', app.specialty);
    setVal('psyExperience', app.experience);
    setVal('psyDescription', app.description);
    setVal('psyAbout', app.about);
    setVal('psyPrice', app.price);

    // Восстанавливаем документы
    if (Array.isArray(app.diploma)) {
        uploadedDiploma = app.diploma.map(function (f) {
            return { name: f.name, size: f.size, dataUrl: f.dataUrl };
        });
        renderUploadedFiles('diplomaFiles', uploadedDiploma, 'diploma');
    }
    if (Array.isArray(app.certificates)) {
        uploadedCertificates = app.certificates.map(function (f) {
            return { name: f.name, size: f.size, dataUrl: f.dataUrl };
        });
        renderUploadedFiles('certificateFiles', uploadedCertificates, 'certificates');
    }
}

// ---------- Файлы ----------
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

function renderUploadedFiles(containerId, files, type) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    files.forEach(function (file, index) {
        var div = document.createElement('div');
        div.className = 'uploaded-file';
        div.innerHTML =
            '<span class="uploaded-file-name">📄 ' + escapeHtmlBecome(file.name) + '</span>' +
            '<span class="uploaded-file-size">' + formatFileSize(file.size) + '</span>' +
            '<button type="button" class="btn-remove-file" data-type="' + type + '" data-index="' + index + '" title="Удалить">✕</button>';
        container.appendChild(div);
    });

    container.querySelectorAll('.btn-remove-file').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var t = btn.dataset.type;
            var i = parseInt(btn.dataset.index);
            if (t === 'diploma') {
                uploadedDiploma.splice(i, 1);
                renderUploadedFiles('diplomaFiles', uploadedDiploma, 'diploma');
            } else {
                uploadedCertificates.splice(i, 1);
                renderUploadedFiles('certificateFiles', uploadedCertificates, 'certificates');
            }
        });
    });
}

async function handleFiles(files, type) {
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл "' + file.name + '" больше 5 МБ. Выберите меньший.');
            continue;
        }
        try {
            var dataUrl = await readFileAsDataURL(file);
            var item = { name: file.name, size: file.size, dataUrl: dataUrl };
            if (type === 'diploma') {
                if (uploadedDiploma.length >= 3) { alert('Можно загрузить до 3 файлов диплома.'); break; }
                uploadedDiploma.push(item);
            } else {
                if (uploadedCertificates.length >= 10) { alert('Можно загрузить до 10 файлов сертификатов.'); break; }
                uploadedCertificates.push(item);
            }
        } catch (e) {
            alert('Не удалось прочитать файл: ' + file.name);
        }
    }
    if (type === 'diploma') renderUploadedFiles('diplomaFiles', uploadedDiploma, 'diploma');
    else renderUploadedFiles('certificateFiles', uploadedCertificates, 'certificates');
}

// ---------- Валидация ----------
function showBecomeError(fieldId, message) {
    var errorEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) {
        var group = inputEl.closest('.form-group');
        if (group) group.classList.add('has-error');
    }
}
function clearBecomeError(fieldId) {
    var errorEl = document.getElementById(fieldId + 'Error');
    var inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) {
        var group = inputEl.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }
}

function validateBecomeForm() {
    var isValid = true;

    if (!document.getElementById('psySpecialty').value.trim() ||
        document.getElementById('psySpecialty').value.trim().length < 3) {
        showBecomeError('psySpecialty', 'Укажите специализацию'); isValid = false;
    } else clearBecomeError('psySpecialty');

    var exp = parseInt(document.getElementById('psyExperience').value) || 0;
    if (exp < 0) { showBecomeError('psyExperience', 'Укажите стаж'); isValid = false; }
    else clearBecomeError('psyExperience');

    if ((document.getElementById('psyDescription').value.trim() || '').length < 50) {
        showBecomeError('psyDescription', 'Описание минимум 50 символов'); isValid = false;
    } else clearBecomeError('psyDescription');

    if ((document.getElementById('psyAbout').value.trim() || '').length < 30) {
        showBecomeError('psyAbout', 'Расскажите о себе (минимум 30 символов)'); isValid = false;
    } else clearBecomeError('psyAbout');

    var price = parseInt(document.getElementById('psyPrice').value) || 0;
    if (price < 500) { showBecomeError('psyPrice', 'Минимальная цена — 500 ₽'); isValid = false; }
    else clearBecomeError('psyPrice');

    var diplomaError = document.getElementById('diplomaError');
    if (uploadedDiploma.length === 0) {
        if (diplomaError) diplomaError.textContent = 'Загрузите хотя бы один диплом';
        isValid = false;
    } else if (diplomaError) diplomaError.textContent = '';

    if (!document.getElementById('agreeRules').checked) {
        document.getElementById('agreeRulesError').textContent = 'Необходимо согласие';
        isValid = false;
    } else document.getElementById('agreeRulesError').textContent = '';

    if (!document.getElementById('agreeInterview').checked) {
        document.getElementById('agreeInterviewError').textContent = 'Необходимо согласие';
        isValid = false;
    } else document.getElementById('agreeInterviewError').textContent = '';

    return isValid;
}

// ---------- Отправка ----------
function handleBecomeSubmit(e) {
    e.preventDefault();
    if (!validateBecomeForm()) {
        var firstError = document.querySelector('.form-error:not(:empty)');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    var submitBtn = document.getElementById('submitBecomeBtn');
    var messageEl = document.getElementById('becomeMessage');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';

    var user = getBecomeUser();

    // Формируем новую заявку
    user.psychologistApplication = {
        specialty: document.getElementById('psySpecialty').value.trim(),
        experience: parseInt(document.getElementById('psyExperience').value) || 0,
        description: document.getElementById('psyDescription').value.trim(),
        about: document.getElementById('psyAbout').value.trim(),
        price: parseInt(document.getElementById('psyPrice').value) || 0,
        diploma: uploadedDiploma,
        certificates: uploadedCertificates,
        submittedAt: Date.now(),
        finalDecisionReason: ''
    };
    user.psychologistStatus = 'pending';
    saveBecomeUser(user);

    // В общий список для модератора
    try {
        var apps = JSON.parse(localStorage.getItem(BECOME_APPS_KEY)) || [];
        var alreadyExists = apps.some(function (a) {
            return a.userId === user.id &&
                (a.status === 'pending' || a.status === 'in_review' || a.status === 'awaiting_decision');
        });

        if (!alreadyExists) {
            var displayName = (function () {
                var f = (user.displayFirstName || user.realFirstName || '').trim();
                var m = (user.displayMiddleName || user.realMiddleName || '').trim();
                if (f && m) return f + ' ' + m;
                if (f) return f;
                return 'Без имени';
            })();

            apps.push({
                id: 'app-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                userId: user.id,
                userCode: user.code || '',
                userName: displayName,
                status: 'pending',
                submittedAt: Date.now(),
                reviewedAt: null,
                rejectionReason: '',
                specialty: user.psychologistApplication.specialty,
                experience: user.psychologistApplication.experience,
                description: user.psychologistApplication.description,
                about: user.psychologistApplication.about,
                price: user.psychologistApplication.price,
                diploma: user.psychologistApplication.diploma,
                certificates: user.psychologistApplication.certificates
            });
            localStorage.setItem(BECOME_APPS_KEY, JSON.stringify(apps));
            console.log('[become] заявка добавлена, всего:', apps.length);
        }
    } catch (err) {
        console.error('[become] ошибка сохранения в общий список:', err);
    }

    setTimeout(function () {
        messageEl.className = 'form-message success';
        messageEl.innerHTML =
            '✓ Заявка отправлена!<br>' +
            '<span style="font-size:14px;">Мы проверим документы и свяжемся с вами.</span>';
        submitBtn.textContent = 'Отправлено';

        setTimeout(function () {
            window.location.href = 'client.html?section=profile';
        }, 3000);
    }, 1200);
}

// ---------- Инициализация ----------
document.addEventListener('DOMContentLoaded', function () {
    if (!checkBecomeAccess()) return;

    prefillFromPrevious();

    var form = document.getElementById('becomeForm');
    if (form) form.addEventListener('submit', handleBecomeSubmit);

    var diplomaBtn = document.getElementById('diplomaBtn');
    var diplomaInput = document.getElementById('diplomaInput');
    if (diplomaBtn && diplomaInput) {
        diplomaBtn.addEventListener('click', function () { diplomaInput.click(); });
        diplomaInput.addEventListener('change', function (e) {
            handleFiles(e.target.files, 'diploma');
            e.target.value = '';
        });
    }

    var certBtn = document.getElementById('certificatesBtn');
    var certInput = document.getElementById('certificatesInput');
    if (certBtn && certInput) {
        certBtn.addEventListener('click', function () { certInput.click(); });
        certInput.addEventListener('change', function (e) {
            handleFiles(e.target.files, 'certificates');
            e.target.value = '';
        });
    }
});