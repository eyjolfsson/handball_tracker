const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const form = document.getElementById("progressForm");
const logList = document.getElementById("logList");
const clearLogsBtn = document.getElementById("clearLogs");
const themeToggle = document.getElementById("themeToggle");
const dateInput = document.getElementById("date");
const sessionTypeSelect = document.getElementById("sessionType");
const exerciseFields = document.getElementById("exerciseFields");
const exerciseSection = document.getElementById("exerciseSection");

const deadliftHistory = document.getElementById("deadliftHistory");
const backSquatHistory = document.getElementById("backSquatHistory");
const jumpHistory = document.getElementById("jumpHistory");

const deadliftChartCanvas = document.getElementById("deadliftChart");
const backSquatChartCanvas = document.getElementById("backSquatChart");
const jumpChartCanvas = document.getElementById("jumpChart");

const LOG_STORAGE_KEY = "handballLogs";
const THEME_STORAGE_KEY = "theme";

let deadliftChartInstance = null;
let backSquatChartInstance = null;
let jumpChartInstance = null;

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
  const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
  return savedLogs ? JSON.parse(savedLogs) : [];
}

function saveLogs(logs) {
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
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
  let fields = "";

  if (exercise.type === "weight") {
    fields = `
      ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
      ${createInputField({ label: "Reps", className: "exercise-reps", placeholder: "e.g. 10" })}
      ${createInputField({ label: "Weight (kg)", className: "exercise-weight", placeholder: "e.g. 70" })}
    `;
  } else if (exercise.type === "jumps") {
    fields = `
      ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
      ${createInputField({ label: "Jumps / Reps", className: "exercise-jumps", placeholder: "e.g. 15" })}
      ${createInputField({ label: "Height / Note", type: "text", className: "exercise-extra", placeholder: "optional" })}
    `;
  } else if (exercise.type === "reps") {
    fields = `
      ${createInputField({ label: "Sets", className: "exercise-sets", placeholder: "e.g. 3" })}
      ${createInputField({ label: "Reps", className: "exercise-reps", placeholder: "e.g. 8" })}
      ${createInputField({ label: "Load / Ball / Assist", type: "text", className: "exercise-extra", placeholder: "optional" })}
    `;
  } else if (exercise.type === "conditioning") {
    fields = `
      ${createInputField({ label: "Rounds", className: "exercise-rounds", placeholder: "e.g. 10" })}
      ${createInputField({ label: "Work Time", type: "text", className: "exercise-work", placeholder: "e.g. 45 sec" })}
      ${createInputField({ label: "Rest Time", type: "text", className: "exercise-rest", placeholder: "e.g. 60 sec" })}
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
            placeholder="e.g. 32.4"
          />
        </div>
      `;
    }

    fields = `
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
      <div class="exercise-grid sprint-times-grid">
        ${sprintInputs}
      </div>
    `;
  }

  return `
    <div class="mini-card exercise-card" data-index="${index}" data-type="${exercise.type}">
      <h4>${exercise.name}</h4>
      <div class="exercise-grid">
        ${fields}
      </div>
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

    if (type === "conditioning") {
      return {
        ...baseData,
        rounds: card.querySelector(".exercise-rounds")?.value || "",
        work: card.querySelector(".exercise-work")?.value.trim() || "",
        rest: card.querySelector(".exercise-rest")?.value.trim() || ""
      };
    }

    if (type === "sprint") {
      const sprintTimeInputs = card.querySelectorAll(".exercise-sprint-time");
      const times = Array.from(sprintTimeInputs)
        .map((input) => Number(input.value))
        .filter((value) => !Number.isNaN(value) && value > 0);

      const bestTime = times.length ? Math.min(...times) : "";
      const averageTime = times.length
        ? (times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(2)
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

  if (exercise.type === "conditioning") {
    return `
      <li>
        <strong>${exercise.name}:</strong>
        Rounds ${exercise.rounds || "-"},
        Work ${exercise.work || "-"},
        Rest ${exercise.rest || "-"}
        ${exercise.note ? `, Note: ${exercise.note}` : ""}
      </li>
    `;
  }

  if (exercise.type === "sprint") {
    return `
      <li>
        <strong>${exercise.name}:</strong>
        Distance ${exercise.distance || "-"} m,
        Target Reps ${exercise.targetReps || "-"},
        Best Time ${exercise.bestTime || "-"} sec,
        Average Time ${exercise.averageTime || "-"} sec,
        Rest ${exercise.rest || "-"}
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
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      deleteLog(index);
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

  destroyChart(deadliftChartInstance);
  destroyChart(backSquatChartInstance);
  destroyChart(jumpChartInstance);

  deadliftChartInstance = createLineChart(
    deadliftChartCanvas,
    deadliftData.labels,
    deadliftData.values,
    "Deadlift Weight (kg)"
  );

  backSquatChartInstance = createLineChart(
    backSquatChartCanvas,
    squatData.labels,
    squatData.values,
    "Back Squat Weight (kg)"
  );

  jumpChartInstance = createLineChart(
    jumpChartCanvas,
    jumpData.labels,
    jumpData.values,
    "Total Jump Volume"
  );
}

function resetForm() {
  form.reset();

  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  renderExerciseFields(sessionTypeSelect.value);
}

function handleFormSubmit(event) {
  event.preventDefault();

  const sessionType = sessionTypeSelect.value;

  const newLog = {
    date: document.getElementById("date").value,
    sessionType,
    rpe: document.getElementById("rpe").value,
    duration: document.getElementById("duration").value,
    notes: document.getElementById("notes").value.trim(),
    exercises: collectExerciseData(sessionType)
  };

  const logs = getLogs();
  logs.push(newLog);
  saveLogs(logs);
  renderLogs();
  renderHistory();
  renderCharts();
  resetForm();
}

function clearLogs() {
  const confirmed = confirm("Are you sure you want to clear all saved sessions?");
  if (!confirmed) return;

  localStorage.removeItem(LOG_STORAGE_KEY);
  renderLogs();
  renderHistory();
  renderCharts();
}

function deleteLog(index) {
  const logs = getLogs();
  logs.splice(index, 1);
  saveLogs(logs);
  renderLogs();
  renderHistory();
  renderCharts();
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

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

loadTheme();
resetForm();
renderLogs();
renderHistory();
renderCharts();