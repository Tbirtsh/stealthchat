const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'Users.json');
const LOG_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

// Register
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    if (users[username]) return res.status(400).json({ error: 'User already exists' });

    users[username] = { password, starred: [] };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return res.status(200).json({ success: true });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    if (!users[username]) return res.status(404).json({ error: 'User not found' });
    if (users[username].password !== password) return res.status(403).json({ error: 'Wrong password' });

    return res.status(200).json({ success: true });
});

let onlineUsers = {};

function logMessage(file, line) {
    fs.appendFile(path.join(LOG_DIR, file), line, (err) => {
        if (err) console.error(`Error saving to ${file}:`, err);
    });
}

function sortedThreadName(userA, userB) {
    return [userA, userB].sort().join('_') + '.txt';
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('login', (username) => {
        currentUser = username;
        onlineUsers[username] = socket.id;
        io.emit('users_update', Object.keys(onlineUsers));
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            delete onlineUsers[currentUser];
            io.emit('users_update', Object.keys(onlineUsers));
        }
    });

    // Public chat
    socket.on('public_message', (data) => {
        const timestamp = new Date().toLocaleTimeString();
        const line = `[${timestamp}] ${data.name}: ${data.msg}\n`;
        logMessage('public.txt', line);
        io.emit('public_message', { ...data, timestamp });
    });

    // Private chat
    socket.on('private_message', (data) => {
        const { to, from, msg } = data;
        const timestamp = new Date().toLocaleTimeString();
        const line = `[${timestamp}] ${from} -> ${to}: ${msg}\n`;

        const threadFile = sortedThreadName(to, from);
        logMessage(threadFile, line);

        if (onlineUsers[to]) {
            io.to(onlineUsers[to]).emit('private_message', { from, msg, timestamp });
        }
        socket.emit('private_message', { from, msg, timestamp });
    });

    socket.on('star_user', ({ username, target }) => {
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        if (!users[username].starred.includes(target)) {
            users[username].starred.push(target);
        } else {
            users[username].starred = users[username].starred.filter(name => name !== target);
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    });

    socket.on('get_starred', (username, cb) => {
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        cb(users[username]?.starred || []);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});