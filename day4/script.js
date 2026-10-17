
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

// Track whether the previous count was above 180 characters.
let wasWarning = false;

// Update the character count, word count and warning classes.
function updateCounts() {
    const text = noteText.value;
    const characters = text.length;
    const trimmedText = text.trim();

    const words = trimmedText === ""
        ? 0
        : trimmedText.split(/\s+/).length;

    // Display both counters.
    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    // Remove previous warning classes.
    charCount.classList.remove("warning", "over");

    // Apply the correct warning class.
    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }

    const isWarning = characters > 180;

    // Announce when the user crosses the 180-character threshold.
    if (!wasWarning && characters > 180 && characters <= 200) {
        status.textContent =
            "You have exceeded 180 characters. You are approaching the 200-character limit.";
    }

    // Announce when the user exceeds 200 characters.
    if (characters > 200 && characters <= 201) {
        status.textContent =
            "Warning: You have exceeded 200 characters.";
    }

    // Announce when the user returns to 180 characters or fewer.
    if (wasWarning && !isWarning) {
        status.textContent =
            "You are back within the 180-character warning threshold.";
    }

    wasWarning = isWarning;
}

// Save the current note as a draft.
function saveDraft() {
    try {
        localStorage.setItem(DRAFT_KEY, noteText.value);
        return true;
    } catch (error) {
        status.textContent =
            "Draft could not be saved in this browser.";
        return false;
    }
}

// Clear the note, counters and saved draft.
function clearNote() {
    noteText.value = "";

    try {
        localStorage.removeItem(DRAFT_KEY);
        status.textContent = "Note cleared. Draft removed.";
    } catch (error) {
        status.textContent =
            "Note cleared, but the saved draft could not be removed.";
    }

    wasWarning = false;
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
        localStorage.setItem(
            THEME_KEY,
            isDark ? "dark" : "light"
        );
        return true;
    } catch (error) {
        status.textContent =
            "Theme changed, but the preference could not be saved.";
        return false;
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

// Display the correct counters for the initial or restored note.
updateCounts();

// Save the draft and update counters whenever the user types.
noteText.addEventListener("input", function () {
    updateCounts();
    saveDraft();
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

