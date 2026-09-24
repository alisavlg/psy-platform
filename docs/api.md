Версия: 0.4
Последнее обновление: 24 сентября 2026
1. Что такое API

API — «язык общения» между фронтендом (сайт) и бэкендом (сервер).

Аналогия: фронтенд — посетитель ресторана, API — официант, бэкенд — кухня.
2. Как выглядит запрос

    МЕТОД — что делаем (GET, POST, PUT, PATCH, DELETE)

    /адрес — куда обращаемся

    Заголовки — кто мы (токен авторизации)

    Тело — данные

Пример:

POST /api/auth/register
Content-Type: application/json

{
"email": "anna@example.com",
"password": "secret123",
"firstName": "Анна",
"middleName": "Сергеевна",
"lastName": "Иванова",
"phone": "+79001234567"
}

Ответ:

200 OK
{
"success": true,
"userId": 42,
"message": "Регистрация успешна."
}
3. Методы HTTP
Метод	Что делает	Пример
GET	Получить данные	GET /api/psychologists
POST	Создать	POST /api/sessions
PUT	Обновить полностью	PUT /api/users/42
PATCH	Обновить частично	PATCH /api/users/42
DELETE	Удалить	DELETE /api/sessions/15
4. Коды ответов
Код	Значение
200	OK
201	Created
400	Bad Request
401	Unauthorized
403	Forbidden
404	Not Found
500	Server Error
5. Авторизация

После входа сервер выдаёт JWT-токен. Фронтенд сохраняет его и прикрепляет к каждому запросу:

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Сервер проверяет токен: «Это пользователь с ID 42, у него роли client, psychologist».
6. Структура API

/api
├── /auth ← регистрация, вход, восстановление пароля
├── /users ← профиль пользователя
├── /applications ← заявки на роль психолога
├── /psychologists ← психологи
├── /sessions ← сессии
├── /events ← календарь
├── /notifications ← уведомления
├── /payments ← платежи
├── /tasks ← задачи (делегирование)
├── /admin ← админ-функции
├── /chats ← чаты (этап 2)
├── /articles ← блог (этап 2)
└── /questions ← Q&A (этап 2)
7. Правила отображения имени

    Публично: имя + отчество (например, «Анна Сергеевна»).

    Фамилия хранится, но не показывается публично.

    Если клиент указал транслируемое имя — показывается оно.

    В системе пользователи не определяются по фамилии.

8. Аутентификация
8.1. Регистрация

POST /api/auth/register

Тело:

{
"email": "anna@example.com",
"password": "secret123",
"firstName": "Анна",
"middleName": "Сергеевна",
"lastName": "Иванова",
"phone": "+79001234567",
"timezone": "Europe/Moscow"
}

Правила:

    Email — уникальный.

    Пароль — минимум 8 символов.

    Имя, отчество, фамилия — обязательные.

    Телефон — уникальный.

    Часовой пояс — обязательный.

Ответ (200):

{
"success": true,
"userId": 42,
"message": "Регистрация успешна. Проверьте email."
}

Ошибки: 400 — невалидные данные; 409 — email или телефон заняты.
8.2. Подтверждение email

GET /api/auth/confirm-email?token=xxx
8.3. Подтверждение телефона

POST /api/auth/confirm-phone

Тело:

{ "phone": "+79001234567", "code": "1234" }
8.4. Вход

POST /api/auth/login

Тело:

{ "email": "anna@example.com", "password": "secret123" }

Ответ (200):

{
"success": true,
"token": "eyJhbGciOiJIUzI1NiIs...",
"user": {
"id": 42,
"firstName": "Анна",
"roles": ["client"]
}
}
8.5. Выход

POST /api/auth/logout
8.6. Восстановление пароля

POST /api/auth/forgot-password
POST /api/auth/reset-password
8.7. Проверка токена

GET /api/auth/me

Ответ (200):

{
"id": 42,
"firstName": "Анна",
"middleName": "Сергеевна",
"roles": ["client"],
"isEmailConfirmed": true,
"isPhoneConfirmed": true
}
9. Пользователи
9.1. Получить свой профиль

GET /api/users/me
9.2. Обновить профиль

PATCH /api/users/me

Тело:

{
"displayFirstName": "Ирина",
"displayMiddleName": "Викторовна",
"phone": "+79001234567",
"timezone": "Europe/Moscow",
"avatarUrl": "/uploads/avatars/42.jpg"
}
9.3. Сменить пароль

POST /api/users/me/change-password

Тело:

{ "oldPassword": "secret123", "newPassword": "newSecret456" }
10. Заявки на роль психолога
10.1. Подать заявку

POST /api/applications

Тело:

{
"specialty": "Тревога, отношения",
"experience": 8,
"description": "Публичное описание...",
"about": "О себе для модератора...",
"price": 3000,
"diploma": [ /* файлы / ],
"certificates": [ / файлы */ ]
}

Ответ (201):

{ "success": true, "applicationId": 5, "status": "pending" }
10.2. Моя заявка

GET /api/applications/my

Ответ (200):

{
"id": 5,
"status": "in_review",
"submittedAt": "2026-09-24T10:00:00Z",
"finalDecisionReason": null
}
10.3. История моих заявок

GET /api/applications/my/history

Ответ (200):

{
"items": [
{
"id": 1,
"specialty": "Тревога",
"submittedAt": "2026-08-01T10:00:00Z",
"status": "rejected",
"reason": "Не хватает сертификата по КПТ"
}
]
}
11. Психологи
11.1. Список психологов

GET /api/psychologists?specialization=тревога&minPrice=1000&maxPrice=5000&rating=4&page=1&limit=20

Ответ (200):

{
"total": 42,
"page": 1,
"items": [
{
"id": 7,
"firstName": "Анна",
"middleName": "Сергеевна",
"specialization": "Тревога, отношения",
"pricePerSession": 3000,
"rating": 4.8,
"reviewsCount": 42,
"experienceYears": 8,
"isVerified": true
}
]
}
11.2. Профиль психолога

GET /api/psychologists/7

Ответ (200):

{
"id": 7,
"firstName": "Анна",
"middleName": "Сергеевна",
"specialization": "Тревога, отношения",
"description": "...",
"pricePerSession": 3000,
"rating": 4.8,
"reviewsCount": 42,
"experienceYears": 8,
"isVerified": true,
"reviews": [
{
"id": 1,
"authorName": "Елена",
"rating": 5,
"text": "Очень помогла...",
"createdAt": "2026-01-12T10:00:00Z"
}
]
}
11.3. Оставить отзыв

POST /api/psychologists/7/reviews

Тело:

{ "rating": 5, "text": "Отличный специалист" }

Правила:

    Только после проведённой сессии.

    Один клиент — один отзыв на психолога.

Ответ (201):

{ "success": true, "reviewId": 10, "newRating": 4.85 }
11.4. Обновить свой профиль психолога

PATCH /api/psychologists/me
12. Календарь
12.1. Получить события

GET /api/events?from=2026-09-01&to=2026-09-30
12.2. Создать событие

POST /api/events

Тело:

{
"title": "Свободно",
"date": "2026-09-20",
"hour": 14,
"category": "free"
}
12.3. Обновить

PATCH /api/events/1
12.4. Удалить

DELETE /api/events/1
13. Сессии
13.1. Создать (запись)

POST /api/sessions

Тело:

{
"psychologistId": 7,
"date": "2026-09-25",
"hour": 14,
"topic": "Тревога",
"agreedToCancelRules": true
}

Ответ (201):

{
"success": true,
"sessionId": 55,
"paymentUrl": "https://yookassa.ru/..."
}
13.2. Мои сессии (клиент)

GET /api/sessions/my
13.3. Сессии психолога

GET /api/sessions/psychologist
13.4. Отметить сессию проведённой (психолог)

POST /api/sessions/55/complete
13.5. Отменить сессию

POST /api/sessions/55/cancel

Тело:

{ "reason": "Заболел" }

Правила возврата:

Отмена клиентом:

    ≥ 48 ч до сессии — возврат 100%.

    24–48 ч — возврат 50%.

    < 24 ч — без возврата.

Отмена психологом:

    Возврат клиенту 100% в любом случае.

Форс-мажор:

    Через чат поддержки, в индивидуальном порядке.

13.6. Перенести

POST /api/sessions/55/reschedule

Тело:

{ "newDate": "2026-09-28", "newHour": 16 }
14. Уведомления
14.1. Получить уведомления

GET /api/notifications

Ответ (200):

{
"items": [
{
"id": 1,
"type": "session_booked",
"title": "Сессия подтверждена",
"text": "Иван Сергеевич — 25 сентября в 18:00.",
"link": "/client.html?section=sessions&highlight=s-123",
"isRead": false,
"createdAt": "2026-09-24T10:00:00Z"
}
]
}
14.2. Отметить все прочитанными

POST /api/notifications/read-all
14.3. Отметить одно

POST /api/notifications/1/read
15. Платежи
15.1. Создать платёж

POST /api/payments
15.2. Вебхук от ЮKassa

POST /api/payments/webhook
15.3. История платежей

GET /api/payments/my
16. Задачи (делегирование)
16.1. Создать задачу

POST /api/tasks

Тело:

{
"assigneeId": 3,
"type": "verify_psychologist",
"title": "Проверить заявку психолога Иванова",
"applicationId": 5,
"checklist": [
{ "id": "diploma", "text": "Проверить диплом" },
{ "id": "certificates", "text": "Проверить сертификаты" }
]
}
16.2. Мои задачи

GET /api/tasks/my
16.3. Отправить рецензию (исполнитель)

POST /api/tasks/1/submit

Тело:

{
"checklist": [
{ "id": "diploma", "checked": true, "comment": "ВУЗ в реестре" }
],
"recommendation": "approve",
"recommendationReason": "Все документы в порядке"
}
16.4. Принять решение (собственник)

POST /api/tasks/1/decide

Тело:

{
"decision": "approved",
"reason": "Документы в порядке, собеседование пройдено"
}

Права: только собственник.
17. Админ
17.1. Управление ролями пользователя

POST /api/admin/users/42/roles

Тело:

{ "roles": ["client", "psychologist"] }

Права: только собственник.
17.2. Управление правами роли

POST /api/admin/roles/moderator/permissions
17.3. Список пользователей

GET /api/admin/users?role=psychologist&page=1&limit=20
17.4. Список всех заявок

GET /api/admin/applications?status=pending
17.5. Заблокировать пользователя

POST /api/admin/users/42/block
17.6. Логи действий

GET /api/admin/logs
18. Что дальше (этап 2)

    Чаты — личные и групповые.

    Сообщения — отправка, получение.

    Статьи — блог.

    Q&A — вопросы и ответы.

    Транскрибация — расшифровка сессий.

    Видеосессии — LiveKit / WebRTC.

    Email и SMS — реальные уведомления.

19. Открытые вопросы

    JWT: срок жизни токена — 7 дней? 30 дней?

    Пагинация: сколько элементов по умолчанию? (20?)

    Вебхуки: отдельный эндпоинт для уведомлений ЮKassa?

Документ обновлён: 24 сентября 2026.