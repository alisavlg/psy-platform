// ============================================
// Логика личного кабинета
// ============================================

const sections = {
    calendar: { title: 'Календарь', isCalendar: true },
    schedule: { title: 'Расписание', isSchedule: true },
    requests: { title: 'Заявки на запись', isRequests: true },
    clients:  { title: 'Клиенты', isClients: true },
    room:     { title: 'Комната', content: 'Здесь будет встроенный видеочат для проведения сессий.' },
    profile:  { title: 'Личная страница', isProfile: true },
    reports:  { title: 'Отчёты', isReports: true },
    settings: { title: 'Настройки', content: 'Здесь вы можете настроить часовой пояс и уведомления.' }
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

    const calendarSection = document.getElementById('calendarSection');
    const scheduleSection = document.getElementById('scheduleSection');
    const requestsSection = document.getElementById('requestsSection');
    const clientsSection = document.getElementById('clientsSection');
    const profileSection = document.getElementById('profileSection');
    const reportsSection = document.getElementById('reportsSection');
    const placeholderSection = document.getElementById('placeholderSection');

    if (!calendarSection || !placeholderSection) return;

    calendarSection.style.display = 'none';
    if (scheduleSection) scheduleSection.style.display = 'none';
    if (requestsSection) requestsSection.style.display = 'none';
    if (clientsSection) clientsSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (reportsSection) reportsSection.style.display = 'none';
    placeholderSection.style.display = 'none';

    if (section.isCalendar) {
        calendarSection.style.display = 'block';
        if (typeof renderCalendar === 'function') {
            renderCalendar();
            if (typeof scrollToCurrentHour === 'function') scrollToCurrentHour();
        }
    } else if (section.isSchedule) {
        if (scheduleSection) {
            scheduleSection.style.display = 'block';
            if (typeof renderSchedule === 'function') renderSchedule();
        }
    } else if (section.isRequests) {
        if (requestsSection) {
            requestsSection.style.display = 'block';
            if (typeof renderRequests === 'function') renderRequests('new');
        }
    } else if (section.isClients) {
        if (clientsSection) {
            clientsSection.style.display = 'block';
            if (typeof renderClients === 'function') renderClients();
        }
    } else if (section.isProfile) {
        if (profileSection) {
            profileSection.style.display = 'block';
            if (typeof renderProfileForm === 'function') renderProfileForm();
        }
    } else if (section.isReports) {
        if (reportsSection) {
            reportsSection.style.display = 'block';
            if (typeof renderReports === 'function') renderReports('month');
        }
    } else {
        placeholderSection.style.display = 'block';
        document.getElementById('placeholderText').textContent = section.content;
    }

    if (typeof renderTodayPanel === 'function') renderTodayPanel();
}

document.addEventListener('DOMContentLoaded', renderSection);