/**
 * TaskFlow - Interactive To-Do Application
 */

// Storage keys
const STORAGE_KEY = 'taskflow_tasks_v1';
const THEME_KEY = 'taskflow_theme';

// Default initial tasks if empty
const DEFAULT_TASKS = [
  {
    id: 'demo-1',
    title: 'Découvrir TaskFlow et organiser mes priorités',
    category: 'Projets',
    priority: 'haute',
    dueDate: getRelativeDate(0),
    completed: false,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'demo-2',
    title: 'Faire les courses pour le dîner',
    category: 'Courses',
    priority: 'moyenne',
    dueDate: getRelativeDate(1),
    completed: false,
    createdAt: Date.now() - 7200000
  },
  {
    id: 'demo-3',
    title: 'Configuration de l’application',
    category: 'Travail',
    priority: 'basse',
    dueDate: getRelativeDate(-1),
    completed: true,
    createdAt: Date.now() - 10800000
  }
];

function getRelativeDate(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// State
let tasks = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
let currentCategory = 'all'; // 'all' | category name
let searchQuery = '';
let currentSort = 'date-created';
let lastDeletedTask = null;
let toastTimeout = null;

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskCategorySelect = document.getElementById('taskCategorySelect');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');
const taskDueDateInput = document.getElementById('taskDueDateInput');

const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const emptyStateTitle = document.getElementById('emptyStateTitle');
const emptyStateDesc = document.getElementById('emptyStateDesc');

const completedCountEl = document.getElementById('completedCount');
const totalCountEl = document.getElementById('totalCount');
const progressPercentEl = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');

const badgeAll = document.getElementById('badgeAll');
const badgeActive = document.getElementById('badgeActive');
const badgeCompleted = document.getElementById('badgeCompleted');

const filterTabs = document.querySelectorAll('.filter-tab');
const categoryPills = document.querySelectorAll('.cat-pill');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const currentDateEl = document.getElementById('currentDate');

// Modal Elements
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskCategory = document.getElementById('editTaskCategory');
const editTaskPriority = document.getElementById('editTaskPriority');
const editTaskDueDate = document.getElementById('editTaskDueDate');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastAction = document.getElementById('toastAction');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initDateDisplay();
  initTheme();
  loadTasks();
  setupEventListeners();
  render();
});

function initDateDisplay() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const today = new Date().toLocaleDateString('fr-FR', options);
  currentDateEl.textContent = today;
  // Default date in input is today
  taskDueDateInput.value = getRelativeDate(0);
}

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}

// Storage handling
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      tasks = JSON.parse(saved);
    } else {
      tasks = [...DEFAULT_TASKS];
      saveTasks();
    }
  } catch (e) {
    console.error('Erreur chargement:', e);
    tasks = [...DEFAULT_TASKS];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Erreur sauvegarde:', e);
  }
}

// Events Setup
function setupEventListeners() {
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Add task
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title,
      category: taskCategorySelect.value,
      priority: taskPrioritySelect.value,
      dueDate: taskDueDateInput.value || null,
      completed: false,
      createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    render();
    taskTitleInput.value = '';
    taskDueDateInput.value = getRelativeDate(0);
    showToast('Tâche ajoutée avec succès !');
  });

  // Filter tabs
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      render();
    });
  });

  // Category pills
  categoryPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      categoryPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-cat');
      render();
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    render();
  });

  // Sorting
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // Clear completed
  clearCompletedBtn.addEventListener('click', () => {
    const completedTasks = tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      showToast('Aucune tâche terminée à nettoyer');
      return;
    }
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
    showToast(`${completedTasks.length} tâche(s) terminée(s) supprimée(s)`);
  });

  // Edit Modal form
  editTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editTaskId.value;
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.title = editTaskTitle.value.trim();
      task.category = editTaskCategory.value;
      task.priority = editTaskPriority.value;
      task.dueDate = editTaskDueDate.value || null;
      saveTasks();
      render();
      closeEditModal();
      showToast('Tâche modifiée !');
    }
  });

  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.style.display !== 'none') {
      closeEditModal();
    }
  });

  toastAction.addEventListener('click', () => {
    if (lastDeletedTask) {
      tasks.unshift(lastDeletedTask);
      saveTasks();
      render();
      lastDeletedTask = null;
      hideToast();
    }
  });
}

// Modal handling
function openEditModal(task) {
  editTaskId.value = task.id;
  editTaskTitle.value = task.title;
  editTaskCategory.value = task.category;
  editTaskPriority.value = task.priority;
  editTaskDueDate.value = task.dueDate || '';
  editModal.style.display = 'flex';
  editTaskTitle.focus();
}

function closeEditModal() {
  editModal.style.display = 'none';
}

// Toast
function showToast(message, allowUndo = false) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = message;
  toastAction.style.display = allowUndo ? 'inline-block' : 'none';
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    hideToast();
  }, allowUndo ? 5000 : 3000);
}

function hideToast() {
  toast.classList.remove('show');
}

// Helpers for dates
function formatDueDate(dueDateStr) {
  if (!dueDateStr) return null;
  const todayStr = getRelativeDate(0);
  const tomorrowStr = getRelativeDate(1);
  const yesterdayStr = getRelativeDate(-1);

  if (dueDateStr === todayStr) {
    return { text: "Aujourd'hui", class: 'today' };
  } else if (dueDateStr === tomorrowStr) {
    return { text: 'Demain', class: 'tomorrow' };
  } else if (dueDateStr < todayStr) {
    return { text: 'En retard', class: 'overdue' };
  } else {
    const parts = dueDateStr.split('-');
    if (parts.length === 3) {
      return { text: `${parts[2]}/${parts[1]}`, class: 'normal' };
    }
    return { text: dueDateStr, class: 'normal' };
  }
}

// Render Logic
function render() {
  updateStats();

  // Filter tasks
  let filtered = tasks.filter((task) => {
    // Status
    if (currentFilter === 'active' && task.completed) return false;
    if (currentFilter === 'completed' && !task.completed) return false;

    // Category
    if (currentCategory !== 'all' && task.category !== currentCategory) return false;

    // Search query
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery)) return false;

    return true;
  });

  // Sort tasks
  filtered.sort((a, b) => {
    if (currentSort === 'date-created') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    if (currentSort === 'due-date') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (currentSort === 'priority') {
      const pWeight = { haute: 3, moyenne: 2, basse: 1 };
      return (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0);
    }
    if (currentSort === 'alphabetical') {
      return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    }
    return 0;
  });

  // Render items
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    if (searchQuery) {
      emptyStateTitle.textContent = 'Aucun résultat';
      emptyStateDesc.textContent = `Aucune tâche ne correspond à "${searchQuery}".`;
    } else if (currentFilter === 'completed') {
      emptyStateTitle.textContent = 'Aucune tâche terminée';
      emptyStateDesc.textContent = 'Terminez une tâche pour la voir apparaître ici.';
    } else {
      emptyStateTitle.textContent = 'Tout est à jour ! 🎉';
      emptyStateDesc.textContent = 'Ajoutez une nouvelle tâche ci-dessus ou profitez de votre temps libre.';
    }
  } else {
    emptyState.style.display = 'none';

    filtered.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      // Due date object
      const dueInfo = formatDueDate(task.dueDate);

      li.innerHTML = `
        <div class="checkbox-container" title="${task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}">
          <button class="custom-checkbox" aria-label="Valider la tâche">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>

        <div class="task-body">
          <div class="task-title">${escapeHTML(task.title)}</div>
          <div class="task-meta">
            <span class="meta-pill pill-category">${escapeHTML(task.category)}</span>
            <span class="meta-pill pill-priority ${task.priority}">${capitalize(task.priority)}</span>
            ${
              dueInfo
                ? `<span class="meta-pill pill-date ${dueInfo.class}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${dueInfo.text}
                  </span>`
                : ''
            }
          </div>
        </div>

        <div class="task-actions">
          <button class="task-btn btn-edit" title="Modifier" aria-label="Modifier">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="task-btn btn-delete" title="Supprimer" aria-label="Supprimer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Checkbox click
      const chk = li.querySelector('.checkbox-container');
      chk.addEventListener('click', () => {
        task.completed = !task.completed;
        saveTasks();
        render();
        if (task.completed) {
          showToast('Tâche terminée ! 🎉');
        }
      });

      // Edit click
      const editBtn = li.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => {
        openEditModal(task);
      });

      // Delete click
      const delBtn = li.querySelector('.btn-delete');
      delBtn.addEventListener('click', () => {
        lastDeletedTask = { ...task };
        tasks = tasks.filter((t) => t.id !== task.id);
        saveTasks();
        render();
        showToast('Tâche supprimée', true);
      });

      taskList.appendChild(li);
    });
  }
}

// Update stats & counters
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  totalCountEl.textContent = total;
  completedCountEl.textContent = completed;
  progressPercentEl.textContent = `${percent}%`;
  progressBarFill.style.width = `${percent}%`;

  badgeAll.textContent = total;
  badgeActive.textContent = active;
  badgeCompleted.textContent = completed;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
