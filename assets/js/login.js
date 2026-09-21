// ============================================
// Вход: валидация и отправка
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('loginForm');
    if (!form) return;

    // === 1. Показать/скрыть пароль ===
    var togglePassword = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            var type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    // === 2. Вспомогательные функции ===
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

    // === 3. Валидация ===
    function validateForm() {
        var isValid = true;

        // Email
        var email = document.getElementById('email').value.trim();
        if (!email) {
            showError('email', 'Введите email');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Неверный формат email');
            isValid = false;
        } else {
            clearError('email');
        }

        // Пароль
        var password = document.getElementById('password').value;
        if (!password) {
            showError('password', 'Введите пароль');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Пароль должен быть минимум 8 символов');
            isValid = false;
        } else {
            clearError('password');
        }

        return isValid;
    }

    // === 4. Отправка ===
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Входим...';

        var data = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        console.log('Отправка данных:', data);

        // Имитация входа
        setTimeout(function () {
            messageEl.className = 'form-message success';
            messageEl.textContent = '✓ Вход выполнен. Перенаправляем...';

            // Через 1.5 секунды — в личный кабинет
            setTimeout(function () {
                window.location.href = 'dashboard.html?section=calendar';
            }, 1500);
        }, 1200);
    });
});