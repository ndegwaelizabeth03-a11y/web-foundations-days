// Starting notes data
let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// 1. Search notes
function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}


// Test searchNotes
console.log(searchNotes("day"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("python"));
// Expected: []


// 2. Find the longest note
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}


// Test longestNote
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

const savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;


// 3. Count notes by category
function countByCategory() {
    let counts = {};

    for (let note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}


// Test countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

console.log(countByCategory().personal);
// Expected: 2


// 4. Get summary
function getSummary() {
    const counts = countByCategory();
    const total = notes.length;

    const noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}


// Test getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

const savedNotesForSummary = notes;
notes = [{ id: 1, text: "Call mum", category: "personal" }];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = savedNotesForSummary;


// 5. Check for duplicate notes
function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === cleanedText
    );
}


// Test isDuplicate
console.log(isDuplicate("Call mum"));
// Expected: true

console.log(isDuplicate("   CALL MUM   "));
// Expected: true


// 6. Add a new note
function addNote(text, category) {
    const cleanedText = text.trim();

    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Note must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(cleanedText)) {
        console.log("Note already exists.");
        return false;
    }

    if (!["personal", "work", "study"].includes(category)) {
        console.log("Invalid category.");
        return false;
    }

    const newId = notes.length > 0
        ? Math.max(...notes.map(note => note.id)) + 1
        : 1;

    notes.push({
        id: newId,
        text: cleanedText,
        category: category
    });

    return true;
}


// Test addNote - normal case
console.log(addNote("Read about JavaScript functions", "study"));
// Expected: true

// Test addNote - duplicate
console.log(addNote("  CALL MUM  ", "personal"));
// Expected: "Note already exists." followed by false

// Test addNote - invalid category
console.log(addNote("Buy a new laptop", "shopping"));
// Expected: "Invalid category." followed by false

// Test addNote - invalid length
console.log(addNote("", "personal"));
// Expected: "Note must be between 1 and 200 characters." followed by false