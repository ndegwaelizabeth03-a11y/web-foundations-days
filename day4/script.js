
"use strict";

// Select the HTML elements.
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");
const status = document.getElementById("status");

// Keys used to store data in localStorage.
const DRAFT_KEY = "day4-note-draft";
const THEME_KEY = "day4-theme";

// Update the character count, word count and warning classes.
function updateCounts() {
    const text = noteText.value;
    const characters = text.length;

    const trimmedText = text.trim();

    const words = trimmedText === ""
        ? 0
        : trimmedText.split(/\s+/).length;

    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    // Remove old warning classes before checking the new count.
    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

// Save the current note as a draft.
function saveDraft() {
    try {
        localStorage.setItem(DRAFT_KEY, noteText.value);
    } catch (error) {
        status.textContent = "Draft could not be saved in this browser.";
    }
}

// Clear the note, counters and saved draft.
function clearNote() {
    noteText.value = "";

    try {
        localStorage.removeItem(DRAFT_KEY);
        status.textContent = "Note cleared. Draft removed.";
    } catch (error) {
        status.textContent = "Note cleared, but the saved draft could not be removed.";
    }

    updateCounts();
}

// Apply the selected theme and update the button.
function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);

    themeToggle.textContent = isDark
        ? "Light mode"
        : "Dark mode";

    themeToggle.setAttribute("aria-pressed", String(isDark));
}

// Save the selected theme.
function saveTheme(isDark) {
    try {
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch (error) {
        status.textContent = "Theme changed, but the preference could not be saved.";
    }
}

// Switch between light mode and dark mode.
function toggleTheme() {
    const isDark = !document.body.classList.contains("dark");

    applyTheme(isDark);
    saveTheme(isDark);
}

// Restore the saved note when the page loads.
try {
    const savedDraft = localStorage.getItem(DRAFT_KEY);

    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }
} catch (error) {
    status.textContent = "Saved draft could not be accessed.";
}

// Restore the saved theme when the page loads.
try {
    const savedTheme = localStorage.getItem(THEME_KEY);

    applyTheme(savedTheme === "dark");
} catch (error) {
    applyTheme(false);
}

// Show the correct counters for the initial or restored note.
updateCounts();

// Save the draft and update counters whenever the user types.
noteText.addEventListener("input", function () {
    updateCounts();
    saveDraft();

    if (status.textContent !== "Draft could not be saved in this browser.") {
        status.textContent = "Draft saved automatically.";
    }
});

// Clear the note when the Clear button is clicked.
clearBtn.addEventListener("click", clearNote);

// Toggle the theme when the theme button is clicked.
themeToggle.addEventListener("click", toggleTheme);

// Pressing Escape inside the textarea clears the note.
noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearNote();
    }
});
