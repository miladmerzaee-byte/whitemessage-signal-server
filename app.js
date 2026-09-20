const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const users = {};
const io = new Server(server, { cors: { origin: '*' } });
app.get('/', function(req, res) {
    res.send('OK - Online: ' + Object.keys(users).length);
});
io.on('connection', function(socket) {
    socket.on('register-user', function(userId) {
        users[userId] = socket.id;
        socket.userId = userId;
        socket.emit('registered', { userId: userId });
    });
    socket.on('call-user', function(data) {
        var target = users[data.to];
        if (target) {
            io.to(target).emit('incoming-call', {
                fromUserId: data.from,
                fromSocketId: socket.id,
                offer: data.offer
            });
        } else {
            socket.emit('user-not-found', data.to);
        }
    });
    socket.on('accept-call', function(data) {
        if (data.to) {
            io.to(data.to).emit('call-accepted', {
                fromSocketId: socket.id,
                answer: data.answer
            });
        }
    });
    socket.on('reject-call', function(data) {
        if (data.to) io.to(data.to).emit('call-rejected');
    });
    socket.on('ice-candidate', function(data) {
        if (data.to) {
            io.to(data.to).emit('ice-candidate', {
                from: socket.id,
                candidate: data.candidate
            });
        }
    });
    socket.on('chat-message', function(data) {
        if (data.to && typeof data.message === 'string') {
            io.to(data.to).emit('chat-message', {
                fromUserId: data.fromUserId,
                message: data.message
            });
        }
    });
    socket.on('disconnect', function() {
        if (socket.userId) delete users[socket.userId];
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('Server running on port ' + PORT);
});
