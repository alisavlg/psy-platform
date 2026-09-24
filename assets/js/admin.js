// ============================================
// АДМИНКА / МОДЕРАЦИЯ
// ============================================

console.log('[admin.js] loaded');

const ADMIN_USER_KEY = 'psyhelp_user';
const ADMIN_APPS_KEY = 'psyhelp_applications';
const ADMIN_TASKS_KEY = 'psyhelp_tasks';

let currentRole = 'owner';
let currentTab = 'applications';
let currentModalContext = null;

function getUser() {
    try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY)) || {}; } catch (e) { return {}; }
}
function saveUser(u) { localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(u)); }

function getApps() {
    try { return JSON.parse(localStorage.getItem(ADMIN_APPS_KEY)) || []; } catch (e) { return []; }
}
function saveApps(a) { localStorage.setItem(ADMIN_APPS_KEY, JSON.stringify(a)); }

function getTasks() {
    try { return JSON.parse(localStorage.getItem(ADMIN_TASKS_KEY)) || []; } catch (e) { return []; }
}
function saveTasks(t) { localStorage.setItem(ADMIN_TASKS_KEY, JSON.stringify(t)); }

function getCurrentExecutorId() { return 'mod-1'; }

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}
function formatDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function statusLabel(s) { return STATUS_LABELS[s] || s; }
function genId(prefix) { return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (el) {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    var titles = {
        applications: 'Заявки на роль психолога',
        tasks: currentRole === 'owner' ? 'Мои задачи (делегированные)' : 'Мои задачи',
        decisions: 'Ожидают моего решения'
    };
    document.getElementById('pageTitle').textContent = titles[tab];
    render();
}

function render() {
    updateBadges();
    var el = document.getElementById('mainContent');
    if (currentRole === 'owner') {
        if (currentTab === 'applications') el.innerHTML = renderApplicationsOwner();
        else if (currentTab === 'tasks') el.innerHTML = renderTasksOwner();
        else if (currentTab === 'decisions') el.innerHTML = renderDecisionsOwner();
    } else {
        if (currentTab === 'applications') el.innerHTML = empty('Перейдите во вкладку «Мои задачи».');
        else if (currentTab === 'tasks') el.innerHTML = renderTasksModerator();
        else el.innerHTML = empty('Раздел доступен только собственнику.');
    }
    bindActions();
}

function updateBadges() {
    var tasks = getTasks();
    var apps = getApps();
    var pendingApps = apps.filter(function (a) { return a.status === 'pending'; }).length;
    var dec = tasks.filter(function (t) { return t.status === 'awaiting_decision'; }).length;
    var my = currentRole === 'moderator'
        ? tasks.filter(function (t) { return t.assigneeId === getCurrentExecutorId() && t.status === 'in_progress'; }).length
        : tasks.filter(function (t) { return t.status === 'in_progress'; }).length;

    var appsEl = document.getElementById('appsBadge');
    if (appsEl) appsEl.textContent = pendingApps || '';
    document.getElementById('tasksBadge').textContent = my || '';
    document.getElementById('decisionsBadge').textContent = dec || '';
}

function empty(text) { return '<div class="admin-empty">' + escapeHtml(text) + '</div>'; }

function renderApplicationsOwner() {
    var apps = getApps().filter(function (a) {
        return ['pending', 'in_review', 'awaiting_decision', 'needs_changes', 'needs_documents'].indexOf(a.status) !== -1;
    });
    if (!apps.length) return empty('Активных заявок нет.');
    return '<div class="admin-list">' + apps.map(renderAppCardOwner).join('') + '</div>';
}

function renderAppCardOwner(a) {
    var tasks = getTasks();
    var task = tasks.find(function (t) { return t.applicationId === a.id && t.status !== 'cancelled'; });

    var actionArea = '';
    if (a.status === 'pending') {
        actionArea =
            '<button class="admin-btn admin-btn-cancel" data-action="direct-approve" data-id="' + a.id + '">Одобрить самому</button>' +
            '<button class="admin-btn admin-btn-approve" data-action="delegate" data-id="' + a.id + '">Делегировать →</button>';
    } else if (a.status === 'in_review' && task) {
        actionArea = '<span class="admin-hint">Исполнитель: ' + escapeHtml(task.assigneeName) + '</span>';
    } else if (a.status === 'awaiting_decision' && task) {
        actionArea = '<button class="admin-btn admin-btn-approve" data-action="open-decision" data-id="' + task.id + '">К решению →</button>';
    } else if (a.status === 'needs_changes' || a.status === 'needs_documents') {
        actionArea = '<span class="admin-hint">Клиент правит заявку</span>';
    }

    return '<div class="admin-card ' + a.status + '">' +
        '<div class="admin-card-main">' +
            '<div class="admin-card-name">' + escapeHtml(a.userName) + '</div>' +
            '<div class="admin-card-meta">' +
                '<span class="admin-card-code">' + escapeHtml(a.userCode) + '</span>' +
                '<span>' + escapeHtml(a.specialty) + '</span>' +
                '<span>' + (a.experience || 0) + ' лет</span>' +
                '<span>' + (a.price || 0) + ' ₽</span>' +
                '<span class="admin-card-date">' + formatDate(a.submittedAt) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="admin-card-actions">' +
            '<span class="admin-card-status ' + a.status + '">' + statusLabel(a.status) + '</span>' +
            actionArea +
        '</div>' +
    '</div>';
}

function renderTasksOwner() {
    var tasks = getTasks().filter(function (t) { return t.status === 'in_progress' || t.status === 'awaiting_decision'; });
    if (!tasks.length) return empty('Активных задач нет.');
    return '<div class="admin-list">' + tasks.map(renderTaskCardOwner).join('') + '</div>';
}

function renderTaskCardOwner(t) {
    return '<div class="admin-card ' + (t.status === 'awaiting_decision' ? 'awaiting_decision' : 'in_review') + '">' +
        '<div class="admin-card-main">' +
            '<div class="admin-card-name">' + escapeHtml(t.title) + '</div>' +
            '<div class="admin-card-meta">' +
                '<span>Исполнитель: ' + escapeHtml(t.assigneeName) + '</span>' +
                '<span>Объект: ' + escapeHtml(t.targetName) + '</span>' +
                '<span class="admin-card-date">' + formatDate(t.createdAt) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="admin-card-actions">' +
            (t.status === 'awaiting_decision'
                ? '<button class="admin-btn admin-btn-approve" data-action="open-decision" data-id="' + t.id + '">К решению →</button>'
                : '<span class="admin-card-status in_review">В работе</span>') +
        '</div>' +
    '</div>';
}

function renderDecisionsOwner() {
    var tasks = getTasks().filter(function (t) { return t.status === 'awaiting_decision'; });
    if (!tasks.length) return empty('Нет задач, ожидающих вашего решения.');
    return '<div class="admin-list">' + tasks.map(renderTaskCardOwner).join('') + '</div>';
}

function renderTasksModerator() {
    var myId = getCurrentExecutorId();
    var tasks = getTasks().filter(function (t) { return t.assigneeId === myId; });
    if (!tasks.length) return empty('У вас пока нет задач.');
    return '<div class="admin-list">' + tasks.map(renderTaskCardModerator).join('') + '</div>';
}

function renderTaskCardModerator(t) {
    var action = '';
    if (t.status === 'in_progress') {
        action = '<button class="admin-btn admin-btn-approve" data-action="open-task" data-id="' + t.id + '">Открыть →</button>';
    } else if (t.status === 'awaiting_decision') {
        action = '<span class="admin-card-status awaiting_decision">Отправлено собственнику</span>';
    } else if (t.status === 'completed') {
        action = '<span class="admin-card-status approved">Завершена</span>';
    }
    return '<div class="admin-card ' + (t.status === 'completed' ? 'approved' : 'in_review') + '">' +
        '<div class="admin-card-main">' +
            '<div class="admin-card-name">' + escapeHtml(t.title) + '</div>' +
            '<div class="admin-card-meta">' +
                '<span>Объект: ' + escapeHtml(t.targetName) + '</span>' +
                '<span class="admin-card-date">' + formatDate(t.createdAt) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="admin-card-actions">' + action + '</div>' +
    '</div>';
}

function openDelegateModal(appId) {
    var app = getApps().find(function (a) { return a.id === appId; });
    if (!app) return;
    currentModalContext = { type: 'delegate', appId: appId };
    var tpl = CHECKLIST_TEMPLATES.verify_psychologist;

    document.getElementById('delegateBody').innerHTML =
        '<div class="admin-field">' +
            '<div class="admin-field-label">Заявка</div>' +
            '<div class="admin-field-value">' + escapeHtml(app.userName) + ' (' + escapeHtml(app.userCode) + ')</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Тип задачи</div>' +
            '<div class="admin-field-value">' + escapeHtml(tpl.title) + '</div>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Шаблон инструкции</div>' +
            '<ul class="checklist-preview">' +
                tpl.items.map(function (i) { return '<li>' + escapeHtml(i.text) + '</li>'; }).join('') +
            '</ul>' +
        '</div>' +
        '<div class="admin-field">' +
            '<div class="admin-field-label">Исполнитель</div>' +
            '<select id="delegateAssignee" class="admin-select">' +
                TEST_EXECUTORS.map(function (e) {
                    return '<option value="' + e.id + '">' + escapeHtml(e.name) + ' (' + e.code + ')</option>';
                }).join('') +
            '</select>' +
        '</div>';

    openModal('delegateModal');
}

function confirmDelegate() {
    var app = getApps().find(function (a) { return a.id === currentModalContext.appId; });
    if (!app) return;
    var assigneeId = document.getElementById('delegateAssignee').value;
    var executor = TEST_EXECUTORS.find(function (e) { return e.id === assigneeId; });
    var tpl = CHECKLIST_TEMPLATES.verify_psychologist;

    var task = {
        id: genId('task'),
        type: tpl.type,
        title: tpl.title + ': ' + app.userName,
        applicationId: app.id,
        targetName: app.userName,
        targetCode: app.userCode,
        assigneeId: assigneeId,
        assigneeName: executor.name,
        assigneeCode: executor.code,
        authorId: 'owner',
        checklist: tpl.items.map(function (i) { return { id: i.id, text: i.text, checked: false, comment: '' }; }),
        recommendation: '',
        recommendationReason: '',
        status: 'in_progress',
        createdAt: Date.now(),
        completedAt: null,
        finalDecision: '',
        finalDecisionReason: '',
        decidedAt: null
    };

    var tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);

    var apps = getApps();
    var ai = apps.findIndex(function (a) { return a.id === app.id; });
    apps[ai].status = 'in_review';
    apps[ai].taskId = task.id;
    saveApps(apps);

    closeModal('delegateModal');
    render();
}

function openTaskModal(taskId) {
    var t = getTasks().find(function (x) { return x.id === taskId; });
    if (!t) return;
    currentModalContext = { type: 'task', taskId: taskId };
    document.getElementById('taskModalTitle').textContent = t.title;

    var html = '';
    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Объект проверки</div>' +
        '<div class="admin-field-value">' + escapeHtml(t.targetName) + ' (' + escapeHtml(t.targetCode) + ')</div>' +
    '</div>';

    html += '<div class="admin-field"><div class="admin-field-label">Чек-лист</div><div class="checklist">';
    t.checklist.forEach(function (item) {
        html += '<div class="checklist-item">' +
            '<label class="checklist-row">' +
                '<input type="checkbox" data-check-id="' + item.id + '"' + (item.checked ? ' checked' : '') + '>' +
                '<span>' + escapeHtml(item.text) + '</span>' +
            '</label>' +
            '<textarea class="checklist-comment" data-comment-id="' + item.id + '" placeholder="Комментарий к пункту...">' + escapeHtml(item.comment || '') + '</textarea>' +
        '</div>';
    });
    html += '</div></div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Рекомендация</div>' +
        '<select id="taskRecommendation" class="admin-select">' +
            '<option value="">— выберите —</option>' +
            '<option value="approve"' + (t.recommendation === 'approve' ? ' selected' : '') + '>Одобрить</option>' +
            '<option value="reject"' + (t.recommendation === 'reject' ? ' selected' : '') + '>Отклонить</option>' +
            '<option value="request_changes"' + (t.recommendation === 'request_changes' ? ' selected' : '') + '>Запросить изменения</option>' +
            '<option value="request_documents"' + (t.recommendation === 'request_documents' ? ' selected' : '') + '>Запросить документы</option>' +
        '</select>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Аргументация</div>' +
        '<textarea id="taskReason" class="admin-reject-reason" placeholder="Почему так? Что важно знать собственнику...">' + escapeHtml(t.recommendationReason || '') + '</textarea>' +
    '</div>';

    document.getElementById('taskModalBody').innerHTML = html;

    var actions = document.getElementById('taskModalActions');
    if (t.status === 'in_progress') {
        actions.innerHTML =
            '<button class="admin-btn admin-btn-cancel" data-close="taskModal">Закрыть</button>' +
            '<button class="admin-btn admin-btn-approve" id="submitTask">Отправить собственнику</button>';
        document.getElementById('submitTask').onclick = function () { submitTask(taskId); };
    } else {
        actions.innerHTML = '<button class="admin-btn admin-btn-cancel" data-close="taskModal">Закрыть</button>';
    }

    openModal('taskModal');
}

function collectChecklist() {
    var items = [];
    document.querySelectorAll('.checklist-item').forEach(function (el) {
        var cb = el.querySelector('input[type="checkbox"]');
        var ta = el.querySelector('textarea');
        items.push({
            id: cb.dataset.checkId,
            text: el.querySelector('span').textContent,
            checked: cb.checked,
            comment: ta.value.trim()
        });
    });
    return items;
}

function submitTask(taskId) {
    var t = getTasks().find(function (x) { return x.id === taskId; });
    if (!t) return;

    var recommendation = document.getElementById('taskRecommendation').value;
    var reason = document.getElementById('taskReason').value.trim();
    if (!recommendation) { alert('Выберите рекомендацию'); return; }
    if (!reason) { alert('Напишите аргументацию'); return; }

    var checklist = collectChecklist();
    var unchecked = checklist.filter(function (i) { return !i.checked; }).length;
    if (unchecked > 0 && !confirm('Есть неотмеченные пункты (' + unchecked + '). Всё равно отправить?')) return;

    t.checklist = checklist;
    t.recommendation = recommendation;
    t.recommendationReason = reason;
    t.status = 'awaiting_decision';
    t.completedAt = Date.now();

    var tasks = getTasks();
    var ti = tasks.findIndex(function (x) { return x.id === taskId; });
    tasks[ti] = t;
    saveTasks(tasks);

    var apps = getApps();
    var ai = apps.findIndex(function (a) { return a.id === t.applicationId; });
    if (ai !== -1) { apps[ai].status = 'awaiting_decision'; saveApps(apps); }

    closeModal('taskModal');
    render();
}

function openDecisionModal(taskId) {
    var t = getTasks().find(function (x) { return x.id === taskId; });
    if (!t) return;
    currentModalContext = { type: 'decision', taskId: taskId };

    var html = '';
    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Исполнитель</div>' +
        '<div class="admin-field-value">' + escapeHtml(t.assigneeName) + ' (' + escapeHtml(t.assigneeCode) + ')</div>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Чек-лист исполнителя</div>' +
        '<ul class="checklist-done">' +
            t.checklist.map(function (i) {
                return '<li>' +
                    '<span class="' + (i.checked ? 'done' : 'not-done') + '">' + (i.checked ? '✓' : '○') + '</span> ' +
                    escapeHtml(i.text) +
                    (i.comment ? '<div class="checklist-done-comment">' + escapeHtml(i.comment) + '</div>' : '') +
                '</li>';
            }).join('') +
        '</ul>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Рекомендация исполнителя</div>' +
        '<div class="admin-field-value"><strong>' + escapeHtml(RECOMMENDATION_LABELS[t.recommendation] || t.recommendation) + '</strong></div>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Аргументация</div>' +
        '<div class="admin-field-value">' + escapeHtml(t.recommendationReason) + '</div>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Ваше финальное решение</div>' +
        '<select id="finalDecision" class="admin-select">' +
            '<option value="">— выберите —</option>' +
            '<option value="approved"' + (t.recommendation === 'approve' ? ' selected' : '') + '>Одобрить</option>' +
            '<option value="rejected"' + (t.recommendation === 'reject' ? ' selected' : '') + '>Отклонить</option>' +
            '<option value="needs_changes"' + (t.recommendation === 'request_changes' ? ' selected' : '') + '>Запросить изменения</option>' +
            '<option value="needs_documents"' + (t.recommendation === 'request_documents' ? ' selected' : '') + '>Запросить документы</option>' +
        '</select>' +
    '</div>';

    html += '<div class="admin-field">' +
        '<div class="admin-field-label">Комментарий клиенту (виден в его профиле)</div>' +
        '<textarea id="finalReason" class="admin-reject-reason" placeholder="Что не так, что нужно исправить или догрузить..."></textarea>' +
    '</div>';

    document.getElementById('decisionBody').innerHTML = html;

    var actions = document.getElementById('decisionActions');
    actions.innerHTML = '<button class="admin-btn admin-btn-approve" id="confirmDecision">Применить решение</button>';
    document.getElementById('confirmDecision').onclick = function () { applyFinalDecision(taskId); };

    openModal('decisionModal');
}

function applyFinalDecision(taskId) {
    var decision = document.getElementById('finalDecision').value;
    var reason = document.getElementById('finalReason').value.trim();

    if (!decision) { alert('Выберите решение'); return; }
    if ((decision === 'rejected' || decision === 'needs_changes' || decision === 'needs_documents') && !reason) {
        alert('Для этого решения нужен комментарий клиенту');
        return;
    }

    var tasks = getTasks();
    var ti = tasks.findIndex(function (x) { return x.id === taskId; });
    var t = tasks[ti];
    t.status = 'completed';
    t.finalDecision = decision;
    t.finalDecisionReason = reason;
    t.decidedAt = Date.now();
    saveTasks(tasks);

    var apps = getApps();
    var ai = apps.findIndex(function (a) { return a.id === t.applicationId; });
    if (ai !== -1) {
        apps[ai].status = decision;
        apps[ai].reviewedAt = Date.now();
        apps[ai].finalDecisionReason = reason;
        saveApps(apps);
    }

    // Обновляем профиль клиента
    var user = getUser();
    if (ai !== -1 && user.id === apps[ai].userId) {
        var decidedApp = user.psychologistApplication || {};

                // Уведомление клиенту
        if (typeof window.Notifications !== 'undefined') {
            var notifMap = {
                'approved': {
                    type: 'application_approved',
                    title: 'Заявка одобрена',
                    text: 'Ваша заявка на роль психолога одобрена. Кабинет психолога активирован.',
                    link: 'dashboard.html?section=calendar'
                },
                'rejected': {
                    type: 'application_rejected',
                    title: 'Заявка отклонена',
                    text: reason || 'Посмотрите комментарий в профиле.',
                    link: 'client.html?section=profile'
                },
                'needs_changes': {
                    type: 'application_needs_changes',
                    title: 'Нужны изменения в заявке',
                    text: reason || 'Посмотрите комментарий в профиле.',
                    link: 'client.html?section=profile'
                },
                'needs_documents': {
                    type: 'application_needs_documents',
                    title: 'Нужны документы',
                    text: reason || 'Догрузите документы в заявку.',
                    link: 'client.html?section=profile'
                }
            };
            if (notifMap[decision]) {
                window.Notifications.add(notifMap[decision]);
            }
        }

        // 1. Добавляем запись в историю заявок клиента
        if (!Array.isArray(user.psychologistHistory)) user.psychologistHistory = [];
        user.psychologistHistory.push({
            specialty: decidedApp.specialty || apps[ai].specialty || '',
            experience: decidedApp.experience || apps[ai].experience || 0,
            price: decidedApp.price || apps[ai].price || 0,
            submittedAt: decidedApp.submittedAt || apps[ai].submittedAt || Date.now(),
            status: decision,
            reason: reason,
            decidedAt: Date.now()
        });

        // 2. Обновляем статус и роли
        if (decision === 'approved') {
            user.psychologistStatus = 'approved';
            user.roles = Array.isArray(user.roles) ? user.roles : ['client'];
            if (user.roles.indexOf('psychologist') === -1) user.roles.push('psychologist');
            delete user.psychologistApplication;
        } else if (decision === 'rejected') {
            user.psychologistStatus = 'rejected';
            if (user.psychologistApplication) {
                user.psychologistApplication.finalDecisionReason = reason;
            }
        } else if (decision === 'needs_changes' || decision === 'needs_documents') {
            user.psychologistStatus = decision;
            if (user.psychologistApplication) {
                user.psychologistApplication.finalDecisionReason = reason;
            }


        }

        saveUser(user);
    }

    closeModal('decisionModal');
    render();
}

function directApprove(appId) {
    if (!confirm('Одобрить заявку без делегирования?')) return;
    var apps = getApps();
    var ai = apps.findIndex(function (a) { return a.id === appId; });
    if (ai === -1) return;
    apps[ai].status = 'approved';
    apps[ai].reviewedAt = Date.now();
    saveApps(apps);

    var user = getUser();
    if (user.id === apps[ai].userId) {
        var decidedApp = user.psychologistApplication || {};
        if (!Array.isArray(user.psychologistHistory)) user.psychologistHistory = [];
        user.psychologistHistory.push({
            specialty: decidedApp.specialty || apps[ai].specialty || '',
            experience: decidedApp.experience || apps[ai].experience || 0,
            price: decidedApp.price || apps[ai].price || 0,
            submittedAt: decidedApp.submittedAt || apps[ai].submittedAt || Date.now(),
            status: 'approved',
            reason: '',
            decidedAt: Date.now()
        });
        user.psychologistStatus = 'approved';
        user.roles = Array.isArray(user.roles) ? user.roles : ['client'];
        if (user.roles.indexOf('psychologist') === -1) user.roles.push('psychologist');
        delete user.psychologistApplication;
        saveUser(user);
    }
    render();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function bindActions() {
    document.querySelectorAll('[data-action="delegate"]').forEach(function (b) {
        b.onclick = function () { openDelegateModal(b.dataset.id); };
    });
    document.querySelectorAll('[data-action="direct-approve"]').forEach(function (b) {
        b.onclick = function () { directApprove(b.dataset.id); };
    });
    document.querySelectorAll('[data-action="open-task"]').forEach(function (b) {
        b.onclick = function () { openTaskModal(b.dataset.id); };
    });
    document.querySelectorAll('[data-action="open-decision"]').forEach(function (b) {
        b.onclick = function () { openDecisionModal(b.dataset.id); };
    });
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (el) {
        el.onclick = function (e) { e.preventDefault(); setTab(el.dataset.tab); };
    });
    document.getElementById('roleSelect').onchange = function (e) {
        currentRole = e.target.value;
        if (currentRole === 'moderator') setTab('tasks');
        else setTab('applications');
    };
    document.querySelectorAll('[data-close]').forEach(function (el) {
        el.onclick = function () { closeModal(el.dataset.close); };
    });
    document.querySelectorAll('.admin-modal-overlay').forEach(function (overlay) {
        overlay.onclick = function (e) { if (e.target === overlay) overlay.classList.remove('open'); };
    });
    document.getElementById('delegateConfirm').onclick = confirmDelegate;
    setTab('applications');
});