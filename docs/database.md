# PsyHelp — Схема базы данных

## 1. Что такое база данных и зачем она нужна

**База данных (БД)** — это как Excel-файл с множеством листов. Каждый «лист» — это **таблица**. В таблице есть **столбцы** (поля) и **строки** (записи).

Пример:
- Лист «Пользователи» — все, кто зарегистрировался.
- Лист «Сессии» — все записи на приём.
- Лист «Сообщения» — все сообщения из чатов.

**Зачем это нужно?**
- Данные не пропадают при обновлении страницы (в отличие от `localStorage`).
- Данные можно **связывать** между собой. Например: «Показать все сессии клиента Ивана» — БД быстро найдёт их по связи.
- Можно делать сложные запросы: «Показать всех психологов со стажем > 5 лет и рейтингом > 4».

**Главное правило:** у каждой таблицы есть **уникальный идентификатор (ID)**. По нему мы связываем таблицы друг с другом.

---

## 2. Обозначения связей

- **1:1** — один к одному. У одного пользователя — один профиль психолога.
- **1:N** — один ко многим. У одного пользователя — много событий в календаре.
- **N:N** — многие ко многим. Один клиент может ходить к нескольким психологам, и один психолог может работать с несколькими клиентами. Реализуется через промежуточную таблицу (в нашем случае — `sessions`).

---

## 3. Группы таблиц

- **MVP** — нужны сразу для запуска.
- **Этап 2** — после запуска MVP.
- **Будущее** — когда проект вырастет.

---

## 4. MVP (то, что нужно для запуска)

### 4.1. `users` — все пользователи

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| email | VARCHAR | Email (уникальный) |
| password_hash | VARCHAR | Пароль (зашифрованный) |
| role | VARCHAR | client / psychologist / admin / owner / moderator |
| first_name | VARCHAR | Имя |
| middle_name | VARCHAR | Отчество (может быть пустым) |
| phone | VARCHAR | Телефон |
| timezone | VARCHAR | Часовой пояс (например, Europe/Moscow) |
| avatar_url | VARCHAR | Ссылка на фото |
| created_at | TIMESTAMP | Дата регистрации |
| is_verified | BOOLEAN | Верифицирован ли (для психологов) |
| is_blocked | BOOLEAN | Заблокирован ли |

**Связи:** с `psychologist_profiles`, `sessions`, `messages`, `events`.

**Важно:** в системе пользователи не определяются по фамилии. Только имя и отчество (по желанию). Контакты (телефон, email) собираются, но не показываются публично.

---

### 4.2. `psychologist_profiles` — профили психологов

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| description | TEXT | Описание |
| specialization | VARCHAR | Специализация (тревога, отношения и т.д.) |
| experience_start_date | DATE | Дата начала практики (для расчёта стажа) |
| price_per_session | INTEGER | Цена за сессию (в копейках) |
| rating | DECIMAL | Средний рейтинг (звёзды) |
| is_public | BOOLEAN | Опубликован ли профиль |

**Связи:** с `users`, `reviews`, `verifications`.

**Примечание:** один психолог — один профиль. Но у одного клиента может быть **несколько психологов** — это реализуется через `sessions`.

---

### 4.3. `schedule_slots` — слоты расписания психолога

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| psychologist_id | INTEGER | Ссылка на `users.id` |
| start_time | TIMESTAMP | Начало слота (UTC) |
| end_time | TIMESTAMP | Конец слота (UTC) |
| is_booked | BOOLEAN | Занят ли слот |

---

### 4.4. `sessions` — сессии (записи на приём)

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| client_id | INTEGER | Ссылка на `users.id` (клиент) |
| psychologist_id | INTEGER | Ссылка на `users.id` (психолог) |
| slot_id | INTEGER | Ссылка на `schedule_slots.id` |
| status | VARCHAR | pending / confirmed / cancelled / completed |
| video_room_url | VARCHAR | Ссылка на комнату видеочата |
| payment_id | INTEGER | Ссылка на `payments.id` |
| created_at | TIMESTAMP | Когда создана |
| notes | TEXT | Заметки психолога (зашифрованы) |
| transcript | TEXT | Транскрибация (зашифрована) |

**Связи:** с `users` (дважды — как клиент и как психолог), `schedule_slots`, `payments`, `reviews`.

**Важно:** один клиент может иметь **несколько психологов**. Это отражается в `sessions`: у клиента просто будет несколько записей с разными `psychologist_id`.

**Ограничение:** клиент не может быть записан к двум психологам **на одно и то же время**. Это проверяется:
- На уровне приложения (перед бронированием).
- На уровне БД — можно добавить уникальный индекс на `(client_id, slot_id)`, но проще проверять в коде.

---

### 4.5. `payments` — платежи

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| session_id | INTEGER | Ссылка на `sessions.id` |
| amount | INTEGER | Сумма (в копейках) |
| currency | VARCHAR | Валюта (RUB) |
| status | VARCHAR | pending / paid / refunded / failed |
| payment_date | TIMESTAMP | Дата платежа |
| refund_amount | INTEGER | Сумма возврата (если был) |
| external_id | VARCHAR | ID в ЮKassa |

---

### 4.6. `events` — события календаря (универсальный планировщик)

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` (чей это календарь) |
| title | VARCHAR | Название события |
| date | DATE | Дата |
| hour | INTEGER | Час (0–23) |
| category | VARCHAR | session / personal / work / health / study |
| created_at | TIMESTAMP | Когда создано |

**Связи:** с `users`.

**Примечание:** это универсальный планировщик. Он используется и клиентами, и психологами. Сессии попадают сюда автоматически с категорией `session`.

---

### 4.7. `reviews` — отзывы о психологах

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| psychologist_id | INTEGER | Ссылка на `users.id` |
| client_id | INTEGER | Ссылка на `users.id` |
| session_id | INTEGER | Ссылка на `sessions.id` |
| rating | INTEGER | Оценка (1–5) |
| text | TEXT | Текст отзыва |
| created_at | TIMESTAMP | Когда создан |
| is_published | BOOLEAN | Опубликован ли |

---

## 5. Этап 2 (после MVP)

### 5.1. `chats` — чаты (личные и групповые)

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| type | VARCHAR | private / group |
| title | VARCHAR | Название (для групп) |
| owner_id | INTEGER | Ссылка на `users.id` (создатель группы) |
| created_at | TIMESTAMP | Когда создан |

---

### 5.2. `chat_members` — участники чатов

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| chat_id | INTEGER | Ссылка на `chats.id` |
| user_id | INTEGER | Ссылка на `users.id` |
| role | VARCHAR | owner / member / moderator |
| joined_at | TIMESTAMP | Когда присоединился |

---

### 5.3. `messages` — сообщения

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| chat_id | INTEGER | Ссылка на `chats.id` |
| sender_id | INTEGER | Ссылка на `users.id` |
| text | TEXT | Текст сообщения (зашифрован) |
| created_at | TIMESTAMP | Когда отправлено |
| is_read | BOOLEAN | Прочитано ли |

---

### 5.4. `articles` — статьи блога

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| author_id | INTEGER | Ссылка на `users.id` |
| title | VARCHAR | Заголовок |
| slug | VARCHAR | ЧПУ (URL) |
| content | TEXT | Текст статьи |
| category | VARCHAR | Категория |
| tags | VARCHAR | Теги (через запятую) |
| meta_description | VARCHAR | Мета-описание для SEO |
| status | VARCHAR | draft / moderation / published |
| created_at | TIMESTAMP | Когда создана |
| published_at | TIMESTAMP | Когда опубликована |

---

### 5.5. `questions` — вопросы Q&A

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| author_id | INTEGER | Ссылка на `users.id` |
| title | VARCHAR | Заголовок вопроса |
| content | TEXT | Текст вопроса |
| category | VARCHAR | Категория |
| status | VARCHAR | open / answered / closed |
| created_at | TIMESTAMP | Когда создан |

---

### 5.6. `answers` — ответы Q&A

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| question_id | INTEGER | Ссылка на `questions.id` |
| author_id | INTEGER | Ссылка на `users.id` (психолог) |
| content | TEXT | Текст ответа |
| rating | INTEGER | Рейтинг ответа (звёзды) |
| created_at | TIMESTAMP | Когда создан |
| is_best | BOOLEAN | Лучший ответ |

---

### 5.7. `verifications` — верификация психологов

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| psychologist_id | INTEGER | Ссылка на `users.id` |
| diploma_url | VARCHAR | Ссылка на диплом |
| certificates_url | TEXT | Ссылки на сертификаты |
| interview_date | TIMESTAMP | Дата собеседования |
| status | VARCHAR | pending / approved / rejected |
| moderator_id | INTEGER | Кто проверял |
| comment | TEXT | Комментарий модератора |

---

### 5.8. `notifications` — уведомления

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Уникальный ID |
| user_id | INTEGER | Ссылка на `users.id` |
| type | VARCHAR | email / push / system |
| title | VARCHAR | Заголовок |
| text | TEXT | Текст |
| is_read | BOOLEAN | Прочитано ли |
| created_at | TIMESTAMP | Когда создано |

---

## 6. Будущее (когда проект вырастет)

- `moderation_log` — лог модерации
- `bans` — блокировки
- `subscriptions` — подписки
- `promo_codes` — промокоды
- `analytics` — метрики и статистика
- `advertisements` — реклама
- `ai_generations` — история ИИ-генераций

---

## 7. Связи между таблицами (упрощённо)
