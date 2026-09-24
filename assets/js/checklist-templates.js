// ============================================
// ШАБЛОНЫ ИНСТРУКЦИЙ ДЛЯ ЗАДАЧ
// ============================================

const CHECKLIST_TEMPLATES = {
  verify_psychologist: {
    type: 'verify_psychologist',
    title: 'Одобрение профиля психолога',
    description: 'Проверить документы, провести собеседование, оценить компетенции.',
    items: [
      { id: 'diploma', text: 'Диплом: ВУЗ, специальность, подлинность' },
      { id: 'certificates', text: 'Сертификаты повышения квалификации' },
      { id: 'experience', text: 'Стаж: соответствует заявленному' },
      { id: 'interview', text: 'Собеседование: компетенции, подход' },
      { id: 'description', text: 'Описание: без обещаний «вылечу за 1 сессию», без контактов' },
      { id: 'rules', text: 'Согласие с правилами платформы' }
    ]
  }
};

// Для прототипа — список доступных исполнителей
const TEST_EXECUTORS = [
  { id: 'mod-1', code: 'MK-1111', name: 'Мария Кузнецова' },
  { id: 'mod-2', code: 'AP-2222', name: 'Алексей Петров' },
  { id: 'mod-3', code: 'SV-3333', name: 'Светлана Волкова' }
];

const RECOMMENDATION_LABELS = {
  approve: 'Одобрить',
  reject: 'Отклонить',
  request_changes: 'Запросить изменения',
  request_documents: 'Запросить документы'
};

const STATUS_LABELS = {
  pending: 'На проверке',
  in_review: 'На рассмотрении',
  awaiting_decision: 'Ждёт решения',
  needs_changes: 'Нужны изменения',
  needs_documents: 'Нужны документы',
  approved: 'Одобрена',
  rejected: 'Отклонена'
};