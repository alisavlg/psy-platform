// ============================================
// МЕНЮ ПОЛЬЗОВАТЕЛЯ — переключатель ролей
// ============================================

console.log('[user-menu.js] loaded');

const USER_MENU_KEY = 'psyhelp_user';

// ============================================
// Работа с пользователем
// ============================================

function getUser() {
    const data = localStorage.getItem(USER_MENU_KEY);
    if (!data) return {};
    try {
        const u = JSON.parse(data);
        return u || {};
    } catch (e) { return {}; }
}

function saveUser(user) {
    localStorage.setItem(USER_MENU_KEY, JSON.stringify(user));
}

function saveActiveRole(role) {
    const user = getUser();
    if (!user.id) return;
    user.activeRole = role;
    saveUser(user);
    console.log('[user-menu] activeRole сохранён:', role);
}

function generateUserCode() {
    const letters = 'ACDEFHJKMNPRTUVWXY';
    const digits = '23456789';
    let code = '';
    code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-';
    for (let i = 0; i < 4; i++) {
        code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
}

function generateUserId() {
    return 'u-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

// ============================================
// Миграция
// ============================================

function migrateUser(user) {
    let changed = false;

    if (user.firstName && !user.realFirstName) {
        user.realFirstName = user.firstName;
        user.realMiddleName = user.middleName || '';
        user.realLastName = user.lastName || '';
        delete user.firstName;
        delete user.middleName;
        delete user.lastName;
        changed = true;
    }

    if (!user.id) { user.id = generateUserId(); changed = true; }
    if (!user.code) { user.code = generateUserCode(); changed = true; }
    if (typeof user.displayFirstName !== 'string') { user.displayFirstName = ''; changed = true; }
    if (typeof user.displayMiddleName !== 'string') { user.displayMiddleName = ''; changed = true; }
    if (typeof user.avatarUrl !== 'string') { user.avatarUrl = ''; changed = true; }
    if (!user.psychologistStatus) { user.psychologistStatus = 'none'; changed = true; }
    if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = ['client'];
        changed = true;
    }
    if (!user.activeRole) { user.activeRole = 'client'; changed = true; }

    if (changed) saveUser(user);
    return user;
}

// ============================================
// Имя / инициалы
// ============================================

function getDisplayName(user) {
    var f = (user.displayFirstName || '').trim();
    var m = (user.displayMiddleName || '').trim();

    if (f && m) return f + ' ' + m;
    if (f) return f;

    var rf = (user.realFirstName || '').trim();
    var rm = (user.realMiddleName || '').trim();
    if (rf && rm) return rf + ' ' + rm;
    if (rf) return rf;

    return 'Пользователь';
}

function getInitials(user) {
    var f = (user.displayFirstName || user.realFirstName || '').charAt(0).toUpperCase();
    var m = (user.displayMiddleName || user.realMiddleName || '').charAt(0).toUpperCase();
    if (f && m) return f + m;
    if (f) return f;
    return '?';
}

function escapeHtmlUser(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Подгружаем аватар из Supabase
// ============================================

function getAvatarFromSupabase(user) {
    if (!user.id || !window.supa) return Promise.resolve('');

    var currentRole = window.CURRENT_USER || 'client';

    if (currentRole === 'psychologist') {
        return window.supa
            .from('psychologist_profiles')
            .select('avatar_url')
            .eq('user_id', user.id)
            .limit(1)
            .then(function (r) {
                if (r.data && r.data.length > 0 && r.data[0].avatar_url) {
                    return r.data[0].avatar_url;
                }
                return window.supa.from('profiles').select('avatar_url').eq('id', user.id).single()
                    .then(function (r2) {
                        return (r2.data && r2.data.avatar_url) || '';
                    });
            })
            .catch(function () { return ''; });
    } else {
        return window.supa
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()
            .then(function (r) {
                return (r.data && r.data.avatar_url) || '';
            })
            .catch(function () { return ''; });
    }
}

// Рисует аватар — фото или инициалы
function avatarInnerHtml(avatarUrl, initials) {
    if (avatarUrl) {
        return '<div class="user-avatar" style="background-image:url(' + avatarUrl + ');background-size:cover;background-position:center;"></div>';
    }
    return '<div class="user-avatar">' + initials + '</div>';
}

// ============================================
// Отрисовка меню
// ============================================

async function renderUserMenu() {
    console.log('[user-menu] renderUserMenu запущен, CURRENT_USER =', window.CURRENT_USER);

    const actionsEl = document.querySelector('.topbar-actions');
    if (!actionsEl) {
        console.error('[user-menu] .topbar-actions НЕ НАЙДЕН');
        return;
    }

    var user = getUser();
    if (!user.realFirstName && !user.email) {
        console.log('[user-menu] psyhelp_user пуст или неполный');
        return;
    }

    user = migrateUser(user);
    console.log('[user-menu] user готов:', user.realFirstName, user.code);

    const initials = getInitials(user);
    const displayName = getDisplayName(user);
    const code = user.code || '—';
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const currentRole = window.CURRENT_USER || 'client';

    // Подгружаем актуальный аватар из Supabase
    var avatarUrl = await getAvatarFromSupabase(user);
    if (avatarUrl) {
        user.avatarUrl = avatarUrl;
        saveUser(user);
    } else {
        avatarUrl = user.avatarUrl || '';
    }

    var avatarHtml = avatarInnerHtml(avatarUrl, initials);

    // Удаляем старое меню
    var oldMenu = document.getElementById('userMenu');
    if (oldMenu) oldMenu.remove();

    let roleItemsHtml = '';

    if (roles.indexOf('client') !== -1) {
        const isActive = currentRole === 'client';
        roleItemsHtml +=
            '<a href="client.html?section=catalog" class="user-menu-item' + (isActive ? ' active' : '') + '" data-role="client">' +
                '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
                    '<circle cx="12" cy="7" r="4"></circle>' +
                '</svg>' +
                'Кабинет клиента' +
            '</a>';
    }

    if (roles.indexOf('psychologist') !== -1) {
        const isActive = currentRole === 'psychologist';
        roleItemsHtml +=
            '<a href="dashboard.html?section=calendar" class="user-menu-item' + (isActive ? ' active' : '') + '" data-role="psychologist">' +
                '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
                    '<circle cx="12" cy="7" r="4"></circle>' +
                    '<polyline points="16 11 18 13 22 9"></polyline>' +
                '</svg>' +
                'Кабинет психолога' +
            '</a>';
    }

    const settingsHref = currentRole === 'psychologist'
        ? 'dashboard.html?section=settings'
        : 'client.html?section=profile';

    const menuHtml =
        '<div class="user-menu" id="userMenu">' +
            '<button class="user-menu-trigger" id="userMenuTrigger" type="button" aria-label="Меню пользователя">' +
                avatarHtml +
                '<svg class="user-menu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                    '<polyline points="6 9 12 15 18 9"></polyline>' +
                '</svg>' +
            '</button>' +
            '<div class="user-menu-dropdown" id="userMenuDropdown">' +

                '<div class="user-menu-info">' +
                    avatarHtml +
                    '<div class="user-menu-info-text">' +
                        '<div class="user-menu-name">' + escapeHtmlUser(displayName) + '</div>' +
                        '<div class="user-menu-code">' + escapeHtmlUser(code) + '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="user-menu-divider"></div>' +

                '<div class="user-menu-section-title">Переключить кабинет</div>' +
                roleItemsHtml +

                '<div class="user-menu-divider"></div>' +

                '<a href="' + settingsHref + '" class="user-menu-item" data-action="settings">' +
                    '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<circle cx="12" cy="12" r="3"></circle>' +
                        '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
                    '</svg>' +
                    'Настройки' +
                '</a>' +

                '<a href="#" class="user-menu-item user-menu-item-danger" id="logoutBtn">' +
                    '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
                        '<polyline points="16 17 21 12 16 7"></polyline>' +
                        '<line x1="21" y1="12" x2="9" y2="12"></line>' +
                    '</svg>' +
                    'Выйти' +
                '</a>' +

            '</div>' +
        '</div>';

    // Удаляем старый статичный аватар из topbar
    const oldAvatar = actionsEl.querySelector('.user-avatar');
    if (oldAvatar && !oldAvatar.closest('.user-menu')) {
        oldAvatar.remove();
    }

    actionsEl.insertAdjacentHTML('beforeend', menuHtml);
    console.log('[user-menu] меню добавлено');

    const menu = document.getElementById('userMenu');
    const trigger = document.getElementById('userMenuTrigger');
    const logoutBtn = document.getElementById('logoutBtn');

    if (trigger) {
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
    }

    document.addEventListener('click', function (e) {
        if (menu && !menu.contains(e.target)) {
            menu.classList.remove('open');
        }
    });

    document.querySelectorAll('.user-menu-item').forEach(function (link) {
        link.addEventListener('click', function () {
            var role = link.getAttribute('data-role');
            if (role) saveActiveRole(role);
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Выйти из аккаунта?')) {
                localStorage.removeItem('psyhelp_user');
                window.location.href = 'login.html';
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderUserMenu);
} else {
    renderUserMenu();
}