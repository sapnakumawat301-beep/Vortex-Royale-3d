import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { PhysicsState } from './game/carPhysics';
import { VEHICLE_CONFIGS } from './game/vehicleBuilder';
import {
  VehicleId,
  TimeOfDay,
  CameraViewMode,
  CarCustomization,
  GameMission,
} from './types/game';
import { HUD } from './components/HUD';
import { Minimap } from './components/Minimap';
import { BottomDock } from './components/BottomDock';
import { HelpModal } from './components/HelpModal';
import { soundEngine } from './audio/soundEngine';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Vehicle & Customization State
  const [currentVehicleId, setCurrentVehicleId] = useState<VehicleId>('hypercar');
  const [customization, setCustomization] = useState<CarCustomization>({
    bodyColor: '#e63946',
    finish: 'metallic',
    underglowColor: '#00f5d4',
    hasUnderglow: true,
    hasSpoiler: true,
    rimColor: '#e0e0e0',
  });

  // Environment & Camera State
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [radioStation, setRadioStation] = useState<number>(0);

  // Live Physics Telemetry for HUD
  const [physicsState, setPhysicsState] = useState<PhysicsState | null>(null);

  // Alerts & Notifications
  const [speedTrapAlert, setSpeedTrapAlert] = useState<{ name: string; speed: number } | null>(null);
  const [stuntAlert, setStuntAlert] = useState<string | null>(null);

  // Mission State
  const [activeMission, setActiveMission] = useState<GameMission | null>(null);
  const [missionCheckpointsHit, setMissionCheckpointsHit] = useState<number>(0);
  const [missionTime, setMissionTime] = useState<number>(0);

  // User Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [useMph, setUseMph] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Missions list from WorldBuilder
  const [missions, setMissions] = useState<GameMission[]>([
    {
      id: 'circuit_downtown',
      title: 'Neon Downtown Circuit',
      description: 'Complete the four-corner high-speed downtown loop in under 45 seconds!',
      targetType: 'time_trial',
      targetValue: 45,
      checkpoints: [
        { x: -160, z: -40, radius: 14 },
        { x: -280, z: -40, radius: 14 },
        { x: -280, z: -280, radius: 14 },
        { x: -40, z: -280, radius: 14 },
        { x: -40, z: -40, radius: 14 },
        { x: -160, z: -40, radius: 14 },
      ],
    },
    {
      id: 'drift_mountain',
      title: 'Mountain Pass Drift King',
      description: 'Score 5,000 drift points through the winding mountain hairpin turns!',
      targetType: 'drift_challenge',
      targetValue: 5000,
      checkpoints: [
        { x: -180, z: 40, radius: 16 },
        { x: -180, z: 160, radius: 16 },
        { x: -80, z: 240, radius: 16 },
        { x: -200, z: 240, radius: 16 },
      ],
    },
    {
      id: 'drag_runway',
      title: 'Airport 1/4 Mile Drag Sprint',
      description: 'Floor it down the runway! Hit 250+ km/h and reach the hangar in record time.',
      targetType: 'speed_run',
      targetValue: 250,
      checkpoints: [
        { x: 20, z: 80, radius: 18 },
        { x: 20, z: -100, radius: 18 },
        { x: 20, z: -350, radius: 18 },
      ],
    },
  ]);

  // Handle vehicle switch
  const handleSelectVehicle = useCallback((id: VehicleId) => {
    setCurrentVehicleId(id);
    const vConfig = VEHICLE_CONFIGS[id];
    setCustomization((prev) => ({ ...prev, bodyColor: vConfig.defaultColor }));
    engineRef.current?.setVehicle(id);
  }, []);

  // Handle customization change
  const handleUpdateCustomization = useCallback((updated: CarCustomization) => {
    setCustomization(updated);
    engineRef.current?.setCustomization(updated);
  }, []);

  // Handle Time of Day change
  const handleSelectTimeOfDay = useCallback((tod: TimeOfDay) => {
    setTimeOfDay(tod);
    engineRef.current?.setTimeOfDay(tod);
  }, []);

  // Handle Camera Mode change
  const handleSelectCameraMode = useCallback((mode: CameraViewMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  // Handle Radio Station change
  const handleSelectRadioStation = useCallback((station: number) => {
    soundEngine.init();
    soundEngine.resume();
    setRadioStation(station);
    soundEngine.setRadioStation(station);
  }, []);

  // Handle Reset Car
  const handleResetCar = useCallback(() => {
    engineRef.current?.resetCar();
  }, []);

  // Start Mission
  const handleStartMission = useCallback((mission: GameMission) => {
    setActiveMission(mission);
    setMissionCheckpointsHit(0);
    setMissionTime(0);
    engineRef.current?.startMission(mission);
  }, []);

  // Cancel Mission
  const handleCancelMission = useCallback(() => {
    setActiveMission(null);
    setMissionCheckpointsHit(0);
    engineRef.current?.cancelMission();
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Initialize Game Engine on Mount (Skill Directive 4.1)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = new GameEngine(
      container,
      currentVehicleId,
      customization,
      {
        onPhysicsUpdate: (state) => {
          setPhysicsState({ ...state });
          if (state.stuntBonusMessage) {
            setStuntAlert(state.stuntBonusMessage);
            setTimeout(() => setStuntAlert(null), 3500);
            state.stuntBonusMessage = null;
          }
        },
        onSpeedTrapFlash: (name, speed) => {
          setSpeedTrapAlert({ name, speed });
          setTimeout(() => setSpeedTrapAlert(null), 3000);
        },
        onMissionProgress: (mission, cpIdx, isComplete, timeSeconds) => {
          setMissionCheckpointsHit(cpIdx);
          setMissionTime(timeSeconds);
          if (isComplete) {
            setStuntAlert(`🏆 MISSION COMPLETE! Finished in ${timeSeconds.toFixed(1)}s!`);
            setTimeout(() => setStuntAlert(null), 4000);
            setActiveMission(null);
          }
        },
        onCollectibleGrab: (points, type) => {
          const typeName = type === 'nitro_refill' ? '⚡ NITRO TANK!' : '⭐ TROPHY COLLECTED!';
          setStuntAlert(`${typeName} +${points} PTS`);
          setTimeout(() => setStuntAlert(null), 2500);
        },
      }
    );

    engineRef.current = engine;

    // ----------------------------------------------------
    // KEYBOARD DRIVING EVENT LISTENERS
    // ----------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent) => {
      // First interaction unlocks procedural audio
      soundEngine.init();
      soundEngine.resume();

      const c = engine.controls;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          c.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          c.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          c.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          c.right = true;
          break;
        case 'Space':
          c.handbrake = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          c.boost = true;
          break;
        case 'KeyR':
          engine.resetCar();
          break;
        case 'KeyC':
          setCameraMode((prev) => {
            const next = prev === 'chase' ? 'hood' : prev === 'hood' ? 'drone' : 'chase';
            engine.setCameraMode(next);
            return next;
          });
          break;
        case 'KeyM':
          handleToggleMute();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const c = engine.controls;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          c.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          c.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          c.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          c.right = false;
          break;
        case 'Space':
          c.handbrake = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          c.boost = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engine.dispose();
    };
  }, []);

  // Touch controls forwarding
  const handleTouchStart = (action: 'forward' | 'backward' | 'left' | 'right' | 'handbrake' | 'boost') => {
    soundEngine.init();
    soundEngine.resume();
    if (engineRef.current) {
      engineRef.current.controls[action] = true;
    }
  };

  const handleTouchEnd = (action: 'forward' | 'backward' | 'left' | 'right' | 'handbrake' | 'boost') => {
    if (engineRef.current) {
      engineRef.current.controls[action] = false;
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      onClick={() => {
        soundEngine.init();
        soundEngine.resume();
      }}
    >
      {/* 3D WebGL Canvas Mount (Isolated ref container per Directive 4.1) */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Minimap GPS Radar */}
      <Minimap
        physics={physicsState}
        activeMission={activeMission}
        missionCheckpointIdx={missionCheckpointsHit}
      />

      {/* Main HUD Overlay (Speedometer, Tachometer, Alerts, Touch Controls) */}
      <HUD
        physics={physicsState}
        currentVehicle={VEHICLE_CONFIGS[currentVehicleId]}
        activeMission={activeMission}
        missionCheckpointsHit={missionCheckpointsHit}
        missionTime={missionTime}
        speedTrapAlert={speedTrapAlert}
        stuntAlert={stuntAlert}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenHelp={() => setIsHelpOpen(true)}
        useMph={useMph}
        onToggleMph={() => setUseMph(!useMph)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* Collapsible Bottom Control Dock (Directive 5) */}
      <BottomDock
        currentVehicleId={currentVehicleId}
        onSelectVehicle={handleSelectVehicle}
        customization={customization}
        onUpdateCustomization={handleUpdateCustomization}
        timeOfDay={timeOfDay}
        onSelectTimeOfDay={handleSelectTimeOfDay}
        cameraMode={cameraMode}
        onSelectCameraMode={handleSelectCameraMode}
        radioStation={radioStation}
        onSelectRadioStation={handleSelectRadioStation}
        missions={missions}
        activeMission={activeMission}
        onStartMission={handleStartMission}
        onCancelMission={handleCancelMission}
        onResetCar={handleResetCar}
      />

      {/* Help & Controls Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
