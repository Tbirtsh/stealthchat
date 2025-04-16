const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'misc.txt');
const USERS_FILE = path.join(__dirname, 'Users.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Helper to get users
function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch {
        return [];
    }
}

// Helper to save users
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Auth endpoint
app.post('/auth', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const existing = users.find(u => u.username === username);

    if (existing) {
        if (existing.password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.json({ success: false, message: 'Incorrect password' });
        }
    } else {
        users.push({ username, password });
        saveUsers(users);
        res.json({ success: true, message: 'Account created' });
    }
});

// WebSocket logic
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('user_joined', (name) => {
        console.log(`${name} joined.`);
    });

    socket.on('message', (data) => {
        const line = `[${data.timestamp}] ${data.name}: ${data.msg}\n`;
        fs.appendFile(LOG_FILE, line, (err) => {
            if (err) console.error("Error saving message:", err);
        });
        io.emit('message', data);
    });

    socket.on('message_read', (data) => {
        console.log(`${data.name} saw message at ${data.timestamp}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});