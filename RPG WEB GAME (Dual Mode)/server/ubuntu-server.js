/**
 * Standalone Socket.io Multiplayer Game Server for Eldoria RPG
 *
 * Cara Menjalankan di Ubuntu Server:
 * 1. Pastikan Node.js terinstall:
 *    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
 *    sudo apt install -y nodejs
 * 2. Masuk ke direktori dan install dependensi:
 *    npm init -y
 *    npm install express socket.io cors
 * 3. Jalankan server:
 *    node ubuntu-server.js
 *    atau menggunakan PM2 agar berjalan 24/7 di background:
 *    sudo npm install -g pm2
 *    pm2 start ubuntu-server.js --name "eldoria-rpg-server"
 *    pm2 save
 *    pm2 startup
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 10000,
  pingInterval: 5000,
});

app.use(express.json());

const rooms = {};

function createDefaultRoomMonsters() {
  const monsters = {};
  const slimePositions = [[-12, 14], [-18, 10], [-8, 20], [-15, 24]];
  slimePositions.forEach((pos, idx) => {
    const id = `slime_${idx}`;
    monsters[id] = {
      id,
      name: `Slime Lembah #${idx + 1}`,
      type: 'slime',
      x: pos[0],
      y: 0.5,
      z: pos[1],
      spawnX: pos[0],
      spawnZ: pos[1],
      rotationY: 0,
      hp: 45,
      maxHp: 45,
      speed: 2.2,
      detectRange: 14,
      attackRange: 1.8,
      attack: 7,
      isDead: false,
    };
  });

  const magmaPositions = [[-10, -32], [10, -32], [-6, -42], [8, -44]];
  magmaPositions.forEach((pos, idx) => {
    const id = `magma_slime_${idx}`;
    monsters[id] = {
      id,
      name: `Magma Slime Kawah #${idx + 1}`,
      type: 'magma_slime',
      x: pos[0],
      y: 0.5,
      z: pos[1],
      spawnX: pos[0],
      spawnZ: pos[1],
      rotationY: 0,
      hp: 85,
      maxHp: 85,
      speed: 2.4,
      detectRange: 15,
      attackRange: 1.8,
      attack: 14,
      isDead: false,
    };
  });

  const spiderPositions = [[28, 14], [34, 8], [30, 24], [40, 18]];
  spiderPositions.forEach((pos, idx) => {
    const id = `forest_spider_${idx}`;
    monsters[id] = {
      id,
      name: `Laba-laba Hutan Kelam #${idx + 1}`,
      type: 'spider',
      x: pos[0],
      y: 0.5,
      z: pos[1],
      spawnX: pos[0],
      spawnZ: pos[1],
      rotationY: 0,
      hp: 70,
      maxHp: 70,
      speed: 3.2,
      detectRange: 16,
      attackRange: 2.0,
      attack: 11,
      isDead: false,
    };
  });

  const golemPositions = [[-38, -12], [-44, -18], [-32, -26]];
  golemPositions.forEach((pos, idx) => {
    const id = `ruin_golem_${idx}`;
    monsters[id] = {
      id,
      name: `Golem Reruntuhan Kuno #${idx + 1}`,
      type: 'golem',
      x: pos[0],
      y: 0.5,
      z: pos[1],
      spawnX: pos[0],
      spawnZ: pos[1],
      rotationY: 0,
      hp: 190,
      maxHp: 190,
      speed: 1.6,
      detectRange: 13,
      attackRange: 2.4,
      attack: 24,
      isDead: false,
    };
  });

  monsters['boss_dragon'] = {
    id: 'boss_dragon',
    name: 'Ignis sang Naga Bencana',
    type: 'boss',
    x: 0,
    y: 0.5,
    z: -50,
    spawnX: 0,
    spawnZ: -50,
    rotationY: Math.PI,
    hp: 750,
    maxHp: 750,
    speed: 2.5,
    detectRange: 28,
    attackRange: 4.5,
    attack: 38,
    isDead: false,
  };

  return monsters;
}

// Server authoritative monster loop (10 Hz = 100ms)
setInterval(() => {
  const dt = 0.1;
  for (const [roomId, room] of Object.entries(rooms)) {
    const playerList = Object.values(room.players);
    if (playerList.length === 0) continue;

    for (const monster of Object.values(room.monsters)) {
      if (monster.isDead) continue;

      let closestPlayer = null;
      let closestDist = Infinity;

      for (const player of playerList) {
        const dist = Math.hypot(player.x - monster.x, player.z - monster.z);
        if (dist < closestDist) {
          closestDist = dist;
          closestPlayer = player;
        }
      }

      if (closestPlayer && closestDist <= monster.detectRange) {
        const dx = closestPlayer.x - monster.x;
        const dz = closestPlayer.z - monster.z;
        monster.rotationY = Math.atan2(dx, dz);

        if (closestDist > monster.attackRange) {
          const moveStep = monster.speed * dt;
          monster.x += (dx / closestDist) * moveStep;
          monster.z += (dz / closestDist) * moveStep;
        }
      } else {
        const sdx = monster.spawnX - monster.x;
        const sdz = monster.spawnZ - monster.z;
        const sdist = Math.hypot(sdx, sdz);
        if (sdist > 1.2) {
          const returnStep = monster.speed * 0.4 * dt;
          monster.x += (sdx / sdist) * returnStep;
          monster.z += (sdz / sdist) * returnStep;
          monster.rotationY = Math.atan2(sdx, sdz);
        }
      }
    }

    // Broadcast synchronized monster coordinates (X, Z) to all clients in this room
    io.to(roomId).emit(
      'monsters_sync',
      Object.values(room.monsters).map((m) => ({
        id: m.id,
        x: Math.round(m.x * 100) / 100,
        y: m.y,
        z: Math.round(m.z * 100) / 100,
        rotationY: Math.round(m.rotationY * 100) / 100,
        hp: m.hp,
        isDead: m.isDead,
      }))
    );
  }
}, 100);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Eldoria RPG Multiplayer Server</title></head>
      <body style="font-family: sans-serif; background: #1c1917; color: #f5f5f4; padding: 40px;">
        <h1 style="color: #facc15;">⚔️ Eldoria RPG Ubuntu Multiplayer Server</h1>
        <p>Status: <span style="color: #4ade80; font-weight: bold;">ONLINE</span></p>
        <p>Port: ${PORT}</p>
        <p>Active Rooms: ${Object.keys(rooms).length}</p>
        <p>Total Connected Players: ${Object.values(rooms).reduce((acc, r) => acc + Object.keys(r.players).length, 0)}</p>
      </body>
    </html>
  `);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    serverType: 'Eldoria Dedicated Ubuntu Socket.io Server',
    activeRooms: Object.keys(rooms).length,
    rooms: Object.keys(rooms).map(roomId => ({
      room: roomId,
      players: Object.values(rooms[roomId].players).map(p => ({
        name: p.name,
        level: p.level,
        charClass: p.charClass
      }))
    }))
  });
});

io.on('connection', (socket) => {
  let currentRoom = null;
  const playerId = socket.id;

  console.log(`[Connect] Client connected: ${playerId}`);

  socket.on('join_game', (data) => {
    const roomId = data.room || 'Eldoria-Global';
    currentRoom = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = { players: {}, monsters: createDefaultRoomMonsters() };
    }

    socket.join(roomId);

    const newPlayer = {
      id: playerId,
      name: data.name || `Player_${playerId.slice(0, 4)}`,
      room: roomId,
      charClass: data.charClass || 'warrior',
      tier: data.tier || 1,
      level: data.level || 1,
      hp: data.hp || 120,
      maxHp: data.maxHp || 120,
      x: data.pos?.x ?? 0,
      y: data.pos?.y ?? 0.5,
      z: data.pos?.z ?? 4,
      rotationY: data.pos?.rotationY ?? 0,
      isMoving: false,
      isRunning: false,
      lastUpdate: Date.now(),
    };

    rooms[roomId].players[playerId] = newPlayer;

    socket.emit('current_players', rooms[roomId].players);
    socket.to(roomId).emit('player_joined', newPlayer);

    io.to(roomId).emit('chat_broadcast', {
      id: `sys_${Date.now()}`,
      sender: 'System',
      text: `${newPlayer.name} [Lv.${newPlayer.level} ${newPlayer.charClass.toUpperCase()}] bergabung ke dunia!`,
      isSystem: true,
      timestamp: Date.now(),
    });

    console.log(`[Join] ${newPlayer.name} joined room ${roomId}`);
  });

  socket.on('player_move', (data) => {
    if (!currentRoom || !rooms[currentRoom] || !rooms[currentRoom].players[playerId]) return;

    const p = rooms[currentRoom].players[playerId];
    p.x = data.x;
    p.y = data.y;
    p.z = data.z;
    p.rotationY = data.rotationY;
    p.isMoving = data.isMoving;
    p.isRunning = !!data.isRunning;
    if (data.tier) p.tier = data.tier;
    if (data.hp !== undefined) p.hp = data.hp;
    if (data.maxHp !== undefined) p.maxHp = data.maxHp;
    if (data.level !== undefined) p.level = data.level;
    p.lastUpdate = Date.now();

    socket.to(currentRoom).emit('player_moved', {
      id: playerId,
      x: p.x,
      y: p.y,
      z: p.z,
      rotationY: p.rotationY,
      isMoving: p.isMoving,
      isRunning: p.isRunning,
      tier: p.tier,
      hp: p.hp,
      maxHp: p.maxHp,
      level: p.level,
    });
  });

  socket.on('player_attack', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote_player_attack', {
      id: playerId,
      attackType: data.attackType,
      skillSlot: data.skillSlot,
      x: data.x,
      y: data.y,
      z: data.z,
      rotationY: data.rotationY,
    });
  });

  socket.on('monster_hit', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('monster_damaged', {
      monsterId: data.monsterId,
      damage: data.damage,
      isCrit: data.isCrit,
      attackerName: data.attackerName,
      newHp: data.newHp,
    });
  });

  socket.on('send_chat', (data) => {
    if (!currentRoom) return;
    const senderName = data.sender || rooms[currentRoom]?.players[playerId]?.name || 'Player';
    io.to(currentRoom).emit('chat_broadcast', {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender: senderName,
      text: data.text,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Disconnect] Client disconnected: ${playerId}`);
    if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
      const departingPlayer = rooms[currentRoom].players[playerId];
      delete rooms[currentRoom].players[playerId];

      socket.to(currentRoom).emit('player_left', { id: playerId });

      io.to(currentRoom).emit('chat_broadcast', {
        id: `sys_${Date.now()}`,
        sender: 'System',
        text: `${departingPlayer.name} meninggalkan dunia.`,
        isSystem: true,
        timestamp: Date.now(),
      });

      if (Object.keys(rooms[currentRoom].players).length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`⚔️ Eldoria RPG Dedicated Server running on port ${PORT}`);
  console.log(`🌐 WebSocket & HTTP URL: http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
