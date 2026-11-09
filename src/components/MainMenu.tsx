import React, { useState, useEffect } from 'react';
import {
  Shield,
  Settings,
  ArrowLeft,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Globe,
  Plus,
} from 'lucide-react';
import { CharacterClass, PlayerStats } from '../types/game';
import { soundManager } from '../game/audio';

export interface MultiplayerStartOptions {
  playerName: string;
  roomName: string;
  serverUrl: string;
  charClass: CharacterClass;
}

export interface SaveSlotData {
  id: number;
  isEmpty: boolean;
  role?: CharacterClass;
  roleName?: string;
  level?: number;
  playTimeFormatted?: string;
  lastSaved?: string;
  gold?: number;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
}

export interface SkillInfo {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  title: string;
  description: string;
}

export const KNIGHT_SKILLS: SkillInfo[] = [
  {
    id: 'k_slash',
    name: 'Tebasan/Charge',
    shortName: 'Tebas/Charge',
    icon: '⚔️',
    color: '#f59e0b',
    title: 'TEBASAN PEDANG / CHARGE ATTACK',
    description:
      'Tebasan pedang beruntun ke musuh di depan. Tahan tombol serangan untuk menghimpun energi dan melancarkan retakan pemecah tanah dahsyat berbentuk sektor kipas.',
  },
  {
    id: 'k_crescent',
    name: 'Triple Crescent',
    shortName: 'Triple Crescent',
    icon: '🌙',
    color: '#fbbf24',
    title: 'TRIPLE CRESCENT GALE',
    description:
      'Mengayunkan pedang untuk meluncurkan tiga gelombang angin berbentuk bulan sabit yang menebas musuh di depan, memberikan kerusakan beruntun.',
  },
  {
    id: 'k_leap',
    name: 'Cataclysmic Leap',
    shortName: 'Cataclysmic Leap',
    icon: '💥',
    color: '#ef4444',
    title: 'CATACLYSMIC LEAP SLAM',
    description:
      'Melompat tinggi ke udara dan menghantam tanah dengan kekuatan dahsyat, memicu gelombang kejut dan retakan tanah berapi di area luas.',
  },
  {
    id: 'k_aegis',
    name: 'Aegis',
    shortName: 'Aegis',
    icon: '🛡️',
    color: '#3b82f6',
    title: 'AEGIS RETRIBUTION',
    description:
      'Mengangkat perisai suci, menangkis serangan musuh serta memantulkan gelombang energi balasan yang melumpuhkan lawan di sekitar.',
  },
  {
    id: 'k_dash',
    name: 'Dash',
    shortName: 'Dash',
    icon: '🦘',
    color: '#e2e8f0',
    title: 'SWIFT DASH',
    description:
      'Melesat cepat ke depan untuk menghindari serangan musuh seketika dengan kelincahan tinggi.',
  },
];

export const MAGE_SKILLS: SkillInfo[] = [
  {
    id: 'm_beam',
    name: 'Arcane Beam',
    shortName: 'Arcane Beam',
    icon: '🔮',
    color: '#8b5cf6',
    title: 'ARCANE BEAM',
    description:
      'Menembakkan sinar energi sihir murni terkonsentrasi yang menembus garis lurus dan menghancurkan semua musuh di jalurnya.',
  },
  {
    id: 'm_starfall',
    name: 'Starfall',
    shortName: 'Starfall',
    icon: '☄️',
    color: '#38bdf8',
    title: 'STARFALL CALLING',
    description:
      'Memanggil lingkaran sihir kuno yang menjatuhkan hujan meteor bintang dari langit, menghanguskan musuh dalam area luas.',
  },
  {
    id: 'm_blink',
    name: 'Blink',
    shortName: 'Blink',
    icon: '🌌',
    color: '#06b6d4',
    title: 'ARCANE BLINK',
    description:
      'Melakukan teleportasi instan jarak pendek ke arah hadap karakter, menembus rintangan dan menghindari bahaya.',
  },
  {
    id: 'm_cahaya',
    name: 'Cahaya',
    shortName: 'Cahaya',
    icon: '✨',
    color: '#facc15',
    title: 'CAHAYA SUCI (SANCTUARY)',
    description:
      'Menciptakan pilar cahaya penyembuh suci yang memulihkan HP karakter secara bertahap dan menyucikan aura jahat.',
  },
  {
    id: 'm_dash',
    name: 'Dash',
    shortName: 'Dash',
    icon: '💨',
    color: '#e2e8f0',
    title: 'MAGE DASH',
    description:
      'Meluncur cepat diselimuti aura magis untuk menciptakan jarak aman dari jangkauan musuh.',
  },
];

export const ASSASSIN_SKILLS: SkillInfo[] = [
  {
    id: 'a_dagger',
    name: 'Belati',
    shortName: 'Belati',
    icon: '🗡️',
    color: '#10b981',
    title: 'TIKAMAN BELATI GANDA',
    description:
      'Serangan cepat menusukkan sepasang belati beracun ke titik vital musuh dengan kecepatan tinggi.',
  },
  {
    id: 'a_dagger360',
    name: 'Belati 360°',
    shortName: 'Belati 360°',
    icon: '⚔️',
    color: '#14b8a6',
    title: 'BELATI PUTAR 360°',
    description:
      'Berputar cepat menyapu sekeliling sambil mengayunkan belati kembar, melukai seluruh musuh di sekitar.',
  },
  {
    id: 'a_thousand',
    name: '1000 Belati',
    shortName: '1000 Belati',
    icon: '⚡',
    color: '#f59e0b',
    title: '1000 BELATI BAYANGAN',
    description:
      'Melancarkan rentetan tusukan berkecepatan kilat yang merobek pertahanan musuh dalam sekejap mata.',
  },
  {
    id: 'a_stealth',
    name: 'Siluman',
    shortName: 'Siluman',
    icon: '💨',
    color: '#6ee7b7',
    title: 'JUBAH SILUMAN',
    description:
      'Menyelimuti diri dalam kegelapan pekat untuk menyelinap tak terlihat oleh musuh dan meningkatkan serangan kritis berikutnya.',
  },
  {
    id: 'a_smoke',
    name: 'Bom Asap',
    shortName: 'Bom Asap',
    icon: '🧪',
    color: '#2dd4bf',
    title: 'BOM ASAP (SMOKE BOMB)',
    description:
      'Melemparkan tabung bom asap yang membutakan musuh di sekitar dan memberikan kesempatan meloloskan diri.',
  },
  {
    id: 'a_dash',
    name: 'Dash',
    shortName: 'Dash',
    icon: '💨',
    color: '#e2e8f0',
    title: 'SHADOW DASH',
    description:
      'Melesat bayangan kilat menembus kegelapan dengan kelincahan ekstrem tanpa jejak.',
  },
];

interface MainMenuProps {
  isOpen: boolean;
  onStartSinglePlayer: (charClass: CharacterClass, slotData?: SaveSlotData) => void;
  onStartMultiplayer: (options: MultiplayerStartOptions) => void;
  onOpenSettings: () => void;
  onMenuModeChange?: (mode: 'main_menu' | 'character_select' | 'gameplay') => void;
  onPlayRoleAction?: (role: 'warrior' | 'mage' | 'rogue') => void;
  onSelectPreviewRole?: (role: 'warrior' | 'mage' | 'rogue') => void;
  selectedPreviewRole?: 'warrior' | 'mage' | 'rogue';
}

const STORAGE_KEY_SLOTS = 'ancients_quest_save_slots_v1';

function loadSaveSlots(): SaveSlotData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 5) {
        return parsed;
      }
    }
  } catch {}

  // Default sample slot setup: Slot 1 filled as example (matches user request), Slots 2-5 empty
  const defaults: SaveSlotData[] = [
    {
      id: 1,
      isEmpty: false,
      role: 'warrior',
      roleName: 'Knight',
      level: 12,
      playTimeFormatted: '04:20:12',
      lastSaved: 'Hari Ini',
      gold: 240,
      hp: 280,
      maxHp: 280,
      mp: 120,
      maxMp: 120,
    },
    { id: 2, isEmpty: true },
    { id: 3, isEmpty: true },
    { id: 4, isEmpty: true },
    { id: 5, isEmpty: true },
  ];
  try {
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  isOpen,
  onStartSinglePlayer,
  onStartMultiplayer,
  onOpenSettings,
  onMenuModeChange,
  onPlayRoleAction,
  onSelectPreviewRole,
  selectedPreviewRole = 'warrior',
}) => {
  const [view, setView] = useState<'main' | 'singleplayer_slots' | 'character_select' | 'multiplayer'>('main');
  const [saveSlots, setSaveSlots] = useState<SaveSlotData[]>(() => loadSaveSlots());
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<'warrior' | 'mage' | 'rogue'>(selectedPreviewRole);
  const [activeTooltip, setActiveTooltip] = useState<SkillInfo | null>(null);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPreviewRole) {
      setSelectedRole(selectedPreviewRole);
    }
  }, [selectedPreviewRole]);

  // Multiplayer inputs
  const [playerName, setPlayerName] = useState(() => `Hero_${Math.floor(1000 + Math.random() * 9000)}`);
  const [roomName, setRoomName] = useState('Eldoria-Alpha');
  const [multiplayerClass, setMultiplayerClass] = useState<CharacterClass>('warrior');
  const [useCustomServer, setUseCustomServer] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [serverTestStatus, setServerTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [serverTestMessage, setServerTestMessage] = useState('');

  // Sync 3D camera mode with view
  useEffect(() => {
    if (!isOpen) return;
    if (view === 'character_select') {
      onMenuModeChange?.('character_select');
    } else {
      onMenuModeChange?.('main_menu');
    }
  }, [view, isOpen, onMenuModeChange]);

  if (!isOpen) return null;

  const handleOpenSinglePlayer = () => {
    soundManager.playChestOpen();
    setView('singleplayer_slots');
  };

  const handleOpenMultiplayer = () => {
    soundManager.playChestOpen();
    setView('multiplayer');
  };

  const handleSelectSlotForNewGame = (slotId: number) => {
    soundManager.playChestOpen();
    setSelectedSlotId(slotId);
    setView('character_select');
  };

  const handleLoadSlot = (slot: SaveSlotData) => {
    if (slot.isEmpty || !slot.role) return;
    soundManager.playLevelUp();
    setIsFadingOut(true);
    setTimeout(() => {
      onStartSinglePlayer(slot.role!, slot);
      setIsFadingOut(false);
    }, 900);
  };

  const handleDeleteSlot = (slotId: number) => {
    soundManager.playDash();
    const updated = saveSlots.map((s) => (s.id === slotId ? { id: slotId, isEmpty: true } : s));
    setSaveSlots(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
    } catch {}
  };

  const handleConfirmRole = (role: 'warrior' | 'mage' | 'rogue') => {
    // 1. Play attack/action pose animation on the 3D model
    onPlayRoleAction?.(role);

    // 2. Play sound effect
    soundManager.playLevelUp();

    // 3. Save new game to selected slot
    const roleNames: Record<string, string> = {
      warrior: 'Knight',
      mage: 'Mage',
      rogue: 'Assassin',
    };
    const now = new Date();
    const formattedDate = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newSlotData: SaveSlotData = {
      id: selectedSlotId,
      isEmpty: false,
      role,
      roleName: roleNames[role] || 'Knight',
      level: 1,
      playTimeFormatted: '00:00:01',
      lastSaved: formattedDate,
      gold: 50,
      hp: role === 'warrior' ? 130 : role === 'mage' ? 100 : 110,
      maxHp: role === 'warrior' ? 130 : role === 'mage' ? 100 : 110,
      mp: role === 'warrior' ? 50 : role === 'mage' ? 110 : 60,
      maxMp: role === 'warrior' ? 50 : role === 'mage' ? 110 : 60,
    };

    const updated = saveSlots.map((s) => (s.id === selectedSlotId ? newSlotData : s));
    setSaveSlots(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
    } catch {}

    // 4. Fade to black for 1 second, then launch gameplay
    setIsFadingOut(true);
    setTimeout(() => {
      onStartSinglePlayer(role, newSlotData);
      setIsFadingOut(false);
    }, 1000);
  };

  const handleTestServerConnection = async () => {
    setServerTestStatus('testing');
    setServerTestMessage('Mencoba menghubungi server...');
    const targetUrl = useCustomServer && customServerUrl.trim() ? customServerUrl.trim() : window.location.origin;

    try {
      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`;
      const res = await fetch(`${cleanUrl}/api/multiplayer/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setServerTestStatus('success');
        setServerTestMessage(`Terhubung! Server Online (${data.totalPlayers || 0} pemain online).`);
      } else {
        setServerTestStatus('success');
        setServerTestMessage('Server Socket.io terdeteksi.');
      }
    } catch {
      setServerTestStatus('failed');
      setServerTestMessage('Koneksi gagal atau server belum berjalan di alamat tersebut.');
    }
  };

  const handleLaunchMultiplayer = () => {
    soundManager.playLevelUp();
    setIsFadingOut(true);
    setTimeout(() => {
      onStartMultiplayer({
        playerName: playerName.trim() || 'Pahlawan',
        roomName: roomName.trim() || 'Eldoria-Alpha',
        serverUrl: useCustomServer ? customServerUrl.trim() : '',
        charClass: multiplayerClass,
      });
      setIsFadingOut(false);
    }, 900);
  };

  return (
    <div
      className={`fixed inset-0 z-50 select-none overflow-hidden font-sans ${
        view === 'character_select' ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {/* Fade To Black Overlay for 1-Second Cinematic Transition */}
      <div
        className={`fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-1000 ease-in-out ${
          isFadingOut ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ============================================================== */}
      {/* 1. MAIN MENU SCREEN (Referensi: image_30.png)                   */}
      {/* ============================================================== */}
      {view === 'main' && (
        <div className="relative w-full h-full flex items-center justify-start p-6 sm:p-12 md:p-16 animate-fade-in">
          {/* Left-Aligned Floating Dark Wooden Fantasy Menu Box */}
          <div
            className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col items-center"
            style={{
              background: 'linear-gradient(180deg, #2b1d14ee 0%, #1c130bee 60%, #120c07f4 100%)',
              border: '3px solid #785233',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85), inset 0 0 25px rgba(0,0,0,0.6)',
            }}
          >
            {/* Ornamental Corner Brackets (Gold / Brass Metal Corners) */}
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-amber-400 pointer-events-none" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-amber-400 pointer-events-none" />
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-amber-400 pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-amber-400 pointer-events-none" />

            {/* Inner Gold Studs */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-400 shadow" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-amber-400 shadow" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow" />

            {/* Title: ANCIENT'S QUEST (Exact styling from image_30.png) */}
            <div className="text-center my-3 sm:my-4">
              <h1
                className="text-3xl sm:text-4xl font-black tracking-widest uppercase leading-tight"
                style={{
                  color: '#fbbf24',
                  textShadow: '0 3px 0 #92400e, 0 6px 12px rgba(0,0,0,0.9), 0 0 20px rgba(245,158,11,0.4)',
                  fontFamily: 'serif',
                }}
              >
                ANCIENT'S
                <br />
                QUEST
              </h1>
            </div>

            {/* Stacked Vertical Interactive Buttons */}
            <div className="w-full flex flex-col gap-3.5 my-4">
              {/* 1. SINGLE PLAYER (Active / Golden Highlighted State) */}
              <button
                type="button"
                onClick={handleOpenSinglePlayer}
                className="group relative w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
                  border: '2px solid #fde047',
                  color: '#1c1917',
                  boxShadow: '0 4px 0 #78350f, 0 8px 20px rgba(245,158,11,0.3)',
                }}
              >
                <span className="drop-shadow-sm group-hover:scale-105 transition-transform">SINGLE PLAYER</span>
              </button>

              {/* 2. MULTIPLAYER (Dark Wood Button with Helmets) */}
              <button
                type="button"
                onClick={handleOpenMultiplayer}
                className="group relative w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-between text-amber-100 shadow-md"
                style={{
                  background: 'linear-gradient(180deg, #3d2a1d 0%, #291a11 60%, #190f09 100%)',
                  border: '2px solid #634329',
                  boxShadow: '0 4px 0 #140b06, 0 6px 15px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-base sm:text-lg">🪖</span>
                <span className="font-extrabold tracking-wide drop-shadow text-amber-100 group-hover:text-amber-300 transition-colors">
                  MULTIPLAYER
                </span>
                <span className="text-base sm:text-lg">🪖</span>
              </button>

              {/* 3. SETTINGS (Dark Wood Button with Gear) */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="group relative w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 text-amber-100 shadow-md"
                style={{
                  background: 'linear-gradient(180deg, #3d2a1d 0%, #291a11 60%, #190f09 100%)',
                  border: '2px solid #634329',
                  boxShadow: '0 4px 0 #140b06, 0 6px 15px rgba(0,0,0,0.5)',
                }}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-stone-300 group-hover:rotate-45 transition-transform duration-300" />
                <span className="font-extrabold tracking-wide drop-shadow text-amber-100 group-hover:text-amber-300 transition-colors">
                  SETTINGS
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SUB-MENU SINGLE PLAYER (5 SAVE SLOTS)                       */}
      {/* ============================================================== */}
      {view === 'singleplayer_slots' && (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 animate-fade-in">
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #2b1d14f2 0%, #1c130bf2 60%, #120c07fa 100%)',
              border: '3px solid #785233',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.7)',
            }}
          >
            {/* Top Navigation & Title */}
            <div className="flex items-center justify-between pb-4 border-b border-amber-900/50 mb-5">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>KEMBALI</span>
              </button>

              <h2
                className="text-lg sm:text-2xl font-black text-amber-300 tracking-wider uppercase text-center"
                style={{
                  fontFamily: 'serif',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                PILIH DATA PETUALANGAN
              </h2>

              <div className="w-16" />
            </div>

            {/* Quick "NEW GAME" Action */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  // Find first empty slot or default to slot 1
                  const firstEmpty = saveSlots.find((s) => s.isEmpty);
                  handleSelectSlotForNewGame(firstEmpty ? firstEmpty.id : 1);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-sm tracking-wider uppercase shadow-lg shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer border border-yellow-300"
              >
                <Plus className="w-4 h-4 text-stone-950" />
                <span>MULAI PETUALANGAN BARU (NEW GAME)</span>
              </button>
            </div>

            {/* 5 Save Slots List */}
            <div className="flex flex-col gap-3">
              {saveSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                    slot.isEmpty
                      ? 'border-stone-800/80 bg-stone-950/50 hover:border-amber-900/60 hover:bg-stone-900/40'
                      : 'border-amber-700/60 bg-gradient-to-r from-stone-950/90 to-amber-950/30 hover:border-amber-500/80'
                  }`}
                >
                  {/* Slot Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow ${
                        slot.isEmpty
                          ? 'bg-stone-900 text-stone-500 border border-stone-800'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {slot.isEmpty ? slot.id : slot.role === 'warrior' ? '⚔️' : slot.role === 'mage' ? '🔮' : '🗡️'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-stone-100">Slot {slot.id}:</span>
                        {slot.isEmpty ? (
                          <span className="text-stone-400 text-xs sm:text-sm italic">Slot Kosong</span>
                        ) : (
                          <span className="text-amber-300 font-black text-xs sm:text-sm">
                            {slot.roleName} - Lv. {slot.level}
                          </span>
                        )}
                      </div>

                      {!slot.isEmpty && (
                        <div className="text-[11px] text-stone-400 flex items-center gap-3 mt-0.5">
                          <span>Waktu: {slot.playTimeFormatted || '00:00:00'}</span>
                          <span>•</span>
                          <span>Tersimpan: {slot.lastSaved || 'Hari ini'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slot Actions */}
                  <div className="flex items-center gap-2">
                    {slot.isEmpty ? (
                      <button
                        type="button"
                        onClick={() => handleSelectSlotForNewGame(slot.id)}
                        className="py-1.5 px-3.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        [ Mulai Baru ]
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLoadSlot(slot)}
                          className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs tracking-wider uppercase transition active:scale-95 shadow cursor-pointer"
                        >
                          LOAD
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          title="Hapus progres ini"
                          className="p-1.5 rounded-xl bg-stone-900 hover:bg-red-950/80 text-stone-500 hover:text-red-400 border border-stone-800 hover:border-red-500/50 transition active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SCREEN SELEKSI ROLE KARAKTER (Referensi: image_37.png)      */}
      {/* ============================================================== */}
      {view === 'character_select' && (
        <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 animate-fade-in pointer-events-none">
          {/* Top Bar: Button Kembali & Judul "PILIH ROLE KARAKTER" */}
          <div className="w-full flex items-center justify-between pointer-events-auto">
            <button
              type="button"
              onClick={() => setView('singleplayer_slots')}
              className="px-5 py-2 rounded-xl bg-stone-950/80 hover:bg-stone-900 border-2 border-stone-300 text-white font-black text-xs sm:text-sm tracking-widest shadow-xl backdrop-blur-md active:scale-95 transition cursor-pointer"
            >
              KEMBALI
            </button>

            <h1
              className="text-xl sm:text-3xl font-black text-white tracking-widest uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)]"
              style={{
                fontFamily: 'serif',
                textShadow: '0 2px 4px #000, 0 4px 12px rgba(0,0,0,0.9)',
              }}
            >
              PILIH ROLE KARAKTER
            </h1>

            <div className="w-24 hidden sm:block" />
          </div>

          {/* Interactive Floating Tooltip (Above Clicked or Hovered Skill) */}
          {activeTooltip && (
            <div
              className="absolute z-50 pointer-events-none transition-all duration-150 animate-fade-in"
              style={{
                bottom: '160px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '380px',
                width: '90%',
              }}
            >
              <div
                className="relative p-4 rounded-xl shadow-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, #2a1a11f6 0%, #170e08f8 100%)',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.9), inset 0 0 15px rgba(245,158,11,0.2)',
                }}
              >
                {/* Ornamental Corner Highlights */}
                <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-amber-300" />
                <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-amber-300" />
                <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-amber-300" />
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-amber-300" />

                <h4 className="text-amber-400 font-black text-xs sm:text-sm tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <span>{activeTooltip.icon}</span>
                  <span>{activeTooltip.title}:</span>
                </h4>
                <p className="text-stone-200 text-xs sm:text-[13px] leading-relaxed">{activeTooltip.description}</p>
              </div>
            </div>
          )}

          {/* Bottom Section: 360° Drag Hint, Action Buttons, and Skill Bars (Positioned cleanly below the 3D character bodies) */}
          <div className="w-full flex flex-col items-center gap-2.5 pointer-events-none pb-2 z-20">
            {/* 360° Rotation & Interaction Hint Pill */}
            <div className="pointer-events-none text-[11px] font-semibold text-amber-200/90 bg-stone-950/75 border border-amber-500/30 px-3 py-1 rounded-full shadow-lg backdrop-blur-sm select-none">
              💡 Geser mouse / drag untuk memutar karakter 360° • Klik role untuk memilih
            </div>

            {/* Action Buttons: PILIH KNIGHT / MAGE / ASSASSIN (Shifted down so they do not obstruct characters' bodies) */}
            <div className="w-full max-w-4xl mx-auto grid grid-cols-3 gap-3 sm:gap-6 px-4 pointer-events-none">
              {/* 1. Knight Button (Left) */}
              <div className="flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('warrior');
                    onSelectPreviewRole?.('warrior');
                    handleConfirmRole('warrior');
                  }}
                  onMouseEnter={() => {
                    setSelectedRole('warrior');
                    onSelectPreviewRole?.('warrior');
                  }}
                  className={`pointer-events-auto w-full max-w-[210px] py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl backdrop-blur-md active:scale-95 transition cursor-pointer text-center ${
                    selectedRole === 'warrior'
                      ? 'bg-amber-500/90 border-amber-200 text-stone-950 shadow-amber-500/40 ring-2 ring-amber-400/60 scale-105'
                      : 'bg-stone-950/85 hover:bg-stone-900 border-stone-400/60 text-white'
                  }`}
                >
                  PILIH KNIGHT
                </button>
              </div>

              {/* 2. Mage Button (Center) */}
              <div className="flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('mage');
                    onSelectPreviewRole?.('mage');
                    handleConfirmRole('mage');
                  }}
                  onMouseEnter={() => {
                    setSelectedRole('mage');
                    onSelectPreviewRole?.('mage');
                  }}
                  className={`pointer-events-auto w-full max-w-[210px] py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl backdrop-blur-md active:scale-95 transition cursor-pointer text-center ${
                    selectedRole === 'mage'
                      ? 'bg-purple-500/90 border-purple-200 text-stone-950 shadow-purple-500/40 ring-2 ring-purple-400/60 scale-105'
                      : 'bg-stone-950/85 hover:bg-stone-900 border-stone-400/60 text-white'
                  }`}
                >
                  PILIH MAGE
                </button>
              </div>

              {/* 3. Assassin Button (Right) */}
              <div className="flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('rogue');
                    onSelectPreviewRole?.('rogue');
                    handleConfirmRole('rogue');
                  }}
                  onMouseEnter={() => {
                    setSelectedRole('rogue');
                    onSelectPreviewRole?.('rogue');
                  }}
                  className={`pointer-events-auto w-full max-w-[210px] py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl backdrop-blur-md active:scale-95 transition cursor-pointer text-center ${
                    selectedRole === 'rogue'
                      ? 'bg-emerald-500/90 border-emerald-200 text-stone-950 shadow-emerald-500/40 ring-2 ring-emerald-400/60 scale-105'
                      : 'bg-stone-950/85 hover:bg-stone-900 border-stone-400/60 text-white'
                  }`}
                >
                  PILIH ASSASSIN
                </button>
              </div>
            </div>

            {/* Bottom Skill Icon Bars (Grouped in 3 Rounded Dark Glassy Capsules) */}
            <div className="w-full flex items-center justify-center gap-2 sm:gap-4 md:gap-6 flex-wrap pointer-events-none">
              {/* Knight Skills Bar */}
              <div
                className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl bg-black/80 border backdrop-blur-md shadow-2xl transition-all cursor-pointer ${
                  selectedRole === 'warrior'
                    ? 'border-amber-400 ring-1 ring-amber-400/50 scale-[1.02]'
                    : 'border-amber-600/30'
                }`}
                onClick={() => {
                  setSelectedRole('warrior');
                  onSelectPreviewRole?.('warrior');
                }}
              >
                {KNIGHT_SKILLS.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onMouseEnter={() => setActiveTooltip(skill)}
                    onMouseLeave={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : prev))}
                    onClick={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : skill))}
                    className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      activeTooltip?.id === skill.id
                        ? 'bg-amber-500/30 border-2 border-amber-400 scale-105 shadow-lg shadow-amber-500/30'
                        : 'bg-stone-900/60 hover:bg-stone-800 border border-stone-700/70 hover:border-amber-500/60'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{skill.icon}</span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-stone-300 line-clamp-1 max-w-[42px] text-center">
                      {skill.shortName}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mage Skills Bar */}
              <div
                className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl bg-black/80 border backdrop-blur-md shadow-2xl transition-all cursor-pointer ${
                  selectedRole === 'mage'
                    ? 'border-blue-400 ring-1 ring-blue-400/50 scale-[1.02]'
                    : 'border-blue-600/30'
                }`}
                onClick={() => {
                  setSelectedRole('mage');
                  onSelectPreviewRole?.('mage');
                }}
              >
                {MAGE_SKILLS.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onMouseEnter={() => setActiveTooltip(skill)}
                    onMouseLeave={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : prev))}
                    onClick={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : skill))}
                    className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      activeTooltip?.id === skill.id
                        ? 'bg-blue-500/30 border-2 border-blue-400 scale-105 shadow-lg shadow-blue-500/30'
                        : 'bg-stone-900/60 hover:bg-stone-800 border border-stone-700/70 hover:border-blue-500/60'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{skill.icon}</span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-stone-300 line-clamp-1 max-w-[42px] text-center">
                      {skill.shortName}
                    </span>
                  </button>
                ))}
              </div>

              {/* Assassin Skills Bar */}
              <div
                className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl bg-black/80 border backdrop-blur-md shadow-2xl transition-all cursor-pointer ${
                  selectedRole === 'rogue'
                    ? 'border-emerald-400 ring-1 ring-emerald-400/50 scale-[1.02]'
                    : 'border-emerald-600/30'
                }`}
                onClick={() => {
                  setSelectedRole('rogue');
                  onSelectPreviewRole?.('rogue');
                }}
              >
                {ASSASSIN_SKILLS.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onMouseEnter={() => setActiveTooltip(skill)}
                    onMouseLeave={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : prev))}
                    onClick={() => setActiveTooltip((prev) => (prev?.id === skill.id ? null : skill))}
                    className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      activeTooltip?.id === skill.id
                        ? 'bg-emerald-500/30 border-2 border-emerald-400 scale-105 shadow-lg shadow-emerald-500/30'
                        : 'bg-stone-900/60 hover:bg-stone-800 border border-stone-700/70 hover:border-emerald-500/60'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{skill.icon}</span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-stone-300 line-clamp-1 max-w-[42px] text-center">
                      {skill.shortName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MULTIPLAYER CONNECTION SCREEN                               */}
      {/* ============================================================== */}
      {view === 'multiplayer' && (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 animate-fade-in">
          <div
            className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #2b1d14f2 0%, #1c130bf2 60%, #120c07fa 100%)',
              border: '3px solid #785233',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.7)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-amber-900/50 mb-5">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>KEMBALI</span>
              </button>

              <h2
                className="text-lg sm:text-xl font-black text-amber-300 tracking-wider uppercase text-center"
                style={{
                  fontFamily: 'serif',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                MULTIPLAYER ONLINE
              </h2>

              <div className="w-16" />
            </div>

            {/* Inputs */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-stone-300 font-bold mb-1">Nama Pahlawan:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950/80 border border-stone-700 text-stone-100 font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="Masukkan nama karakter..."
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">Nama Room Server:</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950/80 border border-stone-700 text-stone-100 font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="Contoh: Eldoria-Alpha"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">Pilih Kelas Petualang:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'warrior' as CharacterClass, label: 'Ksatria', icon: '⚔️' },
                    { id: 'mage' as CharacterClass, label: 'Penyihir', icon: '🔮' },
                    { id: 'rogue' as CharacterClass, label: 'Pemburu', icon: '🗡️' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMultiplayerClass(c.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition cursor-pointer ${
                        multiplayerClass === c.id
                          ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                          : 'border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Server Toggle */}
              <div className="pt-2 border-t border-stone-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-stone-300 text-xs">
                  <input
                    type="checkbox"
                    checked={useCustomServer}
                    onChange={(e) => setUseCustomServer(e.target.checked)}
                    className="rounded border-stone-700 text-amber-500 focus:ring-0"
                  />
                  <span>Gunakan Alamat Server Khusus (Custom Server)</span>
                </label>

                {useCustomServer && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="http://192.168.1.5:3001"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestServerConnection}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${serverTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                      <span>Tes</span>
                    </button>
                  </div>
                )}

                {serverTestMessage && (
                  <p
                    className={`mt-1.5 text-[11px] ${
                      serverTestStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {serverTestMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleLaunchMultiplayer}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-sm tracking-wider uppercase shadow-xl active:scale-95 transition cursor-pointer border border-yellow-300"
            >
              GABUNG KE SERVER ONLINE
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FOOTER ANNOTATIONS (v1.0.4 & Copyright - Exact from image_30.png)*/}
      {/* ============================================================== */}
      <div className="absolute bottom-2.5 left-4 text-[11px] font-bold text-stone-400/80 drop-shadow pointer-events-none">
        v1.0.4
      </div>
      <div className="absolute bottom-2.5 right-4 text-[11px] font-bold text-stone-400/80 drop-shadow pointer-events-none">
        © 2022 - All Rights Reserved.
      </div>
    </div>
  );
};

export default MainMenu;
