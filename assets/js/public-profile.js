// ============================================
// Загрузка публичного профиля из localStorage
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const USER_KEY = 'psyhelp_user';
    const PROFILE_KEY = 'psyhelp_profile';

    // Дефолтные данные (если пользователь не регистрировался)
    const DEFAULT_USER = {
        firstName: 'Анна',
        middleName: 'Сергеевна',
        isVerified: true
    };
    const DEFAULT_PROFILE = {
        specialty: 'Тревога, отношения, самооценка',
        description: 'Помогаю справляться с тревогой, строить здоровые отношения и повышать самооценку. Работаю в методах КПТ и гештальт-терапии. Онлайн-сессии.',
        experience: 8,
        price: 3000,
        photoUrl: ''
    };

    let user = DEFAULT_USER;
    let profile = DEFAULT_PROFILE;

    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
        try { user = Object.assign({}, DEFAULT_USER, JSON.parse(userData)); } catch (e) {}
    }

    const profileData = localStorage.getItem(PROFILE_KEY);
    if (profileData) {
        try { profile = Object.assign({}, DEFAULT_PROFILE, JSON.parse(profileData)); } catch (e) {}
    }

    const nameEl = document.getElementById('publicName');
    const specialtyEl = document.getElementById('publicSpecialty');
    const descriptionEl = document.getElementById('publicDescription');
    const experienceEl = document.getElementById('publicExperience');
    const priceEl = document.getElementById('publicPrice');
    const photoEl = document.getElementById('publicPhoto');
    const badgeEl = document.getElementById('publicBadge');

    // Публично показываем ИМЯ + ОТЧЕСТВО (без фамилии)
    if (nameEl) {
        nameEl.textContent = `${user.firstName} ${user.middleName || ''}`.trim();
    }

    if (specialtyEl) specialtyEl.textContent = profile.specialty;
    if (descriptionEl) descriptionEl.textContent = profile.description;

    if (experienceEl) {
        experienceEl.textContent = `Стаж: ${profile.experience} лет`;
    }

    if (priceEl) {
        priceEl.textContent = `${profile.price.toLocaleString('ru-RU')} ₽ / сессия`;
    }

    if (photoEl && profile.photoUrl) {
        photoEl.style.backgroundImage = `url(${profile.photoUrl})`;
        photoEl.textContent = '';
    }

    // Бейдж «Проверен»
    if (badgeEl && user.isVerified) {
        badgeEl.style.display = 'inline-flex';
    }
});