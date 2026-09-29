// ============================================
// AUTH GUARD — проверка сессии Supabase
// Подключается ТОЛЬКО на защищённых страницах:
// client.html, dashboard.html, admin.html
// ============================================

console.log('[auth-guard.js] запуск проверки сессии');

(function () {
    'use strict';

    function waitForSupa(maxAttempts) {
        return new Promise(function (resolve) {
            var attempts = 0;
            var timer = setInterval(function () {
                attempts++;
                if (window.supa) {
                    clearInterval(timer);
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 100);
        });
    }

    async function restoreUserFromSupabase(authUser) {
        console.log('[auth-guard] восстанавливаем psyhelp_user из профиля');

        var profileResult = await window.supa
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (profileResult.error || !profileResult.data) {
            console.error('[auth-guard] профиль не найден:', profileResult.error);
            return null;
        }

        var p = profileResult.data;
        var userData = {
            id: authUser.id,
            code: p.code || '',
            email: authUser.email,
            realFirstName: p.real_first_name || '',
            realMiddleName: p.real_middle_name || '',
            realLastName: p.real_last_name || '',
            displayFirstName: p.display_first_name || '',
            displayMiddleName: p.display_middle_name || '',
            phone: p.phone || '',
            timezone: p.timezone || 'Europe/Moscow',
            avatarUrl: p.avatar_url || '',
            roles: Array.isArray(p.roles) ? p.roles : ['client'],
            activeRole: (Array.isArray(p.roles) && p.roles.indexOf('psychologist') !== -1) ? 'psychologist' : 'client',
            psychologistStatus: p.psychologist_status || 'none',
            isVerified: false,
            registeredAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            passwordChangedAt: Date.now()
        };
        localStorage.setItem('psyhelp_user', JSON.stringify(userData));
        return userData;
    }

    // Проверка роли для admin.html
    function checkAdminAccess() {
        var page = window.location.pathname.split('/').pop();
        if (page !== 'admin.html') return true;

        var userRaw = localStorage.getItem('psyhelp_user');
        var userData = null;
        try { userData = userRaw ? JSON.parse(userRaw) : null; } catch (e) {}

        var roles = (userData && Array.isArray(userData.roles)) ? userData.roles : [];
        var hasAccess = roles.indexOf('owner') !== -1
                     || roles.indexOf('moderator') !== -1
                     || roles.indexOf('admin') !== -1;

        if (!hasAccess) {
            console.warn('[auth-guard] нет доступа к админке → client.html');
            window.location.href = 'client.html?section=catalog';
            return false;
        }
        return true;
    }

    async function checkAuth() {
        var ready = await waitForSupa(50);

        if (!ready) {
            console.error('[auth-guard] Supabase не загрузился за 5 секунд');
            return;
        }

        try {
            var sessionResult = await window.supa.auth.getSession();

            if (sessionResult.error) {
                console.error('[auth-guard] ошибка getSession:', sessionResult.error);
                window.location.href = 'login.html';
                return;
            }

            var session = sessionResult.data.session;

            if (!session || !session.user) {
                console.warn('[auth-guard] сессии нет → редирект на login.html');
                window.location.href = 'login.html';
                return;
            }

            // Сессия есть. Проверим, что psyhelp_user в localStorage соответствует
            var currentUserRaw = localStorage.getItem('psyhelp_user');
            var currentUser = null;
            try {
                currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
            } catch (e) { currentUser = null; }

            if (!currentUser || currentUser.id !== session.user.id) {
                console.log('[auth-guard] psyhelp_user не соответствует сессии, восстанавливаем');
                await restoreUserFromSupabase(session.user);
            } else {
                console.log('[auth-guard] сессия валидна:', session.user.email);
            }

            // Проверка роли для админки — после того, как psyhelp_user точно актуален
            checkAdminAccess();

        } catch (err) {
            console.error('[auth-guard] исключение:', err);
            window.location.href = 'login.html';
        }
    }

    checkAuth();
})();