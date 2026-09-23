import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io with permissive CORS so clients can connect locally or from remote Ubuntu server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 10000,
  pingInterval: 5000,
});

app.use(express.json());

// Structure for tracking players and game rooms
export interface MultiplayerPlayer {
  id: string;
  name: string;
  room: string;
  charClass: 'warrior' | 'mage' | 'rogue' | 'hunter' | 'paladin';
  tier: number;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  isMoving: boolean;
  isRunning: boolean;
  lastUpdate: number;
}

export interface ServerMonster {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  spawnX: number;
  spawnZ: number;
  rotationY: number;
  hp: number;
  maxHp: number;
  speed: number;
  detectRange: number;
  attackRange: number;
  attack: number;
  isDead: boolean;
}

function createDefaultRoomMonsters(): Record<string, ServerMonster> {
  const monsters: Record<string, ServerMonster> = {};

  const slimePositions: [number, number][] = [
    [-12, 14],
    [-18, 10],
    [-8, 20],
    [-15, 24],
  ];
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

  const magmaPositions: [number, number][] = [
    [-10, -32],
    [10, -32],
    [-6, -42],
    [8, -44],
  ];
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

  const spiderPositions: [number, number][] = [
    [28, 14],
    [34, 8],
    [30, 24],
    [40, 18],
  ];
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

  const golemPositions: [number, number][] = [
    [-38, -12],
    [-44, -18],
    [-32, -26],
  ];
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

  // Boss Ignis Dragon
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

const rooms: Record<string, {
  players: Record<string, MultiplayerPlayer>;
  monsters: Record<string, ServerMonster>;
}> = {};

// Server authoritative monster loop (10 Hz = 100ms)
setInterval(() => {
  const dt = 0.1;
  for (const [roomId, room] of Object.entries(rooms)) {
    const playerList = Object.values(room.players);
    if (playerList.length === 0) continue;

    for (const monster of Object.values(room.monsters)) {
      if (monster.isDead) continue;

      // Find closest player in this room
      let closestPlayer: MultiplayerPlayer | null = null;
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
        // Return to spawn point if drifted away
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

// REST endpoint to inspect multiplayer server status
app.get('/api/multiplayer/status', (req, res) => {
  const roomList = Object.keys(rooms).map((roomId) => ({
    room: roomId,
    playerCount: Object.keys(rooms[roomId].players).length,
    players: Object.values(rooms[roomId].players).map((p) => ({
      name: p.name,
      level: p.level,
      charClass: p.charClass,
    })),
  }));

  const totalPlayers = roomList.reduce((acc, r) => acc + r.playerCount, 0);

  res.json({
    status: 'online',
    serverType: 'Eldoria Ubuntu/Node.js Socket.io Server',
    totalPlayers,
    activeRooms: roomList.length,
    rooms: roomList,
    uptime: process.uptime(),
  });
});

// Socket.io Real-time Multiplayer Handlers
io.on('connection', (socket: Socket) => {
  let currentRoom: string | null = null;
  let playerId: string = socket.id;

  // 1. Join Room
  socket.on('join_game', (data: {
    room: string;
    name: string;
    charClass: 'warrior' | 'mage' | 'rogue' | 'hunter' | 'paladin';
    tier?: number;
    level?: number;
    hp?: number;
    maxHp?: number;
    pos?: { x: number; y: number; z: number; rotationY: number };
  }) => {
    const roomId = data.room || 'Eldoria-Global';
    currentRoom = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        monsters: createDefaultRoomMonsters(),
      };
    }

    socket.join(roomId);

    const newPlayer: MultiplayerPlayer = {
      id: playerId,
      name: data.name || `Hero_${playerId.slice(0, 4)}`,
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

    // Store player
    rooms[roomId].players[playerId] = newPlayer;

    // Send existing players in this room to the newly joined player
    socket.emit('current_players', rooms[roomId].players);

    // Broadcast new player arrival to everyone else in this room
    socket.to(roomId).emit('player_joined', newPlayer);

    // Send system announcement chat
    io.to(roomId).emit('chat_broadcast', {
      id: `sys_${Date.now()}`,
      sender: 'System',
      text: `${newPlayer.name} [Lv.${newPlayer.level} ${newPlayer.charClass.toUpperCase()}] has entered the realm!`,
      isSystem: true,
      timestamp: Date.now(),
    });
  });

  // 2. Synchronize Player Movement & Transform
  socket.on('player_move', (data: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
    isMoving: boolean;
    isRunning?: boolean;
    tier?: number;
    hp?: number;
    maxHp?: number;
    level?: number;
  }) => {
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

    // Broadcast updated transform to all other clients in the room
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

  // 3. Synchronize Combat Attacks & Skill Casting VFX
  socket.on('player_attack', (data: {
    attackType: string;
    skillSlot?: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) => {
    if (!currentRoom) return;
    // Broadcast attack event to other players in room
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

  // 4. Synchronize Damage dealt to monsters
  socket.on('monster_hit', (data: {
    monsterId: string;
    damage: number;
    isCrit: boolean;
    attackerName: string;
    newHp?: number;
  }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const monster = rooms[currentRoom].monsters[data.monsterId];
    let syncHp = data.newHp;
    if (monster) {
      monster.hp = Math.max(0, monster.hp - data.damage);
      if (monster.hp <= 0) {
        monster.isDead = true;
      }
      syncHp = monster.hp;
    }

    socket.to(currentRoom).emit('monster_damaged', {
      monsterId: data.monsterId,
      damage: data.damage,
      isCrit: data.isCrit,
      attackerName: data.attackerName,
      newHp: syncHp,
    });
  });

  // 5. In-game Multiplayer Chat
  socket.on('send_chat', (data: { text: string; sender?: string }) => {
    if (!currentRoom) return;
    const senderName = data.sender || rooms[currentRoom]?.players[playerId]?.name || 'Player';
    io.to(currentRoom).emit('chat_broadcast', {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender: senderName,
      text: data.text,
      timestamp: Date.now(),
    });
  });

  // 6. Handle Disconnection
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
      const departingPlayer = rooms[currentRoom].players[playerId];
      delete rooms[currentRoom].players[playerId];

      socket.to(currentRoom).emit('player_left', { id: playerId });

      io.to(currentRoom).emit('chat_broadcast', {
        id: `sys_${Date.now()}`,
        sender: 'System',
        text: `${departingPlayer.name} has left the realm.`,
        isSystem: true,
        timestamp: Date.now(),
      });

      // Cleanup empty room if no players left
      if (Object.keys(rooms[currentRoom].players).length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

// Setup Vite middleware in development or serve static build in production
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Eldoria RPG Server] Running on http://0.0.0.0:${PORT} (Singleplayer & Multiplayer ready)`);
  });
}

startServer();
