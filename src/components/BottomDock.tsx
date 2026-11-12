import React, { useState } from 'react';
import {
  VehicleId,
  TimeOfDay,
  CameraViewMode,
  CarCustomization,
  GameMission,
} from '../types/game';
import { VEHICLE_CONFIGS } from '../game/vehicleBuilder';
import {
  Car,
  Palette,
  Sun,
  Camera,
  Radio,
  Flag,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BottomDockProps {
  currentVehicleId: VehicleId;
  onSelectVehicle: (id: VehicleId) => void;
  customization: CarCustomization;
  onUpdateCustomization: (customization: CarCustomization) => void;
  timeOfDay: TimeOfDay;
  onSelectTimeOfDay: (time: TimeOfDay) => void;
  cameraMode: CameraViewMode;
  onSelectCameraMode: (mode: CameraViewMode) => void;
  radioStation: number;
  onSelectRadioStation: (station: number) => void;
  missions: GameMission[];
  activeMission: GameMission | null;
  onStartMission: (mission: GameMission) => void;
  onCancelMission: () => void;
  onResetCar: () => void;
}

type TabType = 'vehicles' | 'custom' | 'world' | 'camera' | 'radio' | 'missions';

export const BottomDock: React.FC<BottomDockProps> = ({
  currentVehicleId,
  onSelectVehicle,
  customization,
  onUpdateCustomization,
  timeOfDay,
  onSelectTimeOfDay,
  cameraMode,
  onSelectCameraMode,
  radioStation,
  onSelectRadioStation,
  missions,
  activeMission,
  onStartMission,
  onCancelMission,
  onResetCar,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('vehicles');

  const colorSwatches = [
    { label: 'Crimson Red', hex: '#e63946' },
    { label: 'Cyber Cyan', hex: '#00f5d4' },
    { label: 'Midnight Blue', hex: '#1d3557' },
    { label: 'High-Octane Yellow', hex: '#ffbe0b' },
    { label: 'Electric Purple', hex: '#7209b7' },
    { label: 'Stealth Black', hex: '#151515' },
    { label: 'Pearl White', hex: '#f8f9fa' },
  ];

  const neonSwatches = [
    { label: 'Cyan Glow', hex: '#00f5d4' },
    { label: 'Hot Pink', hex: '#f72585' },
    { label: 'Electric Purple', hex: '#7209b7' },
    { label: 'Amber Gold', hex: '#ffbe0b' },
    { label: 'Lime Green', hex: '#52b788' },
  ];

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-out select-none ${
        isCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
      style={{
        bottom: '16px',
        maxWidth: 'min(920px, 94vw)',
        width: '100%',
      }}
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-[#121622] hover:bg-[#1a2030] border border-[#2b3347] border-b-0 text-zinc-300 hover:text-white px-4 py-1.5 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container (Solid/RGBA styling, no heavy blur per directive 4.1) */}
      <div className="bg-[#101420] border border-[#283247] rounded-2xl p-3 sm:p-4 shadow-2xl">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-[#222b3e] pb-2.5 mb-3 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'vehicles'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Garage</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'custom'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tuning</span>
            </button>

            <button
              onClick={() => setActiveTab('world')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'world'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Sky & Time</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'camera'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => setActiveTab('radio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'radio'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radio</span>
            </button>

            <button
              onClick={() => setActiveTab('missions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'missions'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161c2b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Missions</span>
            </button>
          </div>

          {/* Quick Reset Car Button */}
          <button
            onClick={onResetCar}
            title="Reset Car Orientation (R)"
            className="px-2.5 py-1.5 bg-[#1f2738] hover:bg-[#28334a] text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset (R)</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[72px] flex items-center">
          {/* 1. VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {(Object.keys(VEHICLE_CONFIGS) as VehicleId[]).map((vid) => {
                const v = VEHICLE_CONFIGS[vid];
                const isSelected = currentVehicleId === vid;
                return (
                  <button
                    key={vid}
                    onClick={() => onSelectVehicle(vid)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c2436] border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                        : 'bg-[#131724] border-[#222a3d] hover:border-[#323d57]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{v.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{v.topSpeed} km/h</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2">
                      <span>Accel: {v.acceleration}</span>
                      <span>•</span>
                      <span>Drift: {v.driftRating}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. TUNING / CUSTOMIZER TAB */}
          {activeTab === 'custom' && (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              {/* Paint Colors */}
              <div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Paint Color</div>
                <div className="flex items-center gap-1.5">
                  {colorSwatches.map((swatch) => (
                    <button
                      key={swatch.hex}
                      onClick={() => onUpdateCustomization({ ...customization, bodyColor: swatch.hex })}
                      title={swatch.label}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        customization.bodyColor === swatch.hex
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Paint Finish */}
              <div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Finish</div>
                <div className="flex items-center gap-1 bg-[#141826] p-1 rounded-xl border border-[#232b3f]">
                  {(['metallic', 'matte', 'gloss'] as const).map((finish) => (
                    <button
                      key={finish}
                      onClick={() => onUpdateCustomization({ ...customization, finish })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                        customization.finish === finish
                          ? 'bg-cyan-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {finish}
                    </button>
                  ))}
                </div>
              </div>

              {/* Underglow Neon */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
                  <span>Neon Underglow</span>
                  <button
                    onClick={() =>
                      onUpdateCustomization({ ...customization, hasUnderglow: !customization.hasUnderglow })
                    }
                    className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                      customization.hasUnderglow ? 'bg-cyan-600 text-white' : 'bg-[#1f2738] text-zinc-500'
                    }`}
                  >
                    {customization.hasUnderglow ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {neonSwatches.map((neon) => (
                    <button
                      key={neon.hex}
                      onClick={() =>
                        onUpdateCustomization({
                          ...customization,
                          underglowColor: neon.hex,
                          hasUnderglow: true,
                        })
                      }
                      title={neon.label}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                        customization.hasUnderglow && customization.underglowColor === neon.hex
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: neon.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. SKY & TIME TAB */}
          {activeTab === 'world' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {[
                { id: 'day', label: 'Midday Sun', desc: 'Clear sky, crisp shadows' },
                { id: 'sunset', label: 'Golden Sunset', desc: 'Warm amber horizon' },
                { id: 'night', label: 'Cyber Night', desc: 'Neon city & headlights' },
                { id: 'fog', label: 'Foggy Dawn', desc: 'Atmospheric mist' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectTimeOfDay(item.id as TimeOfDay)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    timeOfDay === item.id
                      ? 'bg-[#1c2436] border-cyan-500 shadow-md'
                      : 'bg-[#131724] border-[#222a3d] hover:border-[#323d57]'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{item.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* 4. CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="grid grid-cols-3 gap-2 w-full">
              {[
                { id: 'chase', label: 'Third-Person Chase', desc: 'Smooth trailing dynamic follow' },
                { id: 'hood', label: 'First-Person Hood', desc: 'Fast bumper driving immersion' },
                { id: 'drone', label: 'Cinematic Drone', desc: 'High overhead aerial viewpoint' },
              ].map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => onSelectCameraMode(cam.id as CameraViewMode)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    cameraMode === cam.id
                      ? 'bg-[#1c2436] border-cyan-500 shadow-md'
                      : 'bg-[#131724] border-[#222a3d] hover:border-[#323d57]'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{cam.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{cam.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* 5. RADIO TAB */}
          {activeTab === 'radio' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {[
                { id: 0, label: 'Horizon Synthwave', desc: 'Chill retro arpeggios' },
                { id: 1, label: 'Night City Electro', desc: 'Deep saw bass pulses' },
                { id: 2, label: 'Outrun Highway', desc: 'Fast melodic synth lead' },
                { id: -1, label: 'Radio Off', desc: 'Pure engine acoustics' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => onSelectRadioStation(st.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    radioStation === st.id
                      ? 'bg-[#1c2436] border-cyan-500 shadow-md'
                      : 'bg-[#131724] border-[#222a3d] hover:border-[#323d57]'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{st.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* 6. MISSIONS & CHALLENGES TAB */}
          {activeTab === 'missions' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {missions.map((m) => {
                const isActive = activeMission?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-[#1c2436] border-cyan-500'
                        : 'bg-[#131724] border-[#222a3d]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{m.title}</span>
                      {isActive && (
                        <span className="text-[9px] bg-cyan-600 text-white px-1.5 py-0.5 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{m.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {isActive ? (
                        <button
                          onClick={onCancelMission}
                          className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Abandon Mission
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartMission(m)}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Flag className="w-3 h-3" /> Start Challenge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
