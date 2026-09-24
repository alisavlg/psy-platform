// ============================================
// ДЕМО-ДАННЫЕ: 3 тестовых психолога со слотами
// ============================================

(function () {
    var SEED_FLAG = 'psyhelp_seed_demo_psychologists_v1';
    var REGISTRY_KEY = 'psyhelp_psychologists_registry';

    if (localStorage.getItem(SEED_FLAG)) return;

    // Не пересеваем, если уже есть демо-психологи
    var registry = [];
    try {
        registry = JSON.parse(localStorage.getItem(REGISTRY_KEY)) || [];
    } catch (e) { registry = []; }
    if (!Array.isArray(registry)) registry = [];

    var hasDemo = registry.some(function (p) {
        return p.userId && p.userId.indexOf('psy-demo-') === 0;
    });
    if (hasDemo) {
        localStorage.setItem(SEED_FLAG, '1');
        return;
    }

    var demos = [
        {
            id: 'psy-demo-1',
            userId: 'psy-demo-1',
            firstName: 'Иван',
            middleName: 'Сергеевич',
            specialty: 'Семейная терапия',
            description: 'Работаю с парами и семьями. Помогаю наладить коммуникацию и вернуть доверие.',
            experience: 12,
            price: 4500,
            rating: 4.9,
            reviewsCount: 87,
            isVerified: true
        },
        {
            id: 'psy-demo-2',
            userId: 'psy-demo-2',
            firstName: 'Мария',
            middleName: 'Петровна',
            specialty: 'Детская психология',
            description: 'Работаю с детьми и подростками. Помогаю справляться с тревогой, адаптацией, поведением.',
            experience: 6,
            price: 2500,
            rating: 4.7,
            reviewsCount: 31,
            isVerified: true
        },
        {
            id: 'psy-demo-3',
            userId: 'psy-demo-3',
            firstName: 'Ольга',
            middleName: 'Викторовна',
            specialty: 'Тревога, депрессия',
            description: 'КПТ-подход. Помогаю справиться с тревогой, паническими атаками, депрессией. Онлайн-сессии.',
            experience: 15,
            price: 5000,
            rating: 4.95,
            reviewsCount: 124,
            isVerified: true
        }
    ];

    registry = registry.concat(demos);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

    // Слоты: рабочие дни на следующей неделе, 4 окна в день
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    function formatDateKey(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    demos.forEach(function (psy) {
        var key = 'psyhelp_events_' + psy.userId;
        var events = [];
        try {
            var raw = localStorage.getItem(key);
            events = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(events)) events = [];
        } catch (e) { events = []; }

        var hoursByDay = [10, 14, 16, 18];

        for (var day = 1; day <= 10; day++) {
            var date = new Date(today);
            date.setDate(today.getDate() + day);
            var jsDay = date.getDay();
            if (jsDay === 0 || jsDay === 6) continue; // пропускаем выходные
            var dateKey = formatDateKey(date);

            hoursByDay.forEach(function (h) {
                var id = 'seed-' + psy.userId + '-' + dateKey + '-' + h;
                var exists = events.some(function (e) { return e.id === id; });
                if (exists) return;
                events.push({
                    id: id,
                    title: 'Свободно',
                    date: dateKey,
                    hour: h,
                    category: 'free'
                });
            });
        }

        localStorage.setItem(key, JSON.stringify(events));
        console.log('[demo-seed] созданы слоты для', psy.firstName, psy.middleName, '—', events.length);
    });

    localStorage.setItem(SEED_FLAG, '1');
    console.log('[demo-seed] создано 3 демо-психолога');
})();