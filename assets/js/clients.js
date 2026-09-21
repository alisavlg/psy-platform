// ============================================
// РАЗДЕЛ «КЛИЕНТЫ»
// ============================================

function getClients() {
    const data = localStorage.getItem('psyhelp_clients');
    if (data) return JSON.parse(data);

    // Демо-клиенты
    const demo = [
        {
            id: '1',
            firstName: 'Елена',
            middleName: 'Александровна',
            lastName: 'Иванова',
            phone: '+7 900 123-45-67',
            email: 'elena@example.com',
            createdAt: Date.now() - 30 * 86400000,
            notes: 'Работаем над тревожностью. Прогресс хороший, клиентка стала спокойнее.',
            sessions: [
                { date: '2026-09-15', hour: 14, topic: 'Тревога' },
                { date: '2026-09-08', hour: 14, topic: 'Тревога' },
                { date: '2026-09-01', hour: 14, topic: 'Знакомство' }
            ]
        },
        {
            id: '2',
            firstName: 'Дмитрий',
            middleName: 'Петрович',
            lastName: 'Смирнов',
            phone: '+7 900 234-56-78',
            email: 'dmitry@example.com',
            createdAt: Date.now() - 20 * 86400000,
            notes: 'Семейные отношения. Работает над коммуникацией с супругой.',
            sessions: [
                { date: '2026-09-10', hour: 18, topic: 'Семья' },
                { date: '2026-09-03', hour: 18, topic: 'Семья' }
            ]
        },
        {
            id: '3',
            firstName: 'Ольга',
            middleName: 'Сергеевна',
            lastName: 'Кузнецова',
            phone: '+7 900 345-67-89',
            email: 'olga@example.com',
            createdAt: Date.now() - 60 * 86400000,
            notes: 'Карьерный рост, самооценка. Активно работает, много инсайтов.',
            sessions: [
                { date: '2026-09-18', hour: 11, topic: 'Самооценка' },
                { date: '2026-09-11', hour: 11, topic: 'Карьера' },
                { date: '2026-09-04', hour: 11, topic: 'Самооценка' },
                { date: '2026-08-28', hour: 11, topic: 'Карьера' }
            ]
        }
    ];
    saveClients(demo);
    return demo;
}

function saveClients(clients) {
    localStorage.setItem('psyhelp_clients', JSON.stringify(clients));
}

// ============================================
// Отрисовка списка клиентов
// ============================================

let clientsFilter = '';

function renderClients() {
    const listEl = document.getElementById('clientsList');
    const countEl = document.getElementById('clientsCount');
    if (!listEl) return;

    const all = getClients();

    // Обновляем счётчик
    if (countEl) countEl.textContent = `Всего: ${all.length}`;

    // Фильтрация
    const filtered = clientsFilter
        ? all.filter(c => {
            const full = (c.firstName + ' ' + c.middleName + ' ' + c.lastName + ' ' + c.phone).toLowerCase();
            return full.includes(clientsFilter.toLowerCase());
        })
        : all;

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="clients-empty">
                <div class="clients-empty-icon">👥</div>
                <p>${clientsFilter ? 'Ничего не найдено' : 'Список клиентов пуст'}</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';

        const initials = (client.firstName[0] || '') + (client.lastName[0] || '');
        const fullName = `${client.firstName} ${client.middleName}`;
        const sessionsCount = client.sessions ? client.sessions.length : 0;
        const lastSession = sessionsCount > 0 ? client.sessions[0].date : null;
        const lastSessionFormatted = lastSession ? formatClientDate(lastSession) : '—';

        card.innerHTML = `
            <div class="client-avatar">${initials}</div>
            <div class="client-info">
                <div class="client-name">${fullName}</div>
                <div class="client-phone">${client.phone}</div>
                <div class="client-stats">
                    <span class="client-stat">Сессий: <strong>${sessionsCount}</strong></span>
                    <span class="client-stat">Последняя: <strong>${lastSessionFormatted}</strong></span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openClientModal(client.id));
        listEl.appendChild(card);
    });
}

function formatClientDate(dateKey) {
    const parts = dateKey.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
}

// ============================================
// Модальное окно клиента
// ============================================

let currentClientId = null;

function openClientModal(id) {
    const clients = getClients();
    const client = clients.find(c => c.id === id);
    if (!client) return;

    currentClientId = id;

    const overlay = document.getElementById('clientModalOverlay');
    const titleEl = document.getElementById('clientModalTitle');
    const contentEl = document.getElementById('clientModalContent');

    if (!overlay || !titleEl || !contentEl) return;

    const fullName = `${client.firstName} ${client.middleName}`;
    titleEl.textContent = fullName;

    const initials = (client.firstName[0] || '') + (client.lastName[0] || '');
    const sessionsCount = client.sessions ? client.sessions.length : 0;
    const lastSessionFormatted = sessionsCount > 0 ? formatClientDate(client.sessions[0].date) : '—';

    let sessionsHtml = '';
    if (client.sessions && client.sessions.length > 0) {
        sessionsHtml = client.sessions.map(s => `
            <div class="session-history-item">
                <span class="session-history-date">${formatClientDate(s.date)}, ${String(s.hour).padStart(2, '0')}:00</span>
                <span class="session-history-topic">${s.topic}</span>
            </div>
        `).join('');
    } else {
        sessionsHtml = '<p class="empty-state">Сессий пока не было</p>';
    }

    contentEl.innerHTML = `
        <div class="client-detail-header">
            <div class="client-detail-avatar">${initials}</div>
            <div class="client-detail-info">
                <h4>${fullName}</h4>
                <p>${client.phone}</p>
                <p>${client.email || ''}</p>
                <p style="margin-top: 8px; color: var(--color-primary); font-weight: 600;">
                    Сессий: ${sessionsCount} · Последняя: ${lastSessionFormatted}
                </p>
            </div>
        </div>

        <div class="client-section-title">История сессий</div>
        <div class="sessions-history">
            ${sessionsHtml}
        </div>

        <div class="client-section-title">Заметки</div>
        <textarea class="client-notes" id="clientNotes" placeholder="Ваши заметки о клиенте...">${client.notes || ''}</textarea>

        <div class="modal-actions">
            <button class="btn-save" id="saveNotesBtn">Сохранить заметки</button>
        </div>
    `;

    // Обработчик сохранения заметок
    const saveBtn = document.getElementById('saveNotesBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveClientNotes);
    }

    overlay.classList.add('active');
}

function saveClientNotes() {
    if (!currentClientId) return;

    const notesEl = document.getElementById('clientNotes');
    if (!notesEl) return;

    const clients = getClients();
    const client = clients.find(c => c.id === currentClientId);
    if (!client) return;

    client.notes = notesEl.value;
    saveClients(clients);

    // Показать подтверждение
    const btn = document.getElementById('saveNotesBtn');
    if (btn) {
        btn.textContent = '✓ Сохранено';
        btn.style.backgroundColor = '#2ecc71';
        setTimeout(() => {
            btn.textContent = 'Сохранить заметки';
            btn.style.backgroundColor = '';
        }, 1500);
    }
}

function closeClientModal() {
    const overlay = document.getElementById('clientModalOverlay');
    if (overlay) overlay.classList.remove('active');
    currentClientId = null;
}

// ============================================
// Создание клиента из принятой заявки
// ============================================

function createClientFromRequest(req) {
    const clients = getClients();

    // Проверяем, нет ли уже такого клиента (по телефону)
    const exists = clients.some(c => c.phone === req.clientPhone);
    if (exists) return;

    const newClient = {
        id: Date.now().toString(),
        firstName: req.clientFirstName,
        middleName: req.clientMiddleName,
        lastName: req.clientLastName,
        phone: req.clientPhone,
        email: '',
        createdAt: Date.now(),
        notes: '',
        sessions: [
            { date: req.desiredDate, hour: req.desiredHour, topic: req.topic }
        ]
    };

    clients.push(newClient);
    saveClients(clients);
}

// ============================================
// Поиск
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('clientsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clientsFilter = e.target.value.trim();
            renderClients();
        });
    }

    const closeBtn = document.getElementById('clientCancelBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeClientModal);
    }

    const overlay = document.getElementById('clientModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'clientModalOverlay') closeClientModal();
        });
    }
});