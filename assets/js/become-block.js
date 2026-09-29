// ============================================
// БЛОК «СТАТЬ ПСИХОЛОГОМ» В ПРОФИЛЕ КЛИЕНТА (Supabase)
// ============================================

console.log('[become-block.js] loaded');

(function () {
    'use strict';

    var cachedApp = null;
    var loaded = false;

    function getUser() {
        try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    async function waitForSupa(maxAttempts) {
        return new Promise(function (resolve) {
            var attempts = 0;
            var timer = setInterval(function () {
                attempts++;
                if (window.supa) { clearInterval(timer); resolve(true); }
                else if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
            }, 100);
        });
    }

    async function loadActiveApp() {
        var user = getUser();
        if (!user.id || !window.supa) return null;

        try {
            var result = await window.supa
                .from('applications')
                .select('status, moderator_comment, specialty, experience, price, created_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (result.error) {
                console.error('[become-block] ошибка загрузки:', result.error);
                return null;
            }
            return result.data || null;
        } catch (err) {
            console.error('[become-block] исключение:', err);
            return null;
        }
    }

    function bind() {
        var block = document.getElementById('becomePsychologistBlock');
        if (!block) return;
        var btn = block.querySelector('[data-become-go]');
        if (btn) {
            btn.onclick = function () { window.location.href = 'become-psychologist.html'; };
        }
    }

    function render() {
        var block = document.getElementById('becomePsychologistBlock');
        if (!block) return;

        var user = getUser();
        var roles = Array.isArray(user.roles) ? user.roles : [];

        // Уже психолог — блок скрыт
        if (roles.indexOf('psychologist') !== -1) {
            block.style.display = 'none';
            return;
        }

        block.style.display = '';

        // Заявки нет
        if (!loaded || !cachedApp) {
            block.innerHTML =
                '<div class="become-psy-content">' +
                    '<h3>Хотите помогать другим?</h3>' +
                    '<p>Подайте заявку на роль психолога. Мы проверим данные и проведём собеседование.</p>' +
                    '<button type="button" class="btn-become-psy" data-become-go="1">Стать психологом →</button>' +
                '</div>';
            bind();
            return;
        }

        var status = cachedApp.status;

        if (status === 'pending') {
            block.innerHTML =
                '<div class="become-psy-content">' +
                    '<h3>⏳ Заявка на проверке</h3>' +
                    '<p>Мы проверяем данные. Это занимает 1–3 рабочих дня.</p>' +
                    '<button type="button" class="btn-become-psy" data-become-go="1">Подробнее →</button>' +
                '</div>';
        } else if (status === 'attention') {
            block.innerHTML =
                '<div class="become-psy-content">' +
                    '<h3>⚠️ Требует внимания</h3>' +
                    (cachedApp.moderator_comment
                        ? '<div class="become-reason">' + escapeHtml(cachedApp.moderator_comment) + '</div>'
                        : '<p>Посмотрите комментарий модератора.</p>') +
                    '<button type="button" class="btn-become-psy" data-become-go="1">Подробнее →</button>' +
                '</div>';
        } else if (status === 'rejected') {
            block.innerHTML =
                '<div class="become-psy-content">' +
                    '<h3>❌ Заявка отклонена</h3>' +
                    (cachedApp.moderator_comment
                        ? '<div class="become-reason">' + escapeHtml(cachedApp.moderator_comment) + '</div>'
                        : '<p>Посмотрите комментарий модератора.</p>') +
                    '<button type="button" class="btn-become-psy" data-become-go="1">Подробнее →</button>' +
                '</div>';
        } else if (status === 'approved') {
            block.innerHTML =
                '<div class="become-psy-content">' +
                    '<h3>✅ Заявка одобрена</h3>' +
                    '<p>Перезайдите в аккаунт, чтобы увидеть кабинет психолога.</p>' +
                '</div>';
        }

        bind();
    }

    async function boot() {
        var ready = await waitForSupa(50);
        if (ready) {
            cachedApp = await loadActiveApp();
            loaded = true;
        }
        render();

        // profile.js может перезаписать блок — вернём через 200 и 600 мс
        setTimeout(render, 200);
        setTimeout(render, 600);
        setInterval(render, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();