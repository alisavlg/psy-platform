# PsyHelp — Текущее состояние проекта

**Дата обновления:** 28 сентября 2026
**Текущий этап:** Этап 2 — переезд на Supabase (в процессе)

---

## Принципы проекта

1. Сначала удобно и функционально — потом реклама.
2. Комфортно и психологу, и собственнику.
3. Если продукт хорош — люди приходят сами.
4. Не бежать впереди паровоза.
5. Хочу получать результат — нормально, но не в ущерб качеству.
6. Один человек = один набор данных (ключи по user.id).
7. Один код — одно место (не дублировать).
8. Сначала уточняем логику — потом пишем код.
9. Сначала логика на localStorage, потом переезд на backend.

---

## Архитектура

- **Файлы сайта** — локально, у разработчика (Live Server).
- **База данных** — Supabase (в облаке, Франкфурт).
- **Связь** — через API (HTTP-запросы).

**Проект Supabase:**
- URL: `https://ubbzkxxmgfvvyvfjfcmo.supabase.co`
- Публичный ключ: `sb_publishable_miE5iopycXLfLa_XPektzQ_c-GanKnt`

---

## Что уже в Supabase (работает по-настоящему)

### Аутентификация
- ✅ Регистрация — `supa.auth.signUp`
- ✅ Вход — `supa.auth.signInWithPassword`
- ✅ Выход — `supa.auth.signOut`
- ✅ Проверка сессии — `auth-guard.js` на защищённых страницах
- ✅ `client.html`, `dashboard.html`, `admin.html` — защищены
- ✅ `psychologist.html`, `register.html`, `login.html` — публичные

### Таблицы в Supabase

**`profiles`** — пользователи:
- `id` (uuid, ссылка на auth.users)
- `email`, `code`, `real_first_name`, `real_middle_name`, `real_last_name`
- `display_first_name`, `display_middle_name` (транслируемое имя)
- `phone`, `timezone`, `avatar_url`
- `psychologist_status` (none / pending / approved / rejected / needs_changes / needs_documents)
- `roles` (jsonb: массив — client / psychologist / owner)
- `created_at`

**`psychologist_profiles`** — профили психологов:
- `id`, `user_id` (может быть null — для демо)
- `first_name`, `middle_name`, `specialty`, `description`
- `experience`, `price`, `rating`, `reviews_count`, `is_verified`
- `created_at`

**`events`** — события календаря:
- `id`, `owner_id`, `psychologist_id`
- `title`, `date`, `hour`, `category` (free / session / personal / work / health / study)
- `session_id`, `client_id`, `client_code`, `client_name`
- `psychologist_name`, `created_at`

**`sessions`** — бронирования:
- `id` (text), `client_id`, `psychologist_id`, `psychologist_name`
- `client_code`, `client_name`, `date`, `hour`, `topic`, `price`
- `status` (confirmed / completed / cancelled / rescheduled)
- `cancel_reason`, `cancelled_by`, `cancelled_at`, `refund_percent`
- `remind_24_sent`, `remind_1_sent`, `created_at`, `completed_at`

### RLS-политики

- `profiles`: пользователь видит/редактирует только свой.
- `psychologist_profiles`: каталог виден всем; психолог редактирует свой.
- `events`: free-слоты видны всем; владелец видит свои; авторизованный может удалять/обновлять free-слоты (для бронирования).
- `sessions`: клиент видит свои; психолог видит свои; создаёт — клиент; обновляют — оба.

### Тестовые пользователи

- `test1@mail.ru` — Иван Иванович, роли `["client", "owner", "psychologist"]`.
  Привязан к `psychologist_profiles` с `first_name = 'Иван', middle_name = 'Иванович'`.
- `anna@mail.ru` — Анна Сергеевна, роль `["client"]`.

### Демо-психологи (без аккаунтов, `user_id = null`)

- Анна Сергеевна — тревога, отношения, самооценка
- Иван Сергеевич — семейная терапия
- Мария Петровна — детская психология
- Ольга Викторовна — тревога, депрессия

---

## Что работает (полный цикл)

1. Регистрация клиента → `auth.users` + `profiles`.
2. Вход → сессия Supabase.
3. Каталог психологов — из `psychologist_profiles`.
4. Профиль психолога — из `psychologist_profiles`.
5. Слоты — из `events` (free).
6. Календарь психолога (`dashboard.html?section=calendar`):
   - читает/пишет `events` в Supabase,
   - «Заполнить будни / выходные» — массовая вставка,
   - «Убрать все слоты» — удаление.
7. Бронирование (`psychologist.js`):
   - 4 проверки: не к себе, у клиента нет события, чекбокс согласия, имя/тема,
   - атомарно удаляет free-слот из `events`,
   - создаёт запись в `sessions`,
   - создаёт session-событие у психолога (если есть `user_id`),
   - создаёт session-событие у клиента,
   - уведомление клиенту и психологу (в localStorage).
8. «Мои сессии» клиента (`sessions.js`) — из `sessions` (фильтр по `client_id`).
9. «Сессии» психолога (`psychologist-sessions.js`) — из `sessions` (фильтр по `psychologist_id`).
10. Отмена сессии — обновляет `sessions.status = 'cancelled'`, возвращает free-слот, удаляет события.
11. Уведомления (интерфейс) — localStorage, обновление раз в 10 секунд + при возврате на вкладку.

---

## Что осталось в localStorage (временно)

| Блок | Ключ | Задача |
|------|------|--------|
| Уведомления | `psyhelp_notifications_<uid>` | Переезд в таблицу `notifications` |
| Отзывы | — (сейчас заглушка) | Таблица `reviews` |
| Заявка на психолога | `psyhelp_applications` | Таблица `applications` |
| Задачи модерации | `psyhelp_tasks` | Таблица `tasks` |
| Мессенджер | `psyhelp_messages_<uid>` | Таблицы `chats`, `messages` |
| Аватары, документы | base64 в localStorage | Supabase Storage |

---

## Что дальше

### Ближайшие задачи (по приоритету)

1. **Отзывы** — клиент оценивает психолога после проведённой сессии.
   - Таблица `reviews`.
   - Обновление `psychologist_profiles.rating` и `reviews_count`.
   - Форма на профиле психолога.
   - Отображение отзывов в профиле.

2. **Заявка на роль психолога** — переход клиент → психолог.
   - Таблица `applications`.
   - Файлы в Supabase Storage.
   - Админка: чтение заявок, делегирование, финальное решение.
   - Автоматическое создание `psychologist_profiles` при одобрении.

3. **Уведомления в облако** — таблица `notifications`.

4. **Мессенджер** — реальный обмен между людьми.

5. **Storage** — аватары, дипломы.

### После backend

6. Хостинг (Supabase Hosting / Vercel).
7. Домен.
8. ЮKassa — реальные платежи.
9. Email и SMS.

---

## Известные ограничения

| Ограничение | Решается |
|-------------|----------|
| Уведомления только в одном браузере | Перенос в Supabase |
| Отзывы — заглушка | Задача «Отзывы» |
| Мессенджер — макет | Задача «Мессенджер» + WebSocket |
| Файлы — base64 | Supabase Storage |
| Демо-психологи без аккаунтов | Регистрация реальных |

---

## Документация

- `architecture.md` — карта проекта: файлы, ключи, сценарии.
- `state.md` — этот файл.
- `changelog.md` — история изменений.
- `theme-guide.md` — правила оформления.
- `roles.md` — роли, права, делегирование.
- `database.md` — схема БД (для backend).
- `api.md` — эндпоинты API.
- `requirements.md` — общие требования.

**При старте нового чата:** `state.md` + `architecture.md` + `theme-guide.md`.

---

*Обновляется после каждой завершённой задачи.*