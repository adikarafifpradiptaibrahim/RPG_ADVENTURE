import { io, Socket } from 'socket.io-client';
import { CharacterClass } from '../types/game';

export interface RemotePlayerData {
  id: string;
  name: string;
  room: string;
  charClass: CharacterClass;
  tier: number;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  isMoving: boolean;
  isRunning?: boolean;
}

export interface MultiplayerConfig {
  serverUrl: string;
  roomName: string;
  playerName: string;
  charClass: CharacterClass;
  tier?: number;
  level?: number;
  hp?: number;
  maxHp?: number;
  initialPos?: { x: number; y: number; z: number; rotationY: number };
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isSystem?: boolean;
  timestamp: number;
}

export interface MultiplayerCallbacks {
  onConnected: (socketId: string) => void;
  onConnectError: (error: string) => void;
  onDisconnected: (reason: string) => void;
  onCurrentPlayers: (players: Record<string, RemotePlayerData>) => void;
  onPlayerJoined: (player: RemotePlayerData) => void;
  onPlayerMoved: (data: {
    id: string;
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
  }) => void;
  onRemotePlayerAttack: (data: {
    id: string;
    attackType: string;
    skillSlot?: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) => void;
  onMonsterDamaged: (data: {
    monsterId: string;
    damage: number;
    attackerName: string;
    isCrit: boolean;
    newHp?: number;
  }) => void;
  onMonstersSync?: (monsters: {
    id: string;
    x: number;
    y?: number;
    z: number;
    rotationY?: number;
    hp?: number;
    isDead?: boolean;
  }[]) => void;
  onPlayerLeft: (id: string) => void;
  onChatReceived: (message: ChatMessage) => void;
}

class MultiplayerClient {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentRoom: string = '';
  private currentConfig: MultiplayerConfig | null = null;
  private callbacks: MultiplayerCallbacks | null = null;

  public isConnectedStatus(): boolean {
    return this.isConnected;
  }

  public connect(config: MultiplayerConfig, callbacks: MultiplayerCallbacks) {
    this.disconnect();
    this.currentConfig = config;
    this.callbacks = callbacks;
    this.currentRoom = config.roomName;

    // Use user-provided server URL, fallback to current origin or port 3000
    let url = config.serverUrl.trim();
    if (!url) {
      url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    }

    // Standardize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        callbacks.onConnected(this.socket?.id || '');

        // Emit join_game once connected
        this.socket?.emit('join_game', {
          room: config.roomName,
          name: config.playerName,
          charClass: config.charClass,
          tier: config.tier || 1,
          level: config.level || 1,
          hp: config.hp || 120,
          maxHp: config.maxHp || 120,
          pos: config.initialPos,
        });
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[Multiplayer] Connection failed:', err.message);
        callbacks.onConnectError(err.message || 'Gagal terhubung ke Ubuntu Server Socket.io');
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        callbacks.onDisconnected(reason);
      });

      this.socket.on('current_players', (players: Record<string, RemotePlayerData>) => {
        callbacks.onCurrentPlayers(players);
      });

      this.socket.on('player_joined', (player: RemotePlayerData) => {
        callbacks.onPlayerJoined(player);
      });

      this.socket.on('player_moved', (data) => {
        callbacks.onPlayerMoved(data);
      });

      this.socket.on('remote_player_attack', (data) => {
        callbacks.onRemotePlayerAttack(data);
      });

      this.socket.on('monster_damaged', (data) => {
        callbacks.onMonsterDamaged(data);
      });

      this.socket.on('monsters_sync', (monsters) => {
        callbacks.onMonstersSync?.(monsters);
      });

      this.socket.on('player_left', (data: { id: string }) => {
        callbacks.onPlayerLeft(data.id);
      });

      this.socket.on('chat_broadcast', (msg: ChatMessage) => {
        callbacks.onChatReceived(msg);
      });
    } catch (err: any) {
      callbacks.onConnectError(err?.message || 'Inisialisasi WebSocket gagal');
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public sendMove(data: {
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
  }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player_move', data);
    }
  }

  public sendAttack(data: {
    attackType: string;
    skillSlot?: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player_attack', data);
    }
  }

  public sendMonsterHit(data: {
    monsterId: string;
    damage: number;
    isCrit: boolean;
    attackerName: string;
    newHp?: number;
  }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('monster_hit', data);
    }
  }

  public sendChat(text: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_chat', {
        text,
        sender: this.currentConfig?.playerName || 'Player',
      });
    }
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getRoomName(): string {
    return this.currentRoom;
  }
}

export const multiplayerClient = new MultiplayerClient();
