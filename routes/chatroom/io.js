module.exports = function (server) {
    var io = require('socket.io')(server);

    var users = {
        'test': {
            id: 'test',
            pw: 'test'
        }
    }

    var onlineUsers = {

    };
    
    io.sockets.on('connection', function (socket) {

        socket.on("join user", function (data, cb) {
            if (joinCheck(data)) {
                cb({
                    result: false,
                    data: "이미 존재하는 회원입니다."
                });
                return false;
            } else {
                users[data.id] = {
                    id: data.id,
                    pw: data.pw
                };
                cb({
                    result: true,
                    data: "회원가입에 성공하였습니다."
                });
    
            }
        });
    
        socket.on("login user", function (data, cb) {
            if (loginCheck(data)) {
                onlineUsers[data.id] = {
                    roomId: 1,
                    socketId: socket.id
                };
                socket.join('room1');
                cb({
                    result: true,
                    data: "로그인에 성공하였습니다."
                });
                updateUserList(0, 1, data.id);
            } else {
                cb({
                    result: false,
                    data: "등록된 회원이 없습니다. 회원가입을 진행해 주세요."
                });
                return false;
            }
        });
    
        socket.on('logout', function () {
            if (!socket.id) return;
            let id = getUserBySocketId(socket.id);
            let roomId = onlineUsers[id].roomId;
            delete onlineUsers[getUserBySocketId(socket.id)];
            updateUserList(roomId, 0, id);
        });
    
        socket.on('disconnect', function () {
            if (!socket.id) return;
            let id = getUserBySocketId(socket.id);
            if(id === undefined || id === null){
                return;
            }
            let roomId = onlineUsers[id].roomId || 0;
            delete onlineUsers[getUserBySocketId(socket.id)];
            updateUserList(roomId, 0, id);
        });
    
        socket.on('join room', function (data) {
            let id = getUserBySocketId(socket.id);
            let prevRoomId = onlineUsers[id].roomId;
            let nextRoomId = data.roomId;
            //socket.leave('room' + prevRoomId);
            socket.join('room' + nextRoomId);
            onlineUsers[id].roomId = data.roomId;
            updateUserList(prevRoomId, nextRoomId, id);
        });
    
        socket.on("send message", function (data) {
          io.sockets.in('room' + data.roomId).emit('new message', {
              name: getUserBySocketId(socket.id),
              socketId: socket.id,
              msg: data.msg
          });
      });
    
    
    
        function updateUserList(prev, next, id) {
            if (prev !== 0) {
                io.sockets.in('room' + prev).emit("userlist", getUsersByRoomId(prev));
                io.sockets.in('room' + prev).emit("lefted room", id);
            }
            if (next !== 0) {
                io.sockets.in('room' + next).emit("userlist", getUsersByRoomId(next));
                io.sockets.in('room' + next).emit("joined room", id);
            }
        }
    
        function loginCheck(data) {
            if (users.hasOwnProperty(data.id) && users[data.id].pw === data.pw) {
                return true;
            } else {
                return false;
            }
        }
    
        function joinCheck(data) {
            if (users.hasOwnProperty(data.id)) {
                return true;
            } else {
                return false;
            }
        }
    
        function getUserBySocketId(id) {
            return Object.keys(onlineUsers).find(key => onlineUsers[key].socketId === id);
        }
    
        function getUsersByRoomId(roomId) {
            let userstemp = [];
            Object.keys(onlineUsers).forEach((el) => {
                if (onlineUsers[el].roomId === roomId) {
                    userstemp.push({
                        socketId: onlineUsers[el].socketId,
                        name: el
                    });
                }
            });
            return userstemp;
        }

        setInterval(() => { // 일정 주기로 팝퀴즈를 반환함
            var data = {};
    
            PopQuiz.find({}, function(err, datas){ 
                if(err) return err;
                var randomQuizNumber = Math.floor(Math.random() * datas.length); // 팝퀴즈 중 하나 랜덤으로 찾음
    
                data.author = datas[randomQuizNumber].question; // TODO : 이거 나중에 프론트엔드에 RECEIVE_QUIZ 작성 되면 author -> question으로 수정
                data.message = datas[randomQuizNumber].answer;
    
                console.log(data);
                io.emit('RECEIVE_MESSAGE', data); // TODO : RECEIVE_QUIZ로 나중에 수정 예정
            })
        }, 2000000); // 시간 주기 설정 (2000 -> 2초)

    });

    return io;
}