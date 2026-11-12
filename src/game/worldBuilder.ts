import * as THREE from 'three';
import { TextureFactory } from './proceduralTextures';
import { CollectibleItem, SpeedTrapRecord, GameMission } from '../types/game';

export interface WorldObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface StuntRamp {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  size: THREE.Vector3;
  type: 'ramp' | 'loop' | 'corkscrew';
  boost?: number;
}

export interface BuiltWorld {
  root: THREE.Group;
  obstacles: WorldObstacle[];
  collectibles: CollectibleItem[];
  speedTraps: SpeedTrapRecord[];
  missions: GameMission[];
  stuntRamps: StuntRamp[];
  skyMesh: THREE.Mesh;
  oceanMesh: THREE.Mesh;
  streetLights: THREE.PointLight[];
  lampMeshInstances: THREE.InstancedMesh;
  treeInstances: THREE.InstancedMesh;
  collectibleMeshes: THREE.Group[];
  update: (delta: number, time: number) => void;
}

export class WorldBuilder {
  public static buildWorld(renderer: THREE.WebGLRenderer): BuiltWorld {
    TextureFactory.init(renderer);
    const root = new THREE.Group();
    const obstacles: WorldObstacle[] = [];
    const streetLights: THREE.PointLight[] = [];
    const stuntRamps: StuntRamp[] = [];

    // ----------------------------------------------------
    // 1. SKY DOME & HORIZON FOG
    // ----------------------------------------------------
    const skyGeo = new THREE.SphereGeometry(900, 32, 24);
    skyGeo.scale(-1, 1, 1);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    root.add(skyMesh);

    // ----------------------------------------------------
    // 2. EXTENDED TERRAIN GROUND (No floating void)
    // ----------------------------------------------------
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d7042,
      roughness: 0.9,
      metalness: 0.05,
      map: TextureFactory.createTerrainTexture(),
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    root.add(groundMesh);

    // ----------------------------------------------------
    // 3. OCEAN WATER (Eastern Coast)
    // ----------------------------------------------------
    const oceanGeo = new THREE.PlaneGeometry(800, 1600);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x007799,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.35,
      transparent: true,
      opacity: 0.88,
      map: TextureFactory.createOceanTexture(),
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.set(580, -0.4, 0);
    root.add(oceanMesh);

    // Sandy beach shoreline strip between highway and ocean
    const beachGeo = new THREE.PlaneGeometry(80, 1600);
    beachGeo.rotateX(-Math.PI / 2);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xe0cda9,
      roughness: 0.95,
      metalness: 0.0,
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.position.set(200, 0.02, 0);
    beachMesh.receiveShadow = true;
    root.add(beachMesh);

    // ----------------------------------------------------
    // 4. ROAD NETWORK (Asphalt Highways & City Grid)
    // ----------------------------------------------------
    const roadTexture = TextureFactory.createRoadTexture(false);
    const runwayTexture = TextureFactory.createRoadTexture(true);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.85,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const runwayMat = new THREE.MeshStandardMaterial({
      map: runwayTexture,
      roughness: 0.8,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Helper to spawn road segment
    const spawnRoad = (x: number, z: number, width: number, length: number, rotY = 0, mat = roadMat) => {
      const roadGeo = new THREE.PlaneGeometry(width, length);
      roadGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(roadGeo, mat);
      road.position.set(x, 0.05, z);
      road.rotation.y = rotY;
      road.receiveShadow = true;
      root.add(road);
    };

    // A. Coastal Highway (North-South scenic drive)
    spawnRoad(150, 0, 24, 750, 0);

    // B. Main Grand Cross Arterial (East-West Boulevard connecting Beach to Downtown)
    spawnRoad(0, 0, 26, 750, Math.PI / 2);

    // C. Downtown Ring Boulevard
    spawnRoad(-160, -160, 22, 280, 0); // West Ave
    spawnRoad(-40, -160, 22, 280, 0); // Center Ave
    spawnRoad(-280, -160, 22, 280, 0); // Outer West Ave
    spawnRoad(-160, -280, 22, 280, Math.PI / 2); // North St
    spawnRoad(-160, -40, 22, 280, Math.PI / 2); // South St

    // D. Airport 500m Drag Strip
    spawnRoad(20, -160, 36, 500, 0, runwayMat);

    // E. Mountain Pass to Stunt Valley
    spawnRoad(-180, 160, 20, 360, 0);
    spawnRoad(-80, 240, 20, 240, Math.PI / 4);

    // ----------------------------------------------------
    // 5. DOWNTOWN SKYSCRAPERS & BUILDINGS (Composite 3-8 parts)
    // ----------------------------------------------------
    const buildingColors = [190, 215, 235, 45, 275]; // HSL hues
    const buildingCoords: { x: number; z: number; w: number; d: number; h: number }[] = [];

    // Generate 4x4 city blocks in Downtown (-260 to -60, -260 to -60)
    for (let bx = -250; bx <= -70; bx += 60) {
      for (let bz = -250; bz <= -70; bz += 60) {
        // Skip street intersections
        if (Math.abs(bx - -160) < 18 || Math.abs(bz - -160) < 18) continue;

        const w = 32 + Math.random() * 8;
        const d = 32 + Math.random() * 8;
        const h = 45 + Math.random() * 65; // High-rise towers 45m - 110m
        buildingCoords.push({ x: bx, z: bz, w, d, h });
      }
    }

    buildingCoords.forEach((b, index) => {
      const bldgGroup = new THREE.Group();
      bldgGroup.position.set(b.x, 0, b.z);

      const facadeTex = TextureFactory.createBuildingTexture(buildingColors[index % buildingColors.length], 0.65);
      const bldgMat = new THREE.MeshStandardMaterial({
        map: facadeTex,
        roughness: 0.35,
        metalness: 0.7,
      });

      // Part 1: Main Tower
      const towerGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const tower = new THREE.Mesh(towerGeo, bldgMat);
      tower.position.y = b.h * 0.5;
      tower.castShadow = true;
      tower.receiveShadow = true;
      bldgGroup.add(tower);

      // Part 2: Architectural Crown / Roof Stepping
      const crownH = b.h * 0.15;
      const crownGeo = new THREE.BoxGeometry(b.w * 0.75, crownH, b.d * 0.75);
      const crown = new THREE.Mesh(crownGeo, bldgMat);
      crown.position.y = b.h + crownH * 0.5;
      bldgGroup.add(crown);

      // Part 3: Spire / Antenna or Helipad
      if (index % 3 === 0) {
        const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 16, 8);
        const spireMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.2 });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = b.h + crownH + 8;
        bldgGroup.add(spire);

        // Warning beacon on top
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0044 })
        );
        beacon.position.y = b.h + crownH + 16;
        bldgGroup.add(beacon);
      } else {
        // Helipad platform
        const heliGeo = new THREE.CylinderGeometry(b.w * 0.3, b.w * 0.3, 0.4, 16);
        const heliMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.8 });
        const helipad = new THREE.Mesh(heliGeo, heliMat);
        helipad.position.y = b.h + crownH + 0.2;
        bldgGroup.add(helipad);
      }

      // Part 4: Ground Floor Canopy & Neon Entrance
      const canopyGeo = new THREE.BoxGeometry(b.w * 0.4, 0.4, 4);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 4.5, b.d * 0.5 + 2);
      bldgGroup.add(canopy);

      root.add(bldgGroup);

      // Add to collision obstacle list
      obstacles.push({
        minX: b.x - b.w * 0.55,
        maxX: b.x + b.w * 0.55,
        minZ: b.z - b.d * 0.55,
        maxZ: b.z + b.d * 0.55,
        height: b.h + 20,
      });
    });

    // ----------------------------------------------------
    // 6. STUNT VALLEY: MEGA RAMP, 360 LOOP & SPIRAL CORKSCREW
    // ----------------------------------------------------
    const stuntTex = TextureFactory.createStuntTexture();
    const stuntMat = new THREE.MeshStandardMaterial({
      map: stuntTex,
      roughness: 0.4,
      metalness: 0.5,
    });

    // A. Giant 360-degree Stunt Loop
    const loopRadius = 14;
    const loopTube = 4.5;
    const loopGeo = new THREE.TorusGeometry(loopRadius, loopTube, 16, 32, Math.PI * 1.85);
    loopGeo.rotateY(Math.PI / 2);
    const loopMesh = new THREE.Mesh(loopGeo, stuntMat);
    loopMesh.position.set(-200, loopRadius + 1, 240);
    loopMesh.castShadow = true;
    root.add(loopMesh);

    // Stunt Loop Entrance & Exit Ramps
    const rampEntranceGeo = new THREE.BoxGeometry(10, 1, 26);
    rampEntranceGeo.rotateX(0.24);
    const rampEntrance = new THREE.Mesh(rampEntranceGeo, stuntMat);
    rampEntrance.position.set(-200, 3.2, 218);
    root.add(rampEntrance);

    stuntRamps.push({
      position: new THREE.Vector3(-200, 3.2, 218),
      rotation: new THREE.Euler(0.24, 0, 0),
      size: new THREE.Vector3(10, 5, 26),
      type: 'loop',
      boost: 1.4,
    });

    // B. Mega Canyon Jump Ramp
    const megaRampGeo = new THREE.BoxGeometry(14, 2, 32);
    megaRampGeo.rotateX(-0.35);
    const megaRamp = new THREE.Mesh(megaRampGeo, stuntMat);
    megaRamp.position.set(-90, 5.5, 120);
    megaRamp.castShadow = true;
    root.add(megaRamp);

    stuntRamps.push({
      position: new THREE.Vector3(-90, 5.5, 120),
      rotation: new THREE.Euler(-0.35, 0, 0),
      size: new THREE.Vector3(14, 8, 32),
      type: 'ramp',
      boost: 1.5,
    });

    // Mega Ramp Target Landing Ramp across canyon
    const landingRampGeo = new THREE.BoxGeometry(16, 2, 30);
    landingRampGeo.rotateX(0.28);
    const landingRamp = new THREE.Mesh(landingRampGeo, stuntMat);
    landingRamp.position.set(-90, 4.5, 195);
    root.add(landingRamp);

    // C. Elevated Sky Spiral Corkscrew
    const corkscrewGroup = new THREE.Group();
    corkscrewGroup.position.set(-280, 0, 160);
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * Math.PI * 2;
      const stepH = step * 1.5;
      const stepPlat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 14), stuntMat);
      stepPlat.position.set(Math.cos(angle) * 22, stepH + 2, Math.sin(angle) * 22);
      stepPlat.rotation.y = -angle;
      corkscrewGroup.add(stepPlat);
    }
    root.add(corkscrewGroup);

    // ----------------------------------------------------
    // 7. AIRPORT HANGAR & SPEED RADAR GANTRY
    // ----------------------------------------------------
    // Hangar at Airport
    const hangarGeo = new THREE.CylinderGeometry(24, 24, 60, 16, 1, false, 0, Math.PI);
    hangarGeo.rotateZ(Math.PI / 2);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x3f4654,
      roughness: 0.6,
      metalness: 0.6,
    });
    const hangar = new THREE.Mesh(hangarGeo, hangarMat);
    hangar.position.set(-45, 0, -360);
    hangar.castShadow = true;
    root.add(hangar);

    obstacles.push({
      minX: -45 - 32,
      maxX: -45 + 32,
      minZ: -360 - 15,
      maxZ: -360 + 15,
      height: 25,
    });

    // ----------------------------------------------------
    // 8. NATURAL PERIMETER: ROCK CLIFFS & PINE TREES (InstancedMesh)
    // ----------------------------------------------------
    // Mountain Rock Outcrops on Western Edge
    const rockGeo = new THREE.DodecahedronGeometry(20, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a544b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const rockPositions = [
      [-360, 10, -200],
      [-370, 14, -100],
      [-350, 12, 0],
      [-380, 18, 120],
      [-360, 16, 260],
      [-200, 14, 370],
      [-100, 18, 380],
      [0, 15, 370],
    ];

    rockPositions.forEach(([rx, ry, rz]) => {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rx, ry, rz);
      rock.scale.set(1.5 + Math.random(), 1.8 + Math.random(), 1.5 + Math.random());
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      root.add(rock);

      obstacles.push({
        minX: rx - 25,
        maxX: rx + 25,
        minZ: rz - 25,
        maxZ: rz + 25,
        height: 35,
      });
    });

    // Instanced Trees (120 Trees: Pine and Palm Trees)
    const treeCount = 120;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const foliageGeo = new THREE.ConeGeometry(2.5, 6, 6);
    const mergedTreeGeo = new THREE.BufferGeometry();

    // Create instanced mesh for trees
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x24542d,
      roughness: 0.8,
      metalness: 0.1,
    });
    const treeInstances = new THREE.InstancedMesh(foliageGeo, treeMat, treeCount);
    treeInstances.castShadow = true;

    const dummy = new THREE.Object3D();
    let treeIdx = 0;

    // Line the scenic boulevard and park
    for (let i = 0; i < treeCount; i++) {
      let tx: number;
      let tz: number;

      if (i < 50) {
        // Along Coastal Highway & Beach
        tx = 175 + (Math.random() - 0.5) * 20;
        tz = -320 + (i / 50) * 640;
      } else if (i < 80) {
        // Downtown Central Park
        tx = -160 + (Math.random() - 0.5) * 45;
        tz = 0 + (Math.random() - 0.5) * 45;
      } else {
        // Stunt Valley periphery
        tx = -140 + (Math.random() - 0.5) * 80;
        tz = 180 + Math.random() * 140;
      }

      dummy.position.set(tx, 3.5, tz);
      const scale = 0.8 + Math.random() * 0.5;
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      treeInstances.setMatrixAt(treeIdx++, dummy.matrix);
    }
    treeInstances.computeBoundingSphere();
    root.add(treeInstances);

    // ----------------------------------------------------
    // 9. STREET LAMPS WITH LIGHT BULBS & GLOW (InstancedMesh)
    // ----------------------------------------------------
    const lampCount = 60;
    const lampPostGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 6);
    const lampArmGeo = new THREE.BoxGeometry(1.8, 0.15, 0.15);
    const lampInstances = new THREE.InstancedMesh(
      lampPostGeo,
      new THREE.MeshStandardMaterial({ color: 0x2b2f38, metalness: 0.8, roughness: 0.2 }),
      lampCount
    );

    let lampIdx = 0;
    for (let z = -320; z <= 320; z += 35) {
      // Along Coastal Highway
      dummy.position.set(136, 3.25, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lampInstances.setMatrixAt(lampIdx++, dummy.matrix);

      // Night light source at key intervals
      if (lampIdx % 4 === 0) {
        const light = new THREE.PointLight(0xffdf9e, 1.8, 28);
        light.position.set(136, 6.2, z);
        streetLights.push(light);
        root.add(light);
      }
    }

    lampInstances.computeBoundingSphere();
    root.add(lampInstances);

    // ----------------------------------------------------
    // 10. SPEED TRAPS (Radar Flash Units)
    // ----------------------------------------------------
    const speedTraps: SpeedTrapRecord[] = [
      { id: 'trap_runway', name: 'Runway Speed Trap', x: 20, z: -50, speedRecord: 0 },
      { id: 'trap_coastal', name: 'Coastal Sprint Trap', x: 150, z: 0, speedRecord: 0 },
      { id: 'trap_downtown', name: 'Downtown Express Trap', x: -160, z: -160, speedRecord: 0 },
    ];

    speedTraps.forEach((trap) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(trap.x, 0, trap.z);

      // Overhead arch gantry
      const archMat = new THREE.MeshStandardMaterial({ color: 0xf5b041, metalness: 0.7, roughness: 0.3 });
      const archPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 8), archMat);
      archPostL.position.set(-14, 4, 0);
      const archPostR = archPostL.clone();
      archPostR.position.x = 14;

      const archCross = new THREE.Mesh(new THREE.BoxGeometry(28, 0.8, 0.8), archMat);
      archCross.position.set(0, 8, 0);

      // Radar camera box
      const camBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
      );
      camBox.position.set(0, 7.2, 0);

      // Flash lens
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
      );
      lens.position.set(0, 7.2, 0.6);

      gantryGroup.add(archPostL, archPostR, archCross, camBox, lens);
      root.add(gantryGroup);
    });

    // ----------------------------------------------------
    // 11. COLLECTIBLES (Golden Trophies & Turbo Refills)
    // ----------------------------------------------------
    const collectibles: CollectibleItem[] = [
      // Downtown alley
      { id: 'c1', x: -160, z: -220, y: 1.2, collected: false, points: 250, type: 'trophy' },
      { id: 'c2', x: -220, z: -160, y: 1.2, collected: false, points: 250, type: 'trophy' },
      { id: 'c3', x: -100, z: -100, y: 1.2, collected: false, points: 250, type: 'trophy' },
      // Stunt Mega Ramp Apex (in mid-air!)
      { id: 'c4', x: -90, z: 155, y: 8.5, collected: false, points: 1000, type: 'trophy' },
      // Inside 360 Loop
      { id: 'c5', x: -200, z: 240, y: 14.0, collected: false, points: 1500, type: 'trophy' },
      // Top of corkscrew
      { id: 'c6', x: -280, z: 160, y: 26.0, collected: false, points: 2000, type: 'trophy' },
      // Beachfront Boardwalk
      { id: 'c7', x: 195, z: -180, y: 1.2, collected: false, points: 250, type: 'trophy' },
      { id: 'c8', x: 195, z: 120, y: 1.2, collected: false, points: 250, type: 'trophy' },
      // Airport Runway end
      { id: 'c9', x: 20, z: -380, y: 1.2, collected: false, points: 500, type: 'nitro_refill' },
      // Central Park
      { id: 'c10', x: -160, z: 0, y: 1.2, collected: false, points: 250, type: 'wrench' },
      // Coastal Cliff
      { id: 'c11', x: 220, z: 320, y: 1.5, collected: false, points: 500, type: 'trophy' },
      // Hangar Secret
      { id: 'c12', x: -45, z: -360, y: 1.5, collected: false, points: 750, type: 'trophy' },
    ];

    const collectibleMeshes: THREE.Group[] = [];
    const trophyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 1.0,
      emissive: 0x997a00,
      emissiveIntensity: 0.4,
    });

    collectibles.forEach((item) => {
      const group = new THREE.Group();
      group.position.set(item.x, item.y, item.z);

      // Rotating Star / Trophy shape
      const trophyGeo = new THREE.OctahedronGeometry(0.8, 0);
      const mesh = new THREE.Mesh(trophyGeo, trophyMat);
      group.add(mesh);

      // Floating ring halo
      const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      root.add(group);
      collectibleMeshes.push(group);
    });

    // ----------------------------------------------------
    // 12. GAME MISSIONS & TIME TRIALS
    // ----------------------------------------------------
    const missions: GameMission[] = [
      {
        id: 'circuit_downtown',
        title: 'Neon Downtown Circuit',
        description: 'Complete the high-speed four-corner downtown loop in under 45 seconds!',
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
        description: 'Score 5,000 drift points through the winding mountain hairpins!',
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
        description: 'Floor it down the runway! Hit 250+ km/h and reach the finish in record time.',
        targetType: 'speed_run',
        targetValue: 250,
        checkpoints: [
          { x: 20, z: 80, radius: 18 },
          { x: 20, z: -100, radius: 18 },
          { x: 20, z: -350, radius: 18 },
        ],
      },
    ];

    // Animation update function for world (water ripples, spinning collectibles)
    const update = (delta: number, time: number) => {
      // Gentle ocean ripple
      if (oceanMesh.material instanceof THREE.Material && 'map' in oceanMesh.material) {
        const tex = (oceanMesh.material as THREE.MeshStandardMaterial).map;
        if (tex) {
          tex.offset.x = (time * 0.03) % 1;
          tex.offset.y = (time * 0.02) % 1;
        }
      }

      // Rotate collectibles
      collectibleMeshes.forEach((mesh, idx) => {
        if (!collectibles[idx].collected) {
          mesh.rotation.y += delta * 1.8;
          mesh.position.y = collectibles[idx].y + Math.sin(time * 3 + idx) * 0.25;
        } else {
          mesh.visible = false;
        }
      });
    };

    return {
      root,
      obstacles,
      collectibles,
      speedTraps,
      missions,
      stuntRamps,
      skyMesh,
      oceanMesh,
      streetLights,
      lampMeshInstances: lampInstances,
      treeInstances,
      collectibleMeshes,
      update,
    };
  }
}
