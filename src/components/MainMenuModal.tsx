import React, { useState } from 'react';
import { Shield, Users, Sparkles, Server, Globe, Play, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Terminal } from 'lucide-react';
import { CharacterClass } from '../types/game';
import { soundManager } from '../game/audio';

export interface MultiplayerStartOptions {
  playerName: string;
  roomName: string;
  serverUrl: string;
  charClass: CharacterClass;
}

interface MainMenuModalProps {
  isOpen: boolean;
  onStartSinglePlayer: (charClass: CharacterClass) => void;
  onStartMultiplayer: (options: MultiplayerStartOptions) => void;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onStartSinglePlayer,
  onStartMultiplayer,
}) => {
  const [activeTab, setActiveTab] = useState<'selection' | 'singleplayer' | 'multiplayer' | 'ubuntu_guide'>('selection');
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('warrior');

  // Multiplayer inputs
  const [playerName, setPlayerName] = useState(() => `Hero_${Math.floor(1000 + Math.random() * 9000)}`);
  const [roomName, setRoomName] = useState('Eldoria-Alpha');
  const [useCustomServer, setUseCustomServer] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [serverTestStatus, setServerTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [serverTestMessage, setServerTestMessage] = useState('');

  if (!isOpen) return null;

  const classes: {
    id: CharacterClass;
    name: string;
    icon: string;
    desc: string;
    color: string;
  }[] = [
    {
      id: 'warrior',
      name: 'Ksatria (Warrior)',
      icon: '⚔️',
      desc: 'Ahli pedang baja & perisai tebal. Pertahanan kokoh dan tebasan beruntun.',
      color: 'border-blue-500 bg-blue-950/30 text-blue-300',
    },
    {
      id: 'mage',
      name: 'Penyihir (Mage)',
      icon: '🔮',
      desc: 'Penguasa sihir kristal dan pemulihan suci dengan mana berlimpah.',
      color: 'border-purple-500 bg-purple-950/30 text-purple-300',
    },
    {
      id: 'rogue',
      name: 'Pemburu (Rogue)',
      icon: '🏹',
      desc: 'Lincah dengan belati ganda & panah elang. Kecepatan dan serangan kritis.',
      color: 'border-emerald-500 bg-emerald-950/30 text-emerald-300',
    },
  ];

  const handleTestServerConnection = async () => {
    setServerTestStatus('testing');
    setServerTestMessage('Mencoba menghubungi server Socket.io...');
    const targetUrl = useCustomServer && customServerUrl.trim()
      ? customServerUrl.trim()
      : window.location.origin;

    try {
      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`;
      const res = await fetch(`${cleanUrl}/api/multiplayer/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setServerTestStatus('success');
        setServerTestMessage(`Terhubung! Server Online (${data.activeRooms || 0} room aktif, ${data.totalPlayers || 0} pemain online).`);
      } else {
        // Even if status route is 404, server might be running Socket.io
        setServerTestStatus('success');
        setServerTestMessage('Server Socket.io merespons port HTTP.');
      }
    } catch (err: any) {
      setServerTestStatus('failed');
      setServerTestMessage('Koneksi gagal atau server belum berjalan di alamat tersebut.');
    }
  };

  const handleLaunchSinglePlayer = () => {
    soundManager.playLevelUp();
    onStartSinglePlayer(selectedClass);
  };

  const handleLaunchMultiplayer = () => {
    if (!playerName.trim()) {
      alert('Silakan masukkan nama karakter Anda terlebih dahulu!');
      return;
    }
    soundManager.playLevelUp();
    const effectiveServerUrl = useCustomServer && customServerUrl.trim()
      ? customServerUrl.trim()
      : window.location.origin;

    onStartMultiplayer({
      playerName: playerName.trim(),
      roomName: roomName.trim() || 'Eldoria-Global',
      serverUrl: effectiveServerUrl,
      charClass: selectedClass,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col text-stone-100 my-auto">
        
        {/* Banner Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
            ⚔️ Open-World 3D RPG Action
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-md">
            CHRONICLES OF ELDORIA
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md mx-auto">
            Pilih mode petualangan Anda: Single Player (offline client-side) atau Multiplayer (sinkronisasi real-time via Socket.io Server).
          </p>
        </div>

        {/* 1. Main Mode Selection Screen */}
        {activeTab === 'selection' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Single Player Card */}
              <div
                onClick={() => {
                  soundManager.playChestOpen();
                  setActiveTab('singleplayer');
                }}
                className="group relative p-5 rounded-2xl bg-stone-900/80 border-2 border-stone-700 hover:border-amber-400/80 hover:bg-stone-850 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-2xl">
                      🛡️
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 border border-blue-500/30 text-blue-300">
                      100% Client-Side
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                    Play Single Player
                  </h2>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                    Jalankan game sepenuhnya di browser Anda. Semua logika monster, pergerakan musuh, damage pertarungan, quest, dan status HP diproses lokal tanpa jaringan server/WebSocket.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span>Mulai Petualangan Solo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Multiplayer Card */}
              <div
                onClick={() => {
                  soundManager.playChestOpen();
                  setActiveTab('multiplayer');
                }}
                className="group relative p-5 rounded-2xl bg-stone-900/80 border-2 border-stone-700 hover:border-amber-400/80 hover:bg-stone-850 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                      ⚔️
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/30 text-amber-300">
                      Socket.io Real-Time
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                    Play Multiplayer
                  </h2>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                    Sinkronisasi posisi pemain lain, animasi pertempuran, monster, dan obrolan obrolan langsung via Socket.io Server di Ubuntu Server secara real-time.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span>Pengaturan Room & Server</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>

            {/* Ubuntu Server Guide Button */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setActiveTab('ubuntu_guide')}
                className="text-xs text-stone-400 hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Panduan Menjalankan Socket.io Server di Ubuntu Server</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Single Player Setup Screen */}
        {activeTab === 'singleplayer' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h2 className="text-base font-bold text-amber-300">Single Player Mode (Client-Side)</h2>
              </div>
              <button
                onClick={() => setActiveTab('selection')}
                className="text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Kembali ke Menu Utama
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2">
                Pilih Kelas Pahlawan:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {classes.map((c) => {
                  const isSelected = selectedClass === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClass(c.id);
                        soundManager.playChestOpen();
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-500/20'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className="text-2xl mb-1">{c.icon}</div>
                        <div className="text-xs font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-stone-400 mt-1 leading-snug">{c.desc}</div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Dipilih
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400">
              💡 <span className="text-stone-300 font-semibold">Mode Offline:</span> Game akan berjalan 100% di browser tanpa koneksi socket server. Progres tersimpan di penyimpanan browser lokal.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveTab('selection')}
                className="px-4 py-2.5 rounded-xl border border-stone-700 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLaunchSinglePlayer}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                Mulai Main Single Player
              </button>
            </div>
          </div>
        )}

        {/* 3. Multiplayer Setup Screen */}
        {activeTab === 'multiplayer' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚔️</span>
                <h2 className="text-base font-bold text-amber-300">Multiplayer Mode (Socket.io Real-Time)</h2>
              </div>
              <button
                onClick={() => setActiveTab('selection')}
                className="text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Kembali ke Menu Utama
              </button>
            </div>

            {/* Inputs: Player Name & Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nama Karakter Petualang:
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Contoh: Ksatria_Bintang"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                  maxLength={18}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nama Room / Realm:
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Contoh: Eldoria-Alpha"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                  maxLength={24}
                />
              </div>
            </div>

            {/* Server Destination Config */}
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200">Koneksi Ubuntu / Node.js Server:</span>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomServer}
                    onChange={(e) => {
                      setUseCustomServer(e.target.checked);
                      setServerTestStatus('idle');
                    }}
                    className="accent-amber-500"
                  />
                  <span>Gunakan IP Ubuntu Server Kustom</span>
                </label>
              </div>

              {useCustomServer ? (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customServerUrl}
                    onChange={(e) => {
                      setCustomServerUrl(e.target.value);
                      setServerTestStatus('idle');
                    }}
                    placeholder="http://192.168.1.100:3000 atau https://vps.yourdomain.com:3000"
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestServerConnection}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg text-xs font-semibold text-amber-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${serverTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Tes Koneksi</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span>Server Internal Dev: <strong className="text-amber-300">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</strong></span>
                  <button
                    type="button"
                    onClick={handleTestServerConnection}
                    className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${serverTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Periksa Status</span>
                  </button>
                </div>
              )}

              {/* Server Test Feedback */}
              {serverTestStatus !== 'idle' && (
                <div className={`text-[11px] flex items-center gap-1.5 pt-1 ${
                  serverTestStatus === 'success' ? 'text-emerald-400' :
                  serverTestStatus === 'failed' ? 'text-red-400' : 'text-amber-300'
                }`}>
                  {serverTestStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {serverTestStatus === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{serverTestMessage}</span>
                </div>
              )}
            </div>

            {/* Class Choice */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2">
                Pilih Kelas Karakter:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {classes.map((c) => {
                  const isSelected = selectedClass === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClass(c.id);
                        soundManager.playChestOpen();
                      }}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition text-center ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-500/20'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="text-xl">{c.icon}</div>
                      <div className="text-xs font-bold text-white mt-1">{c.name.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveTab('selection')}
                className="px-4 py-2.5 rounded-xl border border-stone-700 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLaunchMultiplayer}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
              >
                <Users className="w-4 h-4" />
                Hubungkan & Masuk ke Room
              </button>
            </div>
          </div>
        )}

        {/* 4. Ubuntu Server Deployment Guide */}
        {activeTab === 'ubuntu_guide' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-amber-300">Panduan Menjalankan di Ubuntu Server</h2>
              </div>
              <button
                onClick={() => setActiveTab('selection')}
                className="text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <p className="text-stone-300 leading-relaxed">
              File server backend mandiri telah disediakan di dalam folder proyek pada berkas: <code className="bg-stone-800 px-1.5 py-0.5 rounded text-amber-300">server/ubuntu-server.js</code>.
            </p>

            <div className="space-y-2">
              <div className="font-bold text-stone-200">1. Install Node.js di Ubuntu:</div>
              <pre className="p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -{"\n"}
                sudo apt install -y nodejs
              </pre>

              <div className="font-bold text-stone-200 pt-1">2. Siapkan Dependensi di folder server:</div>
              <pre className="p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">
                npm install express socket.io
              </pre>

              <div className="font-bold text-stone-200 pt-1">3. Jalankan Server 24/7 dengan PM2:</div>
              <pre className="p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">
                sudo npm install -g pm2{"\n"}
                pm2 start server/ubuntu-server.js --name "eldoria-rpg"{"\n"}
                pm2 save
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveTab('multiplayer')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl transition cursor-pointer"
              >
                Lanjut ke Multiplayer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
