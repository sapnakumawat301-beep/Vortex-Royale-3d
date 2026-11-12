import * as THREE from 'three';
import { VehicleConfig, ControlState } from '../types/game';
import { WorldObstacle, StuntRamp } from './worldBuilder';
import { soundEngine } from '../audio/soundEngine';

// Pre-allocated math objects to avoid garbage collection in animation tick (Skill Directive 4.3)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _velNorm = new THREE.Vector3();

export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler; // pitch, yaw, roll
  speedKmh: number;
  rpm: number; // 0.0 to 1.0
  gear: number; // 1 to 6 or -1 (reverse)
  steerAngle: number;
  wheelRotation: number;
  isDrifting: boolean;
  driftAngle: number;
  driftScore: number;
  driftMultiplier: number;
  nitroAmount: number; // 0 to 100
  isBoosting: boolean;
  isAirborne: boolean;
  airTime: number;
  jumpDistance: number;
  jumpStartPos: THREE.Vector3;
  stuntBonusMessage: string | null;
  suspensionPitch: number;
  suspensionRoll: number;
  tireSkidIntensity: number;
}

export class CarPhysics {
  public state: PhysicsState;
  private config: VehicleConfig;
  private obstacles: WorldObstacle[];
  private stuntRamps: StuntRamp[];

  constructor(config: VehicleConfig, obstacles: WorldObstacle[], stuntRamps: StuntRamp[]) {
    this.config = config;
    this.obstacles = obstacles;
    this.stuntRamps = stuntRamps;

    this.state = {
      position: new THREE.Vector3(0, config.suspensionHeight, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      speedKmh: 0,
      rpm: 0.1,
      gear: 1,
      steerAngle: 0,
      wheelRotation: 0,
      isDrifting: false,
      driftAngle: 0,
      driftScore: 0,
      driftMultiplier: 1,
      nitroAmount: 100,
      isBoosting: false,
      isAirborne: false,
      airTime: 0,
      jumpDistance: 0,
      jumpStartPos: new THREE.Vector3(),
      stuntBonusMessage: null,
      suspensionPitch: 0,
      suspensionRoll: 0,
      tireSkidIntensity: 0,
    };
  }

  public setConfig(config: VehicleConfig) {
    this.config = config;
    this.state.position.y = Math.max(this.state.position.y, config.suspensionHeight);
  }

  public reset(x = 0, z = 0, yaw = 0) {
    this.state.position.set(x, this.config.suspensionHeight, z);
    this.state.velocity.set(0, 0, 0);
    this.state.rotation.set(0, yaw, 0);
    this.state.speedKmh = 0;
    this.state.rpm = 0.1;
    this.state.gear = 1;
    this.state.steerAngle = 0;
    this.state.isDrifting = false;
    this.state.driftScore = 0;
    this.state.isAirborne = false;
    this.state.airTime = 0;
    this.state.stuntBonusMessage = null;
  }

  /**
   * Main Physics Simulation Step (runs every frame)
   */
  public update(delta: number, controls: ControlState): PhysicsState {
    const s = this.state;
    const dt = Math.min(delta, 0.05); // Prevent tunneling on large frame spikes

    // Manual car reset
    if (controls.reset) {
      this.reset(s.position.x, s.position.z, s.rotation.y);
      return s;
    }

    // Determine forward and right unit vectors from car heading
    const yaw = s.rotation.y;
    _forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

    // 1. NITRO BOOST HANDLING
    s.isBoosting = controls.boost && s.nitroAmount > 5 && controls.forward;
    if (s.isBoosting) {
      s.nitroAmount = Math.max(0, s.nitroAmount - dt * 25);
    } else {
      // Slow passive recharge
      s.nitroAmount = Math.min(100, s.nitroAmount + dt * 8);
    }

    // 2. ACCELERATION & BRAKING FORCES
    const maxSpeedMs = (this.config.topSpeed * (s.isBoosting ? 1.25 : 1.0)) / 3.6;
    const accelRate = (this.config.acceleration / 100) * (s.isBoosting ? 26 : 16);
    const brakeRate = 28;
    const reverseMaxMs = 15;

    // Project velocity along car forward direction
    const forwardSpeed = s.velocity.dot(_forward);
    const lateralSpeed = s.velocity.dot(_right);

    if (controls.forward && !s.isAirborne) {
      if (forwardSpeed < maxSpeedMs) {
        s.velocity.addScaledVector(_forward, accelRate * dt);
      }
    } else if (controls.backward && !s.isAirborne) {
      if (forwardSpeed > 1) {
        // Active braking
        s.velocity.addScaledVector(_forward, -brakeRate * dt);
      } else if (forwardSpeed > -reverseMaxMs) {
        // Reverse gear
        s.velocity.addScaledVector(_forward, -accelRate * 0.65 * dt);
      }
    }

    // 3. STEERING INPUT
    const targetSteer = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    // Steering sensitivity reduces at higher speeds for high-speed stability
    const steerSpeedFactor = Math.max(0.35, 1 - Math.abs(forwardSpeed) / (maxSpeedMs * 1.3));
    const maxSteerAngle = 0.55 * steerSpeedFactor;
    s.steerAngle = THREE.MathUtils.damp(s.steerAngle, targetSteer * maxSteerAngle, 10, dt);

    // 4. DRIFTING & LATERAL TRACTION
    const isHandbrake = controls.handbrake;
    const isSharpTurn = Math.abs(s.steerAngle) > 0.3 && Math.abs(forwardSpeed) > 12;
    const canDrift = isHandbrake || (isSharpTurn && this.config.driftRating > 80);

    let lateralFriction = canDrift ? 0.88 : 0.96; // Lower friction allows rear end to swing out
    if (isHandbrake) {
      lateralFriction = 0.82;
      s.velocity.multiplyScalar(0.985); // Handbrake scrub
    }

    // Apply lateral grip dampening
    s.velocity.addScaledVector(_right, -lateralSpeed * (1 - lateralFriction) * (dt / 0.016));

    // Calculate drift angle
    const speed = s.velocity.length();
    s.speedKmh = Math.round(speed * 3.6);

    if (speed > 5) {
      _velNorm.copy(s.velocity).normalize();
      const dot = _velNorm.dot(_forward);
      s.driftAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
    } else {
      s.driftAngle = 0;
    }

    s.isDrifting = s.driftAngle > 18 && speed > 8 && !s.isAirborne;

    // Drift scoring
    if (s.isDrifting) {
      s.driftMultiplier = Math.min(5, s.driftMultiplier + dt * 0.4);
      s.driftScore += Math.round(s.driftAngle * speed * dt * s.driftMultiplier * 0.4);
      s.tireSkidIntensity = THREE.MathUtils.damp(s.tireSkidIntensity, 1.0, 12, dt);
      // Drifting recharges nitro faster!
      s.nitroAmount = Math.min(100, s.nitroAmount + dt * 15);
    } else {
      s.tireSkidIntensity = THREE.MathUtils.damp(s.tireSkidIntensity, 0.0, 8, dt);
      if (controls.handbrake && speed > 5) {
        s.tireSkidIntensity = 0.85;
      }
    }

    // 5. YAW ROTATION (TURNING)
    if (!s.isAirborne) {
      const turnMultiplier = (s.isDrifting ? 1.6 : 1.0) * (forwardSpeed >= -0.5 ? 1 : -1);
      const yawDelta = s.steerAngle * (speed / 14) * turnMultiplier * dt * 2.8;
      s.rotation.y += yawDelta;
    }

    // 6. STUNT RAMPS & ELEVATION
    let groundHeight = this.config.suspensionHeight;
    this.stuntRamps.forEach((ramp) => {
      const dist = ramp.position.distanceTo(s.position);
      if (dist < ramp.size.z * 0.6) {
        const localX = Math.abs(s.position.x - ramp.position.x);
        if (localX < ramp.size.x * 0.5) {
          // Launch off ramp
          if (ramp.type === 'ramp' && forwardSpeed > 10) {
            s.velocity.y = Math.max(s.velocity.y, 8.5 * (ramp.boost || 1.2));
            s.isAirborne = true;
          } else if (ramp.type === 'loop' && forwardSpeed > 25) {
            // Speed boost for 360 loop
            s.velocity.y = Math.max(s.velocity.y, 14);
            s.velocity.addScaledVector(_forward, 8);
            s.isAirborne = true;
          }
        }
      }
    });

    // 7. VERTICAL AIR PHYSICS & GRAVITY
    const gravity = -22;
    if (s.position.y > groundHeight + 0.05 || s.velocity.y > 0.1) {
      // In air
      if (!s.isAirborne) {
        s.isAirborne = true;
        s.airTime = 0;
        s.jumpStartPos.copy(s.position);
      }
      s.airTime += dt;
      s.velocity.y += gravity * dt;
      // Slight aerodynamic stabilizing pitch in air
      s.rotation.x = THREE.MathUtils.damp(s.rotation.x, 0, 2, dt);
      s.rotation.z = THREE.MathUtils.damp(s.rotation.z, 0, 2, dt);
    } else {
      // Grounded
      if (s.isAirborne) {
        // Touchdown landing!
        s.isAirborne = false;
        s.jumpDistance = Math.round(s.jumpStartPos.distanceTo(s.position));
        if (s.airTime > 0.8 && s.jumpDistance > 15) {
          const stuntScore = Math.round(s.airTime * 200 + s.jumpDistance * 15);
          s.stuntBonusMessage = `STUNT JUMP! Air: ${s.airTime.toFixed(1)}s • ${s.jumpDistance}m • +${stuntScore} PTS`;
          s.driftScore += stuntScore;
          soundEngine.playChime(true);
        }
        soundEngine.playImpact(Math.min(1.5, Math.abs(s.velocity.y) * 0.15));
      }
      s.position.y = groundHeight;
      s.velocity.y = 0;
    }

    // 8. NATURAL AERODYNAMIC DRAG & ROLLING RESISTANCE
    const dragCoeff = 0.00065;
    const rollResistance = 0.08;
    const currentSpeed = s.velocity.length();
    if (currentSpeed > 0.01) {
      const dragForce = (currentSpeed * currentSpeed * dragCoeff + rollResistance) * dt;
      s.velocity.multiplyScalar(Math.max(0, 1 - dragForce));
    }

    // 9. POSITION INTEGRATION
    s.position.addScaledVector(s.velocity, dt);

    // 10. COLLISION DETECTION WITH OBSTACLES (Buildings, Rocks, Structures)
    const carRadius = 1.6;
    for (const obs of this.obstacles) {
      if (
        s.position.x > obs.minX - carRadius &&
        s.position.x < obs.maxX + carRadius &&
        s.position.z > obs.minZ - carRadius &&
        s.position.z < obs.maxZ + carRadius &&
        s.position.y < obs.height
      ) {
        // Collision happened! Rebound car out of obstacle
        const pushLeft = Math.abs(s.position.x - (obs.minX - carRadius));
        const pushRight = Math.abs(s.position.x - (obs.maxX + carRadius));
        const pushTop = Math.abs(s.position.z - (obs.minZ - carRadius));
        const pushBottom = Math.abs(s.position.z - (obs.maxZ + carRadius));
        const minPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);

        if (minPush === pushLeft) s.position.x = obs.minX - carRadius;
        else if (minPush === pushRight) s.position.x = obs.maxX + carRadius;
        else if (minPush === pushTop) s.position.z = obs.minZ - carRadius;
        else s.position.z = obs.maxZ + carRadius;

        // Bounce response
        soundEngine.playImpact(Math.min(1.5, currentSpeed * 0.08));
        s.velocity.multiplyScalar(-0.4); // Restitution rebound
        s.driftMultiplier = 1; // Crash resets drift combo
        break;
      }
    }

    // 11. WORLD BOUNDARY PERIMETER BARRIER (-380m to 380m)
    const worldLimit = 380;
    if (Math.abs(s.position.x) > worldLimit) {
      s.position.x = Math.sign(s.position.x) * worldLimit;
      s.velocity.x *= -0.3;
    }
    if (Math.abs(s.position.z) > worldLimit) {
      s.position.z = Math.sign(s.position.z) * worldLimit;
      s.velocity.z *= -0.3;
    }

    // 12. GEAR & RPM CALCULATION
    if (forwardSpeed < -0.5) {
      s.gear = -1; // Reverse
      s.rpm = Math.min(1.0, Math.abs(forwardSpeed) / reverseMaxMs);
    } else {
      const speedRatios = [0, 45, 95, 150, 210, 275, 360];
      let g = 1;
      for (let i = 1; i < speedRatios.length; i++) {
        if (s.speedKmh >= speedRatios[i - 1]) g = i;
      }
      s.gear = g;
      const lower = speedRatios[g - 1];
      const upper = speedRatios[g] || 380;
      s.rpm = Math.max(0.15, Math.min(1.0, (s.speedKmh - lower) / (upper - lower)));
    }

    // 13. SUSPENSION PITCH & ROLL
    // Pitch forward on braking, back on acceleration
    const accelPitch = controls.forward ? -0.04 : controls.backward ? 0.06 : 0;
    s.suspensionPitch = THREE.MathUtils.damp(s.suspensionPitch, accelPitch, 8, dt);

    // Roll into turns
    const turnRoll = -s.steerAngle * (speed / 30) * 0.08;
    s.suspensionRoll = THREE.MathUtils.damp(s.suspensionRoll, turnRoll, 8, dt);

    // 14. WHEEL SPIN ROTATION
    s.wheelRotation += (forwardSpeed / 0.35) * dt;

    // 15. AUDIO ENGINE UPDATE
    soundEngine.updateEngine(s.rpm, controls.forward || controls.backward, s.gear);
    soundEngine.updateSkid(s.tireSkidIntensity);
    soundEngine.updateNitro(s.isBoosting);

    return s;
  }
}
