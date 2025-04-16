const socket = io();
let currentUser = '';
let currentChat = 'public'; // or username for private
let starredUsers = [];

function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      document.getElementById('auth-msg').innerText = 'Registered! Now login.';
    } else {
      document.getElementById('auth-msg').innerText = data.error;
    }
  });
}

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      currentUser = username;
      document.getElementById('auth').style.display = 'none';
      document.getElementById('chat-container').style.display = 'flex';
      socket.emit('login', username);
      loadStarred();
    } else {
      document.getElementById('auth-msg').innerText = data.error;
    }
  });
}

function sendMessage() {
  const msg = document.getElementById('chat-input').value.trim();
  if (!msg) return;
  document.getElementById('chat-input').value = '';

  if (currentChat === 'public') {
    socket.emit('public_message', { name: currentUser, msg });
  } else {
    socket.emit('private_message', {
      from: currentUser,
      to: currentChat,
      msg
    });
  }
}

socket.on('public_message', data => {
  appendMessage(data, true);
});

socket.on('private_message', data => {
  if (currentChat === data.from || data.from === currentUser) {
    appendMessage(data, false);
  }
});

socket.on('users_update', users => {
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  users.forEach(user => {
    if (user !== currentUser) {
      const li = document.createElement('li');
      li.innerText = user;
      li.onclick = () => {
        currentChat = user;
        clearChat();
      };

      const starBtn = document.createElement('button');
      starBtn.innerText = starredUsers.includes(user) ? '★' : '☆';
      starBtn.onclick = (e) => {
        e.stopPropagation();
        toggleStar(user);
      };

      li.appendChild(starBtn);
      list.appendChild(li);
    }
  });
});

function toggleStar(target) {
  fetch('/login', {
    method: 'POST', // dummy request to keep session
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, password: 'pass' })
  });
  socket.emit('star_user', { username: currentUser, target });
  setTimeout(loadStarred, 200);
}

function loadStarred() {
  socket.emit('get_starred', currentUser, (list) => {
    starredUsers = list;
    const ul = document.getElementById('starred-list');
    ul.innerHTML = '';
    list.forEach(user => {
      const li = document.createElement('li');
      li.innerText = user;
      li.onclick = () => {
        currentChat = user;
        clearChat();
      };
      ul.appendChild(li);
    });
  });
}

function appendMessage(data, isPublic) {
  const chatLog = document.getElementById('chat-log');
  const line = document.createElement('div');
  line.innerText = `[${data.timestamp}] ${data.from || data.name}: ${data.msg}`;
  chatLog.appendChild(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function clearChat() {
  document.getElementById('chat-log').innerHTML = '';
}

// Clear messages every 15min (client-side only)
setInterval(clearChat, 15 * 60 * 1000);