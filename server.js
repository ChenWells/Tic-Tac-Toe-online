const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('.'));

// 遊戲房間數據
const rooms = new Map();
const userRooms = new Map();

// 檢查獲勝條件
function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // 橫行
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // 直行
        [0, 4, 8], [2, 4, 6] // 對角線
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    if (board.every(cell => cell !== '')) {
        return 'draw';
    }

    return null;
}

// Socket.io 事件處理
io.on('connection', (socket) => {
    console.log('用戶連接：', socket.id);
    let username = '';

    // 用戶登入
    socket.on('login', ({ username: name }) => {
        username = name;
        socket.emit('roomList', Array.from(rooms.values()));
    });

    // 創建房間
    socket.on('createRoom', ({ roomName }) => {
        const roomId = Math.random().toString(36).substring(7);
        const room = {
            id: roomId,
            name: roomName,
            owner: username,
            players: 1,
            playerX: username,
            playerO: null,
            board: Array(9).fill(''),
            currentPlayer: 'X',
            sockets: [socket.id]
        };

        rooms.set(roomId, room);
        userRooms.set(socket.id, roomId);
        socket.join(roomId);

        // 更新房間列表
        io.emit('roomList', Array.from(rooms.values()));

        // 直接進入遊戲室
        socket.emit('joinSuccess', { roomId });
        
        // 更新遊戲狀態
        io.to(roomId).emit('gameUpdate', {
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameState: {
                playerX: room.playerX,
                playerO: room.playerO,
                message: '等待其他玩家加入...'
            }
        });
    });

    // 加入房間
    socket.on('joinRoom', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.players < 2 && !room.playerO && username !== room.playerX) {  // 確保房間存在且未滿，且不是房主
            room.players++;
            room.sockets.push(socket.id);
            room.playerO = username; // 第二個玩家為 O
            userRooms.set(socket.id, roomId);
            socket.join(roomId);

            // 通知加入成功
            socket.emit('joinSuccess', { roomId });

            // 通知房間內所有玩家更新遊戲狀態
            io.to(roomId).emit('gameUpdate', {
                board: room.board,
                currentPlayer: room.currentPlayer,
                gameState: {
                    playerX: room.playerX,
                    playerO: room.playerO,
                    message: `${username} 加入了遊戲！\n\n${room.playerX} (X) vs ${username} (O)\n\n遊戲開始！`
                }
            });

            // 更新大廳的房間列表
            io.emit('roomList', Array.from(rooms.values()));
        } else {
            // 通知玩家無法加入
            socket.emit('gameUpdate', {
                gameState: {
                    message: room?.players >= 2 ? '房間已滿' : '無法加入房間'
                }
            });
        }
    });

    // 離開房間
    socket.on('leaveRoom', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.players--;
            room.sockets = room.sockets.filter(id => id !== socket.id);
            
            // 更新玩家狀態
            if (username === room.playerX) {
                room.playerX = null;
            } else if (username === room.playerO) {
                room.playerO = null;
            }

            userRooms.delete(socket.id);
            socket.leave(roomId);

            // 如果房間空了或只剩一個玩家，刪除房間
            if (room.players <= 0) {
                rooms.delete(roomId);
            } else {
                // 通知剩餘的玩家
                io.to(roomId).emit('gameUpdate', {
                    board: Array(9).fill(''),
                    currentPlayer: 'X',
                    gameState: {
                        playerX: room.playerX,
                        playerO: room.playerO,
                        message: '對手已離開遊戲，請等待新玩家加入...'
                    }
                });
            }

            // 更新大廳的房間列表
            io.emit('roomList', Array.from(rooms.values()));
        }
    });

    // 遊戲移動
    socket.on('makeMove', ({ roomId, index }) => {
        const room = rooms.get(roomId);
        if (!room || room.board[index] !== '') return;

        // 確認是否為當前玩家的回合
        const isPlayerX = username === room.playerX;
        const isPlayerO = username === room.playerO;
        const isCorrectTurn = (room.currentPlayer === 'X' && isPlayerX) || 
                            (room.currentPlayer === 'O' && isPlayerO);

        if (!isCorrectTurn) return;

        room.board[index] = room.currentPlayer;
        const winner = checkWinner(room.board);
        const gameState = {
            playerX: room.playerX,
            playerO: room.playerO
        };

        if (winner === 'draw') {
            gameState.draw = true;
            gameState.message = '遊戲平局！';
        } else if (winner) {
            gameState.winner = winner;
            const winnerName = winner === 'X' ? room.playerX : room.playerO;
            gameState.message = `${winnerName} 獲勝！`;
        }

        room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
        io.to(roomId).emit('gameUpdate', {
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameState
        });
    });

    // 新增：處理新遊戲請求
    socket.on('newGame', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
            // 重置遊戲狀態
            room.board = Array(9).fill('');
            room.currentPlayer = 'X';
            
            // 發送更新給所有玩家
            io.to(roomId).emit('gameUpdate', {
                board: room.board,
                currentPlayer: room.currentPlayer,
                gameState: {
                    playerX: room.playerX,
                    playerO: room.playerO,
                    message: `新的一局開始！\n\n${room.playerX} (X) vs ${room.playerO} (O)`
                }
            });
        }
    });

    // 聊天消息
    socket.on('chatMessage', ({ roomId, message }) => {
        io.to(roomId).emit('chatMessage', {
            username,
            message
        });
    });

    // 用戶登出
    socket.on('logout', () => {
        const roomId = userRooms.get(socket.id);
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.players--;
                room.sockets = room.sockets.filter(id => id !== socket.id);
                
                // 更新玩家狀態
                if (username === room.playerX) {
                    room.playerX = null;
                } else if (username === room.playerO) {
                    room.playerO = null;
                }

                if (room.players === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('gameUpdate', {
                        board: Array(9).fill(''),
                        currentPlayer: 'X',
                        gameState: {
                            playerX: room.playerX,
                            playerO: room.playerO,
                            message: '對手已離開遊戲'
                        }
                    });
                }
            }
            userRooms.delete(socket.id);
        }
        
        username = '';
        io.emit('roomList', Array.from(rooms.values()));
    });

    // 斷開連接
    socket.on('disconnect', () => {
        const roomId = userRooms.get(socket.id);
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.players--;
                room.sockets = room.sockets.filter(id => id !== socket.id);
                
                // 更新玩家狀態
                if (username === room.playerX) {
                    room.playerX = null;
                } else if (username === room.playerO) {
                    room.playerO = null;
                }

                if (room.players === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('gameUpdate', {
                        board: Array(9).fill(''),
                        currentPlayer: 'X',
                        gameState: {
                            playerX: room.playerX,
                            playerO: room.playerO,
                            message: '對手已斷開連接'
                        }
                    });
                }
                
                io.emit('roomList', Array.from(rooms.values()));
            }
            userRooms.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`服務器運行在端口 ${PORT}`);
}); 