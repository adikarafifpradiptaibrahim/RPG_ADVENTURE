import React, { useEffect, useState } from 'react';
import {
  DevTestingSettings,
  getEffectiveDevTestingSettings,
  subscribeDevTestingSettings,
} from '../game/storage/devTestingManager';

export interface DevDebugTelemetry {
  fps: number;
  x: number;
  y: number;
  z: number;
  nearestBoss: {
    id: string;
    name: string;
    dist: number;
    hp: number;
    maxHp: number;
    isDead: boolean;
    phase: number;
    aiState: string;
    stormFactor: number;
  } | null;
}

interface DevDebugOverlayProps {
  isVisible: boolean;
  getTelemetry: () => DevDebugTelemetry | null;
}

export const DevDebugOverlay: React.FC<DevDebugOverlayProps> = ({ isVisible, getTelemetry }) => {
  const [telemetry, setTelemetry] = useState<DevDebugTelemetry | null>(null);
  const [devFlags, setDevFlags] = useState<DevTestingSettings>(() => getEffectiveDevTestingSettings());

  useEffect(() => {
    setDevFlags(getEffectiveDevTestingSettings());
    return subscribeDevTestingSettings(() => {
      setDevFlags(getEffectiveDevTestingSettings());
    });
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setTelemetry(null);
      return;
    }
    const update = () => {
      setTelemetry(getTelemetry());
    };
    update();
    const timer = window.setInterval(update, 180);
    return () => window.clearInterval(timer);
  }, [isVisible, getTelemetry]);

  if (!isVisible || !devFlags.enabled || !devFlags.showDebugOverlay || !telemetry) {
    return null;
  }

  const fpsColor =
    telemetry.fps >= 50 ? 'text-emerald-300' : telemetry.fps >= 30 ? 'text-amber-300' : 'text-rose-400';

  const activeBadges: string[] = [];
  if (devFlags.godMode) activeBadges.push('GOD');
  if (devFlags.ccImmune) activeBadges.push('NO-CC');
  if (devFlags.infiniteEnergy) activeBadges.push('∞EN');
  if (devFlags.superDamage) activeBadges.push('10×DMG');
  if (devFlags.zeroCooldown) activeBadges.push('0CD');
  if (devFlags.spectatorMode) activeBadges.push('SPEC');

  return (
    <div className="fixed top-24 left-3 z-30 pointer-events-none select-none w-64 sm:w-72 rounded-lg border border-amber-500/45 bg-stone-950/82 backdrop-blur-sm px-3 py-2 font-mono text-[11px] text-stone-200 shadow-lg">
      <div className="flex items-center justify-between border-b border-stone-700/80 pb-1 mb-1.5">
        <span className="font-bold text-amber-300 tracking-wide">🛠️ DEV TELEMETRY</span>
        <span className={`font-bold ${fpsColor}`}>{telemetry.fps} FPS</span>
      </div>

      <div className="flex items-center justify-between text-stone-300">
        <span className="text-stone-400">XYZ:</span>
        <span>
          {telemetry.x.toFixed(1)}, {telemetry.y.toFixed(1)}, {telemetry.z.toFixed(1)}
        </span>
      </div>

      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {activeBadges.map((b) => (
            <span
              key={b}
              className="rounded bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-200"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {telemetry.nearestBoss && (
        <div className="mt-2 pt-1.5 border-t border-stone-700/70 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-orange-300 font-bold truncate max-w-[140px]">
              {telemetry.nearestBoss.name}
            </span>
            <span className="text-stone-400">{telemetry.nearestBoss.dist.toFixed(1)}m</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-stone-400">
              Fase:{' '}
              <span className={telemetry.nearestBoss.phase === 2 ? 'text-orange-400 font-bold' : 'text-stone-200'}>
                {telemetry.nearestBoss.phase === 2 ? '2 (BERSERK)' : '1'}
              </span>
            </span>
            <span className="text-cyan-300 truncate max-w-[110px]">{telemetry.nearestBoss.aiState}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-300">
            <span>
              HP: {telemetry.nearestBoss.hp}/{telemetry.nearestBoss.maxHp}
            </span>
            {telemetry.nearestBoss.stormFactor > 0.01 && (
              <span className="text-red-300">
                Badai: {Math.round(telemetry.nearestBoss.stormFactor * 100)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
