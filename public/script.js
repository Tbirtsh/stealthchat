let socket;
let username = '';

function auth() {
    username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('authMsg').innerText = data.message;
        if (data.success) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('chat').style.display = 'block';
            startSocket();
        }
    });
}

function startSocket() {
    socket = io();

    socket.emit('user_joined', username);

    document.getElementById('sendBtn').onclick = () => {
        const input = document.getElementById('msgInput');
        const msg = input.value;
        input.value = '';
        const data = {
            name: username,
            msg,
            timestamp: new Date().toLocaleTimeString()
        };
        socket.emit('message', data);
    };

    socket.on('message', (data) => {
        const el = document.createElement('div');
        el.innerText = `[${data.timestamp}] ${data.name}: ${data.msg}`;
        document.getElementById('chatBox').appendChild(el);
    });

    // Clear chat every 15 minutes on user-side only
    setInterval(() => {
        document.getElementById('chatBox').innerHTML = '';
    }, 15 * 60 * 1000);
}