/**
 * Siren Head - Main Application Logic
 * Pure Vanilla JS, No Frameworks
 */

const App = (() => {
    // --- State Management ---
    const state = {
        schedules: [],
        notes: [],
        assignments: [],
        settings: {
            theme: 'light',
            pomodoroTime: 25 * 60
        },
        currentView: 'dashboard',
        calendarDate: new Date()
    };

    const STORAGE_KEYS = {
        schedules: 'Siren Head_schedules',
        notes: 'Siren Head_notes',
        assignments: 'Siren Head_assignments',
        settings: 'Siren Head_settings'
    };

    // --- Initialization ---
    const init = () => {
        loadData();
        setupEventListeners();
        renderAll();
        startClock();
        checkTheme();
    };

    // --- Data Persistence ---
    const saveData = () => {
        localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(state.schedules));
        localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
        localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(state.assignments));
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    };

    const loadData = () => {
        const s = localStorage.getItem(STORAGE_KEYS.schedules);
        const n = localStorage.getItem(STORAGE_KEYS.notes);
        const a = localStorage.getItem(STORAGE_KEYS.assignments);
        const st = localStorage.getItem(STORAGE_KEYS.settings);

        if (s) state.schedules = JSON.parse(s);
        if (n) state.notes = JSON.parse(n);
        if (a) state.assignments = JSON.parse(a);
        if (st) state.settings = { ...state.settings, ...JSON.parse(st) };
    };

    // --- Utilities ---
    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
    
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="ph ph-${type === 'success' ? 'check-circle' : 'warning'}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const formatDate = (dateStr) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    };

    // --- Rendering ---
    const renderAll = () => {
        renderDashboard();
        renderSchedule();
        renderNotes();
        renderAssignments();
        renderCalendar();
    };

    const renderDashboard = () => {
        // Date & Greeting
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good Evening';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';
        
        document.getElementById('greeting').textContent = `${greeting}, Student!`;
        document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Stats
        document.getElementById('stat-notes').textContent = state.notes.length;
        document.getElementById('stat-pending').textContent = state.assignments.filter(a => a.status === 'Pending').length;
        
        const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const todayClasses = state.schedules.filter(s => s.day === todayName);
        document.getElementById('stat-classes').textContent = todayClasses.length;

        // Lists
        const schedList = document.getElementById('dashboard-schedule-list');
        schedList.innerHTML = '';
        if (todayClasses.length === 0) {
            schedList.innerHTML = '<li class="empty-state">No classes today.</li>';
        } else {
            todayClasses.sort((a,b) => a.start.localeCompare(b.start)).forEach(c => {
                schedList.innerHTML += `
                    <li>
                        <div>
                            <strong>${c.subject}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted)">${c.start} - ${c.end} • ${c.location}</div>
                        </div>
                        <div style="width:10px; height:10px; background:${c.color}; border-radius:50%"></div>
                    </li>`;
            });
        }

        const assignList = document.getElementById('dashboard-assignment-list');
        assignList.innerHTML = '';
        const pendingAssigns = state.assignments
            .filter(a => a.status === 'Pending')
            .sort((a,b) => new Date(a.due) - new Date(b.due))
            .slice(0, 5);
            
        if (pendingAssigns.length === 0) {
            assignList.innerHTML = '<li class="empty-state">No pending assignments.</li>';
        } else {
            pendingAssigns.forEach(a => {
                const isOverdue = new Date(a.due) < now && new Date(a.due).getDate() !== now.getDate();
                const color = isOverdue ? 'var(--danger)' : 'var(--text-main)';
                assignList.innerHTML += `
                    <li style="color:${color}">
                        <div>
                            <strong>${a.title}</strong>
                            <div style="font-size:0.8rem">${a.subject} • Due: ${formatDate(a.due)}</div>
                        </div>
                    </li>`;
            });
        }
    };

    const renderSchedule = () => {
        const container = document.getElementById('schedule-container');
        container.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        days.forEach(day => {
            const col = document.createElement('div');
            col.className = 'day-column';
            col.innerHTML = `<div class="day-header">${day}</div>`;
            
            const dayClasses = state.schedules.filter(s => s.day === day).sort((a,b) => a.start.localeCompare(b.start));
            
            dayClasses.forEach(c => {
                const card = document.createElement('div');
                card.className = 'class-card';
                card.style.borderLeftColor = c.color;
                card.innerHTML = `
                    <div style="font-weight:bold">${c.subject}</div>
                    <div>${c.start} - ${c.end}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${c.location}</div>
                `;
                card.onclick = () => editSchedule(c.id);
                col.appendChild(card);
            });
            
            container.appendChild(col);
        });
    };

    const renderNotes = () => {
        const container = document.getElementById('notes-container');
        const search = document.getElementById('note-search').value.toLowerCase();
        container.innerHTML = '';

        const filtered = state.notes.filter(n => 
            n.title.toLowerCase().includes(search) || 
            n.subject.toLowerCase().includes(search) ||
            n.content.toLowerCase().includes(search)
        );

        // Sort pinned first
        filtered.sort((a,b) => (b.pinned === a.pinned) ? 0 : b.pinned ? 1 : -1);

        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.pinned ? 'pinned' : ''}`;
            card.innerHTML = `
                <h4>${note.title}</h4>
                <span class="subject-tag">${note.subject || 'General'}</span>
                <p>${note.content}</p>
            `;
            card.onclick = () => editNote(note.id);
            container.appendChild(card);
        });
    };

    const renderAssignments = () => {
        const tbody = document.getElementById('assignments-list');
        const filter = document.getElementById('assignment-filter').value;
        tbody.innerHTML = '';

        let filtered = state.assignments;
        if (filter !== 'all') {
            filtered = filtered.filter(a => a.status.toLowerCase() === filter);
        }

        filtered.sort((a,b) => new Date(a.due) - new Date(b.due));

        filtered.forEach(a => {
            const tr = document.createElement('tr');
            const isCompleted = a.status === 'Completed';
            tr.innerHTML = `
                <td class="${isCompleted ? 'status-completed' : ''}">${a.title}</td>
                <td>${a.subject}</td>
                <td>${formatDate(a.due)}</td>
                <td><span class="priority-badge priority-${a.priority}">${a.priority}</span></td>
                <td>
                    <select onchange="App.updateAssignmentStatus('${a.id}', this.value)" style="padding:2px; font-size:0.8rem">
                        <option value="Pending" ${a.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Completed" ${a.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td>
                    <button class="btn-secondary" style="padding:4px 8px" onclick="App.editAssignment('${a.id}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn-danger" style="padding:4px 8px" onclick="App.deleteAssignment('${a.id}')"><i class="ph ph-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    const renderCalendar = () => {
        const grid = document.getElementById('calendar-grid');
        // Keep headers
        const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
        grid.innerHTML = '';
        headers.forEach(h => grid.appendChild(h));

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();
        
        document.getElementById('calendar-month-year').textContent = 
            new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day empty';
            grid.appendChild(div);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day';
            div.innerHTML = `<span class="cal-day-number">${i}</span>`;
            
            const currentDateStr = new Date(year, month, i).toDateString();
            
            // Check Assignments
            state.assignments.forEach(a => {
                if (new Date(a.due).toDateString() === currentDateStr) {
                    div.innerHTML += `<div class="cal-event assignment">${a.title}</div>`;
                }
            });

            // Check Classes (Simple visualization: just show count or subject if same day weekly)
            // Note: This is a monthly view, so weekly classes repeat. 
            // For simplicity in this static version, we won't map weekly classes to specific dates 
            // unless we calculate every occurrence, which is complex for vanilla JS without libraries.
            // We will just show assignments for now to keep it clean.

            grid.appendChild(div);
        }
    };

    // --- Actions ---

    // Schedule
    const saveSchedule = (e) => {
        e.preventDefault();
        const id = document.getElementById('sched-id').value;
        const data = {
            id: id || generateId(),
            subject: document.getElementById('sched-subject').value,
            day: document.getElementById('sched-day').value,
            start: document.getElementById('sched-start').value,
            end: document.getElementById('sched-end').value,
            location: document.getElementById('sched-location').value,
            color: document.getElementById('sched-color').value
        };

        if (id) {
                        const index = state.schedules.findIndex(s => s.id === id);
            if (index !== -1) state.schedules[index] = data;
        } else {
            state.schedules.push(data);
        }
        
        saveData();
        renderAll();
        closeModal('schedule-modal');
        showToast('Schedule saved successfully');
    };

    const editSchedule = (id) => {
        const item = state.schedules.find(s => s.id === id);
        if (!item) return;
        
        document.getElementById('sched-id').value = item.id;
        document.getElementById('sched-subject').value = item.subject;
        document.getElementById('sched-day').value = item.day;
        document.getElementById('sched-start').value = item.start;
        document.getElementById('sched-end').value = item.end;
        document.getElementById('sched-location').value = item.location;
        document.getElementById('sched-color').value = item.color;
        
        openModal('schedule-modal');
    };

    const deleteSchedule = (id) => {
        if(confirm('Delete this class?')) {
            state.schedules = state.schedules.filter(s => s.id !== id);
            saveData();
            renderAll();
            showToast('Class deleted', 'error');
        }
    };

    // Notes
    const saveNote = (e) => {
        e.preventDefault();
        const id = document.getElementById('note-id').value;
        const data = {
            id: id || generateId(),
            title: document.getElementById('note-title').value,
            subject: document.getElementById('note-subject').value,
            content: document.getElementById('note-content').value,
            pinned: document.getElementById('note-pinned').checked
        };

        if (id) {
            const index = state.notes.findIndex(n => n.id === id);
            if (index !== -1) state.notes[index] = data;
        } else {
            state.notes.push(data);
        }
        
        saveData();
        renderAll();
        closeModal('note-modal');
        showToast('Note saved');
    };

    const editNote = (id) => {
        const item = state.notes.find(n => n.id === id);
        if (!item) return;
        
        document.getElementById('note-id').value = item.id;
        document.getElementById('note-title').value = item.title;
        document.getElementById('note-subject').value = item.subject;
        document.getElementById('note-content').value = item.content;
        document.getElementById('note-pinned').checked = item.pinned;
        
        openModal('note-modal');
    };

    const deleteNote = (id) => {
        if(confirm('Delete this note?')) {
            state.notes = state.notes.filter(n => n.id !== id);
            saveData();
            renderAll();
            showToast('Note deleted', 'error');
        }
    };

    const exportNoteAsTxt = () => {
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').value;
        if (!title) return;
        
        const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Assignments
    const saveAssignment = (e) => {
        e.preventDefault();
        const id = document.getElementById('assign-id').value;
        const data = {
            id: id || generateId(),
            title: document.getElementById('assign-title').value,
            subject: document.getElementById('assign-subject').value,
            due: document.getElementById('assign-due').value,
            priority: document.getElementById('assign-priority').value,
            status: 'Pending' // Default
        };

        if (id) {
            const index = state.assignments.findIndex(a => a.id === id);
            if (index !== -1) {
                data.status = state.assignments[index].status; // Preserve status
                state.assignments[index] = data;
            }
        } else {
            state.assignments.push(data);
        }
        
        saveData();
        renderAll();
        closeModal('assignment-modal');
        showToast('Assignment added');
    };

    const editAssignment = (id) => {
        const item = state.assignments.find(a => a.id === id);
        if (!item) return;
        
        document.getElementById('assign-id').value = item.id;
        document.getElementById('assign-title').value = item.title;
        document.getElementById('assign-subject').value = item.subject;
        document.getElementById('assign-due').value = item.due;
        document.getElementById('assign-priority').value = item.priority;
        
        openModal('assignment-modal');
    };

    const updateAssignmentStatus = (id, status) => {
        const index = state.assignments.findIndex(a => a.id === id);
        if (index !== -1) {
            state.assignments[index].status = status;
            saveData();
            renderAll();
            showToast(`Marked as ${status}`);
        }
    };

    const deleteAssignment = (id) => {
        if(confirm('Delete this assignment?')) {
            state.assignments = state.assignments.filter(a => a.id !== id);
            saveData();
            renderAll();
            showToast('Assignment deleted', 'error');
        }
    };

    // --- UI Interactions ---
    const openModal = (modalId) => {
        // Reset forms if opening new
        if (!document.getElementById(modalId).querySelector('input[type="hidden"]').value) {
             // Optional: Clear form logic here if needed for "New" vs "Edit"
        }
        document.getElementById(modalId).classList.add('active');
    };

    const closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
        // Clear hidden IDs
        const hiddenInput = document.getElementById(modalId).querySelector('input[type="hidden"]');
        if(hiddenInput) hiddenInput.value = '';
        // Reset forms
        const form = document.getElementById(modalId).querySelector('form');
        if(form) form.reset();
    };

    const switchView = (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-target="${viewId}"]`).classList.add('active');
        
        document.getElementById('page-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);
        state.currentView = viewId;
    };

    const toggleTheme = () => {
        state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveData();
    };

    const applyTheme = () => {
        document.body.setAttribute('data-theme', state.settings.theme);
        const icon = document.querySelector('#theme-toggle i');
        if (state.settings.theme === 'dark') {
            icon.classList.replace('ph-moon', 'ph-sun');
        } else {
            icon.classList.replace('ph-sun', 'ph-moon');
        }
    };

    const checkTheme = () => {
        applyTheme();
    };

    // --- Data Import/Export ---
    const exportData = () => {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Siren Head_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('Data exported');
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.schedules && imported.notes && imported.assignments) {
                    state.schedules = imported.schedules;
                    state.notes = imported.notes;
                    state.assignments = imported.assignments;
                    if (imported.settings) state.settings = imported.settings;
                    saveData();
                    renderAll();
                    checkTheme();
                    showToast('Data imported successfully');
                } else {
                    throw new Error('Invalid format');
                }
            } catch (err) {
                showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    };

    const clearAllData = () => {
        if (confirm('WARNING: This will delete ALL your data. Are you sure?')) {
            localStorage.clear();
            location.reload();
        }
    };

    // --- Clock & Pomodoro ---
    const startClock = () => {
        // Update greeting every minute
        setInterval(renderDashboard, 60000);
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.target));
        });

        // Theme
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('settings-theme-toggle').addEventListener('click', toggleTheme);

        // Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                closeModal(e.target.closest('.modal').id);
            });
        });

        // Forms
        document.getElementById('schedule-form').addEventListener('submit', saveSchedule);
        document.getElementById('note-form').addEventListener('submit', saveNote);
        document.getElementById('assignment-form').addEventListener('submit', saveAssignment);

        // Search & Filter
        document.getElementById('note-search').addEventListener('input', renderNotes);
        document.getElementById('assignment-filter').addEventListener('change', renderAssignments);

        // Calendar Nav
        document.getElementById('prev-month').addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('next-month').addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
            renderCalendar();
        });

        // Import
        document.getElementById('import-file').addEventListener('change', importData);

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (state.currentView === 'notes') openModal('note-modal');
                else if (state.currentView === 'assignments') openModal('assignment-modal');
            }
        });
    };

    // Public API
    return {
        init,
        openModal,
        editSchedule,
        deleteSchedule,
        editNote,
        deleteNote,
        exportNoteAsTxt,
        editAssignment,
        deleteAssignment,
        updateAssignmentStatus,
        exportData,
        clearAllData
    };

})();

// Start App
document.addEventListener('DOMContentLoaded', App.init);