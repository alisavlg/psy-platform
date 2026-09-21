// ============================================
// РАЗДЕЛ «ОТЧЁТЫ»
// ============================================

const PAYMENTS_STORAGE_KEY = 'psyhelp_payments';

function getPayments() {
    const data = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { console.error(e); }
    }

    const demo = [
        { id: '1', date: getDateOffset(-1), clientName: 'Елена Александровна', topic: 'Сессия: тревога', amount: 3000, status: 'paid' },
        { id: '2', date: getDateOffset(-2), clientName: 'Дмитрий Петрович', topic: 'Сессия: отношения', amount: 3000, status: 'paid' },
        { id: '3', date: getDateOffset(-3), clientName: 'Ольга Сергеевна', topic: 'Сессия: самооценка', amount: 4000, status: 'paid' },
        { id: '4', date: getDateOffset(-5), clientName: 'Елена Александровна', topic: 'Сессия: тревога', amount: 3000, status: 'paid' },
        { id: '5', date: getDateOffset(-7), clientName: 'Игорь Николаевич', topic: 'Отменённая сессия', amount: 3000, status: 'refunded' },
        { id: '6', date: getDateOffset(-10), clientName: 'Дмитрий Петрович', topic: 'Сессия: отношения', amount: 3000, status: 'paid' },
        { id: '7', date: getDateOffset(-14), clientName: 'Ольга Сергеевна', topic: 'Сессия: карьера', amount: 4000, status: 'paid' },
        { id: '8', date: getDateOffset(-20), clientName: 'Марина Викторовна', topic: 'Сессия: знакомство', amount: 3000, status: 'paid' },
        { id: '9', date: getDateOffset(-25), clientName: 'Елена Александровна', topic: 'Сессия: тревога', amount: 3000, status: 'paid' },
        { id: '10', date: getDateOffset(-2), clientName: 'Алексей Иванович', topic: 'Ожидает оплаты', amount: 3500, status: 'pending' }
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
    return y + '-' + m + '-' + day;
}

const STATUS_LABELS = {
    paid: 'Оплачено',
    pending: 'Ожидает',
    refunded: 'Возврат',
    cancelled: 'Отменено'
};

let currentPeriod = 'month';

function renderReports(period) {
    if (period) currentPeriod = period;

    const listEl = document.getElementById('paymentsList');
    if (!listEl) return;

    const all = getPayments();
    const filtered = filterByPeriod(all, currentPeriod);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === currentPeriod);
    });

    updateSummary(all, filtered);
    renderChart(all);

    const countEl = document.getElementById('paymentsCount');
    if (countEl) countEl.textContent = 'Всего: ' + filtered.length;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="payments-empty"><div class="payments-empty-icon">💳</div><p>Платежей за этот период нет</p></div>';
        return;
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = '';
    filtered.forEach(p => {
        const row = document.createElement('div');
        row.className = 'payment-row';

        const dateFormatted = formatPaymentDate(p.date);
        const statusLabel = STATUS_LABELS[p.status] || p.status;

        row.innerHTML =
            '<div class="payment-date">' + dateFormatted + '</div>' +
            '<div>' +
                '<div class="payment-client">' + p.clientName + '</div>' +
                '<div class="payment-topic">' + p.topic + '</div>' +
            '</div>' +
            '<div class="payment-amount">' + p.amount.toLocaleString('ru-RU') + ' ₽</div>' +
            '<div class="payment-status ' + p.status + '">' + statusLabel + '</div>' +
            '<div></div>';

        listEl.appendChild(row);
    });
}

// ============================================
// ГРАФИК ДОХОДА ПО МЕСЯЦАМ
// ============================================

function renderChart(all) {
    const chartEl = document.getElementById('reportsChart');
    if (!chartEl) return;

    const paid = all.filter(p => p.status === 'paid');

    const months = [];
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push({
            key: key,
            label: monthNames[d.getMonth()],
            total: 0
        });
    }

    paid.forEach(p => {
        const monthKey = p.date.substring(0, 7);
        const m = months.find(x => x.key === monthKey);
        if (m) m.total += p.amount;
    });

    const maxTotal = Math.max.apply(null, months.map(m => m.total).concat([1]));

    chartEl.innerHTML = '';
    months.forEach(m => {
        const heightPercent = (m.total / maxTotal) * 100;
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-bar-wrapper';

        const valueText = m.total > 0 ? (m.total / 1000).toFixed(0) + 'к ₽' : '';

        wrapper.innerHTML =
            '<span class="chart-bar-value">' + valueText + '</span>' +
            '<div class="chart-bar" style="height: ' + heightPercent + '%;" title="' + m.total.toLocaleString('ru-RU') + ' ₽"></div>' +
            '<span class="chart-bar-label">' + m.label + '</span>';

        chartEl.appendChild(wrapper);
    });
}

function updateSummary(all, filtered) {
    const paidFiltered = filtered.filter(p => p.status === 'paid');
    const paidAll = all.filter(p => p.status === 'paid');

    const sumMonth = paidFiltered.reduce(function (s, p) { return s + p.amount; }, 0);
    const sumTotal = paidAll.reduce(function (s, p) { return s + p.amount; }, 0);
    const sumAverage = paidFiltered.length > 0 ? Math.round(sumMonth / paidFiltered.length) : 0;
    const sumRefunds = filtered.filter(p => p.status === 'refunded').reduce(function (s, p) { return s + p.amount; }, 0);

    const fmt = function (n) { return n.toLocaleString('ru-RU') + ' ₽'; };

    const elMonth = document.getElementById('sumMonth');
    const elTotal = document.getElementById('sumTotal');
    const elAverage = document.getElementById('sumAverage');
    const elRefunds = document.getElementById('sumRefunds');

    if (elMonth) elMonth.textContent = fmt(sumMonth);
    if (elTotal) elTotal.textContent = fmt(sumTotal);
    if (elAverage) elAverage.textContent = fmt(sumAverage);
    if (elRefunds) elRefunds.textContent = fmt(sumRefunds);
}

function filterByPeriod(payments, period) {
    if (period === 'all') return payments;

    const now = new Date();
    const daysAgo = period === 'week' ? 7 : 30;

    const threshold = new Date();
    threshold.setDate(now.getDate() - daysAgo);
    const thresholdKey = formatDateKey(threshold);

    return payments.filter(function (p) { return p.date >= thresholdKey; });
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function formatPaymentDate(dateKey) {
    const parts = dateKey.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}

document.addEventListener('DOMContentLoaded', function () {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(function (btn) {
        btn.addEventListener('click', function () {
            renderReports(btn.dataset.period);
        });
    });
});