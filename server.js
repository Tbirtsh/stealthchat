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
const THREADS_DIR = path.join(__dirname, 'threads');

// Ensure threads dir exists
if (!fs.existsSync(THREADS_DIR)) fs.mkdirSync(THREADS_DIR);

app.use(express.static(__dirname + '/public'));
app.use(express.json());

// ===== API: Register/Login =====
app.post('/api/auth', (req, res) => {
    const { username, password } = req.body;
    let users = [];

    try {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch { }

    const existing = users.find(u => u.username === username);
    if (existing) {
        if (existing.password === password) {
            return res.json({ success: true, user: existing });
        } else {
            return res.status(403).json({ success: false, message: 'Wrong password' });
        }
    } else {
        const newUser = { username, password, starred: [] };
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return res.json({ success: true, user: newUser });
    }
});

// ===== API: Get User List =====
app.get('/api/users', (req, res) => {
    let users = [];
    try {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch { }
    res.json(users.map(u => ({ username: u.username })));
});

// ===== API: Star/Unstar =====
app.post('/api/star', (req, res) => {
    const { username, target, star } = req.body;
    let users = [];

    try {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch { }

    const user = users.find(u => u.username === username);
    if (!user) return res.status(404).send();

    user.starred = star
        ? Array.from(new Set([...(user.starred || []), target]))
        : (user.starred || []).filter(u => u !== target);

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.sendStatus(200);
});

// ===== API: Fetch DM Thread =====
app.get('/api/thread', (req, res) => {
    const { user1, user2 } = req.query;
    const file = threadFile(user1, user2);

    if (!fs.existsSync(file)) return res.json([]);

    const data = fs.readFileSync(file);
    res.json(JSON.parse(data));
});

// ===== API: Send DM Message =====
app.post('/api/thread', (req, res) => {
    const { from, to, message, timestamp } = req.body;
    const file = threadFile(from, to);

    let thread = [];
    try {
        thread = JSON.parse(fs.readFileSync(file));
    } catch { }

    thread.push({ from, to, message, timestamp, read: false });
    fs.writeFileSync(file, JSON.stringify(thread, null, 2));
    res.sendStatus(200);
});

// ===== Socket.IO =====
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('user_joined', (name) => {
        console.log(`${name} joined.`);
    });

    socket.on('public_message', (data) => {
        const line = `[${data.timestamp}] ${data.name}: ${data.msg}\n`;
        fs.appendFile(LOG_FILE, line, err => {
            if (err) console.error("Error saving message:", err);
        });
        io.emit('public_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// ===== Helpers =====
function threadFile(user1, user2) {
    const sorted = [user1, user2].sort().join('_');
    return path.join(THREADS_DIR, `${sorted}.json`);
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});