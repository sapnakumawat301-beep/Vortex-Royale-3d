import * as THREE from 'three';
import { VehicleId, VehicleConfig, CarCustomization } from '../types/game';

export const VEHICLE_CONFIGS: Record<VehicleId, VehicleConfig> = {
  hypercar: {
    id: 'hypercar',
    name: 'Apex GT-900',
    category: 'Hypercar',
    topSpeed: 320,
    acceleration: 96,
    handling: 94,
    driftRating: 88,
    suspensionHeight: 0.32,
    mass: 1250,
    defaultColor: '#e63946', // Racing Red
    description: 'Precision aerodynamic track beast with twin-turbo V10 and active aerodynamics.',
  },
  muscle: {
    id: 'muscle',
    name: 'Renegade V8',
    category: 'Muscle Car',
    topSpeed: 285,
    acceleration: 91,
    handling: 82,
    driftRating: 98,
    suspensionHeight: 0.36,
    mass: 1650,
    defaultColor: '#1d3557', // Midnight Navy
    description: 'Raw American supercharged V8 muscle with massive torque and effortless drift angle.',
  },
  offroad: {
    id: 'offroad',
    name: 'Trophy Raider 4x4',
    category: 'Off-Road Truck',
    topSpeed: 240,
    acceleration: 85,
    handling: 89,
    driftRating: 75,
    suspensionHeight: 0.58,
    mass: 2100,
    defaultColor: '#e07a5f', // Desert Sandstone
    description: 'Heavy-duty lifted suspension with knobby all-terrain tires built for mountain climbs.',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Phantom',
    category: 'Prototype',
    topSpeed: 345,
    acceleration: 99,
    handling: 97,
    driftRating: 92,
    suspensionHeight: 0.30,
    mass: 1180,
    defaultColor: '#00f5d4', // Cyber Turquoise
    description: 'Futuristic ionic propulsion prototype with low drag coefficient and cyber neon accents.',
  },
};

export interface CarVisualModel {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  flWheelGroup: THREE.Group;
  frWheelGroup: THREE.Group;
  rlWheelGroup: THREE.Group;
  rrWheelGroup: THREE.Group;
  flTire: THREE.Mesh;
  frTire: THREE.Mesh;
  rlTire: THREE.Mesh;
  rrTire: THREE.Mesh;
  underglowLight: THREE.PointLight;
  underglowMesh: THREE.Mesh;
  taillightMaterial: THREE.MeshStandardMaterial;
  headlightLightLeft: THREE.SpotLight;
  headlightLightRight: THREE.SpotLight;
  exhaustFlames: THREE.Mesh[];
  spoilerGroup?: THREE.Group;
}

export class VehicleBuilder {
  /**
   * Helper to build a detailed wheel assembly (tire + rim + brake caliper)
   */
  private static createWheel(radius = 0.36, width = 0.28, rimColor = '#e0e0e0', isOffroad = false): { group: THREE.Group; tire: THREE.Mesh } {
    const wheelGroup = new THREE.Group();

    // Tire tread
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, isOffroad ? 16 : 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      roughness: 0.9,
      metalness: 0.1,
    });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim outer lip
    const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: rimColor,
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 0.5,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rim);

    // Rim 5-spoke star
    const spokeCount = isOffroad ? 8 : 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 0.95, radius * 0.65, 0.04);
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(0, (Math.cos(angle) * radius * 0.35), (Math.sin(angle) * radius * 0.35));
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // Brake caliper (red sport accent)
    const caliperGeo = new THREE.BoxGeometry(width * 0.5, radius * 0.35, radius * 0.25);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: '#d90429',
      roughness: 0.3,
      metalness: 0.7,
    });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, radius * 0.32, 0);
    wheelGroup.add(caliper);

    return { group: wheelGroup, tire };
  }

  /**
   * Builds the 3D car model based on vehicle type and customization
   */
  public static buildVehicle(type: VehicleId, customization: CarCustomization): CarVisualModel {
    const root = new THREE.Group();
    const config = VEHICLE_CONFIGS[type];

    // Shared materials
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: customization.bodyColor,
      roughness: customization.finish === 'matte' ? 0.75 : 0.2,
      metalness: customization.finish === 'matte' ? 0.2 : 0.85,
      clearcoat: customization.finish === 'matte' ? 0.0 : 1.0,
      clearcoatRoughness: 0.1,
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: '#151515',
      roughness: 0.65,
      metalness: 0.4,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#101720',
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
      transmission: 0.2,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: '#f0f0f0',
      roughness: 0.1,
      metalness: 0.95,
    });

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#cce6ff',
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: '#ff0033',
      emissive: '#ff0033',
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    let mainBodyMesh: THREE.Mesh;
    let spoilerGroup: THREE.Group | undefined;

    const wheelBase = type === 'offroad' ? 2.6 : 2.5;
    const trackWidth = type === 'offroad' ? 1.75 : 1.6;
    const wheelRadius = type === 'offroad' ? 0.46 : 0.34;
    const wheelWidth = type === 'offroad' ? 0.36 : 0.26;

    // ----------------------------------------------------
    // VEHICLE TYPE 1: HYPERCAR
    // ----------------------------------------------------
    if (type === 'hypercar') {
      // 1. Lower chassis & aerodynamics
      const chassisGeo = new THREE.BoxGeometry(1.65, 0.18, 4.3);
      const chassis = new THREE.Mesh(chassisGeo, carbonMaterial);
      chassis.position.y = 0.18;
      root.add(chassis);

      // Front splitter
      const splitterGeo = new THREE.BoxGeometry(1.72, 0.06, 0.6);
      const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
      splitter.position.set(0, 0.12, 2.15);
      root.add(splitter);

      // 2. Main aerodynamic sculpted body
      const bodyGeo = new THREE.BoxGeometry(1.58, 0.45, 4.1);
      mainBodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      mainBodyMesh.position.y = 0.42;
      mainBodyMesh.castShadow = true;
      root.add(mainBodyMesh);

      // Sloped front hood
      const hoodGeo = new THREE.BoxGeometry(1.5, 0.24, 1.5);
      const hood = new THREE.Mesh(hoodGeo, bodyMaterial);
      hood.position.set(0, 0.48, 1.15);
      hood.rotation.x = -0.12;
      hood.castShadow = true;
      root.add(hood);

      // 3. Cabin & Cockpit Canopy
      const cabinGeo = new THREE.BoxGeometry(1.25, 0.42, 1.8);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 0.8, -0.2);
      cabin.castShadow = true;
      root.add(cabin);

      // Roof strip
      const roofGeo = new THREE.BoxGeometry(1.18, 0.08, 1.4);
      const roof = new THREE.Mesh(roofGeo, bodyMaterial);
      roof.position.set(0, 1.02, -0.2);
      root.add(roof);

      // 4. Rear Diffuser & Quad Exhaust
      const diffuserGeo = new THREE.BoxGeometry(1.5, 0.2, 0.4);
      const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
      diffuser.position.set(0, 0.25, -2.1);
      root.add(diffuser);

      // Exhaust pipes
      [-0.22, -0.08, 0.08, 0.22].forEach((x) => {
        const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.25, 12);
        exhaustGeo.rotateX(Math.PI / 2);
        const exhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
        exhaust.position.set(x, 0.32, -2.15);
        root.add(exhaust);
      });

      // 5. LED Headlights & Taillights
      const hlLeftGeo = new THREE.BoxGeometry(0.35, 0.06, 0.2);
      const hlLeft = new THREE.Mesh(hlLeftGeo, headlightMaterial);
      hlLeft.position.set(-0.55, 0.48, 2.05);
      root.add(hlLeft);

      const hlRight = hlLeft.clone();
      hlRight.position.x = 0.55;
      root.add(hlRight);

      // Continuous rear lightbar
      const tlGeo = new THREE.BoxGeometry(1.4, 0.06, 0.1);
      const tlMesh = new THREE.Mesh(tlGeo, taillightMaterial);
      tlMesh.position.set(0, 0.52, -2.06);
      root.add(tlMesh);

      // 6. GT Rear Wing / Spoiler
      spoilerGroup = new THREE.Group();
      const wingGeo = new THREE.BoxGeometry(1.7, 0.05, 0.36);
      const wing = new THREE.Mesh(wingGeo, carbonMaterial);
      wing.position.set(0, 0.95, -1.9);

      const stanchionL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.15), carbonMaterial);
      stanchionL.position.set(-0.5, 0.78, -1.9);
      const stanchionR = stanchionL.clone();
      stanchionR.position.x = 0.5;

      spoilerGroup.add(wing, stanchionL, stanchionR);
      root.add(spoilerGroup);
    }
    // ----------------------------------------------------
    // VEHICLE TYPE 2: MUSCLE CAR
    // ----------------------------------------------------
    else if (type === 'muscle') {
      // Chassis
      const chassisGeo = new THREE.BoxGeometry(1.7, 0.2, 4.4);
      const chassis = new THREE.Mesh(chassisGeo, carbonMaterial);
      chassis.position.y = 0.2;
      root.add(chassis);

      // Muscular main body
      const bodyGeo = new THREE.BoxGeometry(1.68, 0.56, 4.2);
      mainBodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      mainBodyMesh.position.y = 0.5;
      mainBodyMesh.castShadow = true;
      root.add(mainBodyMesh);

      // Supercharger Hood Scoop
      const scoopGeo = new THREE.BoxGeometry(0.45, 0.18, 0.8);
      const scoop = new THREE.Mesh(scoopGeo, chromeMaterial);
      scoop.position.set(0, 0.84, 0.9);
      root.add(scoop);

      // Cabin
      const cabinGeo = new THREE.BoxGeometry(1.4, 0.46, 2.0);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 0.95, -0.3);
      cabin.castShadow = true;
      root.add(cabin);

      // Fastback roof
      const roofGeo = new THREE.BoxGeometry(1.36, 0.08, 1.8);
      const roof = new THREE.Mesh(roofGeo, bodyMaterial);
      roof.position.set(0, 1.18, -0.3);
      root.add(roof);

      // Twin round retro headlights
      [-0.55, 0.55].forEach((x) => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), headlightMaterial);
        hl.rotateX(Math.PI / 2);
        hl.position.set(x, 0.55, 2.11);
        root.add(hl);
      });

      // Classic muscle square taillights
      [-0.5, 0.5].forEach((x) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), taillightMaterial);
        tl.position.set(x, 0.55, -2.11);
        root.add(tl);
      });

      // Side chrome exhausts
      [-0.86, 0.86].forEach((x) => {
        const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12), chromeMaterial);
        ex.rotateZ(Math.PI / 2);
        ex.position.set(x, 0.25, -0.8);
        root.add(ex);
      });

      // Ducktail spoiler
      spoilerGroup = new THREE.Group();
      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 0.2), bodyMaterial);
      ducktail.position.set(0, 0.82, -2.05);
      ducktail.rotation.x = 0.2;
      spoilerGroup.add(ducktail);
      root.add(spoilerGroup);
    }
    // ----------------------------------------------------
    // VEHICLE TYPE 3: TROPHY RAIDER 4X4
    // ----------------------------------------------------
    else if (type === 'offroad') {
      // Lifted heavy-duty truck frame
      const frameGeo = new THREE.BoxGeometry(1.4, 0.24, 4.4);
      const frame = new THREE.Mesh(frameGeo, carbonMaterial);
      frame.position.y = 0.45;
      root.add(frame);

      // High-clearance truck cab & body
      const bodyGeo = new THREE.BoxGeometry(1.72, 0.65, 3.8);
      mainBodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      mainBodyMesh.position.y = 0.85;
      mainBodyMesh.castShadow = true;
      root.add(mainBodyMesh);

      // Truck bed in the back
      const bedGeo = new THREE.BoxGeometry(1.6, 0.35, 1.5);
      const bed = new THREE.Mesh(bedGeo, carbonMaterial);
      bed.position.set(0, 0.9, -1.2);
      root.add(bed);

      // External roll cage
      const cageMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', metalness: 0.8, roughness: 0.3 });
      const rollBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), cageMat);
      rollBar1.position.set(-0.65, 1.45, -0.5);
      const rollBar2 = rollBar1.clone();
      rollBar2.position.x = 0.65;
      root.add(rollBar1, rollBar2);

      // Glass windshield & cabin
      const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.4), glassMaterial);
      cabGlass.position.set(0, 1.35, 0.3);
      root.add(cabGlass);

      // Roof LED light bar
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.15), headlightMaterial);
      lightBar.position.set(0, 1.68, 0.4);
      root.add(lightBar);

      // Bull bar bumper with winch
      const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 0.3), cageMat);
      bullBar.position.set(0, 0.65, 2.15);
      root.add(bullBar);

      // Spare wheel mounted on tailgate
      const spareWheel = this.createWheel(0.42, 0.32, '#333333', true);
      spareWheel.group.position.set(0, 1.05, -2.05);
      spareWheel.group.rotation.y = Math.PI / 2;
      root.add(spareWheel.group);

      // Front headlights
      [-0.6, 0.6].forEach((x) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), headlightMaterial);
        hl.position.set(x, 0.9, 1.95);
        root.add(hl);
      });

      // Rugged vertical taillights
      [-0.7, 0.7].forEach((x) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.1), taillightMaterial);
        tl.position.set(x, 0.9, -1.95);
        root.add(tl);
      });
    }
    // ----------------------------------------------------
    // VEHICLE TYPE 4: CYBER PHANTOM
    // ----------------------------------------------------
    else {
      // Angular low wedge body
      const bodyGeo = new THREE.ConeGeometry(1.7, 4.4, 5);
      bodyGeo.rotateX(Math.PI / 2);
      mainBodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      mainBodyMesh.scale.set(1.0, 0.35, 1.0);
      mainBodyMesh.position.y = 0.42;
      mainBodyMesh.castShadow = true;
      root.add(mainBodyMesh);

      // Cyber aerodynamic canopy
      const cyberCockpit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.6), glassMaterial);
      cyberCockpit.position.set(0, 0.68, -0.1);
      root.add(cyberCockpit);

      // Neon cyber edge strips (front visor lightbar)
      const cyberHeadlightMat = new THREE.MeshStandardMaterial({
        color: '#00f5d4',
        emissive: '#00f5d4',
        emissiveIntensity: 2.0,
      });
      const cyberHl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.1), cyberHeadlightMat);
      cyberHl.position.set(0, 0.42, 2.15);
      root.add(cyberHl);

      // Cyber rear laser neon bar
      const cyberTlMat = new THREE.MeshStandardMaterial({
        color: '#f72585',
        emissive: '#f72585',
        emissiveIntensity: 2.5,
      });
      const cyberTl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.1), cyberTlMat);
      cyberTl.position.set(0, 0.48, -2.15);
      root.add(cyberTl);

      // Twin ionic thruster vents
      [-0.35, 0.35].forEach((x) => {
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 16), carbonMaterial);
        vent.rotateX(Math.PI / 2);
        vent.position.set(x, 0.4, -2.18);
        root.add(vent);
      });
    }

    // ----------------------------------------------------
    // 4 WHEEL ASSEMBLIES (STEERABLE FRONT, DRIVING REAR)
    // ----------------------------------------------------
    const flWheelData = this.createWheel(wheelRadius, wheelWidth, customization.rimColor, type === 'offroad');
    const frWheelData = this.createWheel(wheelRadius, wheelWidth, customization.rimColor, type === 'offroad');
    const rlWheelData = this.createWheel(wheelRadius, wheelWidth, customization.rimColor, type === 'offroad');
    const rrWheelData = this.createWheel(wheelRadius, wheelWidth, customization.rimColor, type === 'offroad');

    const flWheelGroup = new THREE.Group();
    const frWheelGroup = new THREE.Group();
    const rlWheelGroup = new THREE.Group();
    const rrWheelGroup = new THREE.Group();

    flWheelGroup.position.set(-trackWidth * 0.5, wheelRadius, wheelBase * 0.55);
    frWheelGroup.position.set(trackWidth * 0.5, wheelRadius, wheelBase * 0.55);
    rlWheelGroup.position.set(-trackWidth * 0.5, wheelRadius, -wheelBase * 0.55);
    rrWheelGroup.position.set(trackWidth * 0.5, wheelRadius, -wheelBase * 0.55);

    flWheelGroup.add(flWheelData.group);
    frWheelGroup.add(frWheelData.group);
    rlWheelGroup.add(rlWheelData.group);
    rrWheelGroup.add(rrWheelData.group);

    root.add(flWheelGroup, frWheelGroup, rlWheelGroup, rrWheelGroup);

    // ----------------------------------------------------
    // UNDERGLOW NEON & HEADLIGHT PROJECTORS
    // ----------------------------------------------------
    const underglowGeo = new THREE.PlaneGeometry(1.6, 3.2);
    underglowGeo.rotateX(-Math.PI / 2);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: customization.underglowColor,
      transparent: true,
      opacity: customization.hasUnderglow ? 0.75 : 0.0,
      depthWrite: false,
    });
    const underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    underglowMesh.position.y = 0.05;
    root.add(underglowMesh);

    const underglowLight = new THREE.PointLight(customization.underglowColor, customization.hasUnderglow ? 2.5 : 0, 4);
    underglowLight.position.y = 0.15;
    root.add(underglowLight);

    // Realistic Forward Headlight Spotlights for Night Driving
    const headlightLightLeft = new THREE.SpotLight(0xffffff, 4.0, 45, Math.PI / 6, 0.4, 1.2);
    headlightLightLeft.position.set(-0.5, 0.5, 2.1);
    const targetLeft = new THREE.Object3D();
    targetLeft.position.set(-0.5, 0, 25);
    root.add(targetLeft);
    headlightLightLeft.target = targetLeft;
    root.add(headlightLightLeft);

    const headlightLightRight = new THREE.SpotLight(0xffffff, 4.0, 45, Math.PI / 6, 0.4, 1.2);
    headlightLightRight.position.set(0.5, 0.5, 2.1);
    const targetRight = new THREE.Object3D();
    targetRight.position.set(0.5, 0, 25);
    root.add(targetRight);
    headlightLightRight.target = targetRight;
    root.add(headlightLightRight);

    // ----------------------------------------------------
    // EXHAUST NITRO FLAME CONES
    // ----------------------------------------------------
    const exhaustFlames: THREE.Mesh[] = [];
    const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 12);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: '#00f5d4', // Bright cyan/blue nitrous flame
      transparent: true,
      opacity: 0.0,
    });

    [-0.2, 0.2].forEach((x) => {
      const flame = new THREE.Mesh(flameGeo, flameMat.clone());
      flame.position.set(x, 0.35, -2.4);
      flame.visible = false;
      root.add(flame);
      exhaustFlames.push(flame);
    });

    return {
      root,
      bodyMesh: mainBodyMesh,
      bodyMaterial,
      flWheelGroup,
      frWheelGroup,
      rlWheelGroup,
      rrWheelGroup,
      flTire: flWheelData.tire,
      frTire: frWheelData.tire,
      rlTire: rlWheelData.tire,
      rrTire: rrWheelData.tire,
      underglowLight,
      underglowMesh,
      taillightMaterial,
      headlightLightLeft,
      headlightLightRight,
      exhaustFlames,
      spoilerGroup,
    };
  }
}
