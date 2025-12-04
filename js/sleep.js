/**
 * Sleep Tracker Module
 * Manages sleep logging, weekly stats, and sleep pattern visualization.
 */
const SleepTracker = (() => {
    // Configuration constants
    const SELECTORS = {
        tabs: '.tabs button',
        sections: '.section',
        sleepTimeInput: '#sleepTime',
        wakeTimeInput: '#wakeTime',
        saveButton: '#saveSleep',
        avgSleepValue: '#avgSleepValue',
        nightsTrackedValue: '#nightsTrackedValue',
        suggestionsButton: '#getSuggestions',
        suggestionsContainer: '#suggestionsContainer',
        sleepChart: '#sleepChart',
        sleepTimeDisplay: '#sleepTimeDisplay',
        wakeTimeDisplay: '#wakeTimeDisplay',
        timePicker: '#timePicker',
        closePicker: '#closePicker',
        hoursColumn: '#hoursColumn',
        minutesColumn: '#minutesColumn',
        amBtn: '#amBtn',
        pmBtn: '#pmBtn',
        setTimeBtn: '#setTimeBtn',
        pickerTitle: '#pickerTitle'
    };

    const GRAPH_COLORS = [
        'var(--graph-color-1)',
        'var(--graph-color-2)',
        'var(--graph-color-3)',
        'var(--graph-color-4)',
        'var(--graph-color-5)',
        'var(--graph-color-6)',
        'var(--graph-color-7)'
    ];

    // State
    let sleepLogs = JSON.parse(localStorage.getItem('sleepLogs')) || [];
    let currentWeek = JSON.parse(localStorage.getItem('currentWeek')) || null;
    let sleepChart = null;
    let currentPicker = null;
    let selectedHour = 10;
    let selectedMinute = 0;
    let isPM = true;

    /**
     * Initializes the sleep tracker application.
     */
    function init() {
        checkAndResetWeeklyData();
        setupTabSwitching();
        setupEventListeners();
        initializeTimeInputs();
        initSleepChart();
        updateWeeklyStats();
        setupTimePicker();
    }

    // ------------------ Helper Functions ------------------
    /**
     * Gets the local date key in YYYY-MM-DD format.
     * @returns {string} Local date in YYYY-MM-DD format
     */
    function getLocalDateKey() {
        const now = new Date();
        // Get local date in YYYY-MM-DD without timezone conversion
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Gets the start of the current week (Monday).
     * @returns {Date} Start date of the current week
     */
    function getWeekStartDate() {
        const [year, month, day] = getLocalDateKey().split('-').map(Number);
        const today = new Date(year, month - 1, day);
        const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Days to subtract to get to Monday
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    /**
     * Checks if a new week has started and resets data if necessary.
     */
    function checkAndResetWeeklyData() {
        const weekStart = getWeekStartDate();
        const weekStartKey = weekStart.toISOString().split('T')[0];

        if (!currentWeek || currentWeek !== weekStartKey) {
            // New week, reset sleep logs
            sleepLogs = [];
            currentWeek = weekStartKey;
            localStorage.setItem('sleepLogs', JSON.stringify(sleepLogs));
            localStorage.setItem('currentWeek', JSON.stringify(currentWeek));
        }
    }

    // ------------------ UI Management ------------------
    /**
     * Sets up tab switching functionality for the UI.
     */
    function setupTabSwitching() {
        const tabs = document.querySelectorAll(SELECTORS.tabs);
        const sections = document.querySelectorAll(SELECTORS.sections);

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetId = tab.getAttribute('data-target');
                sections.forEach(section => section.style.display = 'none');

                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                    if (targetId === 'weeklyPattern') {
                        updateSleepChart();
                    }
                }
            });
        });

        document.querySelector('.tabs button.active')?.click();
    }

    /**
     * Sets up event listeners for buttons.
     */
    function setupEventListeners() {
        document.querySelector(SELECTORS.saveButton).addEventListener('click', saveSleepLog);
        document.querySelector(SELECTORS.suggestionsButton).addEventListener('click', generateSuggestions);
    }

    // ------------------ Time Management ------------------
    /**
     * Initializes time inputs with default values.
     */
    function initializeTimeInputs() {
        const now = new Date();
        const sleepTime = new Date(now);
        sleepTime.setHours(22, 0, 0, 0);

        const wakeTime = new Date(now);
        wakeTime.setDate(wakeTime.getDate() + 1);
        wakeTime.setHours(6, 30, 0, 0);

        document.querySelector(SELECTORS.sleepTimeInput).value = formatTime(sleepTime);
        document.querySelector(SELECTORS.wakeTimeInput).value = formatTime(wakeTime);

        updateTimeDisplay(document.querySelector(SELECTORS.sleepTimeDisplay), formatTime(sleepTime));
        updateTimeDisplay(document.querySelector(SELECTORS.wakeTimeDisplay), formatTime(wakeTime));
    }

    /**
     * Sets up the time picker functionality.
     */
    function setupTimePicker() {
        const sleepTimeDisplay = document.querySelector(SELECTORS.sleepTimeDisplay);
        const wakeTimeDisplay = document.querySelector(SELECTORS.wakeTimeDisplay);
        const closePicker = document.querySelector(SELECTORS.closePicker);
        const setTimeBtn = document.querySelector(SELECTORS.setTimeBtn);
        const amBtn = document.querySelector(SELECTORS.amBtn);
        const pmBtn = document.querySelector(SELECTORS.pmBtn);
        const timePicker = document.querySelector(SELECTORS.timePicker);

        sleepTimeDisplay.addEventListener('click', () => openPicker('sleep'));
        wakeTimeDisplay.addEventListener('click', () => openPicker('wake'));
        closePicker.addEventListener('click', closeTimePicker);
        setTimeBtn.addEventListener('click', applySelectedTime);
        amBtn.addEventListener('click', () => setAmPm(false));
        pmBtn.addEventListener('click', () => setAmPm(true));
        timePicker.addEventListener('click', e => {
            if (e.target === timePicker) closeTimePicker();
        });
    }

    /**
     * Opens the time picker for the specified type.
     * @param {string} type - 'sleep' or 'wake'
     */
    function openPicker(type) {
        currentPicker = type;
        const input = document.querySelector(
            type === 'sleep' ? SELECTORS.sleepTimeInput : SELECTORS.wakeTimeInput
        );
        const time = input.value;

        document.querySelector(SELECTORS.pickerTitle).textContent =
            `Set ${type === 'sleep' ? 'Sleep' : 'Wake'} Time`;

        const [h, m] = time.split(':').map(Number);
        selectedHour = h % 12 || 12;
        selectedMinute = m;
        isPM = h >= 12;

        updateAmPmUI();
        buildPickerOptions();

        const timePicker = document.querySelector(SELECTORS.timePicker);
        timePicker.classList.add('active');

        setTimeout(() => {
            scrollToIndex(document.querySelector(SELECTORS.hoursColumn), selectedHour - 1);
            scrollToIndex(document.querySelector(SELECTORS.minutesColumn), selectedMinute);
        }, 50);
    }

    /**
     * Closes the time picker.
     */
    function closeTimePicker() {
        document.querySelector(SELECTORS.timePicker).classList.remove('active');
    }

    /**
     * Builds the options for the time picker.
     */
    function buildPickerOptions() {
        const hoursColumn = document.querySelector(SELECTORS.hoursColumn);
        const minutesColumn = document.querySelector(SELECTORS.minutesColumn);

        hoursColumn.innerHTML = '<div class="picker-highlight"></div>';
        minutesColumn.innerHTML = '<div class="picker-highlight"></div>';

        for (let i = 1; i <= 12; i++) {
            appendPickerItem(hoursColumn, i, selectedHour, 'hour');
        }

        for (let i = 0; i < 60; i++) {
            appendPickerItem(minutesColumn, i, selectedMinute, 'minute');
        }

        attachScrollSync(hoursColumn, 'hour');
        attachScrollSync(minutesColumn, 'minute');
    }

    /**
     * Appends a picker item to the specified column.
     */
    function appendPickerItem(column, value, selected, type) {
        const el = document.createElement('div');
        el.className = 'picker-item';
        if (value === selected) el.classList.add('selected');
        el.textContent = value.toString().padStart(2, '0');
        el.dataset.value = value;
        el.addEventListener('click', () => selectTimeValue(el, type));
        column.appendChild(el);
    }

    /**
     * Attaches scroll synchronization to the picker column.
     */
    function attachScrollSync(column, type) {
        column.addEventListener('scroll', () => {
            const items = column.querySelectorAll('.picker-item');
            const idx = Math.round(column.scrollTop / items[0].offsetHeight);
            items.forEach(i => i.classList.remove('selected'));

            if (items[idx]) {
                items[idx].classList.add('selected');
                if (type === 'hour') selectedHour = parseInt(items[idx].dataset.value);
                else selectedMinute = parseInt(items[idx].dataset.value);
            }
        });
    }

    /**
     * Scrolls to the specified index in the picker column.
     */
    function scrollToIndex(column, idx) {
        const items = column.querySelectorAll('.picker-item');
        if (items.length && idx < items.length) {
            column.scrollTop = idx * items[0].offsetHeight;
        }
    }

    /**
     * Selects a time value in the picker.
     */
    function selectTimeValue(el, type) {
        el.parentElement.querySelectorAll('.picker-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
        if (type === 'hour') selectedHour = parseInt(el.dataset.value);
        else selectedMinute = parseInt(el.dataset.value);
    }

    /**
     * Sets the AM/PM value.
     */
    function setAmPm(pm) {
        isPM = pm;
        updateAmPmUI();
    }

    /**
     * Updates the AM/PM UI state.
     */
    function updateAmPmUI() {
        const amBtn = document.querySelector(SELECTORS.amBtn);
        const pmBtn = document.querySelector(SELECTORS.pmBtn);
        amBtn.classList.toggle('active', !isPM);
        pmBtn.classList.toggle('active', isPM);
    }

    /**
     * Applies the selected time to the input.
     */
    function applySelectedTime() {
        let hour24 = selectedHour;
        if (isPM && hour24 < 12) hour24 += 12;
        if (!isPM && hour24 === 12) hour24 = 0;

        const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        const display = currentPicker === 'sleep'
            ? document.querySelector(SELECTORS.sleepTimeDisplay)
            : document.querySelector(SELECTORS.wakeTimeDisplay);

        const input = currentPicker === 'sleep'
            ? document.querySelector(SELECTORS.sleepTimeInput)
            : document.querySelector(SELECTORS.wakeTimeInput);

        input.value = timeString;
        updateTimeDisplay(display, timeString);
        closeTimePicker();
    }

    /**
     * Updates the time display.
     */
    function updateTimeDisplay(container, time) {
        const [h, m] = time.split(':').map(Number);
        const h12 = h % 12 || 12;
        const suffix = h >= 12 ? 'PM' : 'AM';
        container.querySelector('span').textContent = `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
    }

    /**
     * Formats a date object to HH:mm string.
     */
    function formatTime(date) {
        return date.toTimeString().slice(0, 5);
    }

    // ------------------ Chart Management ------------------
    /**
     * Gets graph colors from CSS variables.
     */
    function getGraphColors() {
        const rootStyles = getComputedStyle(document.documentElement);
        return [
            rootStyles.getPropertyValue('--graph-color-1').trim(),
            rootStyles.getPropertyValue('--graph-color-2').trim(),
            rootStyles.getPropertyValue('--graph-color-3').trim(),
            rootStyles.getPropertyValue('--graph-color-4').trim(),
            rootStyles.getPropertyValue('--graph-color-5').trim(),
            rootStyles.getPropertyValue('--graph-color-6').trim(),
            rootStyles.getPropertyValue('--graph-color-7').trim()
        ];
    }

    /**
     * Initializes the sleep chart using Chart.js.
     */
    function initSleepChart() {
        const chartColors = getGraphColors();
        const ctx = document.querySelector(SELECTORS.sleepChart)?.getContext('2d');
        if (!ctx) return;

        sleepChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Sleep Duration (hours)',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: chartColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Your Sleep Pattern This Week',
                        font: { size: 18 }
                    }
                }
            }
        });

        updateSleepChart();
    }

    /**
     * Updates the sleep chart with the latest data.
     */
    function updateSleepChart() {
        if (!sleepChart) return;

        const last7DaysData = getLast7DaysData();
        sleepChart.data.datasets[0].data = last7DaysData.map(day => day.duration);
        sleepChart.update();
    }

    // ------------------ Data Management ------------------
    /**
     * Saves a new sleep log to local storage.
     */
    function saveSleepLog() {
        const sleepTime = document.querySelector(SELECTORS.sleepTimeInput).value;
        const wakeTime = document.querySelector(SELECTORS.wakeTimeInput).value;

        if (!sleepTime || !wakeTime) {
            Swal.fire({
                title: 'Error',
                text: 'Please enter both sleep and wake times.',
                icon: 'error',
                confirmButtonColor: 'var(--primary-color)'
            });
            return;
        }

        const duration = calculateDuration(sleepTime, wakeTime);
        const log = {
            date: getLocalDateKey(),
            sleepTime,
            wakeTime,
            duration
        };

        const existingLogIndex = sleepLogs.findIndex(l => l.date === log.date);
        if (existingLogIndex !== -1) {
            sleepLogs[existingLogIndex] = log;
        } else {
            sleepLogs.push(log);
        }

        localStorage.setItem('sleepLogs', JSON.stringify(sleepLogs));

        Swal.fire({
            title: 'Sleep Logged Successfully!',
            html: `You slept from <strong>${sleepTime}</strong> to <strong>${wakeTime}</strong><br>
                   Total sleep duration: <strong>${duration} hours</strong>`,
            icon: 'success',
            confirmButtonText: 'View Patterns',
            confirmButtonColor: 'var(--primary-color)'
        }).then(result => {
            if (result.isConfirmed) {
                updateWeeklyStats();
                updateSleepChart();
                document.querySelectorAll(SELECTORS.tabs).forEach(btn => btn.classList.remove('active'));
                const patternTab = document.querySelector('[data-target="weeklyPattern"]');
                patternTab.classList.add('active');
                document.querySelectorAll(SELECTORS.sections).forEach(section => section.style.display = 'none');
                document.getElementById('weeklyPattern').style.display = 'block';
            }
        });
    }

    /**
     * Calculates sleep duration in hours.
     */
    function calculateDuration(sleepTime, wakeTime) {
        const sleep = new Date(`2000-01-01T${sleepTime}:00`);
        const wake = new Date(`2000-01-01T${wakeTime}:00`);

        if (wake < sleep) {
            wake.setDate(wake.getDate() + 1);
        }

        const durationMs = wake - sleep;
        return (durationMs / (1000 * 60 * 60)).toFixed(1);
    }

    /**
     * Retrieves sleep data for the last 7 days, aligned to the current week.
     */
    function getLast7DaysData() {
        const weekStart = getWeekStartDate();
        const last7Days = [];
        const daysInWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Create an array for the week starting from Monday
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            const log = sleepLogs.find(log => log.date === dateString);

            last7Days.push({
                date: dateString,
                duration: log ? parseFloat(log.duration) : 0,
                day: daysInWeek[i]
            });
        }

        return last7Days;
    }

    /**
     * Updates the weekly stats display.
     */
    function updateWeeklyStats() {
        const last7DaysData = getLast7DaysData();
        const nightsTracked = last7DaysData.filter(day => day.duration > 0).length;
        const totalSleep = last7DaysData.reduce((sum, day) => sum + parseFloat(day.duration || 0), 0);
        const avgSleep = nightsTracked > 0 ? (totalSleep / nightsTracked).toFixed(1) : 0;

        document.querySelector(SELECTORS.avgSleepValue).textContent = `${avgSleep}h`;
        document.querySelector(SELECTORS.nightsTrackedValue).textContent = nightsTracked;
    }

    // ------------------ Suggestions ------------------
    /**
     * Generates personalized sleep improvement suggestions.
     */
    function generateSuggestions() {
        const suggestionsContainer = document.querySelector(SELECTORS.suggestionsContainer);
        const last7DaysData = getLast7DaysData();
        const totalSleep = last7DaysData.reduce((sum, day) => sum + parseFloat(day.duration || 0), 0);
        const nightsTracked = last7DaysData.filter(day => day.duration > 0).length;
        const averageSleep = nightsTracked > 0 ? totalSleep / nightsTracked : 0;

        let suggestions = [];

        if (averageSleep < 7) {
            suggestions = [
                "You're getting less than the recommended 7-9 hours of sleep. Try to go to bed 30 minutes earlier each night.",
                "Limit screen time 1 hour before bed to improve sleep quality.",
                "Consider a relaxing bedtime routine with reading or meditation.",
                "Avoid caffeine after 2 PM to help you fall asleep easier."
            ];
        } else if (averageSleep > 9) {
            suggestions = [
                "You're sleeping more than the recommended amount. While rest is important, too much sleep can leave you feeling groggy.",
                "Try to maintain a consistent wake-up time, even on weekends.",
                "Excessive sleep might indicate underlying health issues. Consider consulting a doctor if this pattern continues.",
                "Ensure you're getting enough physical activity during the day."
            ];
        } else {
            suggestions = [
                "Great job! You're within the recommended sleep range.",
                "To maintain this pattern, keep your sleep schedule consistent.",
                "Consider tracking sleep quality in addition to duration for further insights.",
                "Morning sunlight exposure can help regulate your circadian rhythm."
            ];
        }

        const weekdayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const weekendDays = ['Sat', 'Sun'];

        const weekdaySleep = last7DaysData
            .filter(day => weekdayDays.includes(day.day))
            .reduce((sum, day) => sum + parseFloat(day.duration || 0), 0);

        const weekendSleep = last7DaysData
            .filter(day => weekendDays.includes(day.day))
            .reduce((sum, day) => sum + parseFloat(day.duration || 0), 0);

        const weekdayAvg = weekdaySleep / Math.max(1, last7DaysData.filter(day => weekdayDays.includes(day.day)).length);
        const weekendAvg = weekendSleep / Math.max(1, last7DaysData.filter(day => weekendDays.includes(day.day)).length);

        if (weekendAvg - weekdayAvg > 2) {
            suggestions.push("You have significant weekend catch-up sleep. Try to reduce the difference to less than 1 hour to avoid social jet lag.");
        }

        const minSleep = Math.min(...last7DaysData.map(day => day.duration || 0));
        const maxSleep = Math.max(...last7DaysData.map(day => day.duration || 0));

        if (maxSleep - minSleep > 3) {
            suggestions.push("Your sleep duration varies significantly between days. Try to maintain a more consistent schedule.");
        }

        let suggestionsHTML = '<h3>Personalized Sleep Improvement Tips</h3><ul>';
        suggestions.forEach(suggestion => {
            suggestionsHTML += `<li>${suggestion}</li>`;
        });
        suggestionsHTML += '</ul>';

        suggestionsContainer.innerHTML = suggestionsHTML;

        Swal.fire({
            title: 'Suggestions Generated!',
            text: 'We found personalized tips to improve your sleep quality',
            icon: 'success',
            confirmButtonText: 'Got it!',
            confirmButtonColor: 'var(--primary-color)'
        });
    }

    return { init };
})();

// Initialize the app
document.addEventListener('DOMContentLoaded', SleepTracker.init);