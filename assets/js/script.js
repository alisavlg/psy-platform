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
        content: 'Здесь будут входящие заявки от клиентов.'
    },
    clients: {
        title: 'Клиенты',
        content: 'Здесь будет список ваших клиентов и история сессий.'
    },
    room: {
        title: 'Комната',
        content: 'Здесь будет встроенный видеочат для проведения сессий.'
    },
    profile: {
        title: 'Личная страница',
        content: 'Здесь вы можете редактировать свой публичный профиль.'
    },
    payments: {
        title: 'Оплаты',
        content: 'Здесь будет история платежей и выплат.'
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
    const placeholderSection = document.getElementById('placeholderSection');

    if (!calendarSection || !placeholderSection) return;

    if (section.isCalendar) {
        calendarSection.style.display = 'block';
        placeholderSection.style.display = 'none';

        if (typeof renderCalendar === 'function') {
            renderCalendar();
            if (typeof scrollToCurrentHour === 'function') {
                scrollToCurrentHour();
            }
        }
    } else {
        calendarSection.style.display = 'none';
        placeholderSection.style.display = 'block';
        document.getElementById('placeholderText').textContent = section.content;
    }

    // Обновляем панель «Сегодня» (независимо от раздела)
    if (typeof renderTodayPanel === 'function') {
        renderTodayPanel();
    }
}

document.addEventListener('DOMContentLoaded', renderSection);