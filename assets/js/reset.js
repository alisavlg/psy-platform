// ============================================
// Восстановление пароля: сброс
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('resetForm');
    if (!form) return;

    var passwordInput = document.getElementById('password');
    var passwordInput2 = document.getElementById('password2');
    var togglePassword = document.getElementById('togglePassword');
    var togglePassword2 = document.getElementById('togglePassword2');
    var strengthBar = document.getElementById('passwordStrength');

    // === 1. Показать/скрыть пароли ===
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            var type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    if (togglePassword2 && passwordInput2) {
        togglePassword2.addEventListener('click', function () {
            var type = passwordInput2.type === 'password' ? 'text' : 'password';
            passwordInput2.type = type;
            togglePassword2.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    // === 2. Индикатор надёжности ===
    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', function () {
            var val = passwordInput.value;

            strengthBar.classList.remove('weak', 'medium', 'strong');

            if (val.length === 0) return;

            var hasLatin = /[a-zA-Z]/.test(val);
            var hasDigits = /\d/.test(val);
            var hasSymbols = /[^a-zA-Z0-9]/.test(val);
            var hasCyrillic = /[а-яА-ЯёЁ]/.test(val);
            var isLong = val.length >= 8;

            if (hasCyrillic) {
                strengthBar.classList.add('weak');
                return;
            }

            if (isLong && hasLatin && hasDigits && hasSymbols) {
                strengthBar.classList.add('strong');
            } else if (isLong && hasLatin && hasDigits) {
                strengthBar.classList.add('medium');
            } else {
                strengthBar.classList.add('weak');
            }
        });
    }

    // === 3. Вспомогательные функции ===
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

    // === 4. Валидация ===
    function validateForm() {
        var isValid = true;

        var password = passwordInput.value;
        var password2 = passwordInput2.value;

        // Первый пароль
        if (!password) {
            showError('password', 'Введите пароль');
            isValid = false;
        } else if (/[а-яА-ЯёЁ]/.test(password)) {
            showError('password', 'Пароль должен содержать только латинские буквы, цифры и символы');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Пароль должен быть минимум 8 символов');
            isValid = false;
        } else if (!/[a-zA-Z]/.test(password)) {
            showError('password', 'Пароль должен содержать хотя бы одну латинскую букву');
            isValid = false;
        } else if (!/\d/.test(password)) {
            showError('password', 'Пароль должен содержать хотя бы одну цифру');
            isValid = false;
        } else {
            clearError('password');
        }

        // Второй пароль
        if (!password2) {
            showError('password2', 'Повторите пароль');
            isValid = false;
        } else if (password2 !== password) {
            showError('password2', 'Пароли не совпадают');
            isValid = false;
        } else {
            clearError('password2');
        }

        return isValid;
    }

    // === 5. Отправка ===
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохраняем...';

        // Получаем токен из URL (позже будем проверять на сервере)
        var params = new URLSearchParams(window.location.search);
        var token = params.get('token');

        console.log('Сброс пароля, токен:', token);

        // Имитация сброса
        setTimeout(function () {
            messageEl.className = 'form-message success';
            messageEl.textContent = '✓ Пароль успешно изменён! Перенаправляем на страницу входа...';

            setTimeout(function () {
                window.location.href = 'login.html';
            }, 2000);
        }, 1500);
    });
});