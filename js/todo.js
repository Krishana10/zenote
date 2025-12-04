// App State
const state = {
    todos: [],
    dailies: [],
    habits: [],
    theme: 'light',
    health: 100,
    xp: 0,
    level: 1
};

// DOM Elements
const DOM = {
    hamburger: document.getElementById('hamburger'),
    sidebar: document.getElementById('sidebar'),
    themeToggle: document.getElementById('theme-toggle'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskModal: document.getElementById('taskModal'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    saveTaskBtn: document.getElementById('saveTaskBtn'),
    taskType: document.getElementById('taskType'),
    deadlineGroup: document.getElementById('deadlineGroup'),
    habitTasks: document.getElementById('habitTasks'),
    dailyTasks: document.getElementById('dailyTasks'),
    todoTasks: document.getElementById('todoTasks'),
    healthProgress: document.querySelector('.hp .progress-fill'),
    xpProgress: document.querySelector('.xp .progress-fill'),
    healthValue: document.querySelector('.hp .progress-value'),
    xpValue: document.querySelector('.xp .progress-value'),
    levelDisplay: document.querySelector('.level') // Added reference to .level element
};

// Initialize the app
function init() {
    loadFromStorage();
    setupEventListeners();
    renderAllTasks();
    updateProgressBars();
    setupMidnightReset();
}

// Event Listeners
function setupEventListeners() {
    DOM.addTaskBtn.addEventListener('click', openTaskModal);
    DOM.cancelTaskBtn.addEventListener('click', closeTaskModal);
    DOM.saveTaskBtn.addEventListener('click', handleAddTask);
    DOM.taskType.addEventListener('change', toggleDeadlineVisibility);
}

function openTaskModal() {
    DOM.taskModal.classList.add('active');
}

function closeTaskModal() {
    DOM.taskModal.classList.remove('active');
    resetForm();
}

function toggleDeadlineVisibility() {
    const isTodo = DOM.taskType.value === 'todo';
    DOM.deadlineGroup.style.display = isTodo ? 'block' : 'none';
}

// Task Management
function handleAddTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const type = DOM.taskType.value;
    const notes = document.getElementById('taskNotes').value;
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        showAlert('Quest title is required!', 'warning');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        type,
        notes,
        priority,
        createdAt: new Date().toISOString(),
        completed: false
    };

    if (type === 'todo') {
        const deadline = document.getElementById('taskDeadline').value;
        if (deadline) task.deadline = deadline;
        state.todos.push(task);
    } else if (type === 'daily') {
        state.dailies.push(task);
    } else {
        task.streak = 0;
        state.habits.push(task);
    }

    // Gain XP for adding a task
    state.xp = Math.min(100, state.xp + 3);
    updateProgressBars();

    saveToStorage();
    renderAllTasks();
    closeTaskModal();
    showAlert('Quest added successfully!', 'success');
}

function completeTask(type, id) {
    let task;

    if (type === 'todo') {
        task = state.todos.find(t => t.id === id);
        state.todos = state.todos.filter(t => t.id !== id);
        // Gain more XP for completing a todo
        state.xp = Math.min(100, state.xp + 8);
    } else if (type === 'daily') {
        task = state.dailies.find(t => t.id === id);
        task.completed = true;
        // Gain XP for daily
        state.xp = Math.min(100, state.xp + 5);
    } else {
        task = state.habits.find(t => t.id === id);
        task.streak++;
        // Gain XP for habit
        state.xp = Math.min(100, state.xp + 2);

        if (task.streak >= 21) {
            showAlert('Amazing! You\'ve built a strong habit!', 'success');
        }
    }

    // Check for level up
    if (state.xp >= 100) {
        state.level++;
        state.xp = 0;
        showAlert(`Level Up! You're now level ${state.level}`, 'success');
    }

    saveToStorage();
    renderAllTasks();
    updateProgressBars();
}

function deleteTask(type, id) {
    if (type === 'todo') {
        state.todos = state.todos.filter(t => t.id !== id);
        // Lose health for deleting a task
        state.health = Math.max(0, state.health - 5);
    } else if (type === 'daily') {
        state.dailies = state.dailies.filter(t => t.id !== id);
    } else {
        state.habits = state.habits.filter(t => t.id !== id);
    }

    saveToStorage();
    renderAllTasks();
    updateProgressBars();

    if (state.health <= 0) {
        showAlert('Your health is low! Complete quests to restore it.', 'warning');
    }
}

// Rendering
function renderAllTasks() {
    renderTasks('habit', state.habits, DOM.habitTasks);
    renderTasks('daily', state.dailies, DOM.dailyTasks);
    renderTasks('todo', state.todos, DOM.todoTasks);
}

function renderTasks(type, tasks, container) {
    if (tasks.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas ${type === 'habit' ? 'fa-seedling' : type === 'daily' ? 'fa-tasks' : 'fa-clipboard-list'}"></i>
                        <p>No ${type} quests yet. Add your first quest!</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = '';

    tasks.forEach(task => {
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`;

        let streakHtml = '';
        if (type === 'habit' && task.streak > 0) {
            streakHtml = `<div class="habit-streak"><i class="fas fa-fire"></i> ${task.streak} days</div>`;
        }

        let deadlineHtml = '';
        if (task.deadline) {
            deadlineHtml = `
                        <div class="task-deadline">
                            <i class="far fa-calendar"></i> 
                            ${new Date(task.deadline).toLocaleDateString()}
                        </div>
                    `;
        }

        taskElement.innerHTML = `
                    <div class="task-content">
                        <div class="task-title">
                            <i class="fas ${type === 'habit' ? 'fa-redo' : type === 'daily' ? 'fa-calendar-day' : 'fa-check-circle'}"></i>
                            ${task.title}
                        </div>
                        ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ''}
                        <div class="task-meta">
                            <div class="task-priority priority-${task.priority}">
                                ${task.priority}
                            </div>
                            ${deadlineHtml}
                            ${streakHtml}
                        </div>
                    </div>
                    <div class="task-actions">
                        ${!task.completed ? `<button class="task-btn complete" onclick="completeTask('${type}', ${task.id})">
                            <i class="fas fa-check"></i>
                        </button>` : ''}
                        <button class="task-btn delete" onclick="deleteTask('${type}', ${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;

        container.appendChild(taskElement);
    });
}

function updateProgressBars() {
    DOM.healthProgress.style.width = `${state.health}%`;
    DOM.xpProgress.style.width = `${state.xp}%`;
    DOM.healthValue.textContent = `${state.health}%`;
    DOM.xpValue.textContent = `${state.xp}%`;
    DOM.levelDisplay.textContent = `Level ${state.level}`; // Update level display
}

function resetForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskNotes').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDeadline').value = '';
    DOM.taskType.value = 'todo';
    toggleDeadlineVisibility();
}

// Storage
function saveToStorage() {
    const data = {
        tasks: {
            todos: state.todos,
            dailies: state.dailies,
            habits: state.habits
        },
        theme: state.theme,
        health: state.health,
        xp: state.xp,
        level: state.level
    };
    localStorage.setItem('questifyData', JSON.stringify(data));
}

function loadFromStorage() {
    const data = JSON.parse(localStorage.getItem('questifyData'));
    if (data) {
        state.todos = data.tasks?.todos || [];
        state.dailies = data.tasks?.dailies || [];
        state.habits = data.tasks?.habits || [];
        state.theme = data.theme || 'light';
        state.health = data.health || 75;
        state.xp = data.xp || 45;
        state.level = data.level || 3;

        // Apply theme
        if (state.theme === 'dark') {
            document.body.classList.add('dark-theme');
            DOM.themeToggle.checked = true;
        }
    }
}

// Reset daily tasks at midnight
function setupMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const msUntilMidnight = midnight - now;

    setTimeout(() => {
        state.dailies.forEach(task => task.completed = false);
        saveToStorage();
        renderAllTasks();
        // Set next reset
        setupMidnightReset();
    }, msUntilMidnight);
}

// Helper functions
function showAlert(message, type) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: state.theme === 'dark' ? '#16213e' : '#ffffff',
        color: state.theme === 'dark' ? '#e6e6e6' : '#2d3436'
    });

    Toast.fire({
        icon: type,
        title: message
    });
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);