
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");
const status = document.getElementById("status");

const DRAFT_KEY = "day4-note-draft";
const THEME_KEY = "day4-theme";

function updateCounts() {
    const text = noteText.value;
    const characters = text.length;

    const words = text.trim() === ""
        ? 0
        : text.trim().split(/\s+/).length;

    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

function saveDraft() {
    localStorage.setItem(DRAFT_KEY, noteText.value);
}

function clearNote() {
    noteText.value = "";
    localStorage.removeItem(DRAFT_KEY);
    updateCounts();
    status.textContent = "Note cleared.";
}

function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

function toggleTheme() {
    const isDark = !document.body.classList.contains("dark");

    applyTheme(isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

// Restore the saved draft when the page loads.
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {
    noteText.value = savedDraft;
}

// Restore the saved theme.
const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme === "dark");

// Display the correct counters on page load.
updateCounts();

// Update counters and save the draft whenever the user types.
noteText.addEventListener("input", () => {
    updateCounts();
    saveDraft();
    status.textContent = "Draft saved.";
});

// Clear the note when the Clear button is clicked.
clearBtn.addEventListener("click", clearNote);

// Toggle and remember the theme.
themeToggle.addEventListener("click", toggleTheme);

// Clear the note when Escape is pressed inside the textarea.
noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});
