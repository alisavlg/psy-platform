// ============================================
// Загрузка публичного профиля из localStorage
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const PROFILE_KEY = 'psyhelp_profile';
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return;

    let profile;
    try {
        profile = JSON.parse(data);
    } catch (e) {
        return;
    }

    const nameEl = document.getElementById('publicName');
    const specialtyEl = document.getElementById('publicSpecialty');
    const descriptionEl = document.getElementById('publicDescription');
    const experienceEl = document.getElementById('publicExperience');
    const priceEl = document.getElementById('publicPrice');
    const photoEl = document.getElementById('publicPhoto');

    if (nameEl && profile.firstName) {
        nameEl.textContent = `${profile.firstName} ${profile.middleName || ''}`.trim();
    }

    if (specialtyEl && profile.specialty) {
        specialtyEl.textContent = profile.specialty;
    }

    if (descriptionEl && profile.description) {
        descriptionEl.textContent = profile.description;
    }

    if (experienceEl && profile.experience !== undefined) {
        experienceEl.textContent = `Стаж: ${profile.experience} лет`;
    }

    if (priceEl && profile.price) {
        priceEl.textContent = `${profile.price.toLocaleString('ru-RU')} ₽ / сессия`;
    }

    if (photoEl && profile.photoUrl) {
        photoEl.style.backgroundImage = `url(${profile.photoUrl})`;
        photoEl.textContent = '';
    }
});