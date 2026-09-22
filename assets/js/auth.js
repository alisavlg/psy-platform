// ============================================
// Регистрация: валидация, генератор пароля, код пользователя
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('registerForm');
    if (!form) return;

    // === 1. Показать/скрыть пароли ===
    var togglePassword = document.getElementById('togglePassword');
    var togglePassword2 = document.getElementById('togglePassword2');
    var passwordInput = document.getElementById('password');
    var passwordInput2 = document.getElementById('password2');

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
    var strengthBar = document.getElementById('passwordStrength');

    function updateStrength(val) {
        if (!strengthBar) return;
        strengthBar.classList.remove('weak', 'medium', 'strong');
        if (!val) return;

        var hasLatin = /[a-zA-Z]/.test(val);
        var hasDigits = /\d/.test(val);
        var hasSymbols = /[^a-zA-Z0-9]/.test(val);
        var hasCyrillic = /[а-яА-ЯёЁ]/.test(val);
        var isLong = val.length >= 8;

        if (hasCyrillic) { strengthBar.classList.add('weak'); return; }
        if (isLong && hasLatin && hasDigits && hasSymbols) strengthBar.classList.add('strong');
        else if (isLong && hasLatin && hasDigits) strengthBar.classList.add('medium');
        else strengthBar.classList.add('weak');
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () { updateStrength(passwordInput.value); });
    }

    // === 3. Генератор пароля ===
    var generateBtn = document.getElementById('generatePassword');
    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            var pwd = generateStrongPassword();
            passwordInput.value = pwd;
            passwordInput2.value = pwd;
            passwordInput.type = 'text';
            passwordInput2.type = 'text';
            if (togglePassword) togglePassword.textContent = '🙈';
            if (togglePassword2) togglePassword2.textContent = '🙈';
            updateStrength(pwd);
            clearError('password');
            clearError('password2');
        });
    }

    function generateStrongPassword() {
        var lower = 'abcdefghijkmnpqrstuvwxyz';
        var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        var digits = '23456789';
        var symbols = '!@#$%^&*';
        var all = lower + upper + digits + symbols;

        var pwd = '';
        pwd += lower.charAt(Math.floor(Math.random() * lower.length));
        pwd += upper.charAt(Math.floor(Math.random() * upper.length));
        pwd += digits.charAt(Math.floor(Math.random() * digits.length));
        pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));
        for (var i = 4; i < 14; i++) {
            pwd += all.charAt(Math.floor(Math.random() * all.length));
        }
        return pwd.split('').sort(function () { return Math.random() - 0.5; }).join('');
    }

    // === 4. Генератор кода пользователя ===
    // Формат: 2 буквы + 4 цифры, например AK-4821
    // Буквы без путаницы: без O, I, L, Z, S, B, G
    function generateUserCode() {
        var letters = 'ACDEFHJKMNPRTUVWXY';
        var digits = '23456789';
        var code = '';
        code += letters.charAt(Math.floor(Math.random() * letters.length));
        code += letters.charAt(Math.floor(Math.random() * letters.length));
        code += '-';
        for (var i = 0; i < 4; i++) {
            code += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return code;
    }

    function generateUserId() {
        return 'u-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    }

    // === 5. Вспомогательные функции ===
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

    // === 6. Валидация ===
    function validateForm() {
        var isValid = true;

        var email = document.getElementById('email').value.trim();
        if (!email) { showError('email', 'Введите email'); isValid = false; }
        else if (!validateEmail(email)) { showError('email', 'Неверный формат email'); isValid = false; }
        else clearError('email');

        var password = passwordInput.value;
        if (!password) { showError('password', 'Введите пароль'); isValid = false; }
        else if (/[а-яА-ЯёЁ]/.test(password)) { showError('password', 'Только латинские буквы, цифры и символы'); isValid = false; }
        else if (password.length < 8) { showError('password', 'Минимум 8 символов'); isValid = false; }
        else if (!/[a-zA-Z]/.test(password)) { showError('password', 'Хотя бы одна латинская буква'); isValid = false; }
        else if (!/\d/.test(password)) { showError('password', 'Хотя бы одна цифра'); isValid = false; }
        else clearError('password');

        var password2 = passwordInput2.value;
        if (!password2) { showError('password2', 'Повторите пароль'); isValid = false; }
        else if (password2 !== password) { showError('password2', 'Пароли не совпадают'); isValid = false; }
        else clearError('password2');

        var firstName = document.getElementById('firstName').value.trim();
        if (!firstName || firstName.length < 2) { showError('firstName', 'Введите имя (минимум 2 символа)'); isValid = false; }
        else clearError('firstName');

        var middleName = document.getElementById('middleName').value.trim();
        if (!middleName || middleName.length < 2) { showError('middleName', 'Введите отчество (минимум 2 символа)'); isValid = false; }
        else clearError('middleName');

        var lastName = document.getElementById('lastName').value.trim();
        if (!lastName || lastName.length < 2) { showError('lastName', 'Введите фамилию (минимум 2 символа)'); isValid = false; }
        else clearError('lastName');

        var phone = document.getElementById('phone').value.trim();
        if (!phone) { showError('phone', 'Введите телефон'); isValid = false; }
        else if (!validatePhone(phone)) { showError('phone', 'Неверный формат телефона'); isValid = false; }
        else clearError('phone');

        var timezone = document.getElementById('timezone').value;
        if (!timezone) { showError('timezone', 'Выберите часовой пояс'); isValid = false; }
        else clearError('timezone');

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

    // === 7. Отправка ===
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm()) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';

        // Генерируем уникальный код и id
        var userCode = generateUserCode();
        var userId = generateUserId();

        var userData = {
            id: userId,
            code: userCode,
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            timezone: document.getElementById('timezone').value,
            isVerified: false,
            registeredAt: Date.now(),
            passwordChangedAt: Date.now()
        };
        localStorage.setItem('psyhelp_user', JSON.stringify(userData));

        console.log('Регистрация, код пользователя:', userCode);

        setTimeout(function () {
            messageEl.className = 'form-message success';
            messageEl.innerHTML =
                '✓ Регистрация успешна!<br>' +
                '<span style="font-size: 14px; opacity: 0.85;">' +
                    'Ваш код: <strong>' + userCode + '</strong>. Сохраните его.' +
                '</span>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';

            setTimeout(function () {
                window.location.href = 'dashboard.html?section=profile';
            }, 3500);
        }, 1500);
    });
});