// ============================================
// Логика личного кабинета психолога
// ============================================

window.CURRENT_USER = window.CURRENT_USER || 'psychologist';

const sections = {
    calendar: { title: 'Календарь', isCalendar: true },
    sessions: { title: 'Мои сессии', isSessions: true },
    messages: { title: 'Сообщения', isMessages: true },
    requests: { title: 'Заявки на запись', isRequests: true },
    clients:  { title: 'Клиенты', isClients: true },
    room:     { title: 'Комната', isRoom: true },
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

    const ids = ['calendarSection', 'sessionsSection', 'messagesSection', 'requestsSection',
                 'clientsSection', 'profileSection', 'reportsSection', 'placeholderSection'];

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
    } else if (section.isRequests) {
        if (elements.requestsSection) {
            elements.requestsSection.style.display = 'block';
            if (typeof renderRequests === 'function') renderRequests('new');
        }
    } else if (section.isClients) {
        if (elements.clientsSection) {
            elements.clientsSection.style.display = 'block';
            if (typeof renderClients === 'function') renderClients();
        }
    } else if (section.isRoom) {
        // Ищем ближайшую предстоящую сессию и открываем комнату
        let psySessions = [];
        try {
            const d = localStorage.getItem('psyhelp_sessions_psychologist');
            psySessions = d ? JSON.parse(d) : [];
            if (!Array.isArray(psySessions)) psySessions = [];
        } catch (e) { psySessions = []; }

        const upcoming = psySessions
            .filter(function (s) { return s.status === 'confirmed'; })
            .sort(function (a, b) {
                const ad = new Date(a.date + 'T' + String(a.hour).padStart(2, '0') + ':00:00');
                const bd = new Date(b.date + 'T' + String(b.hour).padStart(2, '0') + ':00:00');
                return ad - bd;
            });

        if (upcoming.length > 0) {
            window.location.href = 'room.html?session=' + upcoming[0].id;
        } else {
            elements.placeholderSection.style.display = 'block';
            document.getElementById('placeholderText').textContent =
                'Нет активных сессий. Комната откроется автоматически, когда клиент забронирует сессию.';
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
    } else {
        elements.placeholderSection.style.display = 'block';
        document.getElementById('placeholderText').textContent = section.content;
    }
}

document.addEventListener('DOMContentLoaded', renderSection);