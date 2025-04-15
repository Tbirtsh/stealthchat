const socket = io();
let name = "";
const chatWindow = document.getElementById("chat-window");
const msgInput = document.getElementById("messageInput");
const enterChat = document.getElementById("enter-chat");

enterChat.onclick = () => {
    const userInput = document.getElementById("username").value.trim();
    if (userInput) {
        name = userInput;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("chat-screen").style.display = "block";
        socket.emit("user_joined", name);
    }
};

msgInput.addEventListener("keypress", e => {
    if (e.key === "Enter" && msgInput.value.trim()) {
        const msg = msgInput.value.trim();
        const timestamp = new Date().toLocaleTimeString();
        socket.emit("message", { name, msg, timestamp });
        msgInput.value = "";
    }
});

socket.on("message", data => {
    appendMessage(data);
    socket.emit("message_read", data); // signal that message was seen
});

function appendMessage(data) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.innerHTML = `<b>${data.name}</b> <span class="timestamp">[${data.timestamp}]</span>: ${data.msg}`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

setInterval(() => {
    chatWindow.innerHTML = "";
}, 15 * 60 * 1000); // clear every 15 minutes
