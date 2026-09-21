// ============================================
// РАЗДЕЛ «ОПЛАТЫ»
// ============================================

const PAYMENTS_STORAGE_KEY = 'psyhelp_payments';

// Демо-данные при первом запуске
function getPayments() {
    const data = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (data) return JSON.parse(data);

    const today = new Date();
    const demo = [
        {
            id: '1',
            date: getDateOffset(-1),
            clientName: 'Елена Александровна',
            topic: 'Сессия: тревога',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '2',
            date: getDateOffset(-2),
            clientName: 'Дмитрий Петрович',
            topic: 'Сессия: отношения',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '3',
            date: getDateOffset(-3),
            clientName: 'Ольга Сергеевна',
            topic: 'Сессия: самооценка',
            amount: 4000,
            status: 'paid'
        },
        {
            id: '4',
            date: getDateOffset(-5),
            clientName: 'Елена Александровна',
            topic: 'Сессия: тревога',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '5',
            date: getDateOffset(-7),
            clientName: 'Игорь Николаевич',
            topic: 'Отменённая сессия',
            amount: 3000,
            status: 'refunded'
        },
        {
            id: '6',
            date: getDateOffset(-10),
            clientName: 'Дмитрий Петрович',
            topic: 'Сессия: отношения',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '7',
            date: getDateOffset(-14),
            clientName: 'Ольга Сергеевна',
            topic: 'Сессия: карьера',
            amount: 4000,
            status: 'paid'
        },
        {
            id: '8',
            date: getDateOffset(-20),
            clientName: 'Марина Викторовна',
            topic: 'Сессия: знакомство',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '9',
            date: getDateOffset(-25),
            clientName: 'Елена Александровна',
            topic: 'Сессия: тревога',
            amount: 3000,
            status: 'paid'
        },
        {
            id: '10',
            date: getDateOffset(-2),
            clientName: 'Алексей Иванович',
            topic: 'Ожидает оплаты',
            amount: 3500,
            status: 'pending'
        }
    ];
    savePayments(demo);
    return demo;
}

function savePayments(payments) {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}

function getDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const STATUS_LABELS = {
    paid: 'Оплачено',
    pending: 'Ожидает',
    refunded: 'Возврат',
    cancelled: 'Отменено'
};

// ============================================
// Отрисовка
// ============================================

let currentPeriod = 'month';

function renderPayments(period) {
    if (period) currentPeriod = period;

    const listEl = document.getElementById('paymentsList');
    if (!listEl) return;

    const all = getPayments();
    const filtered = filterByPeriod(all, currentPeriod);

    // Обновляем активный фильтр
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === currentPeriod);
    });

    // Считаем итоги
    updateSummary(all, filtered);

    // Счётчик
    const countEl = document.getElementById('paymentsCount');
    if (countEl) countEl.textContent = `Всего: ${filtered.length}`;

    // Пусто?
    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="payments-empty">
                <div class="payments-empty-icon">💳</div>
                <p>Платежей за этот период нет</p>
            </div>
        `;
        return;
    }

    // Сортируем по дате (новые сверху)
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    // Рендерим
    listEl.innerHTML = '';
    filtered.forEach(p => {
        const row = document.createElement('div');
        row.className = 'payment-row';

        const dateFormatted = formatPaymentDate(p.date);
        const statusLabel = STATUS_LABELS[p.status] || p.status;

        row.innerHTML = `
            <div class="payment-date">${dateFormatted}</div>
            <div>
                <div class="payment-client">${p.clientName}</div>
                <div class="payment-topic">${p.topic}</div>
            </div>
            <div class="payment-amount">${p.amount.toLocaleString('ru-RU')} ₽</div>
            <div class="payment-status ${p.status}">${statusLabel}</div>
            <div></div>
        `;

        listEl.appendChild(row);
    });
}

// ============================================
// Итоги
// ============================================

function updateSummary(all, filtered) {
    // Считаем только "paid" (оплачено) для доходов
    const paidFiltered = filtered.filter(p => p.status === 'paid');
    const paidAll = all.filter(p => p.status === 'paid');

    const sumMonth = paidFiltered.reduce((s, p) => s + p.amount, 0);
    const sumTotal = paidAll.reduce((s, p) => s + p.amount, 0);
    const sumAverage = paidFiltered.length > 0
        ? Math.round(sumMonth / paidFiltered.length)
        : 0;
    const sumRefunds = filtered
        .filter(p => p.status === 'refunded')
        .reduce((s, p) => s + p.amount, 0);

    const fmt = (n) => n.toLocaleString('ru-RU') + ' ₽';

    const elMonth = document.getElementById('sumMonth');
    const elTotal = document.getElementById('sumTotal');
    const elAverage = document.getElementById('sumAverage');
    const elRefunds = document.getElementById('sumRefunds');

    if (elMonth) elMonth.textContent = fmt(sumMonth);
    if (elTotal) elTotal.textContent = fmt(sumTotal);
    if (elAverage) elAverage.textContent = fmt(sumAverage);
    if (elRefunds) elRefunds.textContent = fmt(sumRefunds);
}

// ============================================
// Фильтрация по периоду
// ============================================

function filterByPeriod(payments, period) {
    if (period === 'all') return payments;

    const now = new Date();
    let daysAgo;

    if (period === 'week') daysAgo = 7;
    else if (period === 'month') daysAgo = 30;
    else return payments;

    const threshold = new Date();
    threshold.setDate(now.getDate() - daysAgo);
    const thresholdKey = formatDateKey(threshold);

    return payments.filter(p => p.date >= thresholdKey);
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatPaymentDate(dateKey) {
    const parts = dateKey.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            renderPayments(btn.dataset.period);
        });
    });
});