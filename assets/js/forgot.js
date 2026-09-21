// ============================================
// Восстановление пароля: запрос ссылки
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('forgotForm');
    if (!form) return;

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

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = document.getElementById('email').value.trim();
        var isValid = true;

        if (!email) {
            showError('email', 'Введите email');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Неверный формат email');
            isValid = false;
        } else {
            clearError('email');
        }

        if (!isValid) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';

        // Имитация отправки письма
        setTimeout(function () {
            messageEl.className = 'form-message success';
            messageEl.innerHTML = '✓ Письмо отправлено!<br><small>Проверьте почту. Ссылка для сброса пароля придёт в течение минуты.</small>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить ещё раз';

            // Демонстрация: показываем в консоли "ссылку", которую прислали бы в письме
            console.log('Ссылка для сброса: reset-password.html?token=demo-token-' + Date.now());
        }, 1500);
    });
});