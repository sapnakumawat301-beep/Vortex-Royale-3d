import React from 'react';
import { PhysicsState } from '../game/carPhysics';
import { GameMission, VehicleConfig } from '../types/game';
import {
  Gauge,
  Zap,
  Volume2,
  VolumeX,
  HelpCircle,
  Flag,
  Trophy,
  Compass,
  Radio,
  Flame,
} from 'lucide-react';

interface HUDProps {
  physics: PhysicsState | null;
  currentVehicle: VehicleConfig;
  activeMission: GameMission | null;
  missionCheckpointsHit: number;
  missionTime: number;
  speedTrapAlert: { name: string; speed: number } | null;
  stuntAlert: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHelp: () => void;
  useMph: boolean;
  onToggleMph: () => void;
  // Touch controls
  onTouchStart: (action: 'forward' | 'backward' | 'left' | 'right' | 'handbrake' | 'boost') => void;
  onTouchEnd: (action: 'forward' | 'backward' | 'left' | 'right' | 'handbrake' | 'boost') => void;
}

export const HUD: React.FC<HUDProps> = ({
  physics,
  currentVehicle,
  activeMission,
  missionCheckpointsHit,
  missionTime,
  speedTrapAlert,
  stuntAlert,
  isMuted,
  onToggleMute,
  onOpenHelp,
  useMph,
  onToggleMph,
  onTouchStart,
  onTouchEnd,
}) => {
  const speed = physics ? physics.speedKmh : 0;
  const displaySpeed = useMph ? Math.round(speed * 0.621371) : speed;
  const speedUnit = useMph ? 'MPH' : 'KM/H';

  // Determine current map zone by coordinates
  const getZoneName = (x = 0, z = 0): string => {
    if (x >= 40 && x <= 300) return 'Coastal Highway';
    if (x <= -60 && z <= -60) return 'Downtown Metropolis';
    if (x <= -60 && z >= 40) return 'Stunt Valley & Loop';
    if (x >= -60 && x <= 60 && z <= -60) return 'Airport Runway';
    return 'Open Horizon Sector';
  };

  const zone = physics ? getZoneName(physics.position.x, physics.position.z) : 'Horizon Sector';

  // Tachometer needle calculation (0 to 180 degrees)
  const rpmRatio = physics ? physics.rpm : 0.1;
  const needleAngle = -90 + rpmRatio * 180;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* ----------------------------------------------------
          TOP BAR: MINIMAL LOGO, ZONE, MISSION STATUS
      ---------------------------------------------------- */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        {/* Left: Brand & Vehicle Spec */}
        <div className="flex items-center gap-3">
          <div className="bg-[#12151d] border border-[#2a3040] rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-lg tracking-tighter shadow-md">
              VH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold tracking-wider text-sm uppercase">Velocity Horizon</span>
                <span className="text-[10px] font-semibold tracking-wider text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                  {currentVehicle.category}
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>{currentVehicle.name}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Compass className="w-3 h-3" /> {zone}
                </span>
              </div>
            </div>
          </div>

          {/* Points / Drift Counter */}
          <div className="hidden sm:flex bg-[#12151d] border border-[#2a3040] rounded-xl px-3.5 py-2.5 items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 leading-none">Score</div>
              <div className="text-white font-mono font-bold text-sm leading-tight">
                {(physics?.driftScore || 0).toLocaleString()} PTS
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Controls & Mission Progress */}
        <div className="flex items-center gap-2">
          {activeMission && (
            <div className="bg-[#12151d] border border-cyan-500/50 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg">
              <Flag className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">
                  {activeMission.title}
                </div>
                <div className="text-xs text-zinc-300 font-mono">
                  CP: {missionCheckpointsHit} / {activeMission.checkpoints.length} • {missionTime.toFixed(1)}s
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-10 h-10 rounded-xl bg-[#12151d] hover:bg-[#1c2230] border border-[#2a3040] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-200" />}
          </button>

          <button
            onClick={onOpenHelp}
            title="Controls & Instructions"
            className="w-10 h-10 rounded-xl bg-[#12151d] hover:bg-[#1c2230] border border-[#2a3040] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-zinc-200" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          SPEED TRAP RADAR POPUP ALERT
      ---------------------------------------------------- */}
      {speedTrapAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300">
          <div className="bg-amber-500 text-black px-6 py-2.5 rounded-full font-black tracking-wide flex items-center gap-3 shadow-2xl border-2 border-white">
            <Zap className="w-5 h-5 fill-black" />
            <span>RADAR FLASH: {speedTrapAlert.speed} KM/H!</span>
            <span className="text-xs bg-black text-amber-300 px-2 py-0.5 rounded-full font-bold">
              {speedTrapAlert.name}
            </span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          STUNT JUMP AIR-TIME POPUP
      ---------------------------------------------------- */}
      {stuntAlert && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-full font-bold tracking-wide flex items-center gap-2 shadow-2xl border border-cyan-300">
            <Flame className="w-5 h-5 text-yellow-300" />
            <span>{stuntAlert}</span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          DRIFT SCORE FLOATING DISPLAY
      ---------------------------------------------------- */}
      {physics && physics.isDrifting && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
          <div className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-950/80 px-3 py-1 rounded-full border border-orange-500/60 mb-1">
            Drift Angle: {Math.round(physics.driftAngle)}°
          </div>
          <div className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-lg">
            +{physics.driftScore} ×{physics.driftMultiplier.toFixed(1)}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          BOTTOM-RIGHT: SPEEDOMETER & TACHOMETER CLUSTER
      ---------------------------------------------------- */}
      <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-6 pointer-events-auto">
        <div className="bg-[#10141f] border border-[#273042] rounded-3xl p-4 shadow-2xl flex flex-col items-center w-48 sm:w-56">
          {/* Radial RPM Arc Gauge */}
          <div className="relative w-36 h-20 sm:w-44 sm:h-24 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 160 90" className="w-full h-full">
              {/* Background Arc */}
              <path
                d="M 20 80 A 60 60 0 0 1 140 80"
                fill="none"
                stroke="#1f2638"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Active RPM Fill Arc */}
              <path
                d="M 20 80 A 60 60 0 0 1 140 80"
                fill="none"
                stroke={rpmRatio > 0.85 ? '#ef4444' : '#06b6d4'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="188"
                strokeDashoffset={188 - rpmRatio * 188}
                className="transition-all duration-75"
              />
            </svg>

            {/* Gear Indicator in Center of Gauge */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase leading-none">Gear</span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none">
                {physics?.gear === -1 ? 'R' : physics?.gear || 'N'}
              </span>
            </div>
          </div>

          {/* Large Digital Speed Readout */}
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
              {displaySpeed}
            </span>
            <button
              onClick={onToggleMph}
              title="Click to toggle KM/H and MPH"
              className="text-xs font-bold text-zinc-400 hover:text-cyan-400 bg-[#1b2233] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            >
              {speedUnit}
            </button>
          </div>

          {/* Nitro Boost Bar */}
          <div className="w-full mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
              <span className="flex items-center gap-1 text-cyan-400">
                <Zap className="w-3 h-3 fill-cyan-400" /> Nitro Boost
              </span>
              <span className="font-mono text-zinc-300">{Math.round(physics?.nitroAmount || 0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1b2233] overflow-hidden p-0.5 border border-[#2b3548]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
                style={{ width: `${physics?.nitroAmount || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          TOUCH SCREEN ON-SCREEN CONTROLS (Mobile / Tablet)
      ---------------------------------------------------- */}
      <div className="sm:hidden absolute bottom-24 left-3 flex flex-col gap-2 pointer-events-auto">
        <div className="flex gap-2">
          <button
            onPointerDown={() => onTouchStart('left')}
            onPointerUp={() => onTouchEnd('left')}
            onPointerLeave={() => onTouchEnd('left')}
            className="w-14 h-14 bg-[#141926]/90 border border-[#2e394f] rounded-2xl text-white font-bold text-xl active:bg-cyan-600 flex items-center justify-center shadow-lg"
          >
            ◀
          </button>
          <button
            onPointerDown={() => onTouchStart('right')}
            onPointerUp={() => onTouchEnd('right')}
            onPointerLeave={() => onTouchEnd('right')}
            className="w-14 h-14 bg-[#141926]/90 border border-[#2e394f] rounded-2xl text-white font-bold text-xl active:bg-cyan-600 flex items-center justify-center shadow-lg"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="sm:hidden absolute bottom-24 right-3 flex items-center gap-2 pointer-events-auto">
        <button
          onPointerDown={() => onTouchStart('handbrake')}
          onPointerUp={() => onTouchEnd('handbrake')}
          onPointerLeave={() => onTouchEnd('handbrake')}
          className="w-12 h-12 bg-[#1b2233]/90 border border-amber-600/50 rounded-2xl text-amber-400 font-black text-xs active:bg-amber-600 active:text-black flex items-center justify-center shadow-lg"
        >
          DRIFT
        </button>
        <button
          onPointerDown={() => onTouchStart('boost')}
          onPointerUp={() => onTouchEnd('boost')}
          onPointerLeave={() => onTouchEnd('boost')}
          className="w-12 h-12 bg-[#1b2233]/90 border border-cyan-500/50 rounded-2xl text-cyan-400 font-black text-xs active:bg-cyan-500 active:text-black flex items-center justify-center shadow-lg"
        >
          NOS
        </button>
        <div className="flex flex-col gap-2">
          <button
            onPointerDown={() => onTouchStart('forward')}
            onPointerUp={() => onTouchEnd('forward')}
            onPointerLeave={() => onTouchEnd('forward')}
            className="w-14 h-14 bg-[#141926]/90 border border-[#2e394f] rounded-2xl text-emerald-400 font-bold text-xl active:bg-emerald-600 active:text-white flex items-center justify-center shadow-lg"
          >
            ▲
          </button>
          <button
            onPointerDown={() => onTouchStart('backward')}
            onPointerUp={() => onTouchEnd('backward')}
            onPointerLeave={() => onTouchEnd('backward')}
            className="w-14 h-14 bg-[#141926]/90 border border-[#2e394f] rounded-2xl text-red-400 font-bold text-xl active:bg-red-600 active:text-white flex items-center justify-center shadow-lg"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
};
