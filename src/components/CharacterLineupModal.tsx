import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  X,
  RotateCw,
  Eye,
  Sparkles,
  Shield,
  Zap,
  Sword,
  Sliders,
  Maximize2,
  RefreshCw,
  Info,
  Flame,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import {
  CharacterLineupShowcase,
  createCharacterLineupShowcase,
  CharacterShaderManager,
  EntityType,
} from '../game/3d/characterPipeline';
import { soundManager } from '../game/audio';

interface CharacterLineupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterLineupModal: React.FC<CharacterLineupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<CharacterLineupShowcase | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // UI State
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'all'>('all');
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [assassinWeapon, setAssassinWeapon] = useState<'dual_daggers' | 'bow'>('dual_daggers');
  const [activeTab, setActiveTab] = useState<'controls' | 'shader' | 'lore'>('controls');

  // Shader Uniform Controls
  const [rimIntensity, setRimIntensity] = useState<number>(1.15);
  const [rimPower, setRimPower] = useState<number>(2.8);
  const [ambientLight, setAmbientLight] = useState<number>(0.65);

  // Three.js Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 2.2, 7.8));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbitAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: 0.22,
    radius: 7.8,
  });

  // Camera targets for focused character inspection
  const focusTargets: Record<
    EntityType | 'all',
    { x: number; y: number; z: number; lookY: number; radius: number }
  > = {
    all: { x: 0, y: 1.8, z: 0, lookY: 1.2, radius: 7.8 },
    knight: { x: -3.45, y: 1.6, z: 0, lookY: 1.2, radius: 3.5 },
    mage: { x: -1.15, y: 1.6, z: 0, lookY: 1.2, radius: 3.4 },
    assassin: { x: 1.15, y: 1.5, z: 0, lookY: 1.15, radius: 3.4 },
    npc: { x: 3.45, y: 1.45, z: 0, lookY: 1.05, radius: 3.4 },
  };

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene & Background Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0a09); // Deep warm stone void
    scene.fog = new THREE.FogExp2(0x0c0a09, 0.04);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 2.2, 7.8);
    camera.lookAt(0, 1.2, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    mountRef.current.replaceChildren(renderer.domElement);

    // 4. Lighting Rig
    // Soft global ambient
    const ambient = new THREE.AmbientLight(0xfffbeb, ambientLight);
    ambient.name = 'lineup_ambient';
    scene.add(ambient);

    // Key directional light with sharp shadows
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool fill light from opposing angle
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    fillLight.position.set(-6, 4, 3);
    scene.add(fillLight);

    // Overhead colored accent lights behind characters for rim pop
    const rimBackLight = new THREE.DirectionalLight(0xd8b4fe, 1.1);
    rimBackLight.position.set(0, 5, -6);
    scene.add(rimBackLight);

    // 5. Stylized Platform / Dais Floor
    const floorGeo = new THREE.CylinderGeometry(8.5, 9.2, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.32;
    floor.receiveShadow = true;
    scene.add(floor);

    // Gold inlaid perimeter ring
    const ringGeo = new THREE.TorusGeometry(8.6, 0.04, 6, 48);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.11;
    scene.add(ring);

    // 6. Build the 4-Character Lineup Showcase
    const showcase = createCharacterLineupShowcase({
      spacing: 2.3,
      includePedestals: true,
      scale: 1.0,
    });
    showcaseRef.current = showcase;
    scene.add(showcase.group);

    // 7. Interactive Orbit & Drag Handlers
    const domElem = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePosRef.current.x;
      const deltaY = e.clientY - previousMousePosRef.current.y;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };

      orbitAngleRef.current.theta -= deltaX * 0.007;
      orbitAngleRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI / 2.3, orbitAngleRef.current.phi + deltaY * 0.005)
      );
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitAngleRef.current.radius = Math.max(
        2.2,
        Math.min(11.0, orbitAngleRef.current.radius + e.deltaY * 0.006)
      );
    };

    // Touch support for mobile devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosRef.current.y;
      previousMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      orbitAngleRef.current.theta -= deltaX * 0.008;
      orbitAngleRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI / 2.3, orbitAngleRef.current.phi + deltaY * 0.006)
      );
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });
    domElem.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 8. Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation & Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Update character procedural animations and shader uniforms
      if (showcaseRef.current) {
        showcaseRef.current.update(delta);
      }

      // Smooth camera interpolation towards orbit position around current focus target
      const focus = focusTargets[selectedEntity];
      const targetLook = new THREE.Vector3(focus.x, focus.lookY, focus.z);
      currentLookAtRef.current.lerp(targetLook, delta * 4.0);

      const rad = orbitAngleRef.current.radius;
      const phi = orbitAngleRef.current.phi;
      const theta = orbitAngleRef.current.theta;

      const camX = currentLookAtRef.current.x + rad * Math.sin(theta) * Math.cos(phi);
      const camY = currentLookAtRef.current.y + rad * Math.sin(phi);
      const camZ = currentLookAtRef.current.z + rad * Math.cos(theta) * Math.cos(phi);

      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), delta * 5.0);
      camera.lookAt(currentLookAtRef.current);

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElem.removeEventListener('wheel', onWheel);
      domElem.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);

      if (showcaseRef.current) {
        showcaseRef.current.dispose();
      }
      renderer.dispose();
    };
  }, [isOpen, selectedEntity]);

  // Update Shader Uniforms in Real-Time
  useEffect(() => {
    const shaderMgr = CharacterShaderManager.getInstance();
    shaderMgr.uniforms.uRimIntensity.value = rimIntensity;
    shaderMgr.uniforms.uRimPower.value = rimPower;

    if (sceneRef.current) {
      const amb = sceneRef.current.getObjectByName('lineup_ambient') as THREE.AmbientLight;
      if (amb) amb.intensity = ambientLight;
    }
  }, [rimIntensity, rimPower, ambientLight]);

  // Handle Focus Camera Button
  const handleSelectEntity = (entity: EntityType | 'all') => {
    setSelectedEntity(entity);
    orbitAngleRef.current.theta = 0;
    orbitAngleRef.current.phi = 0.22;
    orbitAngleRef.current.radius = focusTargets[entity].radius;
    soundManager.playChestOpen();
  };

  // Handle Movement Toggle
  const handleToggleMoving = () => {
    const next = !isMoving;
    setIsMoving(next);
    if (showcaseRef.current) {
      showcaseRef.current.setAllMoving(next);
    }
    soundManager.playChestOpen();
  };

  // Handle Attack Trigger
  const handleTriggerAttack = () => {
    if (showcaseRef.current) {
      showcaseRef.current.triggerAllAttacks();
    }
    soundManager.playSwordSlash();
  };

  // Handle Assassin Weapon Switch
  const handleSwitchAssassinWeapon = (mode: 'dual_daggers' | 'bow') => {
    setAssassinWeapon(mode);
    if (showcaseRef.current) {
      showcaseRef.current.switchAssassinWeapon(mode);
    }
    soundManager.playEquip();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="game-modal-card relative w-full max-w-6xl h-[85vh] max-h-[85vh] bg-stone-950 border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-900/90 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-100 tracking-wide">
                  Lineup 4 Karakter RPG Fantasi 3D
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  Shared PBR Shader Pipeline
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Ksatria • Penyihir (Mage) • Asasin • NPC Desa — Berdiri Berdampingan dalam Satu Lineup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="hidden md:flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'controls'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🎮 Kontrol & Aksi
              </button>
              <button
                onClick={() => setActiveTab('shader')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'shader'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ✨ PBR Shader Pipeline
              </button>
              <button
                onClick={() => setActiveTab('lore')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'lore'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                📜 Rincian Siluet Desain
              </button>
            </div>

            <button
              onClick={() => {
                soundManager.playChestOpen();
                onClose();
              }}
              className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Workspace: 3D Canvas + Overlay Panels */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-stone-950">
          {/* 3D WebGL Canvas Mount */}
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            title="Klik dan geser mouse / sentuh untuk memutar sudut pandang 3D; Scroll untuk zoom"
          />

          {/* Top Camera Focus Selector Overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-500/30 shadow-lg text-xs z-20">
            <span className="text-[11px] font-bold text-stone-400 hidden sm:inline mr-1">
              Fokus Kamera:
            </span>
            {[
              { id: 'all', label: '👥 Semua 4', color: 'hover:text-amber-300' },
              { id: 'knight', label: '🛡️ Ksatria', color: 'hover:text-blue-300' },
              { id: 'mage', label: '🔮 Mage', color: 'hover:text-purple-300' },
              { id: 'assassin', label: '🗡️ Asasin', color: 'hover:text-emerald-300' },
              { id: 'npc', label: '🏮 NPC Desa', color: 'hover:text-amber-300' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleSelectEntity(btn.id as EntityType | 'all')}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer text-xs ${
                  selectedEntity === btn.id
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : `text-stone-300 bg-stone-800/80 ${btn.color}`
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Quick Interaction Floating Bar (Bottom-Center) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 bg-stone-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-stone-700/80 shadow-2xl z-20">
            <button
              onClick={handleToggleMoving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                isMoving
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isMoving ? 'animate-spin' : ''}`} />
              <span>{isMoving ? 'Animasi: Berjalan' : 'Animasi: Diam (Idle)'}</span>
            </button>

            <button
              onClick={handleTriggerAttack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
            >
              <Sword className="w-3.5 h-3.5" />
              <span>Aksi Serang Tempur</span>
            </button>

            {/* Assassin Weapon Toggle */}
            <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 text-[11px]">
              <span className="text-stone-400 font-semibold hidden sm:inline">Senjata Asasin:</span>
              <button
                onClick={() => handleSwitchAssassinWeapon('dual_daggers')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  assassinWeapon === 'dual_daggers'
                    ? 'bg-emerald-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ⚔️ Belati Ganda
              </button>
              <button
                onClick={() => handleSwitchAssassinWeapon('bow')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  assassinWeapon === 'bow'
                    ? 'bg-emerald-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🏹 Busur Recurve
              </button>
            </div>
          </div>

          {/* Right Floating Inspection Drawer */}
          <div className="absolute top-14 right-3 bottom-20 w-80 max-w-[calc(100vw-24px)] bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl p-4 shadow-2xl flex flex-col z-20 overflow-y-auto">
            {/* Mobile Tab Selector */}
            <div className="flex md:hidden bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs mb-3">
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-1 rounded-lg font-bold text-center ${
                  activeTab === 'controls' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'
                }`}
              >
                Kontrol
              </button>
              <button
                onClick={() => setActiveTab('shader')}
                className={`flex-1 py-1 rounded-lg font-bold text-center ${
                  activeTab === 'shader' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'
                }`}
              >
                PBR
              </button>
              <button
                onClick={() => setActiveTab('lore')}
                className={`flex-1 py-1 rounded-lg font-bold text-center ${
                  activeTab === 'lore' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'
                }`}
              >
                Siluet
              </button>
            </div>

            {/* TAB 1: QUICK CONTROLS & SPEC OVERVIEW */}
            {activeTab === 'controls' && (
              <div className="space-y-4 text-xs text-stone-300">
                <div className="border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Stylized Fantasy Lineup</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Empat karakter berdiri sejajar dengan proporsi tubuh gagah dan siluet unik.
                  </p>
                </div>

                {/* Character Badges */}
                <div className="space-y-2">
                  <div
                    onClick={() => handleSelectEntity('knight')}
                    className="p-2.5 rounded-xl bg-stone-950/70 border border-blue-500/30 hover:border-blue-500/80 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-blue-300">1. Ksatria (Knight)</div>
                      <div className="text-[10px] text-stone-400">
                        Zirah Lekuk Anatomis, Pauldron Besar, Helm Tajam, Pedang & Perisai
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                  </div>

                  <div
                    onClick={() => handleSelectEntity('mage')}
                    className="p-2.5 rounded-xl bg-stone-950/70 border border-purple-500/30 hover:border-purple-500/80 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-purple-300">2. Penyihir (Mage)</div>
                      <div className="text-[10px] text-stone-400">
                        Jubah Berlayar, Kerah Tinggi Elegan, Tongkat Akar & Kristal Asimetris
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </div>

                  <div
                    onClick={() => handleSelectEntity('assassin')}
                    className="p-2.5 rounded-xl bg-stone-950/70 border border-emerald-500/30 hover:border-emerald-500/80 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-emerald-300">3. Asasin (Shadow Hunter)</div>
                      <div className="text-[10px] text-stone-400">
                        Tubuh Ramping Atletis, Tudung & Syal Asimetris, Belati Melengkung & Busur
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div
                    onClick={() => handleSelectEntity('npc')}
                    className="p-2.5 rounded-xl bg-stone-950/70 border border-amber-500/30 hover:border-amber-500/80 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-amber-300">4. NPC Desa (Village Craftsman)</div>
                      <div className="text-[10px] text-stone-400">
                        Postur Membungkuk Ramah, Lipatan Kain Alami, Sabuk Ramuan, Lentera Kayu
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
                  💡 <strong>Tip Navigasi 3D:</strong> Klik & geser kanvas untuk memutar kamera
                  360°. Gunakan scroll mouse atau cubit layar untuk zoom in/out mendekati detail zirah!
                </div>
              </div>
            )}

            {/* TAB 2: PBR SHADER PIPELINE INSPECTOR */}
            {activeTab === 'shader' && (
              <div className="space-y-4 text-xs text-stone-300">
                <div className="border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>PBR Shader Pipeline Manager</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Pipeline material PBR bersama dengan Fresnel Rim-Lighting & Shadow Directional.
                  </p>
                </div>

                {/* Real-time Shader Uniform Sliders */}
                <div className="space-y-3 bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Fresnel Rim Intensity:</span>
                      <span className="font-bold text-amber-400">{rimIntensity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={rimIntensity}
                      onChange={(e) => setRimIntensity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Fresnel Rim Falloff (Power):</span>
                      <span className="font-bold text-amber-400">{rimPower.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.2"
                      max="5.0"
                      step="0.1"
                      value={rimPower}
                      onChange={(e) => setRimPower(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Global Ambient Factor:</span>
                      <span className="font-bold text-amber-400">{ambientLight.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.2"
                      step="0.05"
                      value={ambientLight}
                      onChange={(e) => setAmbientLight(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Entity PBR Parameters Card */}
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30">
                    <div className="font-bold text-blue-300">🛡️ Ksatria (Knight)</div>
                    <div className="text-stone-400">
                      • Metalness: <strong>0.85</strong> (Tempered Steel)
                      <br />
                      • Roughness: <strong>0.25</strong> (Polished Armor)
                      <br />• Normal Map: <strong>512x512 Armor Micro-Scratches</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30">
                    <div className="font-bold text-purple-300">🔮 Penyihir (Mage)</div>
                    <div className="text-stone-400">
                      • Roughness: <strong>0.70</strong> (Indigo Fabric Weave)
                      <br />
                      • Emissive Glow Map: <strong>Pulsating Arcane Runes (1.6x)</strong>
                      <br />• Crystal Refraction: <strong>0.08 Roughness, 2.8x Cyan Glow</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <div className="font-bold text-emerald-300">🗡️ Asasin (Assassin)</div>
                    <div className="text-stone-400">
                      • Roughness: <strong>0.50</strong> (Obsidian Matte Leather)
                      <br />
                      • Specularity: <strong>Subtle Pebble Grain Normal Map</strong>
                      <br />• Poison Edge: <strong>Emerald Glow Shimmer</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <div className="font-bold text-amber-300">🏮 NPC Desa (Village NPC)</div>
                    <div className="text-stone-400">
                      • Roughness: <strong>0.88</strong> (Matte Rustic Cloth)
                      <br />
                      • Diffuse Weave &amp; <strong>Ambient Occlusion (AO) Crevices</strong>
                      <br />• Brass Lantern: <strong>0.80 Metalness, Glowing Amber Core</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SILHOUETTES & REDESIGN DETAILS */}
            {activeTab === 'lore' && (
              <div className="space-y-4 text-xs text-stone-300">
                <div className="border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Rancangan Siluet Fantasi Modern</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Proporsi anatomi dinamis dan ciri khas siluet yang mudah dibedakan.
                  </p>
                </div>

                <div className="space-y-3 text-[11px] leading-relaxed">
                  <div className="p-3 rounded-xl bg-stone-950 border-l-4 border-blue-500">
                    <div className="font-bold text-blue-300 text-xs mb-1">Ksatria (Warrior)</div>
                    <p className="text-stone-400">
                      Zirah dirancang ulang memiliki lekukan anatomis gagah pada pelat dada dan fauld.
                      Pauldron bahu dibuat bertingkat 3 lapis dengan spira emas ke atas. Jubah bertingkat
                      berkibar dinamis (merah kirmizi luar, trim emas dalam), serta helm Great Helm
                      bersiluet tajam dengan celah mata agresif.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-950 border-l-4 border-purple-500">
                    <div className="font-bold text-purple-300 text-xs mb-1">Penyihir (Mage)</div>
                    <p className="text-stone-400">
                      Jubah berlayar elegan dengan kerah kipas tinggi berdiri dramatis di belakang leher.
                      Tabard upacara bersulam rune berdenyut, lengan lonceng mengembang, serta tongkat
                      kayu berpilin motif akar yang memegang kristal mentah berukuran asimetris dengan
                      cincin rune mengorbit.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-950 border-l-4 border-emerald-500">
                    <div className="font-bold text-emerald-300 text-xs mb-1">Asasin (Rogue)</div>
                    <p className="text-stone-400">
                      Siluet tubuh ramping &amp; atletis. Tudung shadow cowl berujung tajam dipadu syal
                      sutra zamrud asimetris yang menjuntai di bahu kanan. Sabuk kulit bersilang dengan
                      3 pisau lempar di dada, 2 belati cakar melengkung di pinggang, dan busur panah
                      recurve berkomposit tajam.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-950 border-l-4 border-amber-500">
                    <div className="font-bold text-amber-300 text-xs mb-1">NPC Desa (Villager)</div>
                    <p className="text-stone-400">
                      Postur tubuh khas warga desa yang sedikit membungkuk ramah (welcoming hunched tilt).
                      Pakaian kain lena dengan lipatan alami, celemek kerja berjahit, sabuk pinggang
                      berisi 5 botol ramuan berbagai bentuk &amp; warna (sumbat gabus), serta lentera kayu
                      gantung heksagonal dengan nyala lilin hangat.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
