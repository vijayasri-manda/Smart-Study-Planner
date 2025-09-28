// Enhanced Study Planner Application
let tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
let goals = JSON.parse(localStorage.getItem('studyGoals')) || [];
let exams = JSON.parse(localStorage.getItem('studyExams')) || [];
let materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
let studySessions = JSON.parse(localStorage.getItem('studySessions')) || [];
let achievements = JSON.parse(localStorage.getItem('achievements')) || [];
let settings = JSON.parse(localStorage.getItem('appSettings')) || {
    darkMode: false,
    notifications: true,
    sounds: true,
    reminders: true,
    defaultStudyTime: 25,
    defaultBreakTime: 5
};

let currentFilter = 'all';
let currentSection = 'tasks';
let currentTimelineView = 'week';

// Timer variables
let timerInterval = null;
let timerTimeLeft = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;
let isBreakTime = false;
let sessionCount = 1;
let breakCount = 0;
let focusMode = false;
let ambientSound = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Apply saved settings
    applySettings();
    
    // Initialize all sections
    renderTasks();
    updateStats();
    renderGoals();
    renderExams();
    renderMaterials();
    updateAnalytics();
    updateAchievements();
    
    // Set default date to today
    document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
    
    // Check for upcoming tasks every minute
    setInterval(checkUpcomingTasks, 60000);
    
    // Update exam countdowns every second
    setInterval(updateExamCountdowns, 1000);
    
    // Initial checks
    checkUpcomingTasks();
    updateExamCountdowns();
    
    // Schedule existing task reminders on page load
    tasks.forEach(task => {
        if (!task.completed) {
            scheduleReminder(task);
        }
    });
    
    // Initialize achievements
    checkAchievements();
}

// Navigation Functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    document.getElementById('nav-' + sectionName).classList.add('active');
    
    currentSection = sectionName;
    
    // Update content based on section
    switch(sectionName) {
        case 'timeline':
            renderTimeline();
            break;
        case 'analytics':
            updateAnalytics();
            break;
    }
}

// Task Management Functions
function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;
    const priority = document.getElementById('taskPriority').value;
    const subject = document.getElementById('taskSubject').value;
    const duration = parseInt(document.getElementById('taskDuration').value) || 60;
    
    if (!title || !date || !time) {
        alert('Please fill in all required fields');
        return;
    }
    
    const task = {
        id: Date.now(),
        title,
        date,
        time,
        priority,
        subject,
        duration,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    tasks.push(task);
    saveTasks();
    clearForm();
    renderTasks();
    updateStats();
    scheduleReminder(task);
}

function clearForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTime').value = '';
    document.getElementById('taskPriority').value = 'low';
    document.getElementById('taskSubject').value = '';
    document.getElementById('taskDuration').value = '';
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveTasks();
        renderTasks();
        updateStats();
        updateAnalytics();
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderTasks();
}

function getFilteredTasks() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());
    
    switch(currentFilter) {
        case 'pending':
            return tasks.filter(task => !task.completed);
        case 'completed':
            return tasks.filter(task => task.completed);
        case 'today':
            return tasks.filter(task => task.date === today);
        case 'this-week':
            return tasks.filter(task => task.date >= weekStart && task.date <= weekEnd);
        default:
            return tasks;
    }
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No tasks found. Add some study tasks to get started!</p>';
        return;
    }
    
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    taskList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.priority} ${task.completed ? 'completed' : ''}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-datetime">
                    <span>📅 ${formatDate(task.date)}</span>
                    <span>⏰ ${task.time}</span>
                    <span>⏱️ ${task.duration}min</span>
                    ${task.subject ? `<span class="task-subject">${getSubjectDisplayName(task.subject)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function getSubjectDisplayName(subject) {
    const subjectNames = {
        'mathematics': 'Math',
        'science': 'Science',
        'language': 'Language',
        'history': 'History',
        'computer': 'CS',
        'other': 'Other'
    };
    return subjectNames[subject] || subject;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate study time today
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today && task.completed);
    const studyTimeToday = todayTasks.reduce((total, task) => total + (task.duration || 0), 0);
    
    document.getElementById('totalTasks').textContent = `${total} Tasks`;
    document.getElementById('completedTasks').textContent = `${completed} Completed`;
    document.getElementById('studyTime').textContent = `${Math.round(studyTimeToday / 60 * 10) / 10}h Today`;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${progress}% Complete`;
}

// Goals Management Functions
function showAddGoalModal() {
    document.getElementById('goalModal').style.display = 'block';
    document.getElementById('goalDeadline').value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function closeGoalModal() {
    document.getElementById('goalModal').style.display = 'none';
    document.getElementById('goalForm').reset();
}

function addGoal(event) {
    event.preventDefault();
    
    const title = document.getElementById('goalTitle').value.trim();
    const subject = document.getElementById('goalSubject').value;
    const deadline = document.getElementById('goalDeadline').value;
    const description = document.getElementById('goalDescription').value.trim();
    
    if (!title || !deadline) {
        alert('Please fill in title and deadline');
        return;
    }
    
    const goal = {
        id: Date.now(),
        title,
        subject,
        deadline,
        description,
        createdAt: new Date().toISOString(),
        progress: 0,
        completed: false
    };
    
    goals.push(goal);
    saveGoals();
    renderGoals();
    closeGoalModal();
}

function saveGoals() {
    localStorage.setItem('studyGoals', JSON.stringify(goals));
}

function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
        goals = goals.filter(goal => goal.id !== id);
        saveGoals();
        renderGoals();
        showNotification('Goal deleted successfully! 🗑️');
    }
}

function renderGoals() {
    const goalsList = document.getElementById('goalsList');
    
    if (goals.length === 0) {
        goalsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No goals set yet. Create your first study goal!</p>';
        return;
    }
    
    goalsList.innerHTML = goals.map(goal => `
        <div class="goal-item">
            <div class="goal-header">
                <div class="goal-title">${goal.title}</div>
                <div class="goal-actions">
                    <button class="btn-delete-goal" onclick="deleteGoal(${goal.id})" title="Delete Goal">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${goal.subject ? `<span class="goal-subject">${getSubjectDisplayName(goal.subject)}</span>` : ''}
            <div class="goal-deadline">📅 Deadline: ${formatDate(goal.deadline)}</div>
            ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
            <div class="goal-progress">
                <div class="goal-progress-fill" style="width: ${goal.progress}%"></div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #666;">
                ${goal.progress}% Complete
            </div>
        </div>
    `).join('');
}

// Timeline Functions
function changeTimelineView(view) {
    currentTimelineView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(view + '-view').classList.add('active');
    renderTimeline();
}

function renderTimeline() {
    const timelineView = document.getElementById('timelineView');
    
    if (currentTimelineView === 'week') {
        renderWeekView();
    } else {
        renderMonthView();
    }
}

function renderWeekView() {
    const timelineView = document.getElementById('timelineView');
    const today = new Date();
    const weekStart = getWeekStart(today);
    
    let html = '<div class="week-timeline">';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTasks = tasks.filter(task => task.date === dateStr);
        
        html += `
            <div class="day-column">
                <div class="day-header">
                    <strong>${date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                    <div>${date.getDate()}</div>
                </div>
                <div class="day-tasks">
                    ${dayTasks.map(task => `
                        <div class="timeline-task ${task.priority} ${task.completed ? 'completed' : ''}">
                            <div class="task-time">${task.time}</div>
                            <div class="task-title">${task.title}</div>
                            <div class="task-duration">${task.duration}min</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    timelineView.innerHTML = html;
}

function renderMonthView() {
    const timelineView = document.getElementById('timelineView');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let html = '<div class="month-timeline">';
    html += `<div class="month-header">${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>`;
    
    // Calendar grid
    html += '<div class="calendar-grid">';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(task => task.date === dateStr);
        
        html += `
            <div class="calendar-day ${day === today.getDate() ? 'today' : ''}">
                <div class="day-number">${day}</div>
                <div class="day-tasks">
                    ${dayTasks.slice(0, 3).map(task => `
                        <div class="mini-task ${task.priority} ${task.completed ? 'completed' : ''}">
                            ${task.title.substring(0, 15)}${task.title.length > 15 ? '...' : ''}
                        </div>
                    `).join('')}
                    ${dayTasks.length > 3 ? `<div class="more-tasks">+${dayTasks.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }
    
    html += '</div></div>';
    timelineView.innerHTML = html;
}

function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

function getWeekEnd(date) {
    const weekStart = getWeekStart(new Date(date));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd.toISOString().split('T')[0];
}

// Analytics Functions
function updateAnalytics() {
    updateStudyStreak();
    updateWeeklyProgress();
    updateSubjectDistribution();
    updateWeeklyHours();
}

function updateStudyStreak() {
    const streak = calculateStudyStreak();
    document.getElementById('studyStreak').textContent = streak;
}

function calculateStudyStreak() {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const hasStudySession = studySessions.some(session => 
            session.date === dateStr && session.duration > 0
        ) || tasks.some(task => 
            task.date === dateStr && task.completed
        );
        
        if (hasStudySession) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function updateWeeklyProgress() {
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());
    
    const weekTasks = tasks.filter(task => 
        task.date >= weekStart.toISOString().split('T')[0] && 
        task.date <= weekEnd
    );
    
    const completedTasks = weekTasks.filter(task => task.completed);
    const progress = weekTasks.length > 0 ? Math.round((completedTasks.length / weekTasks.length) * 100) : 0;
    
    document.getElementById('weeklyProgressText').textContent = `${progress}%`;
    
    const circle = document.getElementById('weeklyProgressCircle');
    const circumference = 283; // 2 * π * 45
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function updateSubjectDistribution() {
    const subjectChart = document.getElementById('subjectChart');
    const subjectCounts = {};
    
    tasks.forEach(task => {
        if (task.subject) {
            subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
        }
    });
    
    if (Object.keys(subjectCounts).length === 0) {
        subjectChart.innerHTML = '<p style="color: #666; font-size: 14px;">No subjects tracked yet</p>';
        return;
    }
    
    const maxCount = Math.max(...Object.values(subjectCounts));
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
    
    let html = '<div class="subject-bars">';
    Object.entries(subjectCounts).forEach(([subject, count], index) => {
        const percentage = (count / maxCount) * 100;
        const color = colors[index % colors.length];
        
        html += `
            <div class="subject-bar">
                <div class="subject-label">${getSubjectDisplayName(subject)}</div>
                <div class="subject-bar-bg">
                    <div class="subject-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
                <div class="subject-count">${count}</div>
            </div>
        `;
    });
    html += '</div>';
    
    subjectChart.innerHTML = html;
}

function updateWeeklyHours() {
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());
    
    const weekTasks = tasks.filter(task => 
        task.date >= weekStart.toISOString().split('T')[0] && 
        task.date <= weekEnd &&
        task.completed
    );
    
    const totalMinutes = weekTasks.reduce((total, task) => total + (task.duration || 0), 0);
    const hours = Math.round(totalMinutes / 60 * 10) / 10;
    
    document.getElementById('weeklyHours').textContent = hours;
}

// Timer Functions
function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        document.getElementById('timerStart').disabled = true;
        document.getElementById('timerPause').disabled = false;
        
        timerInterval = setInterval(() => {
            timerTimeLeft--;
            updateTimerDisplay();
            
            if (timerTimeLeft <= 0) {
                timerComplete();
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        isTimerRunning = false;
        clearInterval(timerInterval);
        document.getElementById('timerStart').disabled = false;
        document.getElementById('timerPause').disabled = true;
    }
}

function resetTimer() {
    pauseTimer();
    isBreakTime = false;
    const studyMinutes = parseInt(document.getElementById('studyMinutes').value) || 25;
    timerTimeLeft = studyMinutes * 60;
    updateTimerDisplay();
}

function timerComplete() {
    pauseTimer();
    
    if (!isBreakTime) {
        // Study session completed
        sessionCount++;
        document.getElementById('sessionCount').textContent = sessionCount;
        
        // Start break
        isBreakTime = true;
        const breakMinutes = parseInt(document.getElementById('breakMinutes').value) || 5;
        timerTimeLeft = breakMinutes * 60;
        
        // Save study session
        saveStudySession();
        
        showNotification('Study session completed! Time for a break! 🎉');
    } else {
        // Break completed
        breakCount++;
        document.getElementById('breakCount').textContent = breakCount;
        
        // Start new study session
        isBreakTime = false;
        const studyMinutes = parseInt(document.getElementById('studyMinutes').value) || 25;
        timerTimeLeft = studyMinutes * 60;
        
        showNotification('Break time over! Ready for another study session? 📚');
    }
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerTimeLeft / 60);
    const seconds = timerTimeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function saveStudySession() {
    const today = new Date().toISOString().split('T')[0];
    const studyMinutes = parseInt(document.getElementById('studyMinutes').value) || 25;
    
    const session = {
        id: Date.now(),
        date: today,
        duration: studyMinutes,
        type: 'study',
        completedAt: new Date().toISOString()
    };
    
    studySessions.push(session);
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
    updateAnalytics();
}

// Reminder Functions
function scheduleReminder(task) {
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    const now = new Date();
    const timeDiff = taskDateTime.getTime() - now.getTime();
    const reminderTime = timeDiff - (15 * 60 * 1000); // 15 minutes before
    
    if (reminderTime > 0) {
        setTimeout(() => {
            showReminder(task);
        }, reminderTime);
    }
}

function showReminder(task) {
    if (task.completed) return;
    
    const reminder = document.createElement('div');
    reminder.className = 'reminder';
    reminder.innerHTML = `
        <strong>📚 Study Reminder</strong><br>
        ${task.title}<br>
        <small>Starting in 15 minutes</small>
    `;
    
    document.body.appendChild(reminder);
    
    setTimeout(() => {
        reminder.remove();
    }, 5000);
}

function checkUpcomingTasks() {
    const now = new Date();
    const upcoming = tasks.filter(task => {
        if (task.completed) return false;
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const timeDiff = taskDateTime.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff <= (15 * 60 * 1000);
    });
    
    upcoming.forEach(task => showReminder(task));
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'reminder';
    notification.innerHTML = `<strong>${message}</strong>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Event Listeners
document.getElementById('goalForm').addEventListener('submit', addGoal);

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('goalModal');
    if (event.target === modal) {
        closeGoalModal();
    }
}

// Timer settings change handlers
document.getElementById('studyMinutes').addEventListener('change', function() {
    if (!isTimerRunning && !isBreakTime) {
        timerTimeLeft = parseInt(this.value) * 60;
        updateTimerDisplay();
    }
});

document.getElementById('breakMinutes').addEventListener('change', function() {
    // Break time setting only affects future breaks
});

// ===== NEW ENHANCED FEATURES =====

// Dark Mode Functions
function toggleDarkMode() {
    settings.darkMode = !settings.darkMode;
    applySettings();
    saveSettings();
    
    const themeIcon = document.getElementById('themeToggle').querySelector('i');
    themeIcon.className = settings.darkMode ? 'fas fa-sun' : 'fas fa-moon';
}

function applySettings() {
    const body = document.body;
    if (settings.darkMode) {
        body.setAttribute('data-theme', 'dark');
    } else {
        body.removeAttribute('data-theme');
    }
    
    // Apply other settings
    document.getElementById('enableNotifications').checked = settings.notifications;
    document.getElementById('enableSounds').checked = settings.sounds;
    document.getElementById('enableReminders').checked = settings.reminders;
    document.getElementById('defaultStudyTime').value = settings.defaultStudyTime;
    document.getElementById('defaultBreakTime').value = settings.defaultBreakTime;
}

function saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

// Settings Modal Functions
function showSettings() {
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Exam Management Functions
function showAddExamModal() {
    document.getElementById('examModal').style.display = 'block';
    document.getElementById('examDateTime').value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function closeExamModal() {
    document.getElementById('examModal').style.display = 'none';
    document.getElementById('examForm').reset();
}

function addExam(event) {
    event.preventDefault();
    
    const title = document.getElementById('examTitle').value.trim();
    const subject = document.getElementById('examSubject').value;
    const dateTime = document.getElementById('examDateTime').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const type = document.getElementById('examType').value;
    const notes = document.getElementById('examNotes').value.trim();
    
    if (!title || !dateTime || !duration) {
        alert('Please fill in all required fields');
        return;
    }
    
    const exam = {
        id: Date.now(),
        title,
        subject,
        dateTime,
        duration,
        type,
        notes,
        createdAt: new Date().toISOString()
    };
    
    exams.push(exam);
    saveExams();
    renderExams();
    closeExamModal();
    showNotification('Exam added successfully! 📝');
}

function saveExams() {
    localStorage.setItem('studyExams', JSON.stringify(exams));
}

function renderExams() {
    const examsList = document.getElementById('examsList');
    const countdownsContainer = document.getElementById('examCountdowns');
    
    if (exams.length === 0) {
        examsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No exams scheduled. Add your first exam!</p>';
        countdownsContainer.innerHTML = '';
        return;
    }
    
    // Sort exams by date
    const sortedExams = exams.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    // Render upcoming exams (next 3)
    const upcomingExams = sortedExams.slice(0, 3);
    countdownsContainer.innerHTML = upcomingExams.map(exam => `
        <div class="countdown-card">
            <div class="countdown-title">${exam.title}</div>
            <div class="countdown-time" id="countdown-${exam.id}">Calculating...</div>
            <div class="countdown-details">
                📅 ${formatDateTime(exam.dateTime)} | ⏱️ ${exam.duration} min | 📚 ${getSubjectDisplayName(exam.subject)}
            </div>
        </div>
    `).join('');
    
    // Render all exams list
    examsList.innerHTML = sortedExams.map(exam => `
        <div class="task-item ${exam.type}">
            <div class="task-content">
                <div class="task-title">${exam.title}</div>
                <div class="task-datetime">
                    <span>📅 ${formatDateTime(exam.dateTime)}</span>
                    <span>⏱️ ${exam.duration} min</span>
                    <span class="task-subject">${getSubjectDisplayName(exam.subject)}</span>
                    <span class="exam-type">${exam.type.toUpperCase()}</span>
                </div>
                ${exam.notes ? `<div class="exam-notes">${exam.notes}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn-delete" onclick="deleteExam(${exam.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function deleteExam(id) {
    exams = exams.filter(exam => exam.id !== id);
    saveExams();
    renderExams();
    showNotification('Exam deleted successfully! 🗑️');
}

function updateExamCountdowns() {
    exams.forEach(exam => {
        const countdownElement = document.getElementById(`countdown-${exam.id}`);
        if (countdownElement) {
            const examTime = new Date(exam.dateTime);
            const now = new Date();
            const timeDiff = examTime.getTime() - now.getTime();
            
            if (timeDiff > 0) {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                
                if (days > 0) {
                    countdownElement.textContent = `${days}d ${hours}h ${minutes}m`;
                } else if (hours > 0) {
                    countdownElement.textContent = `${hours}h ${minutes}m`;
                } else {
                    countdownElement.textContent = `${minutes}m`;
                }
            } else {
                countdownElement.textContent = 'EXPIRED';
                countdownElement.style.color = '#ff4757';
            }
        }
    });
}

// Study Materials Functions
function showAddMaterialModal() {
    document.getElementById('materialModal').style.display = 'block';
}

function closeMaterialModal() {
    document.getElementById('materialModal').style.display = 'none';
    document.getElementById('materialForm').reset();
}

function addMaterial(event) {
    event.preventDefault();
    
    const title = document.getElementById('materialTitle').value.trim();
    const type = document.getElementById('materialType').value;
    const subject = document.getElementById('materialSubject').value;
    const url = document.getElementById('materialUrl').value.trim();
    const description = document.getElementById('materialDescription').value.trim();
    
    if (!title) {
        alert('Please enter a material title');
        return;
    }
    
    const material = {
        id: Date.now(),
        title,
        type,
        subject,
        url,
        description,
        createdAt: new Date().toISOString()
    };
    
    materials.push(material);
    saveMaterials();
    renderMaterials();
    closeMaterialModal();
    showNotification('Study material added successfully! 📚');
}

function saveMaterials() {
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
}

function renderMaterials() {
    const materialsList = document.getElementById('materialsList');
    
    if (materials.length === 0) {
        materialsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No study materials added yet. Add your first material!</p>';
        return;
    }
    
    materialsList.innerHTML = materials.map(material => `
        <div class="material-card">
            <div class="material-title">${material.title}</div>
            <div class="material-type">${material.type.toUpperCase()}</div>
            ${material.subject ? `<span class="task-subject">${getSubjectDisplayName(material.subject)}</span>` : ''}
            ${material.description ? `<div class="material-description">${material.description}</div>` : ''}
            <div class="material-actions">
                ${material.url ? `<button class="btn-material btn-view" onclick="window.open('${material.url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> View
                </button>` : ''}
                <button class="btn-material btn-delete-material" onclick="deleteMaterial(${material.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function deleteMaterial(id) {
    materials = materials.filter(material => material.id !== id);
    saveMaterials();
    renderMaterials();
    showNotification('Material deleted successfully! 🗑️');
}

// Enhanced Timer Functions
function playAmbientSound() {
    const btn = event.target.closest('.btn-feature');
    if (ambientSound) {
        ambientSound.pause();
        ambientSound = null;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Ambient Sound';
    } else {
        // Create ambient sound (using Web Audio API for simple white noise)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = 4096;
        const noise = audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        noise.onaudioprocess = function(e) {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.1; // Low volume white noise
            }
        };
        
        const source = audioContext.createMediaStreamSource(new MediaStream());
        source.connect(noise);
        noise.connect(audioContext.destination);
        
        ambientSound = { audioContext, noise, source };
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-volume-mute"></i> Stop Sound';
    }
}

function toggleFocusMode() {
    const btn = event.target.closest('.btn-feature');
    focusMode = !focusMode;
    
    if (focusMode) {
        document.body.classList.add('focus-mode');
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Exit Focus';
        
        // Create focus overlay
        const overlay = document.createElement('div');
        overlay.className = 'focus-overlay';
        overlay.innerHTML = `
            <div>
                <h2>🎯 Focus Mode Active</h2>
                <p>Stay focused on your current task</p>
                <button onclick="toggleFocusMode()">Exit Focus Mode</button>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.body.classList.remove('focus-mode');
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-eye"></i> Focus Mode';
        
        // Remove focus overlay
        const overlay = document.querySelector('.focus-overlay');
        if (overlay) overlay.remove();
    }
}

// Achievements and Gamification
function updateAchievements() {
    const streak = calculateStudyStreak();
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalHours = calculateTotalStudyHours();
    
    document.getElementById('achievementStreak').textContent = streak;
    document.getElementById('achievementTasks').textContent = completedTasks;
    document.getElementById('achievementHours').textContent = Math.round(totalHours);
    
    // Update progress bars
    document.getElementById('streakProgress').style.width = `${Math.min((streak / 7) * 100, 100)}%`;
    document.getElementById('tasksProgress').style.width = `${Math.min((completedTasks / 50) * 100, 100)}%`;
    document.getElementById('hoursProgress').style.width = `${Math.min((totalHours / 100) * 100, 100)}%`;
    
    // Update header streak
    document.getElementById('studyStreak').textContent = `${streak} Day Streak`;
}

function calculateTotalStudyHours() {
    const completedTasks = tasks.filter(task => task.completed);
    return completedTasks.reduce((total, task) => total + (task.duration || 0), 0) / 60;
}

function checkAchievements() {
    const newAchievements = [];
    
    // Streak achievements
    const streak = calculateStudyStreak();
    if (streak >= 7 && !hasAchievement('week_streak')) {
        newAchievements.push({ id: 'week_streak', title: 'Week Warrior', description: '7-day study streak!', icon: 'fas fa-fire' });
    }
    if (streak >= 30 && !hasAchievement('month_streak')) {
        newAchievements.push({ id: 'month_streak', title: 'Monthly Master', description: '30-day study streak!', icon: 'fas fa-calendar-alt' });
    }
    
    // Task achievements
    const completedTasks = tasks.filter(task => task.completed).length;
    if (completedTasks >= 10 && !hasAchievement('task_master')) {
        newAchievements.push({ id: 'task_master', title: 'Task Master', description: 'Completed 10 tasks!', icon: 'fas fa-check-circle' });
    }
    if (completedTasks >= 100 && !hasAchievement('task_champion')) {
        newAchievements.push({ id: 'task_champion', title: 'Task Champion', description: 'Completed 100 tasks!', icon: 'fas fa-trophy' });
    }
    
    // Study hours achievements
    const totalHours = calculateTotalStudyHours();
    if (totalHours >= 50 && !hasAchievement('study_hours')) {
        newAchievements.push({ id: 'study_hours', title: 'Study Hours', description: '50 hours of study!', icon: 'fas fa-clock' });
    }
    
    // Add new achievements
    newAchievements.forEach(achievement => {
        achievements.push({
            ...achievement,
            unlockedAt: new Date().toISOString()
        });
        showAchievementNotification(achievement);
    });
    
    if (newAchievements.length > 0) {
        saveAchievements();
        renderRecentBadges();
    }
}

function hasAchievement(id) {
    return achievements.some(achievement => achievement.id === id);
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function renderRecentBadges() {
    const recentBadges = document.getElementById('recentBadges');
    const recentAchievements = achievements.slice(-5).reverse();
    
    recentBadges.innerHTML = `
        <div class="badges-grid">
            ${recentAchievements.map(achievement => `
                <div class="badge unlocked">
                    <i class="${achievement.icon}"></i>
                    <span>${achievement.title}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'reminder bounce';
    notification.innerHTML = `
        <strong>🏆 Achievement Unlocked!</strong><br>
        ${achievement.title}<br>
        <small>${achievement.description}</small>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Data Export/Import Functions
function exportData() {
    const data = {
        tasks,
        goals,
        exams,
        materials,
        studySessions,
        achievements,
        settings,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully! 💾');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (confirm('This will replace all your current data. Are you sure?')) {
                        tasks = data.tasks || [];
                        goals = data.goals || [];
                        exams = data.exams || [];
                        materials = data.materials || [];
                        studySessions = data.studySessions || [];
                        achievements = data.achievements || [];
                        settings = data.settings || settings;
                        
                        saveAllData();
                        initializeApp();
                        showNotification('Data imported successfully! 📥');
                    }
                } catch (error) {
                    alert('Invalid file format. Please select a valid backup file.');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function clearAllData() {
    if (confirm('This will permanently delete ALL your data. This cannot be undone. Are you absolutely sure?')) {
        localStorage.clear();
        location.reload();
    }
}

function saveAllData() {
    saveTasks();
    saveGoals();
    saveExams();
    saveMaterials();
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
    saveAchievements();
    saveSettings();
}

// Utility Functions
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Event Listeners for new modals
document.getElementById('examForm').addEventListener('submit', addExam);
document.getElementById('materialForm').addEventListener('submit', addMaterial);

// Settings event listeners
document.getElementById('enableNotifications').addEventListener('change', function() {
    settings.notifications = this.checked;
    saveSettings();
});

document.getElementById('enableSounds').addEventListener('change', function() {
    settings.sounds = this.checked;
    saveSettings();
});

document.getElementById('enableReminders').addEventListener('change', function() {
    settings.reminders = this.checked;
    saveSettings();
});

document.getElementById('defaultStudyTime').addEventListener('change', function() {
    settings.defaultStudyTime = parseInt(this.value);
    saveSettings();
});

document.getElementById('defaultBreakTime').addEventListener('change', function() {
    settings.defaultBreakTime = parseInt(this.value);
    saveSettings();
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = ['goalModal', 'examModal', 'materialModal', 'settingsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}