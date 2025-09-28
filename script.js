let tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
let currentFilter = 'all';

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const dateInput = document.getElementById('dateInput');
    const priorityInput = document.getElementById('priorityInput');
    
    if (!taskInput.value.trim()) return;
    
    const task = {
        id: Date.now(),
        title: taskInput.value.trim(),
        date: dateInput.value || new Date().toISOString().split('T')[0],
        priority: priorityInput.value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    
    taskInput.value = '';
    dateInput.value = '';
    priorityInput.value = 'low';
}

function toggleTask(id) {
    tasks = tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    let filteredTasks = tasks;
    
    if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
    filteredTasks.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (a.completed !== b.completed) return a.completed - b.completed;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    taskList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    Due: ${new Date(task.date).toLocaleDateString()}
                    <span class="priority ${task.priority}">${task.priority.toUpperCase()}</span>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
        </div>
    `).join('');
    
    updateProgress();
}

function updateProgress() {
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `${percentage}% Complete (${completed}/${total})`;
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});

document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];

renderTasks();