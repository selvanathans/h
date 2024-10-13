// Helper for Local Storage interactions
const setLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getLocalStorage = (key) => JSON.parse(localStorage.getItem(key)) || null;

// Calculate current day based on start date
const calculateCurrentDay = (startDate) => Math.ceil(Math.abs(new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));

// Get the current date information
const getCurrentDateInfo = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const yearDays = today.getFullYear() % 4 === 0 ? 366 : 365;
    return { formattedDate: today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), dayOfYear, yearDays };
}

// Display current date and challenge information
const displayCurrentDateInfo = () => {
    const { formattedDate, dayOfYear, yearDays } = getCurrentDateInfo();
    document.getElementById("currentDateInfo").innerText = `${formattedDate} - Day ${dayOfYear}/${yearDays}`;
}

// Monitor habit changes
const monitorHabitChanges = () => document.querySelectorAll("#habitList input").forEach(input => input.addEventListener('input', updateHabits));

// Load habit tracker data and display it
const loadHabitTracker = (userData) => {
    const today = new Date().toISOString().split('T')[0];
    const daysSinceLastVisit = calculateCurrentDay(userData.last_visited);

    if (userData.last_visited !== today && daysSinceLastVisit > 0) {
        for (const habit in userData.habits) {
            if (userData.habits[habit].type === "streak") {
                userData.habits[habit].value = parseInt(userData.habits[habit].value) + daysSinceLastVisit;
            }
        }
        userData.current_day += daysSinceLastVisit;
        userData.last_visited = today;
        setLocalStorage("user_data", userData);
    }

    document.getElementById("userForm").classList.add("d-none");
    document.getElementById("habitTracker").classList.remove("d-none");

    document.getElementById("welcomeUser").innerText = `Welcome, ${userData.name}!`;
    document.getElementById("challengeInfo").innerText = `Day ${userData.current_day}/${userData.challenge_duration}`;

    const habitList = document.getElementById("habitList");
    habitList.innerHTML = '';

    Object.entries(userData.habits).forEach(([habit, data]) => {
        const inputField = `<input type="${data.type === 'streak' ? 'number' : 'text'}" class="form-control" value="${data.value}" min="0">`;
        habitList.insertAdjacentHTML('beforeend', `<div class="mb-3"><label class="form-label">${habit} (${data.type}):</label>${inputField}</div>`);
    });

    displayCurrentDateInfo();
    monitorHabitChanges();
    generateWhatsAppMessagePreview();
}

// Update habits in local storage
const updateHabits = () => {
    const userData = getLocalStorage("user_data");
    if (!userData) return;

    document.querySelectorAll("#habitList .mb-3").forEach((habitElement) => {
        const habitName = habitElement.querySelector("label").innerText.split(' ')[0];
        const habitValue = habitElement.querySelector("input").value;
        userData.habits[habitName].value = habitValue;
    });

    userData.current_day = userData.isFirstSetupCompleted
        ? calculateCurrentDay(userData.start_date)
        : parseInt(document.getElementById("currentDayInput").value, 10) || calculateCurrentDay(userData.start_date);

    userData.isFirstSetupCompleted = true;
    setLocalStorage("user_data", userData);
    generateWhatsAppMessagePreview();
}

// Generate WhatsApp message preview
const generateWhatsAppMessagePreview = () => {
    const userData = getLocalStorage("user_data");
    if (!userData) return;

    const { formattedDate, dayOfYear, yearDays } = getCurrentDateInfo();
    let summary = `*${userData.name}*\nDay ${userData.current_day}/${userData.challenge_duration}\n${formattedDate} - Day ${dayOfYear}/${yearDays} \n\n`;

    Object.entries(userData.habits).forEach(([habit, data]) => {
        summary += `- *${habit}*: ${data.type === 'streak' ? `Day ${data.value}` : data.value}\n`;
    });

    document.getElementById("whatsappPreview").textContent = summary;
}

// Share progress on WhatsApp
const shareOnWhatsApp = () => {
    const userData = getLocalStorage("user_data");
    if (!userData) return;

    const { formattedDate, dayOfYear, yearDays } = getCurrentDateInfo();
    let summary = `*${userData.name}*\nDay ${userData.current_day}/${userData.challenge_duration}\n${formattedDate} - Day ${dayOfYear}/${yearDays} \n\n`;

    Object.entries(userData.habits).forEach(([habit, data]) => {
        summary += `- *${habit}*: ${data.type === 'streak' ? `Day ${data.value}` : data.value}\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url);
    setLocalStorage("user_data", userData);
}

// Export user data
const exportData = () => {
    const userData = getLocalStorage('user_data');
    if (!userData) {
        alert("No data to export.");
        return;
    }
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(userData))}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "habit_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Import user data
const importData = (event) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const userData = JSON.parse(event.target.result);
            setLocalStorage('user_data', userData);
            loadHabitTracker(userData);
        } catch {
            alert("Failed to import data. Please ensure the file is in the correct format.");
        }
    };
    reader.readAsText(event.target.files[0]);
}

// Reset user data
const confirmReset = () => {
    if (confirm("Are you sure you want to reset all your data? This cannot be undone.")) {
        localStorage.removeItem("user_data"); // Clear the user data from localStorage
        location.reload(); // Reload the page to reset the application
    }
}

// Add habit input fields dynamically
const addHabitInput = () => {
    const habitId = `habit_${document.querySelectorAll(".habit-group").length + 1}`;
    const habitHtml = `
        <div class="mb-3 habit-group" id="${habitId}">
            <label class="form-label">Habit Name:</label>
            <input type="text" class="form-control habit-name" required>
            <label class="form-label">Habit Type:</label>
            <select class="form-select habit-type" required>
                <option value="streak">Streak</option>
                <option value="number">Number</option>
                <option value="text">Text</option>
            </select>
            <button type="button" class="btn btn-danger mt-2" onclick="removeHabit('${habitId}')">Remove</button>
        </div>`;
    document.getElementById("habitInputs").insertAdjacentHTML('beforeend', habitHtml);
}

// Remove habit input
const removeHabit = (habitId) => document.getElementById(habitId).remove();

// Initialize app
window.addEventListener('load', () => {
    if (localStorage.getItem("darkModeEnabled") === "true") {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").checked = true;
    }

    const userData = getLocalStorage('user_data');
    if (userData) loadHabitTracker(userData);
});

// Toggle dark mode
document.getElementById("darkModeToggle").addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkModeEnabled", document.body.classList.contains("dark-mode"));
});


// Start the habit challenge when the form is submitted
document.getElementById("setupForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const challengeDuration = parseInt(document.getElementById("challengeDuration").value);
    const currentDayInput = document.getElementById("currentDayInput").value;
    const habits = {};

    // Validate challenge duration and current day
    if (challengeDuration <= 0) {
        alert("Please enter a valid challenge duration greater than 0.");
        return;
    }
    if (currentDayInput < 1 || currentDayInput > challengeDuration) {
        alert("Please enter a valid current day within the challenge duration.");
        return;
    }

    // Collect habit data from the form
    document.querySelectorAll(".habit-group").forEach((habitGroup) => {
        const habitName = habitGroup.querySelector(".habit-name").value.trim();
        const habitType = habitGroup.querySelector(".habit-type").value;
        if (!habits[habitName]) {
            habits[habitName] = { type: habitType, value: habitType === 'streak' ? 0 : '' };
        } else {
            alert("Each habit should have a unique name. Please rename your habits.");
        }
    });

    const startDate = new Date().toISOString().split('T')[0];
    const currentDay = currentDayInput ? parseInt(currentDayInput, 10) : 1;

    // Prepare user data and save it to localStorage
    const userData = {
        name,
        challenge_duration: challengeDuration,
        habits,
        start_date: startDate,
        current_day: currentDay,
        last_visited: startDate,
        isFirstSetupCompleted: false
    };

    setLocalStorage("user_data", userData);
    loadHabitTracker(userData);
});
