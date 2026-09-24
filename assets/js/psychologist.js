// ============================================
// ПРОФИЛЬ ПСИХОЛОГА + БРОНИРОВАНИЕ + ОТЗЫВЫ
// ============================================

console.log('[psychologist.js] loaded');

window.CURRENT_USER = window.CURRENT_USER || 'client';

const PSY_REGISTRY_KEY = 'psyhelp_psychologists_registry';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

let currentPsy = null;
let currentSlot = null;
let currentFilterDays = 7;
let currentReviewRating = 0;

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || 'demo-client';
    } catch (e) { return 'demo-client'; }
}

function getPsychologistUserId(psy) {
    if (psy && psy.userId) return psy.userId;
    const uid = getCurrentUserId();
    if (psy && psy.id === uid) return uid;
    return (psy && psy.id) || 'psy-1';
}

function getSessionsKeyFor(userId) { return 'psyhelp_sessions_' + userId; }
function getEventsKeyFor(userId) { return 'psyhelp_events_' + userId; }

function getUserCode() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        if (u.code) return u.code;
    } catch (e) {}
    return 'CL-0000';
}

function getPrefilledClientName() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        const f = (u.displayFirstName || u.realFirstName || '').trim();
        const m = (u.displayMiddleName || u.realMiddleName || '').trim();
        if (f && m) return capitalizeWords(f + ' ' + m);
        if (f) return capitalizeWords(f);
    } catch (e) {}
    return '';
}

function getShortName(firstName, middleName) {
    const f = (firstName || '').charAt(0).toUpperCase();
    const m = (middleName || '').charAt(0).toUpperCase();
    if (!f) return 'Клиент';
    return m ? f + '.' + m + '.' : f + '.';
}

function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
}

function getPsychologists() {
    const data = localStorage.getItem(PSY_REGISTRY_KEY);
    if (data) {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
}

function savePsychologists(list) {
    localStorage.setItem(PSY_REGISTRY_KEY, JSON.stringify(list));
}

function getPsychologistById(id) {
    return getPsychologists().find(function (p) { return p.id === id; });
}

function getSlotsFor(psy) {
    const psyUserId = getPsychologistUserId(psy);
    const key = getEventsKeyFor(psyUserId);
    const data = localStorage.getItem(key);

    let events = [];
    if (data) {
        try {
            const parsed = JSON.parse(data);
            events = Array.isArray(parsed) ? parsed : [];
        } catch (e) {}
    }
    if (!Array.isArray(events)) events = [];

    // Занято = ЛЮБОЕ событие, кроме free
    const busy = {};
    events.forEach(function (e) {
        if (e.category === 'free') return;
        busy[e.date + '-' + e.hour] = true;
    });

    // Свободные = free, но не занятые ничем
    const freeKeys = {};
    events.forEach(function (e) {
        if (e.category !== 'free') return;
        const k = e.date + '-' + e.hour;
        if (busy[k]) return;
        freeKeys[k] = true;
    });
    return freeKeys;
}

// ============================================
// ОТЗЫВЫ — вспомогательные
// ============================================

function getReviews(psy) {
    if (!psy || !Array.isArray(psy.reviews)) return [];
    return psy.reviews;
}

function hasReviewed(psy, userId) {
    var reviews = getReviews(psy);
    return reviews.some(function (r) { return r.authorId === userId; });
}

function hasCompletedSessionWith(psy, userId) {
    var psyUserId = getPsychologistUserId(psy);
    var sessions = readSessions(getSessionsKeyFor(userId));
    return sessions.some(function (s) {
        return s.status === 'completed' &&
               (s.psychologistUserId === psyUserId || s.psychologistId === psy.id);
    });
}

function addReview(psyId, authorId, authorName, rating, text) {
    var list = getPsychologists();
    var idx = list.findIndex(function (p) { return p.id === psyId; });
    if (idx === -1) return false;

    var psy = list[idx];
    if (!Array.isArray(psy.reviews)) psy.reviews = [];

    psy.reviews.push({
        id: 'rev-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        authorId: authorId,
        authorName: authorName,
        rating: rating,
        text: text,
        createdAt: Date.now()
    });

    var oldRating = Number(psy.rating) || 0;
    var oldCount = Number(psy.reviewsCount) || 0;
    var newCount = oldCount + 1;
    var newRating = (oldRating * oldCount + rating) / newCount;

    psy.rating = Math.round(newRating * 10) / 10;
    psy.reviewsCount = newCount;

    savePsychologists(list);
    currentPsy = psy;
    return true;
}

function renderReviewsSection() {
    var reviews = getReviews(currentPsy);
    var html = '<div class="psy-profile-section psy-reviews-section">' +
        '<h3>Отзывы ' + (reviews.length > 0 ? '(' + reviews.length + ')' : '') + '</h3>';

    if (reviews.length === 0) {
        html += '<p class="reviews-empty">Пока отзывов нет. ' +
                'Оставьте свой, если уже работали с этим специалистом.</p>';
    } else {
        var sorted = reviews.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
        html += '<div class="reviews-list">';
        sorted.forEach(function (r) {
            var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            html += '<div class="review-item">' +
                '<div class="review-header">' +
                    '<div class="review-author">' + escapeHtml(r.authorName) + '</div>' +
                    '<div class="review-date">' + formatReviewDate(r.createdAt) + '</div>' +
                '</div>' +
                '<div class="review-stars">' + stars + '</div>' +
                (r.text ? '<div class="review-text">' + escapeHtml(r.text) + '</div>' : '') +
            '</div>';
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function formatReviewDate(ts) {
    var d = new Date(ts);
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

// ============================================
// Отрисовка профиля
// ============================================

function renderProfile() {
    const container = document.getElementById('psychologistProfile');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const psyId = params.get('id') || 'psy-1';

    currentPsy = getPsychologistById(psyId);

    if (!currentPsy) {
        container.innerHTML = '<div class="placeholder"><p>Психолог не найден</p></div>';
        return;
    }

    document.title = currentPsy.firstName + ' ' + currentPsy.middleName + ' | PsyHelp';

    const initials = getInitials(currentPsy.firstName + ' ' + currentPsy.middleName);
    const fullName = currentPsy.firstName + ' ' + currentPsy.middleName;
    const stars = '★'.repeat(Math.round(currentPsy.rating)) + '☆'.repeat(5 - Math.round(currentPsy.rating));

    var reviewButtonHtml =
        '<button type="button" class="psy-action-btn psy-action-review" id="writeReviewBtn">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
            '</svg>' +
            'Оставить отзыв' +
        '</button>';

    container.innerHTML =
        '<div class="psy-profile-card">' +
            '<div class="psy-profile-avatar">' + initials + '</div>' +
            '<div class="psy-profile-info">' +
                '<h1 class="psy-profile-name">' + escapeHtml(fullName) + '</h1>' +
                (currentPsy.isVerified ? '<span class="psy-profile-badge">✓ Проверен</span>' : '') +
                '<div class="psy-profile-specialty">' + escapeHtml(currentPsy.specialty) + '</div>' +
                '<div class="psy-profile-meta">' +
                    '<div class="psy-profile-stat">Стаж: <strong>' + currentPsy.experience + ' лет</strong></div>' +
                    '<div class="psy-profile-stat">Сессия: <strong>' + currentPsy.price.toLocaleString('ru-RU') + ' ₽</strong></div>' +
                '</div>' +
                '<div class="psy-profile-rating">' +
                    '<span class="psy-profile-stars">' + stars + '</span>' +
                    '<span class="psy-profile-reviews">' + currentPsy.rating + ' · ' + currentPsy.reviewsCount + ' отзывов</span>' +
                '</div>' +

                '<div class="psy-profile-actions">' +
                    '<button type="button" class="psy-action-btn psy-action-write" id="writeToPsyBtn">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
                        '</svg>' +
                        'Написать' +
                    '</button>' +
                    reviewButtonHtml +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div class="psy-profile-section">' +
            '<h3>О специалисте</h3>' +
            '<p class="psy-profile-description">' + escapeHtml(currentPsy.description) + '</p>' +
        '</div>' +

        '<div class="psy-profile-section" id="slotsSection">' +
            '<h3>Свободные слоты</h3>' +
            '<div class="slots-toolbar">' +
                '<div class="slots-filters">' +
                    '<button class="slot-filter active" data-days="7">Неделя</button>' +
                    '<button class="slot-filter" data-days="14">2 недели</button>' +
                    '<button class="slot-filter" data-days="30">Месяц</button>' +
                '</div>' +
            '</div>' +
            '<div class="slots-container" id="psySlotsGrid"></div>' +
        '</div>' +

        '<div class="psy-profile-section psy-how-to">' +
            '<h3>Как записаться на сессию</h3>' +
            '<ol class="how-to-steps">' +
                '<li>' +
                    '<strong>Напишите психологу</strong> и обсудите запрос — ' +
                    'расскажите, с чем хотите работать, узнайте, работает ли специалист с этим, ' +
                    'обсудите формат и подход. Это поможет понять, комфортно ли вам.' +
                '</li>' +
                '<li>' +
                    '<strong>Если вам комфортно</strong> и психолог готов — ' +
                    'выберите свободный слот выше.' +
                '</li>' +
                '<li>' +
                    '<strong>Забронируйте и оплатите</strong> — сессия закреплена. ' +
                    'Оплата резервирует время за вами.' +
                '</li>' +
            '</ol>' +
        '</div>' +

        renderReviewsSection();

    container.querySelectorAll('.slot-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentFilterDays = parseInt(btn.dataset.days);
            container.querySelectorAll('.slot-filter').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            renderSlots();
        });
    });

        const writeBtn = document.getElementById('writeToPsyBtn');
    if (writeBtn) {
        writeBtn.addEventListener('click', function () {
            if (!currentPsy) return;

            var clientUserId = getCurrentUserId();
            var psyUserId = getPsychologistUserId(currentPsy);

            if (clientUserId === psyUserId) {
                alert('Это ваш собственный профиль. Написать самому себе нельзя.');
                return;
            }

            const chatId = 'chat-' + clientUserId + '-' + currentPsy.id;
            window.location.href = 'client.html?section=messages&chat=' + encodeURIComponent(chatId) + '&psyId=' + encodeURIComponent(currentPsy.id);
        });
    }

    const reviewBtn = document.getElementById('writeReviewBtn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', openReviewModal);
    }

    renderSlots();
}

// ============================================
// Модалка отзыва
// ============================================

function openReviewModal() {
    var userId = getCurrentUserId();

    if (hasReviewed(currentPsy, userId)) {
        alert('Вы уже оставили отзыв этому психологу.\n\nОдин клиент — один отзыв.');
        return;
    }

    if (!hasCompletedSessionWith(currentPsy, userId)) {
        alert('Отзыв можно оставить после проведённых сессий с этим психологом.');
        return;
    }

    currentReviewRating = 0;

    var overlay = document.getElementById('reviewModalOverlay');
    if (!overlay) {
        var html =
            '<div class="modal-overlay" id="reviewModalOverlay">' +
                '<div class="modal">' +
                    '<h3>Оставить отзыв</h3>' +
                    '<p class="review-modal-psy">' + escapeHtml(currentPsy.firstName + ' ' + currentPsy.middleName) + '</p>' +
                    '<div class="form-group">' +
                        '<label>Ваша оценка</label>' +
                        '<div class="review-stars-input" id="reviewStarsInput">' +
                            '<span data-star="1">★</span>' +
                            '<span data-star="2">★</span>' +
                            '<span data-star="3">★</span>' +
                            '<span data-star="4">★</span>' +
                            '<span data-star="5">★</span>' +
                        '</div>' +
                        '<span class="form-error" id="reviewRatingError"></span>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label for="reviewText">Комментарий <span style="color:var(--color-text-muted);font-weight:400;">(необязательно)</span></label>' +
                        '<textarea id="reviewText" rows="4" placeholder="Как вам было? Что помогло?"></textarea>' +
                    '</div>' +
                    '<div class="modal-actions">' +
                        '<button class="btn-save" id="submitReviewBtn">Отправить</button>' +
                        '<button class="btn-cancel" id="cancelReviewBtn">Отмена</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        overlay = document.getElementById('reviewModalOverlay');

        overlay.querySelectorAll('#reviewStarsInput span').forEach(function (star) {
            star.addEventListener('click', function () {
                currentReviewRating = parseInt(star.dataset.star);
                overlay.querySelectorAll('#reviewStarsInput span').forEach(function (s) {
                    s.classList.toggle('active', parseInt(s.dataset.star) <= currentReviewRating);
                });
                var errEl = document.getElementById('reviewRatingError');
                if (errEl) errEl.textContent = '';
            });
            star.addEventListener('mouseenter', function () {
                var n = parseInt(star.dataset.star);
                overlay.querySelectorAll('#reviewStarsInput span').forEach(function (s) {
                    s.classList.toggle('hover', parseInt(s.dataset.star) <= n);
                });
            });
        });
        var starsWrap = document.getElementById('reviewStarsInput');
        if (starsWrap) {
            starsWrap.addEventListener('mouseleave', function () {
                starsWrap.querySelectorAll('span').forEach(function (s) {
                    s.classList.remove('hover');
                });
            });
        }

        document.getElementById('submitReviewBtn').addEventListener('click', submitReview);
        document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'reviewModalOverlay') closeReviewModal();
        });
    }

    var textEl = document.getElementById('reviewText');
    if (textEl) textEl.value = '';
    var errEl = document.getElementById('reviewRatingError');
    if (errEl) errEl.textContent = '';
    overlay.querySelectorAll('#reviewStarsInput span').forEach(function (s) {
        s.classList.remove('active', 'hover');
    });

    overlay.classList.add('active');
}

function closeReviewModal() {
    var overlay = document.getElementById('reviewModalOverlay');
    if (overlay) overlay.classList.remove('active');
    currentReviewRating = 0;
}

function submitReview() {
    if (!currentPsy) return;
    if (!currentReviewRating || currentReviewRating < 1) {
        var errEl = document.getElementById('reviewRatingError');
        if (errEl) errEl.textContent = 'Поставьте оценку';
        return;
    }

    var userId = getCurrentUserId();
    var authorName = getPrefilledClientName() || 'Клиент';
    var textEl = document.getElementById('reviewText');
    var text = textEl ? textEl.value.trim() : '';

    if (hasReviewed(currentPsy, userId)) {
        alert('Вы уже оставили отзыв этому психологу.');
        closeReviewModal();
        return;
    }
    if (!hasCompletedSessionWith(currentPsy, userId)) {
        alert('Отзыв можно оставить после проведённых сессий.');
        closeReviewModal();
        return;
    }

    var ok = addReview(currentPsy.id, userId, authorName, currentReviewRating, text);
    if (!ok) {
        alert('Не удалось сохранить отзыв.');
        return;
    }

    closeReviewModal();
    renderProfile();
    alert('✓ Спасибо за отзыв!');
}

// ============================================
// Отрисовка слотов
// ============================================

function renderSlots() {
    const grid = document.getElementById('psySlotsGrid');
    if (!grid || !currentPsy) return;

    const slots = getSlotsFor(currentPsy);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = {};
    const dateOrder = [];

    for (let i = 0; i < currentFilterDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = formatDateKey(date);
        const isoDay = date.getDay() === 0 ? 7 : date.getDay();

        for (let h = 8; h < 22; h++) {
            if (slots[dateKey + '-' + h]) {
                if (!groups[dateKey]) {
                    groups[dateKey] = { date: date, isoDay: isoDay, hours: [] };
                    dateOrder.push(dateKey);
                }
                groups[dateKey].hours.push(h);
            }
        }
    }

    if (dateOrder.length === 0) {
        grid.innerHTML = '<div class="slots-empty">Свободных слотов нет в выбранном периоде</div>';
        return;
    }

    let total = 0;
    const limitedKeys = [];
    for (let k = 0; k < dateOrder.length && total < 40; k++) {
        const key = dateOrder[k];
        const g = groups[key];
        g.hours.sort(function (a, b) { return a - b; });
        const take = Math.min(g.hours.length, 40 - total);
        g.hours = g.hours.slice(0, take);
        total += g.hours.length;
        limitedKeys.push(key);
    }

    let html = '';
    limitedKeys.forEach(function (dateKey) {
        const g = groups[dateKey];
        const dayLabel = DAYS_RU[g.isoDay - 1] + ', ' + g.date.getDate() + ' ' + MONTHS_RU[g.date.getMonth()];

        html += '<div class="slots-line">';
        g.hours.forEach(function (h) {
            html += '<button type="button" class="slot-card" ' +
                'data-date="' + dateKey + '" ' +
                'data-hour="' + h + '">' +
                '<span class="slot-card-day">' + escapeHtml(dayLabel) + '</span>' +
                '<span class="slot-card-time">' + String(h).padStart(2, '0') + ':00</span>' +
            '</button>';
        });
        html += '</div>';
    });

    grid.innerHTML = html;

    grid.querySelectorAll('.slot-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const dateStr = btn.dataset.date;
            const hour = parseInt(btn.dataset.hour);
            const parts = dateStr.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const isoDay = date.getDay() === 0 ? 7 : date.getDay();
            openBookingModal({ date: date, hour: hour, isoDay: isoDay });
        });
    });
}

// ============================================
// Модалка бронирования
// ============================================

function openBookingModal(slot) {
    currentSlot = slot;

    const overlay = document.getElementById('bookingModalOverlay');
    const summaryEl = document.getElementById('bookingSummary');
    const topicEl = document.getElementById('bookingTopic');
    const nameEl = document.getElementById('bookingClientName');
    const errEl = document.getElementById('bookingClientNameError');
    const agreeEl = document.getElementById('agreeCancelRules');
    const agreeErrEl = document.getElementById('agreeCancelRulesError');

    if (!overlay) return;

    const fullName = currentPsy.firstName + ' ' + currentPsy.middleName;
    const dayLabel = DAYS_RU[slot.isoDay - 1] + ', ' + slot.date.getDate() + ' ' + MONTHS_RU[slot.date.getMonth()];
    const timeLabel = String(slot.hour).padStart(2, '0') + ':00';

    summaryEl.innerHTML =
        '<strong>' + escapeHtml(fullName) + '</strong><br>' +
        dayLabel + ' в ' + timeLabel + '<br>' +
        'Стоимость: <strong>' + currentPsy.price.toLocaleString('ru-RU') + ' ₽</strong>';

    topicEl.value = '';
    if (nameEl) nameEl.value = getPrefilledClientName();
    if (errEl) errEl.textContent = '';
    if (agreeEl) agreeEl.checked = false;
    if (agreeErrEl) agreeErrEl.textContent = '';

    overlay.classList.add('active');
}

function closeBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function confirmBooking() {
    if (!currentSlot || !currentPsy) return;

    const clientUserId = getCurrentUserId();
    const psyUserId = getPsychologistUserId(currentPsy);

    if (clientUserId === psyUserId) {
        alert('Нельзя записаться к самому себе.\n\nВыберите другого психолога в каталоге.');
        closeBookingModal();
        return;
    }

    const agreeEl = document.getElementById('agreeCancelRules');
    const agreeErrEl = document.getElementById('agreeCancelRulesError');
    if (!agreeEl || !agreeEl.checked) {
        if (agreeErrEl) agreeErrEl.textContent = 'Подтвердите согласие с правилами отмены';
        return;
    } else if (agreeErrEl) {
        agreeErrEl.textContent = '';
    }

    const bookedDate = new Date(currentSlot.date);
    const bookedHour = currentSlot.hour;
    const bookedDateStr = formatDateKey(bookedDate);

    // === ПРОВЕРКА 1: у психолога на это время ===
    const psyEventsKey = getEventsKeyFor(psyUserId);
    let psyEvents = [];
    try {
        const d = localStorage.getItem(psyEventsKey);
        psyEvents = d ? JSON.parse(d) : [];
        if (!Array.isArray(psyEvents)) psyEvents = [];
    } catch (e) { psyEvents = []; }

    const psyBusy = psyEvents.some(function (e) {
        return e.date === bookedDateStr && e.hour === bookedHour && e.category !== 'free';
    });

    if (psyBusy) {
        alert('Это время уже занято у психолога. Выберите другое.');
        closeBookingModal();
        renderSlots();
        return;
    }

    const psyHasFree = psyEvents.some(function (e) {
        return e.date === bookedDateStr && e.hour === bookedHour && e.category === 'free';
    });

    if (!psyHasFree) {
        alert('Этот слот уже недоступен. Выберите другой.');
        closeBookingModal();
        renderSlots();
        return;
    }

    // === ПРОВЕРКА 2: у клиента на это время ===
    const clientEventsKey = getEventsKeyFor(clientUserId);
    let clientEvents = [];
    try {
        const d = localStorage.getItem(clientEventsKey);
        clientEvents = d ? JSON.parse(d) : [];
        if (!Array.isArray(clientEvents)) clientEvents = [];
    } catch (e) { clientEvents = []; }

    const clientBusy = clientEvents.some(function (e) {
        return e.date === bookedDateStr && e.hour === bookedHour;
    });

    if (clientBusy) {
        alert('У вас на это время уже есть событие в планировщике.\n\n' +
              'Одно время — одно событие. Выберите другое время или уберите своё событие.');
        closeBookingModal();
        renderSlots();
        return;
    }

    // === ВАЛИДАЦИЯ ФОРМЫ ===
    const nameEl = document.getElementById('bookingClientName');
    const clientFullName = nameEl ? capitalizeWords(nameEl.value.trim()) : '';
    const errEl = document.getElementById('bookingClientNameError');

    if (!clientFullName) {
        if (errEl) errEl.textContent = 'Введите имя и отчество';
        return;
    } else if (errEl) {
        errEl.textContent = '';
    }

    const topic = document.getElementById('bookingTopic').value.trim() || 'Консультация';
    const clientCode = getUserCode();

    const nameParts = clientFullName.split(' ');
    const shortClientName = getShortName(nameParts[0] || '', nameParts[1] || '');
    const shortPsyName = getShortName(currentPsy.firstName, currentPsy.middleName);

    const bookingId = 's-' + Date.now();

    const booking = {
        id: bookingId,
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        psychologistName: currentPsy.firstName + ' ' + currentPsy.middleName,
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        date: bookedDateStr,
        hour: bookedHour,
        topic: topic,
        price: currentPsy.price,
        status: 'confirmed',
        createdAt: Date.now(),
        remind24Sent: false,
        remind1Sent: false
    };

    // Сессия клиенту
    const clientSessions = readSessions(getSessionsKeyFor(clientUserId));
    clientSessions.push(booking);
    writeSessions(getSessionsKeyFor(clientUserId), clientSessions);

    // Сессия психологу
    const psySessions = readSessions(getSessionsKeyFor(psyUserId));
    psySessions.push({
        id: bookingId,
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        date: booking.date,
        hour: booking.hour,
        topic: topic,
        price: booking.price,
        status: 'confirmed',
        createdAt: booking.createdAt,
        remind24Sent: false,
        remind1Sent: false
    });
    writeSessions(getSessionsKeyFor(psyUserId), psySessions);

    // Календарь психолога: убираем free, добавляем session
    psyEvents = psyEvents.filter(function (e) {
        if (e.category !== 'free') return true;
        return !(e.date === bookedDateStr && e.hour === bookedHour);
    });
    psyEvents.push({
        id: 'sess-' + bookingId,
        title: 'Сессия: ' + shortClientName,
        date: bookedDateStr,
        hour: bookedHour,
        category: 'session',
        clientId: clientUserId,
        clientCode: clientCode,
        clientName: clientFullName,
        sessionId: bookingId
    });
    localStorage.setItem(psyEventsKey, JSON.stringify(psyEvents));

    // Календарь клиента: добавляем session
    addEventForUser(clientUserId, {
        title: 'Сессия: ' + shortPsyName,
        date: booking.date,
        hour: booking.hour,
        category: 'session',
        psychologistId: currentPsy.id,
        psychologistUserId: psyUserId,
        psychologistName: currentPsy.firstName + ' ' + currentPsy.middleName,
        sessionId: bookingId
    });

    closeBookingModal();
    currentSlot = null;
    renderSlots();

    // === УВЕДОМЛЕНИЯ ===
    var dateTimeLabel = formatHumanDate(bookedDate) + ' в ' + String(bookedHour).padStart(2, '0') + ':00';
    var priceLabel = currentPsy.price.toLocaleString('ru-RU') + ' ₽';
    var psyName = currentPsy.firstName + ' ' + currentPsy.middleName;

    try {
        var clientNotifKey = 'psyhelp_notifications_' + clientUserId;
        var clientNotifList = JSON.parse(localStorage.getItem(clientNotifKey)) || [];
        if (!Array.isArray(clientNotifList)) clientNotifList = [];
        clientNotifList.unshift({
            id: 'notif-' + Date.now() + '-book-client',
            type: 'session_booked',
            title: 'Сессия подтверждена',
            text: psyName + ' — ' + dateTimeLabel + '. Стоимость: ' + priceLabel + '. ' +
                  'Правила отмены: ≥48 ч — возврат 100%, 24–48 ч — 50%, <24 ч — без возврата.',
            link: 'client.html?section=sessions&highlight=' + encodeURIComponent(bookingId),
            createdAt: Date.now(),
            isRead: false
        });
        localStorage.setItem(clientNotifKey, JSON.stringify(clientNotifList));
    } catch (e) {}

    if (psyUserId !== clientUserId) {
        try {
            var psyNotifKey = 'psyhelp_notifications_' + psyUserId;
            var psyNotifList = JSON.parse(localStorage.getItem(psyNotifKey)) || [];
            if (!Array.isArray(psyNotifList)) psyNotifList = [];
            psyNotifList.unshift({
                id: 'notif-' + Date.now() + '-book-psy',
                type: 'session_booked',
                title: 'Новая сессия',
                text: clientFullName + ' записался на ' + dateTimeLabel + '. Тема: ' + topic + '.',
                link: 'dashboard.html?section=sessions&highlight=' + encodeURIComponent(bookingId),
                createdAt: Date.now(),
                isRead: false
            });
            localStorage.setItem(psyNotifKey, JSON.stringify(psyNotifList));
        } catch (e) {}
    }

    alert('✓ Запись подтверждена!\n\n' +
          'Психолог: ' + booking.psychologistName + '\n' +
          'Дата: ' + formatHumanDate(bookedDate) + '\n' +
          'Время: ' + String(bookedHour).padStart(2, '0') + ':00\n' +
          'Стоимость: ' + currentPsy.price.toLocaleString('ru-RU') + ' ₽\n\n' +
          'Сессия добавлена в ваш планировщик и в раздел «Мои сессии».');
}

// ============================================
// Хранилище
// ============================================

function readSessions(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
        const p = JSON.parse(data);
        return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
}

function writeSessions(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

function addEventForUser(userId, event) {
    const key = getEventsKeyFor(userId);
    console.log('[addEventForUser] ПОПЫТКА. key =', key, '| userId =', userId);

    let events = [];
    try {
        const data = localStorage.getItem(key);
        if (data) {
            const p = JSON.parse(data);
            events = Array.isArray(p) ? p : [];
        }
    } catch (e) {
        console.error('[addEventForUser] Ошибка чтения:', e);
        events = [];
    }

    console.log('[addEventForUser] Событий было:', events.length);

    event.id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
    events.push(event);

    try {
        localStorage.setItem(key, JSON.stringify(events));
        console.log('[addEventForUser] ✅ СОХРАНЕНО. Стало:', events.length);
    } catch (e) {
        console.error('[addEventForUser] ❌ ОШИБКА СОХРАНЕНИЯ:', e.name, e.message);
        alert('Ошибка сохранения события: ' + e.name + '\n\n' + e.message);
    }
}

// ============================================
// Утилиты
// ============================================

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function formatHumanDate(date) {
    return date.getDate() + ' ' + MONTHS_RU[date.getMonth()] + ' ' + date.getFullYear();
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    renderProfile();

    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmBooking);

    const cancelBtn = document.getElementById('cancelBookingBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeBookingModal);

    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.id === 'bookingModalOverlay') closeBookingModal();
        });
    }
});