# PsyHelp — Архитектура проекта

**Версия:** 2.0
**Последнее обновление:** 28 сентября 2026

Карта проекта: файлы, ключи, сценарии, backend.

---

## 1. Структура проекта

psy-platform/
├── assets/
│   ├── css/          ← стили
│   ├── js/           ← скрипты
│   └── images/       ← изображения
├── docs/             ← документация
├── pages/            ← HTML-страницы
├── index.html        ← главная
├── .gitignore
└── README.md

2. Верхний уровень архитектуры

[Файлы сайта]                 [База данных]
У разработчика        ←→       Supabase
(Live Server)                  (облако, Франкфурт)

Файлы сайта — HTML, CSS, JS. Живут локально у разработчика.
База данных — Supabase. Хранит пользователей, психологов, события, сессии.
Связь — HTTP-запросы через библиотеку Supabase JS.

После этапа хостинга — файлы переедут на хостинг, база останется в Supabase.

3. Страницы (pages/)
Файл	Что это	Защита
login.html	Вход	публичная
register.html	Регистрация	публичная
client.html	Кабинет клиента	auth-guard
dashboard.html	Кабинет психолога	auth-guard
psychologist.html	Профиль психолога	публичная
become-psychologist.html	Заявка на психолога	(пока не готово)
admin.html	Админка	auth-guard
rules-cancel.html	Правила отмены	публичная
room.html	Комната видеосвязи (заглушка)	—

Секции client.html: catalog / sessions / messages / planner / profile.
Секции dashboard.html: calendar / sessions / messages / requests / clients / room / profile / reports / settings.
4. Скрипты (assets/js/)
4.1. Подключаются везде
Файл	Что делает
supabase.js	Создаёт клиент Supabase (сейчас подключается inline в HTML)
auth-guard.js	Проверка сессии на защищённых страницах
user-menu.js	Меню аватара, переключение кабинетов
4.2. Аутентификация
Файл	Что делает
auth.js	Регистрация через Supabase
login.js	Вход через Supabase
forgot.js, reset.js	Восстановление пароля (не переведены)
4.3. Кабинет клиента
Файл	Что делает
client.js	Каталог психологов из Supabase
client-profile.js	Профиль клиента в Supabase
psychologist.js	Профиль психолога + бронирование через Supabase
sessions.js	Мои сессии из Supabase
messenger.js	Мессенджер (макет)
calendar.js	Календарь-планировщик через Supabase
notifications.js	Уведомления (localStorage, пока)
4.4. Кабинет психолога
Файл	Что делает
psychologist-sessions.js	Сессии психолога из Supabase
requests.js	Заявки (старое, localStorage)
clients.js	Клиенты (старое)
profile.js	Личная страница (старое)
reports.js	Отчёты (макет)
settings.js	Настройки (макет)
4.5. Админка
Файл	Что делает
admin.js	Заявки, задачи (localStorage, не переведён)
checklist-templates.js	Шаблоны чек-листов
5. Хранилище
5.1. Supabase

Таблицы:

    profiles — пользователи (роли, ФИО, транслируемое имя, код, статус).

    psychologist_profiles — профили психологов.

    events — события календаря.

    sessions — бронирования.

Auth:

    auth.users — учётные записи (email + password).

    JWT-сессия хранится в браузере под своим ключом.

5.2. localStorage (временно, что осталось)
Ключ	Что хранит
psyhelp_user	Кеш профиля для быстрого доступа (перезаписывается из Supabase при загрузке)
psyhelp_notifications_uid	Уведомления (в интерфейсе)
psyhelp_messages_uid	Мессенджер (макет)
psyhelp_applications	Заявки на психолога (старое)
psyhelp_tasks	Задачи модерации (старое)

Принцип: ключ по user.id, не по роли.
6. Роли
Роль	Что может
client	Искать, записываться, общаться
psychologist	Проводить сессии, вести календарь
moderator	Модерация (по задаче)
admin	Управление (по задаче)
owner	Всё

Хранятся в profiles.roles (jsonb массив).

Тестовые пользователи:

    test1@mail.ru — ["client", "owner", "psychologist"]

    anna@mail.ru — ["client"]

7. Ключевые сценарии
7.1. Регистрация

register.html → auth.js → supa.auth.signUp()
  → INSERT в profiles (роли = ['client'])
  → psyhelp_user в localStorage
  → redirect client.html?section=catalog

 7.2. Вход
text

login.html → login.js → supa.auth.signInWithPassword()
  → SELECT profiles → psyhelp_user в localStorage
  → redirect по активной роли

7.3. Защита страниц
text

Загрузка client.html / dashboard.html / admin.html
  → auth-guard.js → supa.auth.getSession()
  → если нет сессии → login.html
  → если есть → psyhelp_user обновляется из profiles

7.4. Слоты психолога
text

dashboard.html?section=calendar
  → calendar.js → loadEvents() из events
  → создание/удаление слотов → INSERT/DELETE в events

7.5. Бронирование
text

psychologist.html → psychologist.js → confirmBooking()
  → проверки (не к себе, нет своих событий)
  → DELETE free из events
  → INSERT в sessions
  → INSERT session в events (у психолога, если есть user_id)
  → INSERT session в events (у клиента)
  → уведомления в localStorage

7.6. Сессии клиента
text

client.html?section=sessions
  → sessions.js → SELECT из sessions WHERE client_id = я

7.7. Сессии психолога
text

dashboard.html?section=sessions
  → psychologist-sessions.js → SELECT из sessions WHERE psychologist_id = мой профиль
  → «Проведена» → UPDATE status
  → «Отменить» → UPDATE status + вернуть free-слот

8. Тема оформления

Все настройки — в theme.css. Остальные CSS — используют переменные.
Подробно — theme-guide.md.
9. Что не переведено на backend

    Отзывы — заглушка.

    Уведомления — localStorage.

    Мессенджер — макет.

    Заявка на психолога — localStorage.

    Админка — localStorage.

    Аватар, документы — base64.

    Восстановление пароля — не работает с Supabase Auth.

10. Документация
Файл	Что внутри
state.md	Что сделано, что в работе, что дальше
architecture.md	Этот файл. Карта проекта
changelog.md	История изменений
theme-guide.md	Правила оформления
roles.md	Роли, права, делегирование
database.md	Схема БД (для backend)
api.md	Эндпоинты API
requirements.md	Требования к системе

Что присылать при старте нового чата: state.md + architecture.md + theme-guide.md.

Обновляется при изменении архитектуры.
 