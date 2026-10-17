
"use strict";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

let users = [];

function renderUsers(list) {
    usersList.replaceChildren();

    if (list.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        usersList.appendChild(message);
        return;
    }

    list.forEach(function (user) {
        const item = document.createElement("li");
        item.className = "user-card";

        const name = document.createElement("h3");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        item.append(name, email, city, company);
        usersList.appendChild(item);
    });
}

async function loadUsers() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading users...";
    usersList.replaceChildren();

    try {
        const response = await fetch(USERS_URL);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();
        users = data;

        const searchTerm = filterInput.value.trim().toLowerCase();
        const filteredUsers = users.filter(function (user) {
            return user.name.toLowerCase().includes(searchTerm);
        });

        renderUsers(filteredUsers);
        statusMessage.textContent = `Successfully loaded ${users.length} users.`;
    } catch (error) {
        users = [];
        usersList.replaceChildren();
        statusMessage.textContent =
            "Unable to load users. Please check your connection and try again.";
        console.error("Error loading users:", error);
    } finally {
        loadButton.disabled = false;
    }
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", function () {
    const searchTerm = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter(function (user) {
        return user.name.toLowerCase().includes(searchTerm);
    });

    renderUsers(filteredUsers);
});
