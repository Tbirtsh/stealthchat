const socket = io();
let currentUser = null;
let selectedChat = "public"; // or username for DMs
let starredUsers = [];

document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function auth() {
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = username;
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("chatScreen").style.display = "flex";
            socket.emit("user_joined", currentUser);
        } else {
            document.getElementById("loginStatus").innerText = data.message;
        }
    });
}

function sendMessage() {
    const msg = document.getElementById("messageInput").value.trim();
    if (!msg) return;

    const data = {
        type: selectedChat === "public" ? "public" : "dm",
        to: selectedChat !== "public" ? selectedChat : null,
        from: currentUser,
        msg: msg,
        timestamp: new Date().toLocaleTimeString()
    };

    socket.emit("message", data);
    document.getElementById("messageInput").value = '';
}

function switchToPublic() {
    selectedChat = "public";
    document.getElementById("chatTitle").innerText = "Public";
    document.getElementById("messages").innerHTML = '';
}

socket.on("message", (data) => {
    if (data.type === "public" && selectedChat === "public") {
        appendMessage(`[${data.timestamp}] ${data.from}: ${data.msg}`);
    } else if (data.type === "dm" && (data.from === selectedChat || data.to === selectedChat)) {
        appendMessage(`[${data.timestamp}] ${data.from} ➝ ${data.to}: ${data.msg}`);
    }
});

socket.on("users", (users) => {
    const userList = document.getElementById("usersList");
    userList.innerHTML = "<h3>Users</h3>";
    users.forEach((u) => {
        if (u !== currentUser) {
            const div = document.createElement("div");
            div.className = "user";
            div.innerText = u;
            div.onclick = () => {
                selectedChat = u;
                document.getElementById("chatTitle").innerText = `DM: ${u}`;
                document.getElementById("messages").innerHTML = '';
            };
            userList.appendChild(div);
        }
    });
});

function appendMessage(text) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerText = text;
    document.getElementById("messages").appendChild(div);
}