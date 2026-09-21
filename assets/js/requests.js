// ============================================
// РАЗДЕЛ «ЗАЯВКИ» (без телефона)
// ============================================
// Психолог НЕ видит телефон/email клиента.
// Общение — только через платформу.

const REQUESTS_KEY = 'psyhelp_requests_v2';

const REQUEST_STATUS_LABELS = {
    new: 'Новая',
    accepted: 'Принята',
    declined: 'Отклонена'
};

function getRequests() {
    const data = localStorage.getItem(REQUESTS_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { console.error(e); }
    }

    const demo = [
        {
            id: '1',
            clientFirstName: 'Елена',
            clientMiddleName: 'Александровна',
            clientLastName: 'Иванова',
            topic: 'Тревога, панические атаки',
            desiredDate: getDatePlusDays(1),
            desiredHour: 14,
            status: 'new',
            createdAt: Date.now()
        },
        {
            id: '2',
            clientFirstName: 'Дмитрий',
            clientMiddleName: 'Петрович',
            clientLastName: 'Смирнов',
            topic: 'Отношения в семье',
            desiredDate: getDatePlusDays(2),
            desiredHour: 18,
            status: 'new',
            createdAt: Date.now() - 86400000
        },
        {
            id: '3',
            clientFirstName: 'Ольга',
            clientMiddleName: 'Сергеевна',
            clientLastName: 'Кузнецова',
            topic: 'Самооценка, карьера',
            desiredDate: getDatePlusDays(3),
            desiredHour: 11,
            status: 'new',
            createdAt: Date.now() - 172800000
        }
    ];
    saveRequests(demo);
    return demo;
}

function saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

function getDatePlusDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

let currentTab = 'new';

function renderRequests(tab) {
    if (tab) currentTab = tab;

    const listEl = document.getElementById('requestsList');
    if (!listEl) return;

    const all = getRequests();
    const filtered = all.filter(function (r) { return r.status === currentTab; });

    updateCounters(all);

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });

    if (filtered.length === 0) {
        const emptyMessages = {
            new: 'Новых заявок нет',
            accepted: 'Принятых заявок нет',
            declined: 'Отклонённых заявок нет'
        };
        listEl.innerHTML =
            '<div class="requests-empty">' +
                '<div class="requests-empty-icon">📭</div>' +
                '<p>' + emptyMessages[currentTab] + '</p>' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (req) {
        const card = document.createElement('div');
        card.className = 'request-card';

        const statusClass = req.status;
        const statusLabel = REQUEST_STATUS_LABELS[req.status] || req.status;
        const dateFormatted = formatRequestDate(req.desiredDate);
        const fullName = req.clientFirstName + ' ' + (req.clientMiddleName || '');

        let actionsHtml = '';
        if (req.status === 'new') {
            actionsHtml =
                '<button class="btn-request btn-accept" data-action="accept" data-id="' + req.id + '">Принять</button>' +
                '<button class="btn-request btn-decline" data-action="decline" data-id="' + req.id + '">Отклонить</button>';
        }

        // Без телефона — только имя, тема и время
        card.innerHTML =
            '<div class="request-info">' +
                '<div class="request-header">' +
                    '<span class="request-client">' + fullName + '</span>' +
                    '<span class="request-status ' + statusClass + '">' + statusLabel + '</span>' +
                '</div>' +
                '<div class="request-topic">' + req.topic + '</div>' +
                '<div class="request-meta">Желаемое время: ' + dateFormatted + ', ' + String(req.desiredHour).padStart(2, '0') + ':00</div>' +
            '</div>' +
            '<div class="request-actions">' + actionsHtml + '</div>';

        listEl.appendChild(card);
    });

    listEl.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'accept') acceptRequest(id);
            if (action === 'decline') declineRequest(id);
        });
    });
}

function updateCounters(all) {
    const countNew = all.filter(function (r) { return r.status === 'new'; }).length;
    const countAccepted = all.filter(function (r) { return r.status === 'accepted'; }).length;
    const countDeclined = all.filter(function (r) { return r.status === 'declined'; }).length;

    const elNew = document.getElementById('countNew');
    const elAccepted = document.getElementById('countAccepted');
    const elDeclined = document.getElementById('countDeclined');

    if (elNew) elNew.textContent = countNew;
    if (elAccepted) elAccepted.textContent = countAccepted;
    if (elDeclined) elDeclined.textContent = countDeclined;
}

function formatRequestDate(dateKey) {
    if (!dateKey) return '—';
    const parts = dateKey.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}

function acceptRequest(id) {
    const requests = getRequests();
    const req = requests.find(function (r) { return r.id === id; });
    if (!req) return;

    req.status = 'accepted';
    saveRequests(requests);

    if (typeof addEvent === 'function') {
        addEvent({
            title: 'Сессия: ' + req.clientFirstName,
            date: req.desiredDate,
            hour: req.desiredHour,
            category: 'session'
        });
    }

    if (typeof createClientFromRequest === 'function') {
        createClientFromRequest(req);
    }

    renderRequests('accepted');
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderTodayPanel === 'function') renderTodayPanel();
}

function declineRequest(id) {
    const requests = getRequests();
    const req = requests.find(function (r) { return r.id === id; });
    if (!req) return;

    req.status = 'declined';
    saveRequests(requests);
    renderRequests('declined');
}

document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            renderRequests(tab.dataset.tab);
        });
    });
});