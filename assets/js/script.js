// ============================================
// Логика личного кабинета: переключение разделов
// ============================================

const sections = {
    calendar: {
        title: 'Календарь',
        isCalendar: true
    },
    requests: {
        title: 'Заявки на запись',
        isRequests: true
    },
    clients: {
        title: 'Клиенты',
        isClients: true
    },
    room: {
        title: 'Комната',
        content: 'Здесь будет встроенный видеочат для проведения сессий.'
    },
    profile: {
        title: 'Личная страница',
        isProfile: true
    },
    payments: {
        title: 'Оплаты',
        isPayments: true
    },
    settings: {
        title: 'Настройки',
        content: 'Здесь вы можете настроить расписание, часовой пояс и уведомления.'
    }
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
    document.title = `${section.title} | PsyHelp`;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.href.includes(`section=${sectionKey}`)) {
            item.classList.add('active');
        }
    });

    const calendarSection = document.getElementById('calendarSection');
    const requestsSection = document.getElementById('requestsSection');
    const clientsSection = document.getElementById('clientsSection');
    const profileSection = document.getElementById('profileSection');
    const paymentsSection = document.getElementById('paymentsSection');
    const placeholderSection = document.getElementById('placeholderSection');

    if (!calendarSection || !placeholderSection) return;

    // Скрываем все
    calendarSection.style.display = 'none';
    if (requestsSection) requestsSection.style.display = 'none';
    if (clientsSection) clientsSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (paymentsSection) paymentsSection.style.display = 'none';
    placeholderSection.style.display = 'none';

    // Показываем нужное
    if (section.isCalendar) {
        calendarSection.style.display = 'block';
        if (typeof renderCalendar === 'function') {
            renderCalendar();
            if (typeof scrollToCurrentHour === 'function') scrollToCurrentHour();
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
    } else if (section.isPayments) {
        if (paymentsSection) {
            paymentsSection.style.display = 'block';
            if (typeof renderPayments === 'function') renderPayments('month');
        }
    } else {
        placeholderSection.style.display = 'block';
        document.getElementById('placeholderText').textContent = section.content;
    }

    if (typeof renderTodayPanel === 'function') renderTodayPanel();
}

document.addEventListener('DOMContentLoaded', renderSection);