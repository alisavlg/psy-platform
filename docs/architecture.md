# Eupsy — Архитектура проекта

**Версия:** 5.0
**Последнее обновление:** 14 октября 2026

**Проект:** Eupsy (бывшее рабочее название — PsyHelp)
**Домен:** eupsy.ru (в процессе подключения)

## 1. Структура проекта
psy-platform/
├── assets/
│ ├── css/
│ ├── js/
│ └── images/
├── docs/
├── pages/
├── index.html
├── .gitignore
└── README.md
text


---

## 2. Страницы (`pages/`)

| Файл | Защита |
|------|--------|
| `login.html`, `register.html` | публичные |
| `client.html` | auth-guard (роль client) |
| `dashboard.html` | auth-guard (роль psychologist) |
| `admin.html` | auth-guard (owner / admin / moderator) |
| `application-history.html` | auth-guard |
| `become-psychologist.html` | auth-guard |
| `psychologist.html` | публичная |
| `room.html` | публичная (по sessionId) |
| `rules-cancel.html` | публичная |

**Секции `client.html`:** catalog / sessions / messages / planner / profile.

**Секции `dashboard.html`:** calendar / sessions / messages / profile / reports.

---

## 3. Скрипты (`assets/js/`)

### Подключаются везде

| Файл | Что |
|------|-----|
| `auth-guard.js` | Проверка сессии + роли для админки |
| `user-menu.js` | Меню аватара, переключение кабинетов |
| `notifications.js` | Виджет уведомлений + напоминания |

### Аутентификация

| Файл | Что |
|------|-----|
| `auth.js` | Регистрация |
| `login.js` | Вход |

### Кабинет клиента

| Файл | Что |
|------|-----|
| `client.js` | Каталог + роутер секций |
| `client-profile.js` | Профиль клиента + загрузка аватара |
| `psychologist.js` | Профиль психолога + бронирование + отзывы |
| `sessions.js` | Мои сессии клиента |
| `messenger.js` | Мессенджер (Supabase) |
| `calendar.js` | Календарь |
| `become-block.js` | Блок заявки в профиле |
| `become-psychologist.js` | Форма заявки + документы |
| `application-history.js` | История заявки |

### Кабинет психолога

| Файл | Что |
|------|-----|
| `script.js` | Роутер секций дашборда |
| `psychologist-sessions.js` | Сессии психолога |
| `profile.js` | Личная страница психолога |
| `reports.js` | Отчёты (в разработке) |

### Админка

| Файл | Что |
|------|-----|
| `admin.js` | Заявки, модерация, фильтры, история |

### Прочее

| Файл | Что |
|------|-----|
| `room.js` | Видеокомната (Jitsi) |

---

## 4. Хранилище

### Supabase

**Auth:** `auth.users`

**Таблицы:**
- `profiles` — пользователи (роли, ФИО, транслируемое имя, код, статус, аватар, часовой пояс)
- `psychologist_profiles` — психологи (специализация, стаж, цена, рейтинг, аватар)
- `events` — календарь (free / session / personal / work / health / study)
- `sessions` — бронирования
- `reviews` — отзывы
- `notifications` — уведомления
- `chats` + `messages` — мессенджер (+ client_avatar, psychologist_avatar)
- `applications` — заявки на психолога (+ documents jsonb, qualifications)
- `application_events` — история заявки (+ author_role, snapshot jsonb)
- `client_notes` — заметки психолога о клиенте

**Storage:** `avatars` (public), `documents` (public).

**Триггеры:**
- `trg_reviews_update_rating`
- `trg_application_events`
- `trg_sync_client_avatar`
- `trg_sync_psychologist_avatar`

**RPC:**
- `approve_application`, `reject_application`, `request_attention`
- `resubmit_application`

### localStorage

- `psyhelp_user` — кеш профиля
- `psyhelp_profile` — старая модель профиля психолога (можно удалить)

---

## 5. Роли

| Роль | Что |
|------|-----|
| client | Каталог, сессии, чаты |
| psychologist | Календарь, сессии |
| moderator | Модерация (задел) |
| admin | Управление (задел) |
| owner | Всё |

`profiles.roles` — jsonb массив.

**Тестовые пользователи:**
- `test1@mail.ru` — Иван Иванович, `["client","owner","psychologist"]`
- `anna@mail.ru` — Анна Сергеевна

---

## 6. Ключевые сценарии

### Регистрация / вход
auth.js / login.js → supa.auth → profiles → psyhelp_user

### Защита страниц
auth-guard.js → getSession → редирект при отсутствии

### Слоты
dashboard → calendar.js → events

### Бронирование
psychologist.js → confirmBooking()
→ 4 проверки
→ DELETE free → INSERT sessions → INSERT events → INSERT notifications

### Отмена
sessions.js / psychologist-sessions.js → status=cancelled
→ возврат free-слота → удаление events → уведомление

### Отзывы
psychologist.js → INSERT reviews → триггер пересчитывает рейтинг

### Заявка на психолога
become-psychologist.js → 4 категории документов в Storage
→ INSERT applications → триггер log_application_event → application_events (со снимком)

### Модерация
admin.js → RPC (approve / reject / attention)
→ триггер пишет событие → уведомление клиенту

### Повторная подача
become-psychologist.js → resubmit_application (RPC)
→ UPDATE applications → триггер пишет событие

### История заявки
application-history.html + application-history.js
→ applications + application_events (раскрывающиеся снимки)

### Мессенджер
messenger.js → polling 5 сек → chats + messages → badge
→ аватары из chats.client_avatar / psychologist_avatar

### Аватары
Загружаются в Storage/avatars
→ клиент: profiles.avatar_url
→ психолог: psychologist_profiles.avatar_url
→ триггеры синхронизируют в chats.client_avatar / psychologist_avatar

### Видеокомната
room.html → Jitsi Meet → psyhelp-{sessionId}

### Уведомления
notifications.js → 30 сек polling + reminders 24ч / 1ч

### Часовой пояс
profile.js → profiles.timezone

---

## 7. Тема оформления

`theme.css` — переменные. Остальные CSS — только ссылки.

---

## 8. Что не переведено на backend

- `profile.js` — старая модель `psyhelp_profile` в localStorage не используется, но остался файл
- `forgot.js`, `reset.js` — не работают с Supabase Auth

---
## Технический долг

1. **Layout в каждом файле.** Сайдбар, логотип, топбар копируются в каждой HTML-странице. Надо вынести в `layout.js`.
2. **PSYHELP → EUPSY.** Название в HTML — в каждой странице. Меняем через Ctrl+Shift+H сейчас, потом — через `layout.js`.
3. **`profile.js` — старая модель `psyhelp_profile` в localStorage.** Не используется, но остался.
4. **`demo-seed.js`** — тестовые данные, надо убрать перед запуском.
5. **`forgot.js`, `reset.js`** — не работают с Supabase Auth.
6. **`requests.js`, `clients.js`** — удалить (не подключены).
7. **`settings.js`** — удалить (не подключён).

## 9. Документация

- `state.md`
- `architecture.md` (этот файл)
- `theme-guide.md`
- `changelog.md`

**При старте нового чата:** `state.md` + `architecture.md` + `theme-guide.md`.