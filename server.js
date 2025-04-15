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

app.use(express.static(__dirname + '/public'));

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
        // Optional: log or emit message read event
        console.log(`${data.name} saw message at ${data.timestamp}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
