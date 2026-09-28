// ============================================
// ПРОФИЛЬ ПСИХОЛОГА + БРОНИРОВАНИЕ + ОТЗЫВЫ (Supabase)
// ============================================

console.log('[psychologist.js] loaded');

window.CURRENT_USER = window.CURRENT_USER || 'client';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

let currentPsy = null;
let currentSlot = null;
let currentFilterDays = 7;
let currentReviewRating = 0;
let cachedReviews = [];

// ============================================
// Supabase helper
// ============================================

async function waitForSupaPsy(maxAttempts) {
    return new Promise(function (resolve) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (window.supa) { clearInterval(timer); resolve(true); }
            else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
        }, 100);
    });
}

function normalizePsychologist(row) {
    return {
        id: row.id,
        userId: row.user_id || null,
        firstName: row.first_name || '',
        middleName: row.middle_name || '',
        specialty: row.specialty || '',
        description: row.description || '',
        experience: row.experience || 0,
        price: row.price || 0,
        rating: Number(row.rating) || 0,
        reviewsCount: row.reviews_count || 0,
        isVerified: row.is_verified === true
    };
}

async function getPsychologistById(id) {
    if (!window.supa) return null;
    try {
        var result = await window.supa
            .from('psychologist_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (result.error || !result.data) {
            console.error('[psychologist] не найден:', result.error);
            return null;
        }

        return normalizePsychologist(result.data);
    } catch (err) {
        console.error('[psychologist] исключение:', err);
        return null;
    }
}

// ============================================
// Пользователь
// ============================================

function getCurrentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || null;
    } catch (e) { return null; }
}

function getPsychologistUserId(psy) {
    if (!psy) return null;
    if (psy.userId) return psy.userId;
    return psy.id;
}

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

// ============================================
// Слоты — из Supabase
// ============================================

async function getSlotsFor(psy) {
    if (!window.supa || !psy) return {};

    try {
        var result = await window.supa
            .from('events')
            .select('date, hour, category')
            .eq('psychologist_id', psy.id);

        if (result.error) {
            console.error('[psychologist] ошибка загрузки слотов:', result.error);
            return {};
        }

        var busy = {};
        var free = {};
        (result.data || []).forEach(function (e) {
            var k = e.date + '-' + e.hour;
            if (e.category === 'session') busy[k] = true;
            else if (e.category === 'free') free[k] = true;
        });

        var freeKeys = {};
        Object.keys(free).forEach(function (k) {
            if (!busy[k]) freeKeys[k] = true;
        });
        return freeKeys;

    } catch (err) {
        console.error('[psychologist] исключение:', err);
        return {};
    }
}

// ============================================
// ОТЗЫВЫ — из Supabase
// ============================================

async function loadReviewsFor(psyId) {
    if (!window.supa || !psyId) return [];

    try {
        var result = await window.supa
            .from('reviews')
            .select('*')
            .eq('psychologist_id', psyId)
            .order('created_at', { ascending: false });

        if (result.error) {
            console.error('[reviews] ошибка загрузки:', result.error);
            return [];
        }

        return result.data || [];
    } catch (err) {
        console.error('[reviews] исключение:', err);
        return [];
    }
}

function hasReviewedLocal(userId) {
    if (!userId) return false;
    return cachedReviews.some(function (r) { return r.author_id === userId; });
}

async function findCompletedSessionId(psyId, userId) {
    if (!window.supa || !psyId || !userId) return null;

    try {
        var result = await window.supa
            .from('sessions')
            .select('id, date, hour')
            .eq('client_id', userId)
            .eq('psychologist_id', psyId)
            .eq('status', 'confirmed');

        if (result.error || !result.data) return null;

        var now = new Date();

        for (var i = 0; i < result.data.length; i++) {
            var s = result.data[i];
            var parts = s.date.split('-');
            var sessionDate = new Date(
                parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
                s.hour, 0, 0
            );
            // Сессия прошла, если с момента начала прошёл час
            if (sessionDate.getTime() + 3600000 < now.getTime()) {
                return s.id;
            }
        }

        return null;
    } catch (err) {
        return null;
    }
}

async function submitReviewToSupabase(data) {
    if (!window.supa) return { success: false, error: 'Supabase не загружен' };

    try {
        var result = await window.supa.from('reviews').insert({
            psychologist_id: data.psychologist_id,
            author_id: data.author_id,
            session_id: data.session_id,
            author_name: data.author_name,
            rating: data.rating,
            text: data.text
        });

        if (result.error) {
            console.error('[reviews] insert error:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[reviews] exception:', err);
        return { success: false, error: err.message || 'Ошибка' };
    }
}

function renderReviewsSection() {
    var html = '<div class="psy-profile-section psy-reviews-section">' +
        '<h3>Отзывы ' + (cachedReviews.length > 0 ? '(' + cachedReviews.length + ')' : '') + '</h3>';

    if (cachedReviews.length === 0) {
        html += '<p class="reviews-empty">Пока отзывов нет. ' +
                'Оставьте свой, если уже работали с этим специалистом.</p>';
    } else {
        html += '<div class="reviews-list">';
        cachedReviews.forEach(function (r) {
            var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            var dateStr = formatReviewDate(new Date(r.created_at).getTime());

            html += '<div class="review-item">' +
                '<div class="review-header">' +
                    '<div class="review-author">' + escapeHtml(r.author_name || 'Клиент') + '</div>' +
                    '<div class="review-date">' + dateStr + '</div>' +
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

async function renderProfile() {
    const container = document.getElementById('psychologistProfile');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const psyId = params.get('id');

    if (!psyId) {
        container.innerHTML = '<div class="placeholder"><p>Психолог не указан</p></div>';
        return;
    }

    container.innerHTML = '<div class="placeholder"><p>Загрузка...</p></div>';

    currentPsy = await getPsychologistById(psyId);

    if (!currentPsy) {
        container.innerHTML = '<div class="placeholder"><p>Психолог не найден</p></div>';
        return;
    }

    // Загружаем отзывы
    cachedReviews = await loadReviewsFor(currentPsy.id);

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

            if (clientUserId && clientUserId === psyUserId) {
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

    await renderSlots();
}

// ============================================
// Модалка отзыва
// ============================================

async function openReviewModal() {
    if (!currentPsy) return;

    var userId = getCurrentUserId();

    if (!userId) {
        alert('Войдите в аккаунт, чтобы оставить отзыв.');
        return;
    }

    var psyUserId = getPsychologistUserId(currentPsy);
    if (userId === psyUserId) {
        alert('Нельзя оставить отзыв самому себе.');
        return;
    }

    if (hasReviewedLocal(userId)) {
        alert('Вы уже оставили отзыв этому психологу.\n\nОдин клиент — один отзыв.');
        return;
    }

    var sessionId = await findCompletedSessionId(currentPsy.id, userId);
    if (!sessionId) {
        alert('Отзыв можно оставить после проведённой сессии с этим психологом.');
        return;
    }

    currentReviewRating = 0;
    window.__reviewSessionId = sessionId;

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

async function submitReview() {
    if (!currentPsy) return;

    if (!currentReviewRating || currentReviewRating < 1) {
        var errEl = document.getElementById('reviewRatingError');
        if (errEl) errEl.textContent = 'Поставьте оценку';
        return;
    }

    var userId = getCurrentUserId();
    if (!userId) {
        alert('Войдите в аккаунт.');
        return;
    }

    var authorName = getPrefilledClientName() || 'Клиент';
    var textEl = document.getElementById('reviewText');
    var text = textEl ? textEl.value.trim() : '';

    var submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';
    }

    var result = await submitReviewToSupabase({
        psychologist_id: currentPsy.id,
        author_id: userId,
        session_id: window.__reviewSessionId || null,
        author_name: authorName,
        rating: currentReviewRating,
        text: text
    });

    if (!result.success) {
        alert('Ошибка: ' + result.error);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
        return;
    }

    // Перезагружаем отзывы и профиль (рейтинг тоже обновился триггером)
    closeReviewModal();
    await renderProfile();
    alert('✓ Спасибо за отзыв!');
}

// ============================================
// Отрисовка слотов
// ============================================

async function renderSlots() {
    const grid = document.getElementById('psySlotsGrid');
    if (!grid || !currentPsy) return;

    grid.innerHTML = '<div class="slots-empty">Загрузка слотов...</div>';

    const slots = await getSlotsFor(currentPsy);

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

async function confirmBooking() {
    if (!currentSlot || !currentPsy) return;

    const clientUserId = getCurrentUserId();
    const psyUserId = getPsychologistUserId(currentPsy);

    if (!clientUserId) {
        alert('Вы не авторизованы. Войдите заново.');
        return;
    }

    if (clientUserId === psyUserId) {
        alert('Нельзя записаться к самому себе.\n\nВыберите другого психолога в каталоге.');
        closeBookingModal();
        return;
    }

    const bookedDate = new Date(currentSlot.date);
    const bookedHour = currentSlot.hour;
    const bookedDateStr = formatDateKey(bookedDate);

    // Проверка: у клиента нет события на это время
    try {
        var clientEventsResult = await window.supa
            .from('events')
            .select('id, category, title')
            .eq('owner_id', clientUserId)
            .eq('date', bookedDateStr)
            .eq('hour', bookedHour);

        if (clientEventsResult.error) {
            console.error('[booking] check client events error:', clientEventsResult.error);
        } else if (clientEventsResult.data && clientEventsResult.data.length > 0) {
            var ev = clientEventsResult.data[0];
            var what = ev.category === 'free'
                ? 'У вас открыт слот для клиентов на это время.'
                : 'У вас уже есть событие в планировщике на это время.';

            alert(what + '\n\n' +
                  'Одно время — одно событие.\n' +
                  'Сначала снимите свой слот или выберите другое время.');
            return;
        }
    } catch (err) {
        console.error('[booking] exception check client:', err);
    }

    const agreeEl = document.getElementById('agreeCancelRules');
    const agreeErrEl = document.getElementById('agreeCancelRulesError');
    if (!agreeEl || !agreeEl.checked) {
        if (agreeErrEl) agreeErrEl.textContent = 'Подтвердите согласие с правилами отмены';
        return;
    } else if (agreeErrEl) {
        agreeErrEl.textContent = '';
    }

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

    // Атомарно удаляем free-слот
    try {
        var delResult = await window.supa
            .from('events')
            .delete()
            .eq('psychologist_id', currentPsy.id)
            .eq('date', bookedDateStr)
            .eq('hour', bookedHour)
            .eq('category', 'free')
            .select();

        if (delResult.error) {
            console.error('[booking] delete free error:', delResult.error);
            alert('Ошибка бронирования. Попробуйте ещё раз.');
            return;
        }

        if (!delResult.data || delResult.data.length === 0) {
            alert('Этот слот уже занят. Выберите другой.');
            closeBookingModal();
            await renderSlots();
            return;
        }
    } catch (err) {
        console.error('[booking] exception delete:', err);
        alert('Ошибка бронирования: ' + (err.message || 'попробуйте ещё раз'));
        return;
    }

    // Создаём запись в sessions
    try {
        var sessionResult = await window.supa.from('sessions').insert({
            id: bookingId,
            client_id: clientUserId,
            psychologist_id: currentPsy.id,
            psychologist_name: currentPsy.firstName + ' ' + currentPsy.middleName,
            client_code: clientCode,
            client_name: clientFullName,
            date: bookedDateStr,
            hour: bookedHour,
            topic: topic,
            price: currentPsy.price,
            status: 'confirmed'
        });

        if (sessionResult.error) {
            console.error('[booking] insert session error:', sessionResult.error);
            alert('Слот освобождён, но сессия не сохранилась. Обратитесь в поддержку.');
            return;
        }
    } catch (err) {
        console.error('[booking] exception session:', err);
        alert('Ошибка сохранения сессии: ' + (err.message || 'попробуйте ещё раз'));
        return;
    }

    // Событие в календаре психолога (только если у него есть реальный аккаунт)
    if (currentPsy.userId) {
        try {
            await window.supa.from('events').insert({
                owner_id: currentPsy.userId,
                psychologist_id: currentPsy.id,
                title: 'Сессия: ' + shortClientName,
                date: bookedDateStr,
                hour: bookedHour,
                category: 'session',
                session_id: bookingId,
                client_id: clientUserId,
                client_code: clientCode,
                client_name: clientFullName
            });
        } catch (err) {
            console.warn('[booking] psy event error:', err);
        }
    }

    // Событие в календаре клиента
    try {
        await window.supa.from('events').insert({
            owner_id: clientUserId,
            psychologist_id: currentPsy.id,
            title: 'Сессия: ' + shortPsyName,
            date: bookedDateStr,
            hour: bookedHour,
            category: 'session',
            session_id: bookingId,
            psychologist_name: currentPsy.firstName + ' ' + currentPsy.middleName
        });
    } catch (err) {
        console.warn('[booking] client event error:', err);
    }

    // Уведомления (localStorage — пока)
    try {
        var dateTimeLabel = formatHumanDate(bookedDate) + ' в ' + String(bookedHour).padStart(2, '0') + ':00';
        var priceLabel = currentPsy.price.toLocaleString('ru-RU') + ' ₽';
        var psyName = currentPsy.firstName + ' ' + currentPsy.middleName;

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

    if (psyUserId && psyUserId !== clientUserId) {
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

    closeBookingModal();
    currentSlot = null;
    await renderSlots();

    alert('✓ Запись подтверждена!\n\n' +
          'Психолог: ' + currentPsy.firstName + ' ' + currentPsy.middleName + '\n' +
          'Дата: ' + formatHumanDate(bookedDate) + '\n' +
          'Время: ' + String(bookedHour).padStart(2, '0') + ':00\n' +
          'Стоимость: ' + currentPsy.price.toLocaleString('ru-RU') + ' ₽\n\n' +
          'Сессия добавлена в ваш планировщик и в раздел «Мои сессии».');
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

document.addEventListener('DOMContentLoaded', async function () {
    await waitForSupaPsy(50);

    await renderProfile();

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