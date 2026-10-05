# PsyHelp — Архитектура проекта

**Версия:** 3.0
**Последнее обновление:** 5 октября 2026

---

## 1. Структура проекта

psy-platform/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── docs/
├── pages/
├── index.html
├── .gitignore
└── README.md

---

## 2. Страницы (`pages/`)

| Файл | Защита |
|------|--------|
| `login.html`, `register.html` | публичные |
| `client.html` | auth-guard (роль client) |
| `dashboard.html` | auth-guard (роль psychologist) |
| `admin.html` | auth-guard (owner / admin / moderator) |
| `application-history.html` | auth-guard |
| `psychologist.html` | публичная |
| `become-psychologist.html` | auth-guard |
| `room.html` | публичная (по sessionId) |
| `rules-cancel.html` | публичная |

**Секции `client.html`:** catalog / sessions / messages / planner / profile.
**Секции `dashboard.html`:** calendar / sessions / messages / requests / clients / profile / reports / settings.

---

## 3. Скрипты (`assets/js/`)

### Везде

| Файл | Что |
|------|-----|
| `auth-guard.js` | Проверка сессии + роли для админки |
| `user-menu.js` | Меню аватара, переключение кабинетов |
| `notifications.js` | Виджет уведомлений (Supabase) + напоминания |

### Аутентификация

| Файл | Что |
|------|-----|
| `auth.js` | Регистрация |
| `login.js` | Вход |

### Кабинет клиента

| Файл | Что |
|------|-----|
| `client.js` | Каталог + роутер секций |
| `client-profile.js` | Профиль клиента |
| `psychologist.js` | Профиль психолога + бронирование + отзывы |
| `sessions.js` | Мои сессии клиента |
| `messenger.js` | Мессенджер (Supabase) |
| `calendar.js` | Календарь (Supabase) |
| `become-block.js` | Блок заявки в профиле клиента |
| `become-psychologist.js` | Форма подачи заявки |
| `application-history.js` | Страница истории заявки |

### Кабинет психолога

| Файл | Что |
|------|-----|
| `script.js` | Роутер секций дашборда + доступ |
| `psychologist-sessions.js` | Сессии психолога |
| `profile.js` | Личная страница психолога |
| `clients.js` | Клиенты (старое, localStorage) |
| `reports.js`, `settings.js` | Заглушки |

### Админка

| Файл | Что |
|------|-----|
| `admin.js` | Заявки + модерация (Supabase) |
| `checklist-templates.js` | Шаблоны (не используется) |

### Прочее

| Файл | Что |
|------|-----|
| `room.js` | Видеокомната (Jitsi) |
| `notifications.js` | Уведомления |

---

## 4. Хранилище

### Supabase (всё основное)

**Auth:**
- `auth.users`

**Таблицы:**
- `profiles`
- `psychologist_profiles`
- `events`
- `sessions`
- `reviews`
- `notifications`
- `chats`
- `messages`
- `applications`
- `application_events`

**Storage:**
- `avatars` (public)
- `documents` (public)

### localStorage (что осталось)

- `psyhelp_user` — кеш профиля
- `psyhelp_clients` — старая модель клиентов психолога
- `psyhelp_profile` — старая модель профиля психолога

---

## 5. Роли

| Роль | Что |
|------|-----|
| client | Каталог, сессии, чаты |
| psychologist | Календарь, сессии, клиенты |
| moderator | Модерация (задел) |
| admin | Управление (задел) |
| owner | Всё |

`profiles.roles` — jsonb массив.

**Тестовые пользователи:**
- `test1@mail.ru` — Иван Иванович, `["client","owner","psychologist"]`
- `anna@mail.ru` — Анна Сергеевна, `["client"]` + одобрена как психолог

---

## 6. Ключевые сценарии

### Регистрация / вход
supa.auth.signUp / signInWithPassword
→ profiles
→ psyhelp_user в localStorage
→ redirect

### Защита страниц
auth-guard.js → supa.auth.getSession()
→ если нет → login.html
→ для admin.html — проверка ролей owner/admin/moderator

### Слоты
dashboard → calendar.js → events (Supabase)

### Бронирование
psychologist.js → confirmBooking()
→ 4 проверки
→ DELETE free из events
→ INSERT sessions
→ INSERT session events (психолог + клиент)
→ INSERT notifications (клиент + психолог)

### Отмена
- Клиент: sessions.js → status=cancelled, вернуть free, удалить events, уведомить психолога
- Психолог: psychologist-sessions.js → то же, уведомить клиента

### Отзывы
Клиент → psychologist.js → submitReview()
→ INSERT reviews
→ триггер пересчитал рейтинг
→ профиль психолога обновлён

### Заявка на психолога
become-psychologist.html → become-psychologist.js
→ INSERT applications (avatar_url в Storage)
→ триггер log_application_event → application_events

### Модерация
admin.js → openAppModal → 3 кнопки
→ RPC approve_application / reject_application / request_attention
→ триггер пишет в application_events
→ уведомление клиенту

### Повторная подача
become-psychologist.js → resubmit_application (RPC)
→ UPDATE applications
→ триггер пишет событие

### История заявки
application-history.html + application-history.js
→ SELECT applications + application_events

### Мессенджер
messenger.js → polling 5 сек
→ SELECT chats + messages
→ INSERT messages
→ badge непрочитанных в сайдбаре

### Видеокомната
room.html → Jitsi Meet
→ имя комнаты = psyhelp-{sessionId}
→ только псевдонимы

### Уведомления
notifications.js → 30 сек polling
→ reminders 24ч / 1ч

---

## 7. Тема оформления

`theme.css` — переменные. Остальные CSS — только ссылки.

---

## 8. Что не переведено на backend

- `clients.js` — старая модель клиентов психолога
- `profile.js` — частично (личная страница психолога)
- `psyhelp_clients`, `psyhelp_profile` в localStorage
- `forgot.js`, `reset.js` — не работают с Supabase Auth

---

## 9. Документация

- `state.md`
- `architecture.md` (этот файл)
- `theme-guide.md`
- `changelog.md`

**Что присылать при старте нового чата:** `state.md` + `architecture.md` + `theme-guide.md`.