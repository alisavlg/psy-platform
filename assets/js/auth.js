// ============================================
// Регистрация: валидация и отправка
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('registerForm');
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

    // === 2. Индикатор надёжности пароля ===
    var strengthBar = document.getElementById('passwordStrength');

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

            // Если есть кириллица — всегда слабый
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

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePhone(phone) {
        var cleaned = phone.replace(/[\s\-\(\)]/g, '');
        return /^(\+7|8)\d{10}$/.test(cleaned);
    }

    // === 4. Валидация формы ===
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

        // Имя
        var firstName = document.getElementById('firstName').value.trim();
        if (!firstName || firstName.length < 2) {
            showError('firstName', 'Введите имя (минимум 2 символа)');
            isValid = false;
        } else {
            clearError('firstName');
        }

        // Отчество
        var middleName = document.getElementById('middleName').value.trim();
        if (!middleName || middleName.length < 2) {
            showError('middleName', 'Введите отчество (минимум 2 символа)');
            isValid = false;
        } else {
            clearError('middleName');
        }

        // Фамилия
        var lastName = document.getElementById('lastName').value.trim();
        if (!lastName || lastName.length < 2) {
            showError('lastName', 'Введите фамилию (минимум 2 символа)');
            isValid = false;
        } else {
            clearError('lastName');
        }

        // Телефон
        var phone = document.getElementById('phone').value.trim();
        if (!phone) {
            showError('phone', 'Введите телефон');
            isValid = false;
        } else if (!validatePhone(phone)) {
            showError('phone', 'Неверный формат телефона');
            isValid = false;
        } else {
            clearError('phone');
        }

        // Часовой пояс
        var timezone = document.getElementById('timezone').value;
        if (!timezone) {
            showError('timezone', 'Выберите часовой пояс');
            isValid = false;
        } else {
            clearError('timezone');
        }

        // Согласия
        var agreeTerms = document.getElementById('agreeTerms').checked;
        var agreePolicy = document.getElementById('agreePolicy').checked;
        var agreeError = document.getElementById('agreeError');

        if (!agreeTerms || !agreePolicy) {
            if (agreeError) agreeError.textContent = 'Необходимо согласиться со всеми условиями';
            isValid = false;
        } else {
            if (agreeError) agreeError.textContent = '';
        }

        return isValid;
    }

    // === 5. Отправка ===
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';

        var data = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            timezone: document.getElementById('timezone').value
        };

        console.log('Отправка данных:', data);

        setTimeout(function () {
            messageEl.className = 'form-message success';
            messageEl.textContent = '✓ Регистрация успешна! Проверьте email и телефон для подтверждения.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';

            setTimeout(function () {
                window.location.href = '../index.html';
            }, 3000);
        }, 1500);
    });
});