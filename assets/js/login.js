// ============================================
// Вход: валидация, отправка, редирект по ролям
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var togglePassword = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            var type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    function showError(fieldId, message) {
        var errorEl = document.getElementById(fieldId + 'Error');
        var inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) {
            var group = inputEl.closest('.form-group');
            if (group) group.classList.add('has-error');
        }
    }

    function clearError(fieldId) {
        var errorEl = document.getElementById(fieldId + 'Error');
        var inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = '';
        if (inputEl) {
            var group = inputEl.closest('.form-group');
            if (group) group.classList.remove('has-error');
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateForm() {
        var isValid = true;

        var email = document.getElementById('email').value.trim();
        if (!email) {
            showError('email', 'Введите email');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Неверный формат email');
            isValid = false;
        } else clearError('email');

        var password = document.getElementById('password').value;
        if (!password) {
            showError('password', 'Введите пароль');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Пароль должен быть минимум 8 символов');
            isValid = false;
        } else clearError('password');

        return isValid;
    }

    function getRedirectURL(user) {
        var roles = Array.isArray(user.roles) ? user.roles : [];

        if (roles.length === 0) {
            roles = ['client'];
            user.roles = roles;
            user.activeRole = 'client';
            localStorage.setItem('psyhelp_user', JSON.stringify(user));
        }

        if (roles.length === 1) {
            return roles[0] === 'psychologist'
                ? 'dashboard.html?section=calendar'
                : 'client.html?section=catalog';
        }

        var activeRole = user.activeRole || 'client';
        if (roles.indexOf(activeRole) === -1) activeRole = roles[0];

        return activeRole === 'psychologist'
            ? 'dashboard.html?section=calendar'
            : 'client.html?section=catalog';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Входим...';

        var email = document.getElementById('email').value.trim();

        setTimeout(function () {
            var user = {};
            try {
                var raw = localStorage.getItem('psyhelp_user');
                user = raw ? JSON.parse(raw) : {};
            } catch (err) { user = {}; }

            // Если аккаунта нет — отправляем на регистрацию
            if (!user.id || !user.email) {
                messageEl.className = 'form-message error';
                messageEl.textContent = 'Аккаунт не найден. Сейчас перенаправим на регистрацию...';

                setTimeout(function () {
                    window.location.href = 'register.html';
                }, 2000);
                return;
            }

            // Если email не совпадает — ошибка
            if (user.email.toLowerCase() !== email.toLowerCase()) {
                messageEl.className = 'form-message error';
                messageEl.textContent = 'Аккаунт с таким email не найден. Проверьте адрес или зарегистрируйтесь.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти';
                return;
            }

            messageEl.className = 'form-message success';
            messageEl.textContent = '✓ Вход выполнен. Перенаправляем...';

            var redirectURL = getRedirectURL(user);
            console.log('[login] роли:', user.roles, '→ редирект в:', redirectURL);

            setTimeout(function () {
                window.location.href = redirectURL;
            }, 1200);
        }, 800);
    });
});