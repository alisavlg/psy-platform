# PsyHelp — Схема базы данных

**Версия:** 2.0
**Последнее обновление:** 24 сентября 2026

## 1. Что такое база данных и зачем она нужна

**База данных (БД)** — это как Excel-файл с множеством листов. Каждый «лист» — это **таблица**. В таблице есть **столбцы** (поля) и **строки** (записи).

**Зачем это нужно:**
- Данные не пропадают при обновлении страницы (в отличие от `localStorage`).
- Данные можно **связывать** между собой.
- Можно делать сложные запросы.

**Главное правило:** у каждой таблицы есть **уникальный идентификатор (ID)**.

---

## 2. Обозначения связей

- **1:1** — один к одному.
- **1:N** — один ко многим.
- **N:N** — многие ко многим. Реализуется через промежуточную таблицу.

---

## 3. Группы таблиц

- **MVP** — нужны сразу для запуска.
- **Этап 2** — после запуска MVP.
- **Будущее** — когда проект вырастет.

---

## 4. MVP

### 4.1. `users` — все пользователи

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| email | VARCHAR | Email (уникальный) |
| password_hash | VARCHAR | Пароль (зашифрованный) |
| real_first_name | VARCHAR | Реальное имя |
| real_middle_name | VARCHAR | Реальное отчество |
| real_last_name | VARCHAR | Реальная фамилия (не публикуется) |
| display_first_name | VARCHAR | Транслируемое имя (опционально) |
| display_middle_name | VARCHAR | Транслируемое отчество (опционально) |
| phone | VARCHAR | Телефон |
| timezone | VARCHAR | Часовой пояс |
| avatar_url | VARCHAR | Ссылка на фото |
| code | VARCHAR | Код пользователя на платформе (например, YF-4797) |
| psychologist_status | VARCHAR | none / pending / approved / rejected / needs_changes / needs_documents |
| created_at | TIMESTAMP | Дата регистрации |
| is_blocked | BOOLEAN | Заблокирован ли |

**Роли пользователя — в `user_roles`** (многие-ко-многим). В `users` поля `role` нет.

**Связи:** с `psychologist_profiles`, `sessions`, `messages`, `events`, `user_roles`, `applications`.

**Правила имени:**
- Публично — `display_*` (если указано) или `real_first_name` + `real_middle_name`.
- `real_last_name` — не транслируется никому, кроме самого пользователя.
- Контакты (телефон, email) не публикуются.

---

### 4.2. `applications` — заявки на роль психолога

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| status | VARCHAR | pending / in_review / awaiting_decision / approved / rejected / needs_changes / needs_documents |
| specialty | VARCHAR | Специализация |
| experience | INTEGER | Стаж в годах |
| description | TEXT | Публичное описание |
| about | TEXT | О себе для модератора |
| price | INTEGER | Цена за сессию (в копейках) |
| diploma | JSON | Массив файлов диплома |
| certificates | JSON | Массив файлов сертификатов |
| submitted_at | TIMESTAMP | Дата подачи |
| reviewed_at | TIMESTAMP | Дата решения |
| final_decision_reason | TEXT | Комментарий собственника клиенту |
| task_id | INTEGER | Ссылка на задачу делегирования (`tasks.id`) |

**Связи:** с `users`, `tasks`, `application_history`.

---

### 4.3. `application_history` — история заявок

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| specialty | VARCHAR | Специализация |
| experience | INTEGER | Стаж |
| price | INTEGER | Цена |
| submitted_at | TIMESTAMP | Когда подана |
| status | VARCHAR | approved / rejected / needs_changes / needs_documents |
| reason | TEXT | Комментарий собственника |
| decided_at | TIMESTAMP | Когда принято решение |

**Назначение:** клиент видит историю всех своих заявок — что подал, что решили, с какой причиной.

---

### 4.4. `psychologist_profiles` — профили психологов

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| description | TEXT | Описание |
| specialization | VARCHAR | Специализация |
| experience_start_date | DATE | Дата начала практики |
| price_per_session | INTEGER | Цена за сессию (в копейках) |
| rating | DECIMAL | Средний рейтинг |
| reviews_count | INTEGER | Число отзывов |
| is_public | BOOLEAN | Опубликован ли профиль |
| is_verified | BOOLEAN | Проверен ли |

**Связи:** с `users`, `reviews`.

**Примечание:** один психолог — один профиль. У одного клиента может быть несколько психологов — через `sessions`.

---

### 4.5. `schedule_slots` — слоты расписания психолога

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| psychologist_id | INTEGER | Ссылка на `users.id` |
| start_time | TIMESTAMP | Начало слота (UTC) |
| end_time | TIMESTAMP | Конец слота (UTC) |
| is_booked | BOOLEAN | Занят ли слот |

---

### 4.6. `sessions` — сессии

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| client_id | INTEGER | Ссылка на `users.id` (клиент) |
| psychologist_id | INTEGER | Ссылка на `users.id` (психолог) |
| slot_id | INTEGER | Ссылка на `schedule_slots.id` |
| status | VARCHAR | confirmed / completed / cancelled / rescheduled |
| date | DATE | Дата сессии |
| hour | INTEGER | Час |
| topic | VARCHAR | Тема |
| price | INTEGER | Стоимость |
| cancelled_by | VARCHAR | client / psychologist (кто отменил) |
| cancel_reason | TEXT | Причина отмены |
| refund_percent | INTEGER | Процент возврата |
| video_room_url | VARCHAR | Ссылка на комнату |
| payment_id | INTEGER | Ссылка на `payments.id` |
| created_at | TIMESTAMP | Когда создана |
| completed_at | TIMESTAMP | Когда проведена |

**Связи:** с `users` (дважды — клиент и психолог), `schedule_slots`, `payments`, `reviews`.

**Правило:** клиент не может быть записан к двум психологам на одно и то же время.

---

### 4.7. `payments` — платежи

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| session_id | INTEGER | Ссылка на `sessions.id` |
| amount | INTEGER | Сумма (в копейках) |
| currency | VARCHAR | Валюта (RUB) |
| status | VARCHAR | pending / paid / refunded / failed |
| payment_date | TIMESTAMP | Дата платежа |
| refund_amount | INTEGER | Сумма возврата |
| external_id | VARCHAR | ID в ЮKassa |

---

### 4.8. `events` — события календаря

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| title | VARCHAR | Название |
| date | DATE | Дата |
| hour | INTEGER | Час (0–23) |
| category | VARCHAR | free / session / personal / work / health / study |
| session_id | INTEGER | Ссылка на `sessions.id` (если это сессия) |
| client_id | INTEGER | Ссылка на `users.id` (кто клиент — для сессий) |
| client_name | VARCHAR | Имя клиента (для отображения) |
| created_at | TIMESTAMP | Когда создано |

**Примечание:** универсальный планировщик. `category = 'free'` — свободный слот психолога, виден клиентам. `category = 'session'` — забронированная сессия.

---

### 4.9. `reviews` — отзывы о психологах

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| psychologist_id | INTEGER | Ссылка на `users.id` |
| author_id | INTEGER | Ссылка на `users.id` (клиент) |
| author_name | VARCHAR | Транслируемое имя автора |
| rating | INTEGER | Оценка (1–5) |
| text | TEXT | Текст отзыва |
| created_at | TIMESTAMP | Когда создан |

**Правило:** один клиент — **один отзыв** на психолога. Отзыв возможен только после проведённой сессии.

---

## 5. Этап 2

### 5.1. `chats` — чаты

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| type | VARCHAR | private / group |
| title | VARCHAR | Название (для групп) |
| owner_id | INTEGER | Создатель группы |
| created_at | TIMESTAMP | Когда создан |

### 5.2. `chat_members` — участники

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| chat_id | INTEGER | Ссылка на `chats.id` |
| user_id | INTEGER | Ссылка на `users.id` |
| role | VARCHAR | owner / member / moderator |
| joined_at | TIMESTAMP | Когда присоединился |

### 5.3. `messages` — сообщения

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| chat_id | INTEGER | Ссылка на `chats.id` |
| sender_id | INTEGER | Ссылка на `users.id` |
| text | TEXT | Текст (зашифрован) |
| created_at | TIMESTAMP | Когда отправлено |
| is_read | BOOLEAN | Прочитано ли |

### 5.4. `articles` — статьи блога

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| author_id | INTEGER | Ссылка на `users.id` |
| title | VARCHAR | Заголовок |
| slug | VARCHAR | ЧПУ |
| content | TEXT | Текст |
| category | VARCHAR | Категория |
| tags | VARCHAR | Теги |
| meta_description | VARCHAR | Мета-описание |
| status | VARCHAR | draft / moderation / published |
| created_at | TIMESTAMP | Когда создана |
| published_at | TIMESTAMP | Когда опубликована |

### 5.5. `questions` — вопросы Q&A

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| author_id | INTEGER | Ссылка на `users.id` |
| title | VARCHAR | Заголовок |
| content | TEXT | Текст вопроса |
| category | VARCHAR | Категория |
| status | VARCHAR | open / answered / closed |
| created_at | TIMESTAMP | Когда создан |

### 5.6. `answers` — ответы Q&A

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| question_id | INTEGER | Ссылка на `questions.id` |
| author_id | INTEGER | Ссылка на `users.id` |
| content | TEXT | Текст ответа |
| rating | INTEGER | Рейтинг ответа |
| is_best | BOOLEAN | Лучший ответ |
| created_at | TIMESTAMP | Когда создан |

### 5.7. `notifications` — уведомления

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| type | VARCHAR | application_approved / application_rejected / application_needs_changes / application_needs_documents / session_booked / session_cancelled / session_reminder_24 / session_reminder_1 |
| title | VARCHAR | Заголовок |
| text | TEXT | Текст |
| link | VARCHAR | URL для перехода |
| is_read | BOOLEAN | Прочитано ли |
| created_at | TIMESTAMP | Когда создано |

**Правило:** уведомление создаётся для каждого получателя отдельно. Если один человек = и клиент, и психолог — ему приходит **одно** уведомление.

---

## 6. Будущее

- `moderation_log` — лог модерации
- `bans` — блокировки
- `subscriptions` — подписки
- `promo_codes` — промокоды
- `analytics` — метрики
- `advertisements` — реклама
- `ai_generations` — история ИИ-генераций

---

## 7. Соответствие таблиц и localStorage (для переезда)

| localStorage | Таблица БД |
|--------------|------------|
| `psyhelp_user` | `users` + `user_roles` |
| `psyhelp_events_<uid>` | `events` |
| `psyhelp_sessions_<uid>` | `sessions` |
| `psyhelp_notifications_<uid>` | `notifications` |
| `psyhelp_psychologists_registry` | `users` + `psychologist_profiles` + `reviews` |
| `psyhelp_applications` | `applications` |
| `psyhelp_tasks` | `tasks` |
| `psyhelp_messages_v2` | `chats` + `chat_members` + `messages` |

**Принцип:** логика фронтенда не меняется. Меняются только функции `get...` / `save...` — вместо localStorage обращаются к API.

---

*Документ обновлён: 24 сентября 2026.*