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

// Генератор кода (2 буквы + 4 цифры)
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

// Если у пользователя есть имя, но нет id — генерируем
function ensureUserRoles() {
    const user = getUser();

    // Если пользователя вообще нет — выходим
    if (!user.firstName && !user.email) {
        console.log('[user-menu] psyhelp_user пуст или неполный');
        return user;
    }

    let changed = false;

    // Генерируем id, если нет
    if (!user.id) {
        user.id = generateUserId();
        changed = true;
        console.log('[user-menu] сгенерирован id:', user.id);
    }

    // Генерируем code, если нет
    if (!user.code) {
        user.code = generateUserCode();
        changed = true;
        console.log('[user-menu] сгенерирован code:', user.code);
    }

    // Добавляем роли
    if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = ['client', 'psychologist'];
        changed = true;
    }

    if (!user.activeRole) {
        user.activeRole = window.CURRENT_USER || 'client';
        changed = true;
    }

    if (changed) saveUser(user);
    return user;
}

function getInitials(user) {
    const f = (user.firstName || '').charAt(0).toUpperCase();
    const m = (user.middleName || '').charAt(0).toUpperCase();
    if (f && m) return f + m;
    if (f) return f;
    return '?';
}

function getShortName(user) {
    const f = (user.firstName || '').trim();
    const m = (user.middleName || '').trim();
    if (f && m) {
        return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() + ' ' +
               m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    }
    if (f) return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
    return 'Пользователь';
}

function escapeHtmlUser(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Отрисовка меню
// ============================================

function renderUserMenu() {
    console.log('[user-menu] renderUserMenu запущен, CURRENT_USER =', window.CURRENT_USER);

    const actionsEl = document.querySelector('.topbar-actions');
    if (!actionsEl) {
        console.error('[user-menu] .topbar-actions НЕ НАЙДЕН');
        return;
    }
    console.log('[user-menu] topbar-actions найден');

    const user = ensureUserRoles();
    if (!user.id) {
        console.log('[user-menu] нет пользователя — меню не строим');
        return;
    }
    console.log('[user-menu] user готов:', user.firstName, user.code);

    const initials = getInitials(user);
    const shortName = getShortName(user);
    const code = user.code || '—';
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const currentRole = window.CURRENT_USER || 'client';

    let roleItemsHtml = '';

    if (roles.indexOf('client') !== -1) {
        const isActive = currentRole === 'client';
        roleItemsHtml +=
            '<a href="client.html?section=catalog" class="user-menu-item' + (isActive ? ' active' : '') + '">' +
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
            '<a href="dashboard.html?section=calendar" class="user-menu-item' + (isActive ? ' active' : '') + '">' +
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
                '<div class="user-avatar">' + initials + '</div>' +
                '<svg class="user-menu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                    '<polyline points="6 9 12 15 18 9"></polyline>' +
                '</svg>' +
            '</button>' +
            '<div class="user-menu-dropdown" id="userMenuDropdown">' +

                '<div class="user-menu-info">' +
                    '<div class="user-avatar">' + initials + '</div>' +
                    '<div class="user-menu-info-text">' +
                        '<div class="user-menu-name">' + escapeHtmlUser(shortName) + '</div>' +
                        '<div class="user-menu-code">' + escapeHtmlUser(code) + '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="user-menu-divider"></div>' +

                '<div class="user-menu-section-title">Переключить кабинет</div>' +
                roleItemsHtml +

                '<div class="user-menu-divider"></div>' +

                '<a href="' + settingsHref + '" class="user-menu-item">' +
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