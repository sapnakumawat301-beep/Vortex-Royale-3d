import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  VehicleId,
  TimeOfDay,
  CameraViewMode,
  CarCustomization,
  ControlState,
  GameMission,
} from '../types/game';
import { VehicleBuilder, CarVisualModel, VEHICLE_CONFIGS } from './vehicleBuilder';
import { WorldBuilder, BuiltWorld } from './worldBuilder';
import { CarPhysics, PhysicsState } from './carPhysics';
import { soundEngine } from '../audio/soundEngine';

// Pre-allocated vectors for camera and rendering without garbage collection (Skill Directive 4.3)
const _camTarget = new THREE.Vector3();
const _camDesiredPos = new THREE.Vector3();
const _carForward = new THREE.Vector3();

export interface GameEngineCallbacks {
  onPhysicsUpdate: (state: PhysicsState) => void;
  onSpeedTrapFlash: (trapName: string, speedKmh: number) => void;
  onMissionProgress: (mission: GameMission, checkpointIdx: number, isComplete: boolean, timeSeconds: number) => void;
  onCollectibleGrab: (points: number, type: string) => void;
}

export class GameEngine {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private animFrameId: number = 0;
  private clock: THREE.Clock;

  // Lighting & Environment
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private currentTimeOfDay: TimeOfDay = 'day';

  // Game World & Entities
  private world: BuiltWorld;
  private physics: CarPhysics;
  private carModel: CarVisualModel;
  private currentVehicleId: VehicleId = 'hypercar';
  private customization: CarCustomization;

  // Controls & State
  public controls: ControlState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    boost: false,
    reset: false,
    lightsToggle: false,
  };

  private cameraMode: CameraViewMode = 'chase';
  private callbacks: GameEngineCallbacks;

  // Particle systems (Tire smoke)
  private smokeParticles: THREE.Points;
  private smokeGeo: THREE.BufferGeometry;
  private smokePositions: Float32Array;
  private smokeAlphas: Float32Array;
  private smokeIndex: number = 0;
  private readonly maxSmoke: number = 200;

  // Active Mission tracking
  private activeMission: GameMission | null = null;
  private activeCheckpointIdx: number = 0;
  private missionStartTime: number = 0;
  private checkpointMarker: THREE.Group | null = null;

  constructor(
    container: HTMLDivElement,
    initialVehicle: VehicleId,
    initialCustomization: CarCustomization,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.currentVehicleId = initialVehicle;
    this.customization = initialCustomization;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // 1. Detect Software WebGL (Skill Directive 2.1)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1400);
    this.camera.position.set(0, 3, -7);

    // 4. Studio Environment Reflection via RoomEnvironment (Skill Directive 2.2)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Rig (Warm Key + Cool Fill + Horizon Fog)
    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    this.dirLight.position.set(120, 200, 100);
    this.dirLight.castShadow = !this.isSoftwareGl;
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 400;
      const d = 160;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0xd9e8f5, 0x3d7042, 0.85);
    this.scene.add(this.hemiLight);

    // Initial fog matching sky
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0016);

    // 6. Build World & Roads
    this.world = WorldBuilder.buildWorld(this.renderer);
    this.scene.add(this.world.root);

    // 7. Build Car & Physics
    const config = VEHICLE_CONFIGS[initialVehicle];
    this.physics = new CarPhysics(config, this.world.obstacles, this.world.stuntRamps);
    this.carModel = VehicleBuilder.buildVehicle(initialVehicle, initialCustomization);
    this.scene.add(this.carModel.root);

    // 8. Tire Smoke Particle System
    this.smokePositions = new Float32Array(this.maxSmoke * 3);
    this.smokeAlphas = new Float32Array(this.maxSmoke);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(this.smokeAlphas, 1));

    const smokeMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.smokeParticles = new THREE.Points(this.smokeGeo, smokeMat);
    this.scene.add(this.smokeParticles);

    // Setup Mission Checkpoint Ring
    this.setupCheckpointMarker();

    // Set Initial Time of Day
    this.setTimeOfDay('day');

    // Pre-warm shaders (Directive 4.1)
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind event handlers
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.startLoop();
  }

  private onResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setVehicle(vehicleId: VehicleId) {
    if (this.currentVehicleId === vehicleId) return;
    this.currentVehicleId = vehicleId;
    this.scene.remove(this.carModel.root);

    this.carModel = VehicleBuilder.buildVehicle(vehicleId, this.customization);
    this.scene.add(this.carModel.root);

    const config = VEHICLE_CONFIGS[vehicleId];
    this.physics.setConfig(config);
  }

  public setCustomization(customization: CarCustomization) {
    this.customization = customization;
    this.scene.remove(this.carModel.root);
    this.carModel = VehicleBuilder.buildVehicle(this.currentVehicleId, customization);
    this.scene.add(this.carModel.root);
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.currentTimeOfDay = time;
    const isNight = time === 'night';

    if (time === 'day') {
      this.dirLight.color.setHex(0xfff5e6);
      this.dirLight.intensity = 2.5;
      this.dirLight.position.set(120, 200, 100);
      this.hemiLight.color.setHex(0xd9e8f5);
      this.hemiLight.groundColor.setHex(0x3d7042);
      this.hemiLight.intensity = 0.9;
      this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0016);
      (this.world.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x87ceeb);
    } else if (time === 'sunset') {
      this.dirLight.color.setHex(0xff7733);
      this.dirLight.intensity = 2.8;
      this.dirLight.position.set(-200, 60, -100);
      this.hemiLight.color.setHex(0xffaa77);
      this.hemiLight.groundColor.setHex(0x221133);
      this.hemiLight.intensity = 0.7;
      this.scene.fog = new THREE.FogExp2(0xd66853, 0.002);
      (this.world.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x6b2d5c);
    } else if (time === 'night') {
      this.dirLight.color.setHex(0x223366);
      this.dirLight.intensity = 0.4;
      this.dirLight.position.set(50, 120, -50);
      this.hemiLight.color.setHex(0x1a2639);
      this.hemiLight.groundColor.setHex(0x0a0e17);
      this.hemiLight.intensity = 0.35;
      this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.0028);
      (this.world.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x060911);
    } else {
      // Foggy Dawn
      this.dirLight.color.setHex(0xeee4d8);
      this.dirLight.intensity = 1.2;
      this.dirLight.position.set(0, 100, 100);
      this.hemiLight.color.setHex(0xcfd8dc);
      this.hemiLight.groundColor.setHex(0x37474f);
      this.hemiLight.intensity = 0.6;
      this.scene.fog = new THREE.FogExp2(0xb0bec5, 0.006);
      (this.world.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x90a4ae);
    }

    // Toggle Streetlights and Car Headlights at night
    this.world.streetLights.forEach((light) => {
      light.intensity = isNight ? 2.5 : 0.0;
    });

    this.carModel.headlightLightLeft.intensity = isNight ? 5.0 : 0.5;
    this.carModel.headlightLightRight.intensity = isNight ? 5.0 : 0.5;
  }

  public startMission(mission: GameMission) {
    this.activeMission = mission;
    this.activeCheckpointIdx = 0;
    this.missionStartTime = this.clock.getElapsedTime();
    this.updateCheckpointMarkerPosition();
  }

  public cancelMission() {
    this.activeMission = null;
    if (this.checkpointMarker) this.checkpointMarker.visible = false;
  }

  private setupCheckpointMarker() {
    this.checkpointMarker = new THREE.Group();

    // Glowing Neon Checkpoint Ring
    const ringGeo = new THREE.TorusGeometry(8, 0.5, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    // Vertical neon light beacon
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, 50, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.5,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 25;

    this.checkpointMarker.add(ring, beam);
    this.checkpointMarker.visible = false;
    this.scene.add(this.checkpointMarker);
  }

  private updateCheckpointMarkerPosition() {
    if (!this.activeMission || !this.checkpointMarker) return;
    const cp = this.activeMission.checkpoints[this.activeCheckpointIdx];
    if (cp) {
      this.checkpointMarker.position.set(cp.x, 0.5, cp.z);
      this.checkpointMarker.visible = true;
    }
  }

  public resetCar() {
    this.physics.reset(0, 0, 0);
  }

  /**
   * Continuous animation loop with Software WebGL guard (Skill Directive 2.3)
   */
  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.animFrameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.animFrameId = window.setTimeout(cb, 60);
        }
      };
      this.animFrameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // 1. Step Car Physics
      const pState = this.physics.update(delta, this.controls);

      // 2. Synchronize 3D Car Visual Model
      this.carModel.root.position.copy(pState.position);
      this.carModel.root.rotation.set(
        pState.rotation.x + pState.suspensionPitch,
        pState.rotation.y,
        pState.rotation.z + pState.suspensionRoll,
        'YXZ'
      );

      // Steer front wheels
      this.carModel.flWheelGroup.rotation.y = pState.steerAngle;
      this.carModel.frWheelGroup.rotation.y = pState.steerAngle;

      // Spin tires
      this.carModel.flTire.rotation.x = pState.wheelRotation;
      this.carModel.frTire.rotation.x = pState.wheelRotation;
      this.carModel.rlTire.rotation.x = pState.wheelRotation;
      this.carModel.rrTire.rotation.x = pState.wheelRotation;

      // Taillight brightness when braking/reversing
      const isBraking = this.controls.backward || this.controls.handbrake;
      this.carModel.taillightMaterial.emissiveIntensity = isBraking ? 3.5 : 1.0;

      // Nitro flame visibility
      this.carModel.exhaustFlames.forEach((flame) => {
        flame.visible = pState.isBoosting;
        if (pState.isBoosting) {
          flame.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.5, 1);
        }
      });

      // 3. Emit Tire Smoke Particles on Drifting / Burnout
      if (pState.tireSkidIntensity > 0.3) {
        const emitX = pState.position.x + (Math.random() - 0.5) * 1.4;
        const emitZ = pState.position.z + (Math.random() - 0.5) * 1.4;
        const idx3 = this.smokeIndex * 3;
        this.smokePositions[idx3] = emitX;
        this.smokePositions[idx3 + 1] = 0.3 + Math.random() * 0.4;
        this.smokePositions[idx3 + 2] = emitZ;
        this.smokeAlphas[this.smokeIndex] = 1.0;
        this.smokeIndex = (this.smokeIndex + 1) % this.maxSmoke;
      }

      // Age smoke particles
      const posAttr = this.smokeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.maxSmoke; i++) {
        if (this.smokeAlphas[i] > 0) {
          this.smokeAlphas[i] -= delta * 1.2;
          this.smokePositions[i * 3 + 1] += delta * 1.4; // Rise upward
        }
      }
      posAttr.needsUpdate = true;

      // 4. Update Camera
      this.updateCamera(delta, pState);

      // 5. Update World Objects (Water animation, Collectible rotation)
      this.world.update(delta, time);

      // 6. Speed Trap Detection
      for (const trap of this.world.speedTraps) {
        const dist = Math.hypot(pState.position.x - trap.x, pState.position.z - trap.z);
        if (dist < 14 && pState.speedKmh > 80) {
          if (pState.speedKmh > trap.speedRecord) {
            trap.speedRecord = pState.speedKmh;
            this.callbacks.onSpeedTrapFlash(trap.name, pState.speedKmh);
            soundEngine.playChime(true);
          }
        }
      }

      // 7. Collectibles Detection
      this.world.collectibles.forEach((item) => {
        if (!item.collected) {
          const dist = Math.hypot(pState.position.x - item.x, pState.position.z - item.z);
          if (dist < 3.2 && Math.abs(pState.position.y - item.y) < 3.0) {
            item.collected = true;
            pState.driftScore += item.points;
            if (item.type === 'nitro_refill') {
              pState.nitroAmount = 100;
            }
            this.callbacks.onCollectibleGrab(item.points, item.type);
            soundEngine.playChime(false);
          }
        }
      });

      // 8. Mission Checkpoints Progress
      if (this.activeMission) {
        const cp = this.activeMission.checkpoints[this.activeCheckpointIdx];
        if (cp) {
          const dist = Math.hypot(pState.position.x - cp.x, pState.position.z - cp.z);
          if (dist < cp.radius) {
            this.activeCheckpointIdx++;
            soundEngine.playChime(false);

            const isComplete = this.activeCheckpointIdx >= this.activeMission.checkpoints.length;
            const elapsed = Math.round((this.clock.getElapsedTime() - this.missionStartTime) * 10) / 10;

            if (isComplete) {
              this.callbacks.onMissionProgress(this.activeMission, this.activeCheckpointIdx, true, elapsed);
              this.cancelMission();
            } else {
              this.callbacks.onMissionProgress(this.activeMission, this.activeCheckpointIdx, false, elapsed);
              this.updateCheckpointMarkerPosition();
            }
          }
        }
      }

      // 9. Send physics telemetry to React HUD
      this.callbacks.onPhysicsUpdate(pState);

      // 10. Render Scene
      this.renderer.render(this.scene, this.camera);

      // Loop scheduling
      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.animFrameId = requestAnimationFrame(tick);
    }
  }

  /**
   * Smooth dynamic camera tracking
   */
  private updateCamera(delta: number, pState: PhysicsState) {
    const yaw = pState.rotation.y;
    _carForward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();

    if (this.cameraMode === 'chase') {
      // Dynamic chase camera: Pulls back further at high speeds
      const speedDistBonus = (pState.speedKmh / 300) * 2.8;
      const followDist = 6.2 + speedDistBonus;
      const camHeight = 2.4 + (pState.speedKmh / 300) * 0.6;

      _camDesiredPos.copy(pState.position).addScaledVector(_carForward, -followDist);
      _camDesiredPos.y += camHeight;

      // Exponential damping for silky smooth motion (Directive 4.2)
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesiredPos.x, 8, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesiredPos.y, 8, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesiredPos.z, 8, delta);

      _camTarget.copy(pState.position);
      _camTarget.y += 1.2;
      this.camera.lookAt(_camTarget);

      // Dynamic FOV warp during nitro boost
      const targetFov = pState.isBoosting ? 74 : 60 + (pState.speedKmh / 300) * 8;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'hood') {
      // First-person hood / bumper view
      _camDesiredPos.copy(pState.position).addScaledVector(_carForward, 0.9);
      _camDesiredPos.y += 0.85;

      this.camera.position.copy(_camDesiredPos);
      _camTarget.copy(pState.position).addScaledVector(_carForward, 20);
      _camTarget.y += 0.85;
      this.camera.lookAt(_camTarget);
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'drone') {
      // High cinematic top-down drone view
      _camDesiredPos.copy(pState.position);
      _camDesiredPos.y += 28;
      _camDesiredPos.z -= 18;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesiredPos.x, 4, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesiredPos.y, 4, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesiredPos.z, 4, delta);

      _camTarget.copy(pState.position);
      this.camera.lookAt(_camTarget);
    }
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      clearTimeout(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
