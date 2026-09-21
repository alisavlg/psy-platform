// ============================================
// РАЗДЕЛ «ЛИЧНАЯ СТРАНИЦА» — редактирование профиля
// ============================================

const PROFILE_STORAGE_KEY = 'psyhelp_profile';

const DEFAULT_PROFILE = {
    firstName: 'Анна',
    middleName: 'Сергеевна',
    specialty: 'Тревога, отношения, самооценка',
    description: 'Помогаю справляться с тревогой, строить здоровые отношения и повышать самооценку. Работаю в методах КПТ и гештальт-терапии. Онлайн-сессии.',
    experience: 8,
    price: 3000,
    photoUrl: ''
};

function getProfile() {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) {
        try {
            return Object.assign({}, DEFAULT_PROFILE, JSON.parse(data));
        } catch (e) {
            return DEFAULT_PROFILE;
        }
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
    const profile = getProfile();

    const firstNameEl = document.getElementById('profileFirstName');
    const middleNameEl = document.getElementById('profileMiddleName');
    const specialtyEl = document.getElementById('profileSpecialty');
    const descriptionEl = document.getElementById('profileDescription');
    const experienceEl = document.getElementById('profileExperience');
    const priceEl = document.getElementById('profilePrice');
    const photoEl = document.getElementById('profilePhotoPreview');

    if (firstNameEl) firstNameEl.value = profile.firstName || '';
    if (middleNameEl) middleNameEl.value = profile.middleName || '';
    if (specialtyEl) specialtyEl.value = profile.specialty || '';
    if (descriptionEl) descriptionEl.value = profile.description || '';
    if (experienceEl) experienceEl.value = profile.experience || '';
    if (priceEl) priceEl.value = profile.price || '';

    if (photoEl && profile.photoUrl) {
        photoEl.style.backgroundImage = `url(${profile.photoUrl})`;
        photoEl.textContent = '';
    }
}

// ============================================
// Сохранение
// ============================================

function handleProfileSave(e) {
    e.preventDefault();

    const firstName = document.getElementById('profileFirstName').value.trim();
    const middleName = document.getElementById('profileMiddleName').value.trim();
    const specialty = document.getElementById('profileSpecialty').value.trim();
    const description = document.getElementById('profileDescription').value.trim();
    const experience = parseInt(document.getElementById('profileExperience').value) || 0;
    const price = parseInt(document.getElementById('profilePrice').value) || 0;

    let isValid = true;

    if (!firstName || firstName.length < 2) {
        showProfileError('profileFirstName', 'Введите имя');
        isValid = false;
    } else clearProfileError('profileFirstName');

    if (!middleName || middleName.length < 2) {
        showProfileError('profileMiddleName', 'Введите отчество');
        isValid = false;
    } else clearProfileError('profileMiddleName');

    if (!specialty || specialty.length < 3) {
        showProfileError('profileSpecialty', 'Введите специализацию');
        isValid = false;
    } else clearProfileError('profileSpecialty');

    if (!description || description.length < 20) {
        showProfileError('profileDescription', 'Описание должно быть не короче 20 символов');
        isValid = false;
    } else clearProfileError('profileDescription');

    if (!experience || experience < 0) {
        showProfileError('profileExperience', 'Укажите стаж');
        isValid = false;
    } else clearProfileError('profileExperience');

    if (!price || price < 0) {
        showProfileError('profilePrice', 'Укажите цену');
        isValid = false;
    } else clearProfileError('profilePrice');

    if (!isValid) return;

    const profile = {
        firstName,
        middleName,
        specialty,
        description,
        experience,
        price,
        photoUrl: getProfile().photoUrl || ''
    };

    saveProfile(profile);

    // Показать сообщение
    const msg = document.getElementById('profileMessage');
    if (msg) {
        msg.className = 'form-message success';
        msg.textContent = '✓ Изменения сохранены. Они уже видны на главной странице.';
        setTimeout(() => {
            msg.className = 'form-message';
        }, 4000);
    }
}

function showProfileError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) {
        const group = inputEl.closest('.form-group');
        if (group) group.classList.add('has-error');
    }
}

function clearProfileError(fieldId) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) {
        const group = inputEl.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', handleProfileSave);
    }
});