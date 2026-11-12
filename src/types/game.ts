export type VehicleId = 'hypercar' | 'muscle' | 'offroad' | 'cyber';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  category: string;
  topSpeed: number; // in km/h
  acceleration: number; // 0-100 rating
  handling: number;
  driftRating: number;
  suspensionHeight: number;
  mass: number;
  defaultColor: string;
  description: string;
}

export type TimeOfDay = 'day' | 'sunset' | 'night' | 'fog';

export type CameraViewMode = 'chase' | 'hood' | 'orbit' | 'drone';

export interface CarCustomization {
  bodyColor: string;
  finish: 'metallic' | 'matte' | 'gloss' | 'carbon';
  underglowColor: string;
  hasUnderglow: boolean;
  hasSpoiler: boolean;
  rimColor: string;
}

export interface SpeedTrapRecord {
  id: string;
  name: string;
  x: number;
  z: number;
  speedRecord: number; // km/h
}

export interface CollectibleItem {
  id: string;
  x: number;
  z: number;
  y: number;
  collected: boolean;
  points: number;
  type: 'trophy' | 'nitro_refill' | 'wrench';
}

export interface MissionCheckpoint {
  x: number;
  z: number;
  radius: number;
}

export interface GameMission {
  id: string;
  title: string;
  description: string;
  targetType: 'time_trial' | 'drift_challenge' | 'speed_run';
  checkpoints: MissionCheckpoint[];
  targetValue: number; // seconds or drift points
  record?: number;
}

export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  boost: boolean;
  reset: boolean;
  lightsToggle: boolean;
}

export interface RadioTrack {
  id: string;
  name: string;
  genre: string;
  tempo: number;
}
