const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const form = document.getElementById("progressForm");
const logList = document.getElementById("logList");
const clearLogsBtn = document.getElementById("clearLogs");
const exportLogsBtn = document.getElementById("exportLogs");
const importLogsBtn = document.getElementById("importLogsBtn");
const importLogsInput = document.getElementById("importLogsInput");
const syncLogsBtn = document.getElementById("syncLogs");
const themeToggle = document.getElementById("themeToggle");
const dateInput = document.getElementById("date");
const sessionTypeSelect = document.getElementById("sessionType");
const exerciseFields = document.getElementById("exerciseFields");
const exerciseSection = document.getElementById("exerciseSection");

const deadliftHistory = document.getElementById("deadliftHistory");
const backSquatHistory = document.getElementById("backSquatHistory");
const jumpHistory = document.getElementById("jumpHistory");
const sprint200History = document.getElementById("sprint200History");
const sprint150History = document.getElementById("sprint150History");
const sprint300History = document.getElementById("sprint300History");

const deadliftChartCanvas = document.getElementById("deadliftChart");
const backSquatChartCanvas = document.getElementById("backSquatChart");
const jumpChartCanvas = document.getElementById("jumpChart");
const sprint200ChartCanvas = document.getElementById("sprint200Chart");
const sprint150ChartCanvas = document.getElementById("sprint150Chart");
const sprint300ChartCanvas = document.getElementById("sprint300Chart");

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzZ0BuOnAM_L0Sxf36cld7PjwxWzWGWG44VvEV8t6TNmJ-ta6G8gJA13yBj_8JiLlXp/exec";
const THEME_STORAGE_KEY = "theme";

let currentLogs = [];
let isSyncing = false;

let deadliftChartInstance = null;
let backSquatChartInstance = null;
let jumpChartInstance = null;
let sprint200ChartInstance = null;
let sprint150ChartInstance = null;
let sprint300ChartInstance = null;

const workoutExercises = {
  "Workout A": [
    { name: "1 Leg Approach Jumps", type: "jumps" },
    { name: "Step Up Knee Drive", type: "weight" },
    { name: "Step Up Knee Drive Jump", type: "jumps" },
    { name: "Deadlift", type: "weight" },
    { name: "Functional Calf Raise", type: "weight" }
  ],
  "Workout B": [
    { name: "Med Ball Rotational Throw", type: "reps" },
    { name: "DB 2 Arm 45 Degree Press", type: "weight" },
    { name: "DB 1 Arm 45 Degree Row + Pause", type: "weight" },
    { name: "Explosive Tricep Overhead Extensions", type: "weight" },
    { name: "3-Way Leg Raise", type: "reps" }
  ],
  "Workout C": [
    { name: "1 Leg Approach Jumps", type: "jumps" },
    { name: "Hurdle Hops Progressions", type: "jumps" },
    { name: "Back Squat", type: "weight" },
    { name: "Pull Up Progressions", type: "reps" },
    { name: "Military Press + Knee Drive", type: "weight" }
  ],
  "Conditioning A": [
    { name: "200m Sprint Block", type: "sprint", distance: 200, reps: 5, rest: "1 min" },
    { name: "150m Sprint Block", type: "sprint", distance: 150, reps: 7, rest: "45 sec" }
  ],
  "Conditioning B": [
    { name: "300m Sprint Block", type: "sprint", distance: 300, reps: 10, rest: "1 min" }
  ]
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    button.classList.add("active");

    const selectedTab = document.getElementById(targetTab);
    if (selectedTab) {
      selectedTab.classList.add("active");
    }

    if (targetTab === "charts") {
      renderCharts();
    }
  });
});

function getLogs() {
  return Array.isArray(currentLogs) ? currentLogs : [];
}

function setLogs(logs) {
  currentLogs = Array.isArray(logs) ? logs : [];
}

function generateLogId() {
  return `log_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function delayedSync(showMessage = false, attempts = 3, delay = 1500) {
  for (let i = 0; i < attempts; i += 1) {
    await sleep(delay);
    await syncLogsFromGoogleSheets(showMessage && i === attempts - 1);
  }
}

function createInputField({ label, type = "number", className, placeholder = "", value = "" }) {
  return `
    <div>
      <label>${label}</label>
      <input type="${type}" class="${className}" placeholder="${placeholder}" value="${value}" />
    </div>
  `;
}

function createExerciseCard(exercise, index) {
  let innerContent = "";

  if (exercise.type === "weight") {
    innerContent = `
      <div class="exercise-grid">
        ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
        ${createInputField({ label: "Reps", className: "exercise-reps", placeholder: "e.g. 10" })}
        ${createInputField({ label: "Weight (kg)", className: "exercise-weight", placeholder: "e.g. 70" })}
      </div>
    `;
  } else if (exercise.type === "jumps") {
    innerContent = `
      <div class="exercise-grid">
        ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
        ${createInputField({ label: "Jumps / Reps", className: "exercise-jumps", placeholder: "e.g. 15" })}
        ${createInputField({ label: "Height / Note", type: "text", className: "exercise-extra", placeholder: "optional" })}
      </div>
    `;
  } else if (exercise.type === "reps") {
    innerContent = `
      <div class="exercise-grid">
        ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
        ${createInputField({ label: "Reps", className: "exercise-reps", placeholder: "e.g. 8" })}
        ${createInputField({ label: "Load / Ball / Assist", type: "text", className: "exercise-extra", placeholder: "optional" })}
      </div>
    `;
  } else if (exercise.type === "sprint") {
    let sprintInputs = "";

    for (let i = 1; i <= exercise.reps; i += 1) {
      sprintInputs += `
        <div>
          <label>Rep ${i} Time (sec)</label>
          <input
            type="number"
            step="0.01"
            class="exercise-sprint-time"
            placeholder="e.g. 32.40"
          />
        </div>
      `;
    }

    innerContent = `
      <div class="exercise-grid">
        ${createInputField({
          label: "Distance (m)",
          className: "exercise-distance",
          value: exercise.distance
        })}
        ${createInputField({
          label: "Target Reps",
          className: "exercise-target-reps",
          value: exercise.reps
        })}
        ${createInputField({
          label: "Rest",
          type: "text",
          className: "exercise-rest",
          value: exercise.rest
        })}
      </div>
      <div class="exercise-grid sprint-times-grid">
        ${sprintInputs}
      </div>
    `;
  }

  return `
    <div class="mini-card exercise-card" data-index="${index}" data-type="${exercise.type}">
      <h4>${exercise.name}</h4>
      ${innerContent}
      <div class="exercise-note-wrap">
        <label>Exercise Note</label>
        <input type="text" class="exercise-note" placeholder="optional note" />
      </div>
    </div>
  `;
}

function renderExerciseFields(sessionType) {
  exerciseFields.innerHTML = "";

  const exercises = workoutExercises[sessionType];

  if (!exercises) {
    exerciseSection.style.display = "none";
    return;
  }

  exerciseSection.style.display = "block";

  exercises.forEach((exercise, index) => {
    exerciseFields.insertAdjacentHTML("beforeend", createExerciseCard(exercise, index));
  });
}

function collectExerciseData(sessionType) {
  const exercises = workoutExercises[sessionType];
  if (!exercises) return [];

  const cards = document.querySelectorAll(".exercise-card");

  return Array.from(cards).map((card, index) => {
    const exercise = exercises[index];
    const type = exercise.type;

    const baseData = {
      name: exercise.name,
      type,
      note: card.querySelector(".exercise-note")?.value.trim() || ""
    };

    if (type === "weight") {
      return {
        ...baseData,
        sets: card.querySelector(".exercise-sets")?.value || "",
        reps: card.querySelector(".exercise-reps")?.value || "",
        weight: card.querySelector(".exercise-weight")?.value || ""
      };
    }

    if (type === "jumps") {
      return {
        ...baseData,
        sets: card.querySelector(".exercise-sets")?.value || "",
        jumps: card.querySelector(".exercise-jumps")?.value || "",
        extra: card.querySelector(".exercise-extra")?.value.trim() || ""
      };
    }

    if (type === "reps") {
      return {
        ...baseData,
        sets: card.querySelector(".exercise-sets")?.value || "",
        reps: card.querySelector(".exercise-reps")?.value || "",
        extra: card.querySelector(".exercise-extra")?.value.trim() || ""
      };
    }

    if (type === "sprint") {
      const sprintTimeInputs = card.querySelectorAll(".exercise-sprint-time");
      const times = Array.from(sprintTimeInputs)
        .map((input) => Number(input.value))
        .filter((value) => !Number.isNaN(value) && value > 0);

      const bestTime = times.length ? Math.min(...times) : "";
      const averageTime = times.length
        ? Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(2))
        : "";

      return {
        ...baseData,
        distance: card.querySelector(".exercise-distance")?.value || "",
        targetReps: card.querySelector(".exercise-target-reps")?.value || "",
        rest: card.querySelector(".exercise-rest")?.value.trim() || "",
        times,
        bestTime,
        averageTime
      };
    }

    return baseData;
  });
}

function formatExerciseDetails(exercise) {
  if (exercise.type === "weight") {
    return `
      <li>
        <strong>${exercise.name}:</strong>
        Sets ${exercise.sets || "-"},
        Reps ${exercise.reps || "-"},
        Weight ${exercise.weight || "-"} kg
        ${exercise.note ? `, Note: ${exercise.note}` : ""}
      </li>
    `;
  }

  if (exercise.type === "jumps") {
    return `
      <li>
        <strong>${exercise.name}:</strong>
        Sets ${exercise.sets || "-"},
        Jumps/Reps ${exercise.jumps || "-"}
        ${exercise.extra ? `, Extra: ${exercise.extra}` : ""}
        ${exercise.note ? `, Note: ${exercise.note}` : ""}
      </li>
    `;
  }

  if (exercise.type === "reps") {
    return `
      <li>
        <strong>${exercise.name}:</strong>
        Sets ${exercise.sets || "-"},
        Reps ${exercise.reps || "-"}
        ${exercise.extra ? `, Extra: ${exercise.extra}` : ""}
        ${exercise.note ? `, Note: ${exercise.note}` : ""}
      </li>
    `;
  }

  if (exercise.type === "sprint") {
    const timesText =
      exercise.times && exercise.times.length ? exercise.times.join(", ") : "-";

    return `
      <li>
        <strong>${exercise.name}:</strong>
        Distance ${exercise.distance || "-"} m,
        Target Reps ${exercise.targetReps || "-"},
        Best Time ${exercise.bestTime || "-"} sec,
        Average Time ${exercise.averageTime || "-"} sec,
        Rest ${exercise.rest || "-"},
        Times [${timesText}]
        ${exercise.note ? `, Note: ${exercise.note}` : ""}
      </li>
    `;
  }

  return `<li><strong>${exercise.name}</strong></li>`;
}

function createLogItem(log, reversedIndex, totalLogs) {
  const logItem = document.createElement("div");
  logItem.className = "log-item";

  const actualIndex = totalLogs - 1 - reversedIndex;
  const exerciseList = log.exercises?.length
    ? `
      <div class="log-exercises">
        <p><strong>Exercises:</strong></p>
        <ul>
          ${log.exercises.map((exercise) => formatExerciseDetails(exercise)).join("")}
        </ul>
      </div>
    `
    : "";

  logItem.innerHTML = `
    <p><strong>Date:</strong> ${log.date}</p>
    <p><strong>Session:</strong> ${log.sessionType}</p>
    <p><strong>RPE:</strong> ${log.rpe || "-"}</p>
    <p><strong>Duration:</strong> ${log.duration ? `${log.duration} min` : "-"}</p>
    <p><strong>Notes:</strong> ${log.notes || "-"}</p>
    ${exerciseList}
    <button type="button" class="danger-btn delete-log-btn" data-index="${actualIndex}">Delete Session</button>
  `;

  return logItem;
}

function renderLogs() {
  const logs = getLogs();
  logList.innerHTML = "";

  if (logs.length === 0) {
    logList.innerHTML = "<p>No sessions logged yet.</p>";
    return;
  }

  const sortedLogs = [...logs].reverse();

  sortedLogs.forEach((log, reversedIndex) => {
    const logItem = createLogItem(log, reversedIndex, logs.length);
    logList.appendChild(logItem);
  });

  document.querySelectorAll(".delete-log-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.index);
      await deleteLog(index);
    });
  });
}

function findExerciseHistory(exerciseName) {
  const logs = getLogs();

  return logs
    .flatMap((log) => {
      if (!log.exercises || !Array.isArray(log.exercises)) return [];

      return log.exercises
        .filter((exercise) => exercise.name === exerciseName)
        .map((exercise) => ({
          date: log.date,
          sessionType: log.sessionType,
          ...exercise
        }));
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function findJumpHistory() {
  const logs = getLogs();

  return logs
    .flatMap((log) => {
      if (!log.exercises || !Array.isArray(log.exercises)) return [];

      return log.exercises
        .filter((exercise) => exercise.type === "jumps")
        .map((exercise) => ({
          date: log.date,
          sessionType: log.sessionType,
          ...exercise
        }));
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function findSprintHistory(distance) {
  const logs = getLogs();

  return logs
    .flatMap((log) => {
      if (!log.exercises || !Array.isArray(log.exercises)) return [];

      return log.exercises
        .filter(
          (exercise) =>
            exercise.type === "sprint" && Number(exercise.distance) === distance
        )
        .map((exercise) => ({
          date: log.date,
          sessionType: log.sessionType,
          ...exercise
        }));
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderHistoryList(container, items, formatter) {
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="history-empty">No history yet.</p>`;
    return;
  }

  const newestFirst = [...items].reverse();
  container.innerHTML = newestFirst.map((item) => formatter(item)).join("");
}

function renderHistory() {
  const deadliftItems = findExerciseHistory("Deadlift");
  const squatItems = findExerciseHistory("Back Squat");
  const jumpItems = findJumpHistory();
  const sprint200Items = findSprintHistory(200);
  const sprint150Items = findSprintHistory(150);
  const sprint300Items = findSprintHistory(300);

  renderHistoryList(deadliftHistory, deadliftItems, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Workout: ${item.sessionType}</p>
      <p>Sets: ${item.sets || "-"}</p>
      <p>Reps: ${item.reps || "-"}</p>
      <p>Weight: ${item.weight || "-"} kg</p>
    </div>
  `);

  renderHistoryList(backSquatHistory, squatItems, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Workout: ${item.sessionType}</p>
      <p>Sets: ${item.sets || "-"}</p>
      <p>Reps: ${item.reps || "-"}</p>
      <p>Weight: ${item.weight || "-"} kg</p>
    </div>
  `);

  renderHistoryList(jumpHistory, jumpItems, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Exercise: ${item.name}</p>
      <p>Workout: ${item.sessionType}</p>
      <p>Sets: ${item.sets || "-"}</p>
      <p>Jumps/Reps: ${item.jumps || "-"}</p>
      <p>${item.extra ? `Extra: ${item.extra}` : "Extra: -"}</p>
    </div>
  `);

  renderHistoryList(sprint200History, sprint200Items, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Workout: ${item.sessionType}</p>
      <p>Best Time: ${item.bestTime || "-"} sec</p>
      <p>Average Time: ${item.averageTime || "-"} sec</p>
      <p>Times: ${item.times?.length ? item.times.join(", ") : "-"}</p>
    </div>
  `);

  renderHistoryList(sprint150History, sprint150Items, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Workout: ${item.sessionType}</p>
      <p>Best Time: ${item.bestTime || "-"} sec</p>
      <p>Average Time: ${item.averageTime || "-"} sec</p>
      <p>Times: ${item.times?.length ? item.times.join(", ") : "-"}</p>
    </div>
  `);

  renderHistoryList(sprint300History, sprint300Items, (item) => `
    <div class="history-entry">
      <p><strong>${item.date}</strong></p>
      <p>Workout: ${item.sessionType}</p>
      <p>Best Time: ${item.bestTime || "-"} sec</p>
      <p>Average Time: ${item.averageTime || "-"} sec</p>
      <p>Times: ${item.times?.length ? item.times.join(", ") : "-"}</p>
    </div>
  `);
}

function buildDeadliftChartData() {
  const items = findExerciseHistory("Deadlift");
  return {
    labels: items.map((item) => item.date),
    values: items.map((item) => Number(item.weight) || 0)
  };
}

function buildBackSquatChartData() {
  const items = findExerciseHistory("Back Squat");
  return {
    labels: items.map((item) => item.date),
    values: items.map((item) => Number(item.weight) || 0)
  };
}

function buildJumpChartData() {
  const items = findJumpHistory();
  const grouped = {};

  items.forEach((item) => {
    const date = item.date;
    const jumps = Number(item.jumps) || 0;

    if (!grouped[date]) {
      grouped[date] = 0;
    }

    grouped[date] += jumps;
  });

  const labels = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
  const values = labels.map((label) => grouped[label]);

  return { labels, values };
}

function buildSprintChartData(distance) {
  const items = findSprintHistory(distance);
  return {
    labels: items.map((item) => item.date),
    values: items.map((item) => Number(item.bestTime) || 0)
  };
}

function destroyChart(instance) {
  if (instance) {
    instance.destroy();
  }
}

function getChartTextColor() {
  return getComputedStyle(document.body).getPropertyValue("--text").trim() || "#EAE8FF";
}

function getChartGridColor() {
  return getComputedStyle(document.body).getPropertyValue("--border").trim() || "#2A2A3C";
}

function createLineChart(canvas, labels, data, labelText) {
  if (!canvas || typeof Chart === "undefined") return null;

  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: labelText,
          data,
          borderWidth: 2,
          tension: 0.25,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      }
    }
  });
}

function renderCharts() {
  const deadliftData = buildDeadliftChartData();
  const squatData = buildBackSquatChartData();
  const jumpData = buildJumpChartData();
  const sprint200Data = buildSprintChartData(200);
  const sprint150Data = buildSprintChartData(150);
  const sprint300Data = buildSprintChartData(300);

  destroyChart(deadliftChartInstance);
  destroyChart(backSquatChartInstance);
  destroyChart(jumpChartInstance);
  destroyChart(sprint200ChartInstance);
  destroyChart(sprint150ChartInstance);
  destroyChart(sprint300ChartInstance);

  deadliftChartInstance = createLineChart(deadliftChartCanvas, deadliftData.labels, deadliftData.values, "Deadlift Weight (kg)");
  backSquatChartInstance = createLineChart(backSquatChartCanvas, squatData.labels, squatData.values, "Back Squat Weight (kg)");
  jumpChartInstance = createLineChart(jumpChartCanvas, jumpData.labels, jumpData.values, "Total Jump Volume");
  sprint200ChartInstance = createLineChart(sprint200ChartCanvas, sprint200Data.labels, sprint200Data.values, "200m Best Time (sec)");
  sprint150ChartInstance = createLineChart(sprint150ChartCanvas, sprint150Data.labels, sprint150Data.values, "150m Best Time (sec)");
  sprint300ChartInstance = createLineChart(sprint300ChartCanvas, sprint300Data.labels, sprint300Data.values, "300m Best Time (sec)");
}

function renderAll() {
  renderLogs();
  renderHistory();
  renderCharts();
}

function callGoogleSheetsAction(params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `googleSheetsCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const query = new URLSearchParams({
      callback: callbackName,
      ...params
    }).toString();

    const script = document.createElement("script");

    window[callbackName] = (response) => {
      try {
        delete window[callbackName];
        script.remove();

        if (response && response.success === false) {
          reject(new Error(response.error || "Google Sheets request failed"));
          return;
        }

        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    script.src = `${GOOGLE_SCRIPT_URL}?${query}&t=${Date.now()}`;

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Failed to connect to Google Sheets"));
    };

    document.body.appendChild(script);
  });
}

async function loadLogsFromGoogleSheets() {
  const response = await callGoogleSheetsAction({});
  return Array.isArray(response) ? response : [];
}

async function syncLogsFromGoogleSheets(showMessage = true) {
  if (isSyncing) return;

  try {
    isSyncing = true;
    const cloudLogs = await loadLogsFromGoogleSheets();
    setLogs(cloudLogs);
    renderAll();

    if (showMessage) {
      alert("Logs synced from Google Sheets.");
    }
  } catch (error) {
    console.error("Sync failed:", error);
    if (showMessage) {
      alert("Failed to sync logs from Google Sheets.");
    }
  } finally {
    isSyncing = false;
  }
}

async function saveLogToGoogleSheets(log) {
  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(log)
  });
}

async function deleteLog(index) {
  const logs = getLogs();
  const log = logs[index];

  if (!log || !log.id) {
    alert("Missing log ID.");
    return;
  }

  const confirmed = confirm("Delete this session?");
  if (!confirmed) return;

  try {
    const url = `${GOOGLE_SCRIPT_URL}?action=delete&id=${encodeURIComponent(log.id)}`;
    await fetch(url);
    await delayedSync(false, 3, 1500);
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete session.");
  }
}

async function clearLogs() {
  const confirmed = confirm("Delete ALL sessions from Google Sheets?");
  if (!confirmed) return;

  try {
    const url = `${GOOGLE_SCRIPT_URL}?action=clearAll`;
    await fetch(url);
    await delayedSync(false, 3, 1500);
  } catch (error) {
    console.error("Clear failed:", error);
    alert("Failed to clear logs.");
  }
}

function exportLogs() {
  const logs = getLogs();

  if (!logs.length) {
    alert("No logs to export.");
    return;
  }

  const jsonString = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `handball_logs_${new Date().toISOString().split("T")[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

function importLogs(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function (loadEvent) {
    try {
      const importedLogs = JSON.parse(loadEvent.target.result);

      if (!Array.isArray(importedLogs)) {
        alert("Invalid file format.");
        return;
      }

      const confirmed = confirm("This will upload all imported logs into Google Sheets. Continue?");
      if (!confirmed) return;

      for (const log of importedLogs) {
        const uploadLog = {
          ...log,
          id: log.id || generateLogId()
        };
        await saveLogToGoogleSheets(uploadLog);
      }

      await delayedSync(true, 3, 1500);
      importLogsInput.value = "";
    } catch (error) {
      console.error("Import failed:", error);
      alert("Error importing file.");
      importLogsInput.value = "";
    }
  };

  reader.readAsText(file);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light") {
    document.body.classList.add("light");
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");
  const currentTheme = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  renderCharts();
}

function resetForm() {
  form.reset();

  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  renderExerciseFields(sessionTypeSelect.value);
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const sessionType = sessionTypeSelect.value;

  const newLog = {
    id: generateLogId(),
    date: document.getElementById("date").value,
    sessionType,
    rpe: document.getElementById("rpe").value,
    duration: document.getElementById("duration").value,
    notes: document.getElementById("notes").value.trim(),
    exercises: collectExerciseData(sessionType)
  };

  try {
    await saveLogToGoogleSheets(newLog);
    resetForm();
    await delayedSync(false, 3, 1500);
  } catch (error) {
    console.error("Failed to save to Google Sheets:", error);
    alert("Failed to save session to Google Sheets.");
  }
}

async function initApp() {
  loadTheme();
  resetForm();
  renderExerciseFields("");
  setLogs([]);
  renderAll();
  await syncLogsFromGoogleSheets(false);
}

if (sessionTypeSelect) {
  sessionTypeSelect.addEventListener("change", () => {
    renderExerciseFields(sessionTypeSelect.value);
  });
}

if (form) {
  form.addEventListener("submit", handleFormSubmit);
}

if (clearLogsBtn) {
  clearLogsBtn.addEventListener("click", clearLogs);
}

if (exportLogsBtn) {
  exportLogsBtn.addEventListener("click", exportLogs);
}

if (importLogsBtn) {
  importLogsBtn.addEventListener("click", () => {
    importLogsInput.click();
  });
}

if (importLogsInput) {
  importLogsInput.addEventListener("change", importLogs);
}

if (syncLogsBtn) {
  syncLogsBtn.addEventListener("click", () => {
    syncLogsFromGoogleSheets(true);
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

initApp();

setInterval(() => {
  if (!document.hidden) {
    syncLogsFromGoogleSheets(false);
  }
}, 10000);