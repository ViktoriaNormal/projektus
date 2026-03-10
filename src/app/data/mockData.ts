// Моковые данные для прототипа

export const currentUser = {
  id: 1,
  username: "admin",
  email: "admin@company.ru",
  fullName: "Иванов Иван Иванович",
  avatarUrl: null,
  isActive: true,
  role: "Администратор",
};

export const users = [
  {
    id: 1,
    username: "admin",
    email: "admin@company.ru",
    fullName: "Иванов Иван Иванович",
    avatarUrl: null,
    isActive: true,
    role: "Администратор",
  },
  {
    id: 2,
    username: "petrova",
    email: "petrova@company.ru",
    fullName: "Петрова Анна Сергеевна",
    avatarUrl: null,
    isActive: true,
    role: "Scrum-мастер",
  },
  {
    id: 3,
    username: "sidorov",
    email: "sidorov@company.ru",
    fullName: "Сидоров Пётр Дмитриевич",
    avatarUrl: null,
    isActive: true,
    role: "Владелец продукта",
  },
  {
    id: 4,
    username: "kuznetsova",
    email: "kuznetsova@company.ru",
    fullName: "Кузнецова Мария Александровна",
    avatarUrl: null,
    isActive: true,
    role: "Разработчик",
  },
  {
    id: 5,
    username: "smirnov",
    email: "smirnov@company.ru",
    fullName: "Смирнов Алексей Викторович",
    avatarUrl: null,
    isActive: true,
    role: "Разработчик",
  },
  {
    id: 6,
    username: "novikova",
    email: "novikova@company.ru",
    fullName: "Новикова Елена Павловна",
    avatarUrl: null,
    isActive: false,
    role: "Тестировщик",
  },
  {
    id: 7,
    username: "fedorov",
    email: "fedorov@company.ru",
    fullName: "Фёдоров Дмитрий Андреевич",
    avatarUrl: null,
    isActive: true,
    role: "Разработчик",
  },
  {
    id: 8,
    username: "volkova",
    email: "volkova@company.ru",
    fullName: "Волкова Ольга Николаевна",
    avatarUrl: null,
    isActive: true,
    role: "Тестировщик",
  },
];

export const projects = [
  {
    id: 1,
    key: "ECOM",
    name: "Электронная коммерция",
    type: "scrum",
    description: "Разработка нового интернет-магазина с современным UX/UI",
    status: "Активный",
    ownerId: 3,
    createdAt: "2025-01-15",
    memberCount: 8,
    taskCount: 45,
    members: [1, 2, 3, 4, 5],
  },
  {
    id: 2,
    key: "MOBILE",
    name: "Мобильное приложение",
    type: "scrum",
    description: "iOS и Android приложение для клиентов",
    status: "Активный",
    ownerId: 3,
    createdAt: "2025-02-01",
    memberCount: 6,
    taskCount: 32,
    members: [3, 5, 6, 7],
  },
  {
    id: 3,
    key: "SUPPORT",
    name: "Техническая поддержка",
    type: "kanban",
    description: "Обработка запросов пользователей",
    status: "Активный",
    ownerId: 2,
    createdAt: "2024-11-10",
    memberCount: 5,
    taskCount: 127,
    members: [2, 4, 6, 8],
  },
  {
    id: 4,
    key: "INFRA",
    name: "Инфраструктура",
    type: "kanban",
    description: "Поддержка и развитие серверной инфраструктуры",
    status: "Активный",
    ownerId: 1,
    createdAt: "2024-12-05",
    memberCount: 4,
    taskCount: 23,
    members: [1, 5, 7],
  },
  {
    id: 5,
    key: "OLD",
    name: "Устаревший проект",
    type: "scrum",
    description: "Завершённый проект",
    status: "Архивирован",
    ownerId: 2,
    createdAt: "2024-06-01",
    memberCount: 3,
    taskCount: 89,
    members: [2, 6, 8],
  },
];

export const tasks = [
  {
    id: 1,
    key: "ECOM-101",
    projectId: 1,
    title: "Разработка системы авторизации",
    description: "Реализовать OAuth 2.0 с поддержкой социальных сетей",
    priority: "Высокий",
    status: "В работе",
    authorId: 3,
    assigneeId: 5,
    createdAt: "2025-02-20T09:30:00",
    updatedAt: "2025-02-28T15:45:00",
    dueDate: "2025-03-05",
    storyPoints: 8,
    tags: ["Backend", "Security"],
    progress: 60,
  },
  {
    id: 2,
    key: "ECOM-102",
    projectId: 1,
    title: "Дизайн главной страницы",
    description: "Создать макеты в Figma с учётом брендбука",
    priority: "Средний",
    status: "Выполнено",
    authorId: 3,
    assigneeId: 4,
    createdAt: "2025-02-18",
    dueDate: "2025-02-25",
    storyPoints: 5,
    tags: ["Design", "UI/UX"],
    progress: 100,
  },
  {
    id: 3,
    key: "ECOM-103",
    projectId: 1,
    title: "Интеграция платёжной системы",
    description: "Подключить Stripe и ЮKassa",
    priority: "Критический",
    status: "Бэклог",
    authorId: 3,
    assigneeId: null,
    createdAt: "2025-02-22",
    dueDate: "2025-03-10",
    storyPoints: 13,
    tags: ["Backend", "Payment"],
    progress: 0,
  },
  {
    id: 4,
    key: "MOBILE-45",
    projectId: 2,
    title: "Push-уведомления",
    description: "Реализовать систему push-уведомлений для iOS и Android",
    priority: "Высокий",
    status: "В работе",
    authorId: 3,
    assigneeId: 5,
    createdAt: "2025-02-23",
    dueDate: "2025-03-01",
    storyPoints: 8,
    tags: ["Mobile", "Notifications"],
    progress: 40,
  },
  {
    id: 5,
    key: "SUPPORT-234",
    projectId: 3,
    title: "Проблема с авторизацией пользователя #12345",
    description: "Пользователь не может войти в систему",
    priority: "Критический",
    status: "В работе",
    authorId: 2,
    assigneeId: 4,
    createdAt: "2025-02-25",
    dueDate: "2025-02-25",
    tags: ["Bug", "Urgent"],
    progress: 75,
    serviceClass: "Ускоренный",
  },
  {
    id: 6,
    key: "INFRA-18",
    projectId: 4,
    title: "Настройка мониторинга",
    description: "Установить и настроить Prometheus + Grafana",
    priority: "Средний",
    status: "Планирование",
    authorId: 1,
    assigneeId: null,
    createdAt: "2025-02-24",
    dueDate: "2025-03-15",
    tags: ["DevOps", "Monitoring"],
    progress: 0,
  },
  {
    id: 7,
    key: "ECOM-107",
    projectId: 1,
    title: "Тестирование OAuth интеграции",
    description: "Провести комплексное тестирование системы авторизации",
    priority: "Высокий",
    status: "Бэклог",
    authorId: 5,
    assigneeId: 8,
    createdAt: "2025-02-24",
    dueDate: "2025-03-06",
    storyPoints: 3,
    tags: ["Testing", "Security"],
    progress: 0,
  },
];

export const sprints = [
  {
    id: 1,
    projectId: 1,
    name: "Спринт 5",
    goal: "Завершить авторизацию и начать работу над каталогом товаров",
    startDate: "2025-02-17",
    endDate: "2025-03-02",
    status: "active",
    completedPoints: 21,
    totalPoints: 34,
  },
  {
    id: 2,
    projectId: 1,
    name: "Спринт 6",
    goal: "Реализация корзины и оформления заказа",
    startDate: "2025-03-03",
    endDate: "2025-03-16",
    status: "planned",
    completedPoints: 0,
    totalPoints: 40,
  },
  {
    id: 3,
    projectId: 2,
    name: "Спринт 3",
    goal: "Доработка профиля пользователя и уведомлений",
    startDate: "2025-02-24",
    endDate: "2025-03-09",
    status: "active",
    completedPoints: 8,
    totalPoints: 21,
  },
];

export const meetings = [
  // Текущая неделя (24-28 февраля 2026)
  { id: 20, title: "Daily Scrum", type: "daily_scrum", projectId: 1, startTime: "2026-02-24T09:30:00", endTime: "2026-02-24T09:45:00", participants: [2, 3, 4, 5], location: "Online (Zoom)" },
  { id: 49, title: "Ежедневная встреча Kanban", type: "kanban_daily", projectId: 3, startTime: "2026-02-25T10:00:00", endTime: "2026-02-25T10:15:00", participants: [2, 4, 6, 8], location: "У доски задач" },
  { id: 22, title: "Daily Scrum", type: "daily_scrum", projectId: 1, startTime: "2026-02-26T09:30:00", endTime: "2026-02-26T09:45:00", participants: [2, 3, 4, 5], location: "Online (Zoom)" },
];

export const roles = [
  {
    id: 1,
    name: "Администратор",
    description: "Полный доступ ко всей системе",
    isSystem: true,
    userCount: 1,
  },
  {
    id: 2,
    name: "Scrum-мастер",
    description: "Управление Scrum-процессами",
    isSystem: true,
    userCount: 2,
  },
  {
    id: 3,
    name: "Владелец продукта",
    description: "Управление бэклогом и приоритетами",
    isSystem: true,
    userCount: 2,
  },
  {
    id: 4,
    name: "Член команды разработки",
    description: "Выполнение задач разработки",
    isSystem: true,
    userCount: 8,
  },
  {
    id: 5,
    name: "Менеджер проекта (Kanban)",
    description: "Управление Kanban-проектами",
    isSystem: true,
    userCount: 3,
  },
];

export const passwordPolicy = {
  minLength: 8,
  requireDigits: true,
  requireLowercase: true,
  requireUppercase: true,
  requireSpecial: true,
  notes: "Пароль должен содержать минимум 8 символов, включая цифры, заглавные и строчные буквы, а также специальные символы",
};

export const notifications = [
  {
    id: 1,
    type: "task_assigned",
    message: "Вам назначена задача ECOM-105",
    read: false,
    timestamp: "2025-02-25T15:30:00",
  },
  {
    id: 2,
    type: "meeting_invite",
    message: "Приглашение на встречу: Планирование спринта 6",
    read: false,
    timestamp: "2025-02-25T14:15:00",
  },
  {
    id: 3,
    type: "comment_mention",
    message: "Вас упомянули в комментарии к MOBILE-45",
    read: true,
    timestamp: "2025-02-25T11:45:00",
  },
];

// Задачи для доски (Board view)
export const boardTasks = [
  { id: 1, key: "ECOM-1", title: "Разработать страницу каталога товаров", priority: "Высокий", assigneeId: 2, columnId: 1, swimlaneId: 1, tags: ["Frontend", "UI"], storyPoints: 8, status: "Бэклог спринта" },
  { id: 2, key: "ECOM-2", title: "Настроить интеграцию с платежной системой", priority: "Критический", assigneeId: 3, columnId: 2, swimlaneId: 1, tags: ["Backend", "Payment"], storyPoints: 13, status: "В работе" },
  { id: 3, key: "ECOM-3", title: "Создать дизайн корзины покупок", priority: "Средний", assigneeId: 5, columnId: 3, swimlaneId: null, tags: ["Design", "UI/UX"], storyPoints: 5, status: "На ревью" },
  { id: 4, key: "ECOM-4", title: "Реализовать систему фильтров", priority: "Средний", assigneeId: 2, columnId: 2, swimlaneId: 2, tags: ["Frontend"], storyPoints: 5, status: "В работе" },
  { id: 5, key: "ECOM-5", title: "Оптимизировать загрузку изображений", priority: "Низкий", assigneeId: null, columnId: 1, swimlaneId: 3, tags: ["Performance"], storyPoints: 3, status: "Бэклог спринта" },
  { id: 6, key: "ECOM-6", title: "Добавить мобильную версию каталога", priority: "Высокий", assigneeId: 4, columnId: 4, swimlaneId: 2, tags: ["Mobile", "Frontend"], storyPoints: 8, status: "Тестирование" },
  { id: 7, key: "ECOM-7", title: "Исправить баги авторизации", priority: "Критический", assigneeId: 3, columnId: 2, swimlaneId: 1, tags: ["Backend", "Security"], storyPoints: 3, status: "В работе" },
  { id: 8, key: "ECOM-8", title: "Написать документацию API", priority: "Низкий", assigneeId: null, columnId: 1, swimlaneId: 3, tags: ["Documentation"], storyPoints: 5, status: "Бэклог спринта" },
];

export const analyticsData = {
  velocity: [
    { sprint: "Спринт 1", planned: 34, completed: 32 },
    { sprint: "Спринт 2", planned: 38, completed: 38 },
    { sprint: "Спринт 3", planned: 36, completed: 30 },
    { sprint: "Спринт 4", planned: 40, completed: 41 },
    { sprint: "Спринт 5", planned: 34, completed: 21 },
  ],
  burndown: [
    { day: "День 1", remaining: 34, ideal: 34 },
    { day: "День 2", remaining: 32, ideal: 31 },
    { day: "День 3", remaining: 29, ideal: 28 },
    { day: "День 4", remaining: 26, ideal: 25 },
    { day: "День 5", remaining: 21, ideal: 22 },
    { day: "День 6", remaining: 18, ideal: 19 },
    { day: "День 7", remaining: 15, ideal: 17 },
    { day: "День 8", remaining: 13, ideal: 14 },
  ],
  cumulativeFlow: [
    { date: "01.02", backlog: 45, ready: 8, progress: 5, testing: 2, done: 15 },
    { date: "05.02", backlog: 42, ready: 7, progress: 6, testing: 3, done: 20 },
    { date: "10.02", backlog: 38, ready: 9, progress: 5, testing: 2, done: 25 },
    { date: "15.02", backlog: 35, ready: 6, progress: 7, testing: 3, done: 30 },
    { date: "20.02", backlog: 30, ready: 8, progress: 6, testing: 2, done: 35 },
    { date: "25.02", backlog: 25, ready: 7, progress: 5, testing: 3, done: 40 },
  ],
  cycleTime: [
    { task: "ECOM-95", time: 3.5 },
    { task: "ECOM-96", time: 5.2 },
    { task: "ECOM-97", time: 2.8 },
    { task: "ECOM-98", time: 7.1 },
    { task: "ECOM-99", time: 4.3 },
    { task: "ECOM-100", time: 6.5 },
  ],
  throughput: [
    { week: "Нед 1", count: 12 },
    { week: "Нед 2", count: 15 },
    { week: "Нед 3", count: 11 },
    { week: "Нед 4", count: 14 },
  ],
  avgCycleTime: [
    { week: "Нед 1", avg: 5.2, p50: 4.8, p85: 7.2 },
    { week: "Нед 2", avg: 4.8, p50: 4.5, p85: 6.8 },
    { week: "Нед 3", avg: 5.5, p50: 5.0, p85: 7.5 },
    { week: "Нед 4", avg: 4.3, p50: 4.0, p85: 6.2 },
    { week: "Нед 5", avg: 4.9, p50: 4.6, p85: 6.9 },
  ],
  throughputTrend: [
    { week: "Нед 1", actual: 12, trend: 12 },
    { week: "Нед 2", actual: 15, trend: 12.5 },
    { week: "Нед 3", actual: 11, trend: 13 },
    { week: "Нед 4", actual: 14, trend: 13.5 },
    { week: "Нед 5", actual: 16, trend: 14 },
  ],
  wip: [
    { date: "01.02", wip: 12, limit: 15 },
    { date: "05.02", wip: 14, limit: 15 },
    { date: "10.02", wip: 16, limit: 15 },
    { date: "15.02", wip: 13, limit: 15 },
    { date: "20.02", wip: 11, limit: 15 },
    { date: "25.02", wip: 14, limit: 15 },
  ],
  wipAge: [
    { date: "01.02", avgAge: 4.2, maxAge: 8 },
    { date: "05.02", avgAge: 4.8, maxAge: 10 },
    { date: "10.02", avgAge: 5.2, maxAge: 12 },
    { date: "15.02", avgAge: 4.5, maxAge: 9 },
    { date: "20.02", avgAge: 3.9, maxAge: 7 },
    { date: "25.02", avgAge: 4.1, maxAge: 8 },
  ],
  cycleTimeDistribution: [
    { range: "0-2", count: 8 },
    { range: "2-4", count: 15 },
    { range: "4-6", count: 22 },
    { range: "6-8", count: 12 },
    { range: "8-10", count: 6 },
    { range: "10+", count: 3 },
  ],
  throughputDistribution: [
    { range: "8-10", count: 2 },
    { range: "10-12", count: 4 },
    { range: "12-14", count: 8 },
    { range: "14-16", count: 5 },
    { range: "16-18", count: 3 },
  ],
};

// Шаблоны проектов
export const projectTemplates = [
  {
    id: 1,
    name: "Scrum стандартный",
    type: "scrum",
    description: "Стандартный шаблон для Scrum-проектов с настройками по умолчанию",
    columns: [
      { id: "backlog", name: "Бэклог спринта", type: "initial", order: 1 },
      { id: "todo", name: "Нужно сделать", type: "initial", order: 2 },
      { id: "in-progress", name: "В работе", type: "in_progress", order: 3 },
      { id: "review", name: "На ревью", type: "in_progress", order: 4 },
      { id: "done", name: "Выполнено", type: "completed", order: 5 },
    ],
    customFields: [],
    isSystem: true,
    createdBy: 1,
    createdAt: "2024-01-10",
  },
  {
    id: 2,
    name: "Kanban стандартный",
    type: "kanban",
    description: "Стандартный шаблон для Kanban-проектов с WIP лимитами",
    columns: [
      { id: "backlog", name: "Бэклог", type: "initial", wipLimit: null, order: 1 },
      { id: "ready", name: "Готово к работе", type: "initial", wipLimit: 5, order: 2 },
      { id: "in-progress", name: "В работе", type: "in_progress", wipLimit: 3, order: 3 },
      { id: "testing", name: "Тестирование", type: "in_progress", wipLimit: 2, order: 4 },
      { id: "done", name: "Завершено", type: "completed", wipLimit: null, order: 5 },
    ],
    customFields: [
      { id: "serviceClass", name: "Класс обслуживания", type: "select", options: ["Стандартный", "Ускоренный", "Срочный"] },
    ],
    isSystem: true,
    createdBy: 1,
    createdAt: "2024-01-10",
  },
  {
    id: 3,
    name: "Техподдержка",
    type: "kanban",
    description: "Шаблон для команд технической поддержки",
    columns: [
      { id: "new", name: "Новые", type: "initial", wipLimit: null, order: 1 },
      { id: "assigned", name: "Назначены", type: "initial", wipLimit: 10, order: 2 },
      { id: "in-progress", name: "В работе", type: "in_progress", wipLimit: 5, order: 3 },
      { id: "waiting", name: "Ожидание", type: "on_pause", wipLimit: null, order: 4 },
      { id: "resolved", name: "Решено", type: "completed", wipLimit: null, order: 5 },
      { id: "closed", name: "Закрыто", type: "completed", wipLimit: null, order: 6 },
    ],
    customFields: [
      { id: "priority", name: "Приоритет", type: "select", options: ["Низкий", "Средний", "Высокий", "Критический"] },
      { id: "category", name: "Категория", type: "select", options: ["Баг", "Вопрос", "Запрос", "Инцидент"] },
    ],
    isSystem: false,
    createdBy: 1,
    createdAt: "2025-01-15",
  },
];

// Роли участников проекта
export const projectRoles = [
  { id: 1, name: "Владелец проекта", permissions: ["all"], isSystem: true },
  { id: 2, name: "Администратор проекта", permissions: ["manage_members", "manage_tasks", "manage_board", "view_analytics"], isSystem: true },
  { id: 3, name: "Разработчик", permissions: ["create_tasks", "edit_tasks", "view_board", "comment"], isSystem: true },
  { id: 4, name: "Наблюдатель", permissions: ["view_board", "view_analytics", "comment"], isSystem: true },
  { id: 5, name: "Scrum-мастер", permissions: ["manage_sprints", "manage_board", "manage_tasks", "view_analytics"], isSystem: true },
  { id: 6, name: "Product Owner", permissions: ["manage_backlog", "prioritize_tasks", "view_analytics"], isSystem: true },
];

// Участники проектов с ролями
export const projectMembers = [
  // Проект ECOM
  { id: 1, projectId: 1, userId: 1, roleId: 1, joinedAt: "2025-01-15" },
  { id: 2, projectId: 1, userId: 2, roleId: 5, joinedAt: "2025-01-15" },
  { id: 3, projectId: 1, userId: 3, roleId: 6, joinedAt: "2025-01-15" },
  { id: 4, projectId: 1, userId: 4, roleId: 3, joinedAt: "2025-01-16" },
  { id: 5, projectId: 1, userId: 5, roleId: 3, joinedAt: "2025-01-16" },
  // Проект MOBILE
  { id: 6, projectId: 2, userId: 3, roleId: 1, joinedAt: "2025-02-01" },
  { id: 7, projectId: 2, userId: 5, roleId: 3, joinedAt: "2025-02-01" },
  { id: 8, projectId: 2, userId: 6, roleId: 3, joinedAt: "2025-02-02" },
  { id: 9, projectId: 2, userId: 7, roleId: 3, joinedAt: "2025-02-02" },
  // Проект SUPPORT
  { id: 10, projectId: 3, userId: 2, roleId: 1, joinedAt: "2024-11-10" },
  { id: 11, projectId: 3, userId: 4, roleId: 3, joinedAt: "2024-11-10" },
  { id: 12, projectId: 3, userId: 6, roleId: 3, joinedAt: "2024-11-11" },
  { id: 13, projectId: 3, userId: 8, roleId: 3, joinedAt: "2024-11-11" },
  // Проект INFRA
  { id: 14, projectId: 4, userId: 1, roleId: 1, joinedAt: "2024-12-05" },
  { id: 15, projectId: 4, userId: 5, roleId: 3, joinedAt: "2024-12-05" },
  { id: 16, projectId: 4, userId: 7, roleId: 3, joinedAt: "2024-12-06" },
];

// Доски задач (несколько досок на проект)
export const boards = [
  { id: 1, projectId: 1, name: "Основная доска разработки", description: "Доска для отслеживания разработки", isDefault: true, order: 1, createdAt: "2025-01-15" },
  { id: 2, projectId: 1, name: "Доска дизайна", description: "Отдельная доска для дизайн-задач", isDefault: false, order: 2, createdAt: "2025-01-20" },
  { id: 3, projectId: 3, name: "Очередь поддержки", description: "Доска обработки запросов пользователей", isDefault: true, order: 1, createdAt: "2024-11-10" },
  { id: 4, projectId: 4, name: "Инфраструктура", description: "Задачи по инфраструктуре", isDefault: true, order: 1, createdAt: "2024-12-05" },
  { id: 5, projectId: 2, name: "Mobile Development", description: "Разработка мобильного приложения", isDefault: true, order: 1, createdAt: "2025-02-01" },
];

// Колонки для досок
export const boardColumns = [
  // Доска 1 - ECOM основная
  { id: 1, boardId: 1, name: "Бэклог спринта", systemType: "initial", wipLimit: null, order: 1 },
  { id: 2, boardId: 1, name: "В работе", systemType: "in_progress", wipLimit: 5, order: 2 },
  { id: 3, boardId: 1, name: "На ревью", systemType: "in_progress", wipLimit: 3, order: 3 },
  { id: 4, boardId: 1, name: "Тестирование", systemType: "in_progress", wipLimit: 2, order: 4 },
  { id: 5, boardId: 1, name: "Выполнено", systemType: "completed", wipLimit: null, order: 5 },
  
  // Доска 2 - ECOM дизайн
  { id: 6, boardId: 2, name: "Бэклог", systemType: "initial", wipLimit: null, order: 1 },
  { id: 7, boardId: 2, name: "В работе", systemType: "in_progress", wipLimit: 3, order: 2 },
  { id: 8, boardId: 2, name: "Ревью", systemType: "in_progress", wipLimit: 2, order: 3 },
  { id: 9, boardId: 2, name: "Готово", systemType: "completed", wipLimit: null, order: 4 },
  
  // Доска 3 - Поддержка
  { id: 10, boardId: 3, name: "Новые", systemType: "initial", wipLimit: null, order: 1 },
  { id: 11, boardId: 3, name: "В работе", systemType: "in_progress", wipLimit: 5, order: 2 },
  { id: 12, boardId: 3, name: "Ожидание", systemType: "on_pause", wipLimit: null, order: 3 },
  { id: 13, boardId: 3, name: "Решено", systemType: "completed", wipLimit: null, order: 4 },
];

// Дорожки для досок
export const boardSwimlanes = [
  // Доска 1 - ECOM
  { id: 1, boardId: 1, name: "Высокий приоритет", wipLimit: 3, order: 1 },
  { id: 2, boardId: 1, name: "Стандартный", wipLimit: null, order: 2 },
  { id: 3, boardId: 1, name: "Технический долг", wipLimit: 2, order: 3 },
  
  // Доска 3 - Поддержка
  { id: 4, boardId: 3, name: "Критические", wipLimit: 2, order: 1 },
  { id: 5, boardId: 3, name: "Обычные", wipLimit: null, order: 2 },
];

export const taskDependencies = [
  { id: 1, taskId: 1, dependsOnTaskId: 2, type: "blocks" }, // ECOM-101 блокирует ECOM-102
  { id: 2, taskId: 3, dependsOnTaskId: 1, type: "blocked_by" }, // ECOM-103 заблокирована ECOM-101
  { id: 3, taskId: 5, relatedTaskId: 6, type: "related" }, // ECOM-105 связана с ECOM-106
  { id: 4, taskId: 1, dependsOnTaskId: 4, type: "related" }, // ECOM-101 связана с ECOM-104
  { id: 5, taskId: 1, relatedTaskId: 3, type: "related" }, // ECOM-101 связана с ECOM-103
];

export const taskHierarchy = [
  { id: 1, parentTaskId: 1, childTaskId: 7 }, // ECOM-101 родительская для ECOM-107
  { id: 2, parentTaskId: 1, childTaskId: 2 }, // ECOM-101 родительская для ECOM-102
  { id: 3, parentTaskId: 1, childTaskId: 3 }, // ECOM-101 родительская для ECOM-103
];

export const taskChecklists = [
  { id: 1, taskId: 1, title: "Чек-лист разработки", items: [
    { id: 1, text: "Настроить OAuth провайдеры", completed: true },
    { id: 2, text: "Реализовать JWT токены", completed: true },
    { id: 3, text: "Добавить refresh token механизм", completed: false },
    { id: 4, text: "Написать unit-тесты", completed: false },
  ]},
  { id: 2, taskId: 1, title: "Безопасность", items: [
    { id: 1, text: "Rate limiting для API", completed: true },
    { id: 2, text: "HttpOnly cookies для токенов", completed: true },
    { id: 3, text: "CSRF защита", completed: false },
  ]},
  { id: 3, taskId: 4, title: "Платформы", items: [
    { id: 1, text: "iOS push-уведомления", completed: true },
    { id: 2, text: "Android push-уведомления", completed: false },
    { id: 3, text: "Тестирование на устройствах", completed: false },
  ]},
];

export const taskFiles = [
  { id: 1, taskId: 2, name: "homepage-design-v1.fig", size: 2048576, uploadedBy: 4, uploadedAt: "2025-02-20T14:30:00", url: "#" },
  { id: 2, taskId: 2, name: "mockups.pdf", size: 512000, uploadedBy: 4, uploadedAt: "2025-02-21T10:15:00", url: "#" },
  { id: 3, taskId: 1, name: "oauth-spec.md", size: 15360, uploadedBy: 5, uploadedAt: "2025-02-22T09:00:00", url: "#" },
  { id: 4, taskId: 1, name: "auth-flow-diagram.png", size: 842500, uploadedBy: 3, uploadedAt: "2025-02-20T11:20:00", url: "#" },
  { id: 5, taskId: 1, name: "security-requirements.docx", size: 256000, uploadedBy: 2, uploadedAt: "2025-02-21T15:45:00", url: "#" },
];

export const taskComments = [
  { id: 1, taskId: 1, userId: 3, content: "Не забудьте добавить поддержку Google OAuth", mentions: [], attachments: [], createdAt: "2025-02-21T10:30:00", updatedAt: null },
  { id: 2, taskId: 1, userId: 5, content: "@Сидоров уже добавил, проверьте пожалуйста ветку feature/oauth", mentions: [3], attachments: [], createdAt: "2025-02-22T11:45:00", updatedAt: null },
  { id: 3, taskId: 1, userId: 4, content: "Обратите внимание на безопасность при хранении токенов. Нужно использовать httpOnly cookies", mentions: [], attachments: [], createdAt: "2025-02-23T09:15:00", updatedAt: null },
  { id: 4, taskId: 1, userId: 2, content: "Согласна с Марией. Также нужно предусмотреть rate limiting для защиты от брутфорса", mentions: [], attachments: [], createdAt: "2025-02-23T10:30:00", updatedAt: null },
  { id: 5, taskId: 1, userId: 5, content: "Все замечания учёл. Добавил rate limiting и защиту токенов. Код готов к ревью", mentions: [], attachments: [{ name: "auth-implementation.md", url: "#" }], createdAt: "2025-02-24T16:20:00", updatedAt: null },
  { id: 6, taskId: 4, userId: 3, content: "Какой статус по iOS? @Смирнов", mentions: [5], attachments: [], createdAt: "2025-02-23T14:00:00", updatedAt: null },
  { id: 7, taskId: 4, userId: 5, content: "iOS готов, осталось протестировать Android. Прикладываю скриншот", mentions: [], attachments: [{ name: "ios-notification.png", url: "#" }], createdAt: "2025-02-23T15:30:00", updatedAt: null },
];