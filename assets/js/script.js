// ============================================
// Логика личного кабинета психолога
// ============================================

window.CURRENT_USER = window.CURRENT_USER || 'psychologist';

// ============================================
// Проверка авторизации и роли
// ============================================

function checkPsychologistAccess() {
    var raw = localStorage.getItem('psyhelp_user');

    if (!raw) {
        console.log('[script.js] не авторизован → login.html');
        window.location.href = 'login.html';
        return false;
    }

    var user;
    try {
        user = JSON.parse(raw);
    } catch (e) {
        window.location.href = 'login.html';
        return false;
    }

    var roles = Array.isArray(user.roles) ? user.roles : [];

    if (roles.length === 0) {
        user.roles = ['client'];
        user.activeRole = 'client';
        localStorage.setItem('psyhelp_user', JSON.stringify(user));
        roles = ['client'];
    }

    if (roles.indexOf('psychologist') === -1) {
        console.log('[script.js] нет роли психолога → client.html');
        window.location.href = 'client.html?section=catalog';
        return false;
    }

    return true;
}

// ============================================
// Разделы
// ============================================

const sections = {
    calendar: { title: 'Календарь', isCalendar: true },
    sessions: { title: 'Мои сессии', isSessions: true },
    messages: { title: 'Сообщения', isMessages: true },
    profile:  { title: 'Личная страница', isProfile: true },
    reports:  { title: 'Отчёты', isReports: true },
    settings: { title: 'Настройки', isSettings: true }
};

function getSectionFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || 'calendar';
}

function renderSection() {
    if (!document.getElementById('pageTitle')) return;

    const sectionKey = getSectionFromURL();
    const section = sections[sectionKey];

    if (!section) {
        window.location.href = 'dashboard.html?section=calendar';
        return;
    }

    document.getElementById('pageTitle').textContent = section.title;
    document.title = section.title + ' | PsyHelp';

    document.querySelectorAll('.nav-item').forEach(function (item) {
        item.classList.remove('active');
        if (item.href.indexOf('section=' + sectionKey) !== -1) {
            item.classList.add('active');
        }
    });

    const ids = ['calendarSection', 'sessionsSection', 'messagesSection',
                 'profileSection', 'reportsSection', 'settingsSection',
                 'placeholderSection'];

    const elements = {};
    ids.forEach(function (id) {
        elements[id] = document.getElementById(id);
        if (elements[id]) elements[id].style.display = 'none';
    });

    if (!elements.calendarSection || !elements.placeholderSection) return;

    if (section.isCalendar) {
        elements.calendarSection.style.display = 'block';
        if (typeof renderCalendar === 'function') {
            renderCalendar();
            if (typeof scrollToCurrentHour === 'function') scrollToCurrentHour();
        }
    } else if (section.isSessions) {
        if (elements.sessionsSection) {
            elements.sessionsSection.style.display = 'block';
            if (typeof renderPsySessions === 'function') renderPsySessions();
        }
    } else if (section.isMessages) {
        if (elements.messagesSection) {
            elements.messagesSection.style.display = 'block';
            if (typeof renderMessenger === 'function') renderMessenger();
        }
    } else if (section.isProfile) {
        if (elements.profileSection) {
            elements.profileSection.style.display = 'block';
            if (typeof renderProfileForm === 'function') renderProfileForm();
        }
    } else if (section.isReports) {
        if (elements.reportsSection) {
            elements.reportsSection.style.display = 'block';
            if (typeof renderReports === 'function') renderReports('month');
        }
    } else if (section.isSettings) {
        if (elements.settingsSection) {
            elements.settingsSection.style.display = 'block';
            if (typeof renderSettingsForm === 'function') renderSettingsForm();
        }
    } else {
        elements.placeholderSection.style.display = 'block';
        document.getElementById('placeholderText').textContent = section.content;
    }
}

// ============================================
// Запуск
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!checkPsychologistAccess()) return;
    renderSection();
});