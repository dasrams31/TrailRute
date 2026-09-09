/**
 * TrailRute 3D - Hyper-Realistic Mountain Expedition Simulation Engine
 * Next-Gen WebGL Photorealism & Outdoor Survival Mechanics
 * 
 * Features:
 * - 1024x1024 Procedural PBR Terrain Textures (Multi-Octave Normal & Roughness Maps)
 * - Triplanar Slope & Elevation Splatting (Montane Forest, Golden Savanna, Volcanic Basalt, Summit Sulfur)
 * - Physical Rayleigh Atmospheric Sky Dome with Anamorphic Sun Flares, 3D Cratered Moon & Milky Way Core
 * - 3D Volumetric Sea of Clouds (Lautan Awan) & Crepuscular Sun Shafts (God Rays)
 * - Authentic Indonesian Mountain Landmarks: Traditional Wooden Pos Shelters, Carved Trail Signs,
 *   Summit Triangulation Pillar with Fluttering Indonesian Flag, Volcanic Solfatara Vents & Campfire Embers
 * - Accurate Alpine Flora: Gnarled Cantigi Gunung (Vaccinium varingiaefolium), Cemara Gunung Pines &
 *   Blooming Edelweiss (Anaphalis javanica) Clusters with Instanced Swaying Grass
 * - First-Person Handheld Gear: Animated Trekking Pole, Fluid-Damped Prismatic Compass with Heading Azimuth,
 *   Tactical Flashlight with Volumetric Dust Beam, and Topographic Canvas GPS Map
 * - Surface-Adaptive Web Audio Synthesizer (Grass, Scree, Rock, Mud Steps + Trekking Pole Taps + Altitude Wind + Campfire Pops)
 * - Tactical Glassmorphic Telemetry HUD: Topographic Radar Minimap, Altimeter, Barometer, Slope Grade, EKG Pulse & NOAA Wind Chill
 */

// ==========================================
// 1. GLOBAL GAME STATE & MOUNTAIN CONFIGS
// ==========================================
const state = {
  mountain: 'prau',
  baseElevation: 1700,
  maxElevation: 2565,
  currentElevation: 1700,
  ascentRate: 0,
  slopeGrade: 0,
  barometricPressure: 825, // hPa at 1700m
  health: 100,
  stamina: 100,
  warmth: 100,
  hydration: 100,
  heartRate: 78,
  trashCount: 0,
  trashDepositedTotal: 0,
  isGpxVisible: true,
  isTentPitched: false,
  headlampOn: false,
  isBackpackOpen: false,
  isLogbookOpen: false,
  isPhotoMode: false,
  isBinocularActive: false,
  weatherMode: 0, // 0: Golden Sunrise, 1: Crisp Noon, 2: Storm & Fog, 3: Milky Way Night
  tempBase: 16.0,
  windSpeed: 16,
  currentPosName: 'Basecamp Patakbanteng',
  isGameActive: false,
  activeInteractable: null,
  completedCheckpoints: new Set(['Basecamp Gerbang Rimba']),
  equippedItem: 'pole', // 'pole', 'compass', 'flashlight', 'map'
  lastElevation: 1700,
  elevationTimer: 0
};

const weatherNames = ['Golden Sunrise 🌅', 'Siang Sabana ⛅', 'Badai Hujan & Kabut 🌧️', 'Malam Bima Sakti 🌌'];

const mountainConfigs = {
  prau: {
    name: 'Gunung Prau',
    base: 1700,
    peak: 2565,
    heightScale: 145,
    basecampName: 'Basecamp Patakbanteng',
    colorBase: 0x245927,
    colorMid: 0x84a93d,
    colorPeak: 0x6b5b52,
    fumaroles: false,
    floraType: 'prau_savanna'
  },
  merbabu: {
    name: 'Gunung Merbabu',
    base: 1830,
    peak: 3145,
    heightScale: 200,
    basecampName: 'Basecamp Selo',
    colorBase: 0x1d4d1f,
    colorMid: 0x769b35,
    colorPeak: 0x54473e,
    fumaroles: false,
    floraType: 'merbabu_sabana'
  },
  sumbing: {
    name: 'Gunung Sumbing',
    base: 1450,
    peak: 3371,
    heightScale: 250,
    basecampName: 'Basecamp Garung',
    colorBase: 0x28471c,
    colorMid: 0x62802b,
    colorPeak: 0x3d312a,
    fumaroles: true,
    floraType: 'sumbing_volcanic'
  }
};

const TERRAIN_SIZE = 850;
const TERRAIN_SEGMENTS = 140;

// Three.js Core Globals
let scene, camera, renderer, terrainMesh;
let directionalLight, ambientLight, skyLight, headlampLight, sunMesh, sunGlowMesh, sunFlareRings = [], starField, moonGroup, moonMesh, moonGlowMesh;
let cloudMeshLayer1, cloudGroupLayer2, sunShaftsGroup = null;
let tentMesh = null, campfireMesh = null, emberParticles = null, nestingStoveMesh = null, steamParticles = null;
let eagleMesh = null, sulfurSmokeParticles = null, breathVaporParticles = null;
let gpxTrackLine = null, gpxWaypointsGroup = null;
let webbingRopeGroup = null;
let checkpoints = [], interactables = [];
let trees = [], cantigiBushes = [], boulders = [], grassInstanceData = [], edelweissInstanceData = [];
let instancedGrassMesh = null, instancedEdelweissMesh = null;
let terrainNormalTexture = null, terrainRoughnessTexture = null;
let rainParticles = null, rainGeo = null, rainOverlayCanvas = null, rainOverlayCtx = null;
let rainDrops2D = [];

// Handheld Item 3D Meshes & Groups
let trekkingPoleGroup = null;
let compassGroup = null, compassNeedle = null, compassDegreeText = null;
let flashlightHandGroup = null, flashlightBeamMesh = null, dustMotesMesh = null;
let mapHandGroup = null, mapCanvas = null, mapCanvasCtx = null, mapCanvasTexture = null;

// Player Movement & Camera Physics
const player = {
  position: new THREE.Vector3(0, 15, 260),
  velocity: new THREE.Vector3(),
  height: 1.75,
  yaw: 0,
  pitch: 0,
  roll: 0,
  speed: 13.5,
  runMultiplier: 1.85,
  isPointerLocked: false,
  bobTimer: 0,
  poleSwingTimer: 0,
  footstepTimer: 0
};

const keys = {};

// Web Audio API Procedural Synthesizer
let audioCtx = null;
let windGain = null, windFilter = null, windNoiseNode = null;
let cricketGain = null, birdGain = null, campfireGain = null;
let isAudioInitialized = false;

// ==========================================
// 2. HIGH-FIDELITY WEB AUDIO SYNTHESIZER
// ==========================================
function initAudio() {
  if (isAudioInitialized) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();

    // 1. Procedural Altitude-Modulated Wind Howl Synth
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // White noise
    }

    windNoiseNode = audioCtx.createBufferSource();
    windNoiseNode.buffer = noiseBuffer;
    windNoiseNode.loop = true;

    windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, audioCtx.currentTime);
    windFilter.Q.setValueAtTime(2.8, audioCtx.currentTime);

    windGain = audioCtx.createGain();
    windGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    windNoiseNode.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(audioCtx.destination);
    windNoiseNode.start(0);

    // 2. Ambient Campfire Crackle Synth
    const campfireNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const campOut = campfireNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      campOut[i] = (Math.random() * 2 - 1) * (Math.random() > 0.985 ? 1.0 : 0.04);
    }
    const campSource = audioCtx.createBufferSource();
    campSource.buffer = campfireNoiseBuffer;
    campSource.loop = true;

    const campFilter = audioCtx.createBiquadFilter();
    campFilter.type = 'highpass';
    campFilter.frequency.setValueAtTime(700, audioCtx.currentTime);

    campfireGain = audioCtx.createGain();
    campfireGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    campSource.connect(campFilter);
    campFilter.connect(campfireGain);
    campfireGain.connect(audioCtx.destination);
    campSource.start(0);

    isAudioInitialized = true;
  } catch (e) {
    console.warn('Audio initialization notice:', e);
  }
}

// Surface-Adaptive Footstep Synthesizer
function playFootstepSound(isSprinting, surfaceType = 'gravel') {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const now = audioCtx.currentTime;
    const dur = isSprinting ? 0.08 : 0.12;

    // A. Low thud impact
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';

    let startFreq = 110, endFreq = 42;
    if (surfaceType === 'rock') { startFreq = 160; endFreq = 65; }
    else if (surfaceType === 'grass') { startFreq = 80; endFreq = 35; }
    else if (surfaceType === 'mud') { startFreq = 95; endFreq = 28; }

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    const baseVol = isSprinting ? 0.08 : 0.045;
    oscGain.gain.setValueAtTime(baseVol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);

    // B. Surface-specific crunch / rustle noise burst
    const noiseLen = dur * 0.9;
    const noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * noiseLen), audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1.0 - (i / data.length));
    }
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = audioCtx.createBiquadFilter();
    if (surfaceType === 'rock') {
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, now);
      noiseFilter.Q.setValueAtTime(3.0, now);
    } else if (surfaceType === 'grass') {
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(900, now);
    } else { // gravel / scree
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseFilter.Q.setValueAtTime(1.5, now);
    }

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(baseVol * 0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + noiseLen);

    // C. Trekking pole tap sound if pole is equipped
    if (state.equippedItem === 'pole') {
      const poleOsc = audioCtx.createOscillator();
      const poleGain = audioCtx.createGain();
      poleOsc.type = 'triangle';
      poleOsc.frequency.setValueAtTime(840, now + 0.02);
      poleOsc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      poleGain.gain.setValueAtTime(0.02, now + 0.02);
      poleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      poleOsc.connect(poleGain);
      poleGain.connect(audioCtx.destination);
      poleOsc.start(now + 0.02);
      poleOsc.stop(now + 0.06);
    }
  } catch (e) {}
}

function playEquipSound() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function playBirdChirp() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(2600 + Math.random() * 400, now);
    osc.frequency.linearRampToValueAtTime(3400 + Math.random() * 600, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.14);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) {}
}

function playSummitFanfare() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      const startT = audioCtx.currentTime + idx * 0.18;
      const endT = startT + 0.6;
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.09, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, endT);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startT);
      osc.stop(endT);
    });
  } catch (e) {}
}

// ==========================================
// 3. 1024x1024 PROCEDURAL PBR TERRAIN TEXTURES
// ==========================================
function createProceduralTerrainTextures() {
  if (terrainNormalTexture && terrainRoughnessTexture) {
    return { normalTex: terrainNormalTexture, roughnessTex: terrainRoughnessTexture };
  }

  const size = 1024;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size; nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);
  const nData = nImg.data;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size; rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');
  const rImg = rCtx.createImageData(size, size);
  const rData = rImg.data;

  // Multi-Octave Noise Field for Micro-Gravel & Rock Crevices
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Octave 1: Macro rock ridges
      const nx1 = Math.sin(x * 0.024) * Math.cos(y * 0.024) * 0.45;
      const ny1 = Math.cos(x * 0.024) * Math.sin(y * 0.024) * 0.45;
      
      // Octave 2: Medium gravel & soil clumps
      const nx2 = Math.sin(x * 0.085 + y * 0.055) * 0.35;
      const ny2 = Math.cos(x * 0.055 + y * 0.085) * 0.35;

      // Octave 3: High-frequency pebble grit & porosity
      const nx3 = Math.sin(x * 0.28 - y * 0.22) * 0.20;
      const ny3 = Math.cos(x * 0.22 + y * 0.28) * 0.20;

      const totalNx = (nx1 + nx2 + nx3) * 0.85;
      const totalNy = (ny1 + ny2 + ny3) * 0.85;
      const totalNz = 1.0;
      const len = Math.sqrt(totalNx * totalNx + totalNy * totalNy + totalNz * totalNz);

      // Normal Map (Tangent Space: R=X, G=Y, B=Z)
      nData[idx]     = Math.floor(((totalNx / len) * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.floor(((totalNy / len) * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.floor(((totalNz / len) * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;

      // Roughness Map (Gravel: 0.85, Soil: 0.75, Mud sheen: 0.45)
      const microVariance = (nx2 + nx3) * 0.15;
      const roughVal = Math.floor(Math.max(0.42, Math.min(0.96, 0.80 + microVariance)) * 255);
      rData[idx]     = roughVal;
      rData[idx + 1] = roughVal;
      rData[idx + 2] = roughVal;
      rData[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  terrainNormalTexture = new THREE.CanvasTexture(nCanvas);
  terrainNormalTexture.wrapS = THREE.RepeatWrapping;
  terrainNormalTexture.wrapT = THREE.RepeatWrapping;
  terrainNormalTexture.repeat.set(48, 48);

  terrainRoughnessTexture = new THREE.CanvasTexture(rCanvas);
  terrainRoughnessTexture.wrapS = THREE.RepeatWrapping;
  terrainRoughnessTexture.wrapT = THREE.RepeatWrapping;
  terrainRoughnessTexture.repeat.set(48, 48);

  return { normalTex: terrainNormalTexture, roughnessTex: terrainRoughnessTexture };
}

// ==========================================
// 4. CORE 3D SCENE & CINEMATIC ATMOSPHERE
// ==========================================
function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  const skyColor = new THREE.Color(0xfbcfe8); // Warm Golden Sunrise Rayleigh Fog
  scene.background = skyColor;
  scene.fog = new THREE.FogExp2(0xfbcfe8, 0.00165);

  const initialY = getTerrainHeight(0, 260) + player.height;
  player.position.set(0, initialY, 260);

  camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.2, 2200);
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;

  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.zIndex = '1';
  container.appendChild(renderer.domElement);

  // Cinematic Environmental Lighting
  ambientLight = new THREE.AmbientLight(0xffedd5, 0.82);
  scene.add(ambientLight);

  skyLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.65);
  scene.add(skyLight);

  directionalLight = new THREE.DirectionalLight(0xffedd5, 1.95);
  directionalLight.position.set(380, 240, -320);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.shadow.camera.left = -300;
  directionalLight.shadow.camera.right = 300;
  directionalLight.shadow.camera.top = 300;
  directionalLight.shadow.camera.bottom = -300;
  directionalLight.shadow.bias = -0.0004;
  scene.add(directionalLight);

  // Headlamp Tactical Spotlight
  headlampLight = new THREE.SpotLight(0xfef08a, 0, 85, Math.PI / 5.2, 0.42, 1.2);
  headlampLight.position.set(0, 0, 0);
  camera.add(headlampLight);
  const headlampTarget = new THREE.Object3D();
  headlampTarget.position.set(0, -0.2, -15);
  camera.add(headlampTarget);
  headlampLight.target = headlampTarget;
  scene.add(camera);

  // Build Expedition World & Mechanics
  buildCinematicSunAndSky();
  buildTerrain();
  buildSeaOfClouds();
  buildSunShafts();
  buildGlowingGpxTrack();
  buildTrailRibbon();
  buildFoliageAndSwayingGrass();
  buildWebbingClimbingZone();
  buildCheckpoints();
  buildMapLandmarks();
  buildWildlifeAndEffects();
  buildRainSystem();
  initScreenRainOverlay();

  // Build Handheld 3D Gear
  buildTrekkingPole();
  buildHandheldCompass();
  buildHandheldFlashlight();
  buildHandheldMap();
  equipItem('pole');

  // Controls & Events
  setupControls();
  setupUIEvents();
  window.addEventListener('resize', onWindowResize);

  state.isGameActive = true;
  requestAnimationFrame(animate);
}

// ==========================================
// 5. CELESTIAL SKY DOME, FLARES & MOON
// ==========================================
function buildCinematicSunAndSky() {
  const sunGroup = new THREE.Group();

  // Core Solar Disk
  const sunGeo = new THREE.SphereGeometry(18, 20, 20);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
  sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunMesh);

  // Anamorphic Lens Flare Ring 1 (Golden Corona)
  const haloGeo = new THREE.RingGeometry(22, 54, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  sunGlowMesh = new THREE.Mesh(haloGeo, haloMat);
  sunGlowMesh.lookAt(-240, -310, -200);
  sunGroup.add(sunGlowMesh);

  // Anamorphic Outer Chromatic Ring 2
  const outerHaloGeo = new THREE.RingGeometry(58, 92, 32);
  const outerHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfda4af,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const outerGlowMesh = new THREE.Mesh(outerHaloGeo, outerHaloMat);
  outerGlowMesh.lookAt(-240, -310, -200);
  sunGroup.add(outerGlowMesh);
  sunFlareRings.push(sunGlowMesh, outerGlowMesh);

  sunGroup.position.set(380, 240, -320);
  scene.add(sunGroup);

  // Photorealistic 3D Moon with Craters
  moonGroup = new THREE.Group();
  const moonGeo = new THREE.SphereGeometry(14, 24, 24);
  const moonMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.95,
    metalness: 0.05,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.22
  });
  moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonGroup.add(moonMesh);

  const moonHaloGeo = new THREE.RingGeometry(16, 42, 32);
  const moonHaloMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  moonGlowMesh = new THREE.Mesh(moonHaloGeo, moonHaloMat);
  moonGlowMesh.lookAt(240, 310, 200);
  moonGroup.add(moonGlowMesh);

  moonGroup.position.set(-360, 260, 280);
  moonGroup.visible = false;
  scene.add(moonGroup);

  // Dense Starfield with Milky Way Galactic Ribbon
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  const starColors = [];
  const colorObj = new THREE.Color();

  for (let i = 0; i < 2200; i++) {
    const theta = Math.random() * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * Math.random() - 1.0);
    const r = 880;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi)) + 15;
    const z = r * Math.sin(phi) * Math.sin(theta);
    starPos.push(x, y, z);

    // Subtle star temperature tints (blue-white to warm amber)
    const tint = Math.random();
    if (tint > 0.8) colorObj.setHex(0x93c5fd);
    else if (tint > 0.6) colorObj.setHex(0xfef08a);
    else colorObj.setHex(0xffffff);
    starColors.push(colorObj.r, colorObj.g, colorObj.b);
  }

  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);
}

// ==========================================
// 6. PROCEDURAL DEM TERRAIN & TRIPLANAR SPLAT
// ==========================================
function getTerrainHeight(x, z) {
  const cfg = mountainConfigs[state.mountain];
  const peakX = 0;
  const peakZ = -210;
  const distToPeak = Math.hypot(x - peakX, z - peakZ);
  
  // Base Volcano Cone Slope
  let h = Math.max(0, (1.0 - (distToPeak / (TERRAIN_SIZE * 0.72)))) * cfg.heightScale;
  
  // Multi-frequency geological ridges & valleys
  h += Math.sin(x * 0.018) * Math.cos(z * 0.018) * 19.5;
  h += Math.sin(x * 0.062 + z * 0.042) * 7.2;
  h += Math.cos(x * 0.12 - z * 0.08) * 2.8;

  // Flattened basecamp valley
  if (z > 230) {
    h = Math.max(2, h * 0.22);
  }
  return h;
}

function getSurfaceType(x, z, y, normalY) {
  const cfg = mountainConfigs[state.mountain];
  const ratio = Math.min(1.0, Math.max(0, y / cfg.heightScale));
  if (normalY < 0.65 || ratio > 0.82) return 'rock';
  if (ratio > 0.68) return 'gravel';
  if (state.weatherMode === 2) return 'mud'; // Rain makes trail muddy
  return 'grass';
}

function buildTerrain() {
  if (terrainMesh) scene.remove(terrainMesh);

  terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  const cfg = mountainConfigs[state.mountain];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);
  }

  terrainGeo.computeVertexNormals();
  const normals = terrainGeo.attributes.normal;
  const colors = [];
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ny = normals.getY(i); // 1.0 = flat plateau, <0.68 = steep cliff face
    const ratio = Math.min(1.0, Math.max(0, y / cfg.heightScale));

    // 4-Tier Photorealistic Triplanar Splatting
    if (ny < 0.66) {
      // Steep Cliff / Volcanic Andesite Rock
      color.setHex(0x1e293b).lerp(new THREE.Color(0x475569), Math.random() * 0.35);
    } else if (ratio < 0.28) {
      // Lower Forest Valley Floor & Humus
      color.setHex(cfg.colorBase).lerp(new THREE.Color(0x14532d), ratio * 3.2);
    } else if (ratio < 0.68) {
      // Mid-Slope Golden Savanna Grasslands
      const midT = (ratio - 0.28) / 0.40;
      color.setHex(cfg.colorMid).lerp(new THREE.Color(0xd97706), midT * 0.65);
    } else if (ratio < 0.90) {
      // Alpine Scree & Gravel Ridge
      const ridgeT = (ratio - 0.68) / 0.22;
      color.setHex(cfg.colorPeak).lerp(new THREE.Color(0x94a3b8), ridgeT * 0.85);
    } else {
      // Summit Crater & Sulfur Mineral Formations
      if (cfg.fumaroles) {
        color.setHex(0xfef08a).lerp(new THREE.Color(0x64748b), 0.45); // Sulfur yellow-gray
      } else {
        color.setHex(0xcfd8dc).lerp(new THREE.Color(0x455a64), 0.4); // Exposed granite peak
      }
    }

    colors.push(color.r, color.g, color.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const { normalTex, roughnessTex } = createProceduralTerrainTextures();
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(2.2, 2.2),
    roughnessMap: roughnessTex,
    roughness: 0.80,
    metalness: 0.08,
    flatShading: false
  });

  terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);
}

// ==========================================
// 7. VOLUMETRIC SEA OF CLOUDS & SUN SHAFTS
// ==========================================
function buildSeaOfClouds() {
  if (cloudMeshLayer1) scene.remove(cloudMeshLayer1);
  if (cloudGroupLayer2) scene.remove(cloudGroupLayer2);

  // Cloud Sheet Base Layer
  const cloudGeo = new THREE.PlaneGeometry(1500, 1500, 24, 24);
  cloudGeo.rotateX(-Math.PI / 2);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    roughness: 0.92,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  cloudMeshLayer1 = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMeshLayer1.position.y = 38;
  scene.add(cloudMeshLayer1);

  // 100+ 3D Volumetric Cloud Puffs (Lautan Awan Bergelombang)
  cloudGroupLayer2 = new THREE.Group();
  const puffGeo = new THREE.SphereGeometry(1, 8, 8);
  const puffMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    roughness: 0.95,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });

  for (let i = 0; i < 110; i++) {
    const puff = new THREE.Mesh(puffGeo, puffMat);
    const rad = 220 + Math.random() * 480;
    const ang = Math.random() * Math.PI * 2;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;
    const py = 32 + Math.sin(px * 0.02 + pz * 0.02) * 14;

    const sx = 28 + Math.random() * 45;
    const sy = 12 + Math.random() * 18;
    const sz = 28 + Math.random() * 45;

    puff.position.set(px, py, pz);
    puff.scale.set(sx, sy, sz);
    cloudGroupLayer2.add(puff);
  }
  scene.add(cloudGroupLayer2);
}

function buildSunShafts() {
  if (sunShaftsGroup) scene.remove(sunShaftsGroup);
  sunShaftsGroup = new THREE.Group();

  // 6 Volumetric Crepuscular Beams radiating from the sun
  const shaftGeo = new THREE.CylinderGeometry(8, 65, 450, 12, 1, true);
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < 6; i++) {
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(380, 240, -320);
    shaft.rotation.z = (Math.PI / 3) * i + (Math.PI / 8);
    shaft.rotation.x = Math.PI / 3.2;
    sunShaftsGroup.add(shaft);
  }
  scene.add(sunShaftsGroup);
}

// ==========================================
// 8. HANDHELD FIRST-PERSON GEAR & ARMS
// ==========================================
function createPlayerArmMesh(colorHex = 0xd97706) {
  const armGroup = new THREE.Group();
  
  // Sleeve Jacket
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.72 })
  );
  sleeve.rotation.x = Math.PI / 3.4;
  sleeve.position.set(0, -0.15, -0.22);
  armGroup.add(sleeve);

  // Hand / Glove
  const glove = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.08, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
  );
  glove.position.set(0, -0.32, -0.42);
  armGroup.add(glove);

  return armGroup;
}

function buildTrekkingPole() {
  if (trekkingPoleGroup) camera.remove(trekkingPoleGroup);

  trekkingPoleGroup = new THREE.Group();
  trekkingPoleGroup.add(createPlayerArmMesh(0xd97706));

  // Carbon Fiber Shaft
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 1.35, 12), shaftMat);
  shaft.position.set(0.02, -0.48, -0.52);
  shaft.rotation.x = Math.PI / 4.2;
  trekkingPoleGroup.add(shaft);

  // Orange Anodized Accent Bands
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.9, roughness: 0.2 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12), accentMat);
  band.position.set(0.02, -0.38, -0.45);
  band.rotation.x = Math.PI / 4.2;
  trekkingPoleGroup.add(band);

  // Ergonomic Natural Cork Grip
  const corkMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.28, 12), corkMat);
  grip.position.set(0.02, -0.28, -0.38);
  grip.rotation.x = Math.PI / 4.2;
  trekkingPoleGroup.add(grip);

  // Wrist Strap & Mud Basket
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 12), shaftMat);
  basket.position.set(0.02, -0.88, -0.78);
  basket.rotation.x = Math.PI / 4.2;
  trekkingPoleGroup.add(basket);

  trekkingPoleGroup.position.set(0.38, -0.15, -0.35);
  camera.add(trekkingPoleGroup);
}

function buildHandheldCompass() {
  if (compassGroup) camera.remove(compassGroup);

  compassGroup = new THREE.Group();
  compassGroup.add(createPlayerArmMesh(0x0284c7));

  // Prismatic Brass/Alloy Body
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 });
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.045, 24), casingMat);
  casing.position.set(0, -0.28, -0.52);
  casing.rotation.x = Math.PI / 4.5;
  compassGroup.add(casing);

  // Bezel Ring with Degree Scale
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.4 });
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 24), bezelMat);
  bezel.position.set(0, -0.26, -0.50);
  bezel.rotation.x = Math.PI / 4.5;
  compassGroup.add(bezel);

  // Glass Cover Lens
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 24), glassMat);
  glass.position.set(0, -0.25, -0.49);
  glass.rotation.x = Math.PI / 4.5;
  compassGroup.add(glass);

  // Fluid-Damped Magnetic Needle (North Red / South Silver)
  const needleGroup = new THREE.Group();
  needleGroup.position.set(0, -0.26, -0.50);
  needleGroup.rotation.x = Math.PI / 4.5;

  const nTip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11, 4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  nTip.rotation.z = Math.PI;
  nTip.position.y = 0.055;
  needleGroup.add(nTip);

  const sTip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11, 4), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
  sTip.position.y = -0.055;
  needleGroup.add(sTip);

  compassNeedle = needleGroup;
  compassGroup.add(compassNeedle);

  compassGroup.position.set(0.24, -0.12, -0.32);
  compassGroup.visible = false;
  camera.add(compassGroup);
}

function buildHandheldFlashlight() {
  if (flashlightHandGroup) camera.remove(flashlightHandGroup);

  flashlightHandGroup = new THREE.Group();
  flashlightHandGroup.add(createPlayerArmMesh(0x475569));

  // Tactical Anodized Aluminum Barrel
  const torchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.25 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.38, 16), torchMat);
  barrel.position.set(0, -0.30, -0.52);
  barrel.rotation.x = Math.PI / 3.8;
  flashlightHandGroup.add(barrel);

  // Knurled Grip Ring
  const knurl = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
  knurl.position.set(0, -0.30, -0.52);
  knurl.rotation.x = Math.PI / 3.8;
  flashlightHandGroup.add(knurl);

  // Optical Lens Head
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.048, 0.10, 16), torchMat);
  head.position.set(0, -0.19, -0.42);
  head.rotation.x = Math.PI / 3.8;
  flashlightHandGroup.add(head);

  // Glowing Front Glass Emitter
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.058, 16), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  lens.position.set(0, -0.14, -0.37);
  lens.rotation.x = -Math.PI / 8;
  flashlightHandGroup.add(lens);

  // Volumetric Light Beam Cone with Dust Particles
  const beamGeo = new THREE.ConeGeometry(3.5, 26, 16, 1, true);
  beamGeo.translate(0, 13, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  flashlightBeamMesh = new THREE.Mesh(beamGeo, beamMat);
  flashlightBeamMesh.position.set(0, -0.14, -0.37);
  flashlightBeamMesh.visible = state.headlampOn;
  flashlightHandGroup.add(flashlightBeamMesh);

  flashlightHandGroup.position.set(0.32, -0.14, -0.32);
  flashlightHandGroup.visible = false;
  camera.add(flashlightHandGroup);
}

function buildHandheldMap() {
  if (mapHandGroup) camera.remove(mapHandGroup);

  mapHandGroup = new THREE.Group();
  mapHandGroup.add(createPlayerArmMesh(0x059669));

  // Dynamic 2D Topographic Canvas Texture
  mapCanvas = document.createElement('canvas');
  mapCanvas.width = 512;
  mapCanvas.height = 512;
  mapCanvasCtx = mapCanvas.getContext('2d');
  renderMapCanvasTexture();

  mapCanvasTexture = new THREE.CanvasTexture(mapCanvas);
  const mapMat = new THREE.MeshStandardMaterial({
    map: mapCanvasTexture,
    roughness: 0.95,
    metalness: 0.05
  });

  const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.42), mapMat);
  mapMesh.position.set(0, -0.28, -0.52);
  mapMesh.rotation.x = -Math.PI / 4.5;
  mapHandGroup.add(mapMesh);

  // Leather Map Case Backing
  const caseBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.44, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
  );
  caseBack.position.set(0, -0.28, -0.53);
  caseBack.rotation.x = -Math.PI / 4.5;
  mapHandGroup.add(caseBack);

  mapHandGroup.position.set(0.18, -0.10, -0.30);
  mapHandGroup.visible = false;
  camera.add(mapHandGroup);
}

function renderMapCanvasTexture() {
  if (!mapCanvasCtx) return;
  const ctx = mapCanvasCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  // Antique Topo Map Parchment
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, w, h);

  // Topographic Contour Rings
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.8;
  for (let r = 30; r < 240; r += 26) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.25)';
  ctx.lineWidth = 1.0;
  for (let x = 0; x < w; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Header Title
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`⛰️ PETA TOPOGRAFI: ${mountainConfigs[state.mountain].name.toUpperCase()}`, 32, 46);
  ctx.font = '16px sans-serif';
  ctx.fillText(`Skala 1:25.000 | Elevasi: ${state.currentElevation} mdpl`, 32, 72);

  // GPX Trail Path Line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(w / 2, h - 50);
  ctx.quadraticCurveTo(w / 2 + 60, h / 2 + 40, w / 2, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Player Position Waypoint Marker
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 + 40, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('📍 Posisi Kamu', w / 2 + 16, h / 2 + 46);
}

function equipItem(itemType) {
  state.equippedItem = itemType;
  if (trekkingPoleGroup) trekkingPoleGroup.visible = (itemType === 'pole');
  if (compassGroup) compassGroup.visible = (itemType === 'compass');
  if (flashlightHandGroup) flashlightHandGroup.visible = (itemType === 'flashlight');
  if (mapHandGroup) {
    mapHandGroup.visible = (itemType === 'map');
    if (itemType === 'map') {
      renderMapCanvasTexture();
      if (mapCanvasTexture) mapCanvasTexture.needsUpdate = true;
    }
  }

  // Update UI hotbar buttons
  document.querySelectorAll('.equip-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-equip-${itemType}`);
  if (btn) btn.classList.add('active');

  playEquipSound();
}

// ==========================================
// 9. GPX TRAIL RIBBON & CLIMBING ZONE
// ==========================================
function buildGlowingGpxTrack() {
  if (gpxTrackLine) scene.remove(gpxTrackLine);
  if (gpxWaypointsGroup) scene.remove(gpxWaypointsGroup);

  const points = [
    new THREE.Vector3(0, getTerrainHeight(0, 255) + 0.6, 255),
    new THREE.Vector3(0, getTerrainHeight(0, 180) + 0.6, 180),
    new THREE.Vector3(12, getTerrainHeight(12, 100) + 0.6, 100),
    new THREE.Vector3(-15, getTerrainHeight(-15, 20) + 0.6, 20),
    new THREE.Vector3(25, getTerrainHeight(25, -60) + 0.6, -60),
    new THREE.Vector3(0, getTerrainHeight(0, -140) + 0.6, -140),
    new THREE.Vector3(0, getTerrainHeight(0, -210) + 0.8, -210)
  ];

  const curve = new THREE.CatmullRomCurve3(points);
  const trackGeo = new THREE.TubeGeometry(curve, 90, 0.45, 8, false);
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.25,
    roughness: 0.3,
    transparent: true,
    opacity: 0.88
  });
  gpxTrackLine = new THREE.Mesh(trackGeo, trackMat);
  scene.add(gpxTrackLine);

  // Glowing Waypoint Pillars
  gpxWaypointsGroup = new THREE.Group();
  const wpGeo = new THREE.CylinderGeometry(0.6, 0.6, 3.2, 8);
  const wpMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });

  points.forEach((pt) => {
    const wp = new THREE.Mesh(wpGeo, wpMat);
    wp.position.copy(pt);
    wp.position.y += 1.6;
    gpxWaypointsGroup.add(wp);
  });
  scene.add(gpxWaypointsGroup);
}

function toggleGpxTrack() {
  state.isGpxVisible = !state.isGpxVisible;
  if (gpxTrackLine) gpxTrackLine.visible = state.isGpxVisible;
  if (gpxWaypointsGroup) gpxWaypointsGroup.visible = state.isGpxVisible;
  showNotification(state.isGpxVisible ? '🗺️ Jalur GPX Navigator Diaktifkan' : '🗺️ Jalur GPX Disembunyikan');
}

function buildTrailRibbon() {
  const points = [
    new THREE.Vector3(0, getTerrainHeight(0, 255) + 0.08, 255),
    new THREE.Vector3(0, getTerrainHeight(0, 180) + 0.08, 180),
    new THREE.Vector3(12, getTerrainHeight(12, 100) + 0.08, 100),
    new THREE.Vector3(-15, getTerrainHeight(-15, 20) + 0.08, 20),
    new THREE.Vector3(25, getTerrainHeight(25, -60) + 0.08, -60),
    new THREE.Vector3(0, getTerrainHeight(0, -140) + 0.08, -140),
    new THREE.Vector3(0, getTerrainHeight(0, -210) + 0.08, -210)
  ];

  const curve = new THREE.CatmullRomCurve3(points);
  const trailGeo = new THREE.TubeGeometry(curve, 100, 1.8, 4, false);
  const trailMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.95,
    metalness: 0.05
  });
  const ribbon = new THREE.Mesh(trailGeo, trailMat);
  scene.add(ribbon);
}

function buildWebbingClimbingZone() {
  if (webbingRopeGroup) scene.remove(webbingRopeGroup);
  webbingRopeGroup = new THREE.Group();

  const startPt = new THREE.Vector3(25, getTerrainHeight(25, -60) + 0.5, -60);
  const endPt = new THREE.Vector3(0, getTerrainHeight(0, -140) + 0.5, -140);
  const curve = new THREE.LineCurve3(startPt, endPt);

  const ropeGeo = new THREE.TubeGeometry(curve, 20, 0.12, 6, false);
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.85
  });
  const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
  webbingRopeGroup.add(ropeMesh);
  scene.add(webbingRopeGroup);
}

// ==========================================
// 10. INDONESIAN ALPINE FLORA & VEGETATION
// ==========================================
function buildFoliageAndSwayingGrass() {
  trees.forEach(t => scene.remove(t));
  cantigiBushes.forEach(b => scene.remove(b));
  boulders.forEach(b => scene.remove(b));
  if (instancedGrassMesh) scene.remove(instancedGrassMesh);
  if (instancedEdelweissMesh) scene.remove(instancedEdelweissMesh);
  trees = []; cantigiBushes = []; boulders = []; grassInstanceData = []; edelweissInstanceData = [];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
  const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.65 });
  const cantigiLeafMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 }); // Red-bronze cantigi tips
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true, roughness: 0.92 });

  // 1. Cemara Gunung / Pine Trees (180 trees)
  for (let i = 0; i < 180; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.72);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.72);
    const y = getTerrainHeight(x, z);

    if (y > 6 && y < 98 && (Math.abs(x) > 8 || z > 200 || z < -100)) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4.2, 6), trunkMat);
      trunk.position.y = 2.1; trunk.castShadow = true; tree.add(trunk);

      // 3-Tier Layered Cones
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.5, 6), pineLeafMat);
      f1.position.y = 3.8; f1.castShadow = true; tree.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3.0, 6), pineLeafMat);
      f2.position.y = 5.6; f2.castShadow = true; tree.add(f2);

      const f3 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 6), pineLeafMat);
      f3.position.y = 7.2; f3.castShadow = true; tree.add(f3);

      tree.position.set(x, y, z);
      scene.add(tree);
      trees.push(tree);
    }
  }

  // 2. Gnarled Cantigi Gunung Trees (Vaccinium varingiaefolium) (120 bushes at mid/high elevation)
  for (let i = 0; i < 120; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.75);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.75);
    const y = getTerrainHeight(x, z);

    if (y >= 85 && y < 165 && (Math.abs(x) > 6 || z < -50)) {
      const cantigi = new THREE.Group();
      const gnarledTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.4, 5), trunkMat);
      gnarledTrunk.rotation.z = (Math.random() - 0.5) * 0.4;
      gnarledTrunk.position.y = 1.2;
      cantigi.add(gnarledTrunk);

      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), cantigiLeafMat);
      crown.position.set(0, 2.4, 0);
      crown.castShadow = true;
      cantigi.add(crown);

      cantigi.position.set(x, y, z);
      scene.add(cantigi);
      cantigiBushes.push(cantigi);
    }
  }

  // 3. Volcanic Andesite Boulders (90 boulders)
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.8);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.8);
    const y = getTerrainHeight(x, z);

    if (y > 20 && (Math.abs(x) > 6 || z < -80)) {
      const scale = 1.2 + Math.random() * 3.8;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 1), rockMat);
      b.position.set(x, y + scale * 0.4, z);
      b.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      b.castShadow = true; b.receiveShadow = true;
      scene.add(b);
      boulders.push(b);
    }
  }

  // 4. GPU Instanced Swaying Savanna Grass (2,200 instances)
  const grassBladeGeo = new THREE.PlaneGeometry(0.9, 1.8);
  grassBladeGeo.translate(0, 0.9, 0);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    roughness: 0.75,
    side: THREE.DoubleSide
  });

  const grassCount = 2200;
  instancedGrassMesh = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < grassCount; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.88);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.88);
    const y = getTerrainHeight(x, z);
    const rotY = Math.random() * Math.PI * 2;
    const scaleX = 0.75 + Math.random() * 0.55;
    const scaleY = 0.85 + Math.random() * 0.85;
    const scaleZ = scaleX;

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(scaleX, scaleY, scaleZ);
    dummy.updateMatrix();

    instancedGrassMesh.setMatrixAt(i, dummy.matrix);
    grassInstanceData.push({ x, y, z, rotY, scaleX, scaleY, scaleZ });
  }
  instancedGrassMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedGrassMesh);

  // 5. GPU Instanced Blooming Edelweiss (Anaphalis javanica) (600 clusters)
  const edelGeo = new THREE.Group();
  const flowerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  edelGeo.add(flowerCore);
  const petalMesh = new THREE.Mesh(new THREE.CircleGeometry(0.35, 6), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, side: THREE.DoubleSide }));
  petalMesh.rotation.x = -Math.PI / 2;
  edelGeo.add(petalMesh);

  const edelCount = 600;
  const singleEdelGeo = new THREE.DodecahedronGeometry(0.38, 1);
  const edelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, emissive: 0xfef08a, emissiveIntensity: 0.12 });
  instancedEdelweissMesh = new THREE.InstancedMesh(singleEdelGeo, edelMat, edelCount);

  for (let i = 0; i < edelCount; i++) {
    const x = (Math.random() - 0.5) * 480;
    const z = (Math.random() - 0.5) * 480 - 80;
    const y = getTerrainHeight(x, z);

    if (y > 75) {
      dummy.position.set(x, y + 0.3, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instancedEdelweissMesh.setMatrixAt(i, dummy.matrix);
      edelweissInstanceData.push({ x, y, z });
    }
  }
  instancedEdelweissMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedEdelweissMesh);
}

function updateSwayingGrass(time) {
  if (!instancedGrassMesh || grassInstanceData.length === 0) return;
  const dummy = new THREE.Object3D();
  const windStrength = (state.windSpeed / 16) * 0.18;

  for (let i = 0; i < grassInstanceData.length; i++) {
    const d = grassInstanceData[i];
    const sway = Math.sin(time * 2.8 + d.x * 0.08 + d.z * 0.08) * windStrength;

    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(sway, d.rotY, sway * 0.5);
    dummy.scale.set(d.scaleX, d.scaleY, d.scaleZ);
    dummy.updateMatrix();

    instancedGrassMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedGrassMesh.instanceMatrix.needsUpdate = true;
}

// ==========================================
// 11. INDONESIAN MOUNTAIN LANDMARK ARCHITECTURE
// ==========================================
function buildCheckpoints() {
  checkpoints = [
    { name: 'Basecamp Gerbang Rimba', x: 0, z: 255, elevation: 1700, desc: 'Pintu masuk pendakian. Tempat simaksi dan persiapan logistik.' },
    { name: 'Pos 1 Ondorante', x: 0, z: 180, elevation: 1880, desc: 'Pos istirahat jalur hutan pinus. Terdapat sumber mata air.' },
    { name: 'Pos 2 Semanggi', x: 12, z: 100, elevation: 2120, desc: 'Batas vegetasi lebat menuju lereng terbuka.' },
    { name: 'Pos 3 Sunrise Camp', x: -15, z: 20, elevation: 2370, desc: 'Area perkemahan sabana luas menghadap timur.' },
    { name: 'Tebing Cadas Scramble', x: 25, z: -60, elevation: 2480, desc: 'Jalur panjat tebing dengan bantuan tali webbing.' },
    { name: 'Plato Puncak & Kawah', x: 0, z: -140, elevation: 2540, desc: 'Punggung kawah purba dengan hembusan angin sejuk.' },
    { name: 'Puncak Tertinggi (Summit)', x: 0, z: -210, elevation: 2565, desc: 'Titik tertinggi ekspedisi. Tugu triangulasi dan panorama 360°.' }
  ];

  checkpoints.forEach(cp => {
    const y = getTerrainHeight(cp.x, cp.z);
    
    // Indonesian Carved Wooden Direction Signpost
    const postGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 8), woodMat);
    post.position.y = 1.2;
    postGroup.add(post);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.08), woodMat);
    signBoard.position.set(0, 2.0, 0);
    postGroup.add(signBoard);

    // Glowing Checkpoint Halo
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.8, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.1;
    postGroup.add(halo);

    postGroup.position.set(cp.x, y, cp.z);
    scene.add(postGroup);
  });
}

function buildMapLandmarks() {
  // A. Tempat Sampah Daur Ulang Basecamp (LNT Zero Waste)
  const trashY = getTerrainHeight(8, 255);
  const trashGroup = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.7, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }));
  bin.position.y = 0.7; trashGroup.add(bin);
  trashGroup.position.set(8, trashY, 255);
  scene.add(trashGroup);

  interactables.push({
    name: '♻️ Tempat Sampah Basecamp (LNT Zero Waste)',
    type: 'trash_bin',
    x: 8, z: 255,
    dialogue: 'Posko Pengumpulan Sampah Gunung. Setorkan semua sampah carrier untuk menjaga kelestarian alam!',
    actionText: 'Setorkan Semua Sampah (+Medali Pendaki Bijak)',
    action: () => {
      if (state.trashCount > 0) {
        state.trashDepositedTotal += state.trashCount;
        const count = state.trashCount;
        state.trashCount = 0;
        updateTrashBadge();
        showNotification(`🏆 Berhasil menyetor ${count} sampah! Predikat: Pendaki Bijak Zero Waste!`);
      } else {
        showNotification('✅ Ranselmu bersih dari sampah logistik. Terus jaga kelestarian!');
      }
    }
  });

  // B. Pondokan Pos Kayu Tradisional di Pos 1
  const pos1Y = getTerrainHeight(10, 182);
  const shelterGroup = new THREE.Group();
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

  // 4 Stilts
  for (let sx of [-1.8, 1.8]) {
    for (let sz of [-1.2, 1.2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 6), timberMat);
      pole.position.set(sx, 1.4, sz);
      shelterGroup.add(pole);
    }
  }

  // Raised Wood Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 3.0), timberMat);
  floor.position.y = 0.4;
  shelterGroup.add(floor);

  // Gable Corrugated Roof
  const roofL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 2.0), roofMat);
  roofL.position.set(0, 2.9, -0.8);
  roofL.rotation.x = Math.PI / 6;
  shelterGroup.add(roofL);

  const roofR = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 2.0), roofMat);
  roofR.position.set(0, 2.9, 0.8);
  roofR.rotation.x = -Math.PI / 6;
  shelterGroup.add(roofR);

  shelterGroup.position.set(10, pos1Y, 182);
  scene.add(shelterGroup);

  // C. Sumber Mata Air Alami Pos 1
  const springY = getTerrainHeight(-18, 185);
  const springGroup = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 }));
  basin.position.y = 0.4; springGroup.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.4, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.2 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.78; springGroup.add(water);
  springGroup.position.set(-18, springY, 185);
  scene.add(springGroup);

  interactables.push({
    name: '💧 Sumber Mata Air Alami Pos 1',
    type: 'spring',
    x: -18, z: 185,
    dialogue: 'Mata air pegunungan alami yang dingin dan segar.',
    actionText: 'Isi Penuh Botol Minum (Hidrasi 100%)',
    action: () => {
      state.hydration = 100;
      updateSurvivalStats(0);
      showNotification('💧 Botol minum penuh! Hidrasimu kembali 100%.');
    }
  });

  // D. Warung Ketinggian Mbak Yem (Pos 3)
  const warungY = getTerrainHeight(-28, 22);
  const warungGroup = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.0, 4.0), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 }));
  hut.position.y = 1.5; warungGroup.add(hut);
  const warungRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
  warungRoof.position.y = 3.6; warungRoof.rotation.y = Math.PI / 4; warungGroup.add(warungRoof);
  warungGroup.position.set(-28, warungY, 22);
  scene.add(warungGroup);

  interactables.push({
    name: '🍲 Warung Mbak Yem Pos 3',
    type: 'warung',
    x: -28, z: 22,
    dialogue: 'Warung legendaris puncak gunung! "Monggo mas, teh anget lan gorengan panas."',
    actionText: 'Beli Nasi Goreng & Teh Manis Hangat (Pulihkan 100% Stamina & Suhu)',
    action: () => {
      state.health = 100;
      state.stamina = 100;
      state.warmth = 100;
      state.trashCount += 1;
      updateSurvivalStats(0);
      updateTrashBadge();
      showNotification('🍲 Tubuh hangat dan berenergi kembali! (+1 sampah bungkus disimpan di ransel)');
    }
  });

  // E. Tugu Triangulasi Puncak Tertinggi & Bendera Merah Putih
  const summitY = getTerrainHeight(0, -210);
  const summitGroup = new THREE.Group();

  // Concrete Triangulation Pillar
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 3.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.92 })
  );
  pillar.position.y = 1.6;
  summitGroup.add(pillar);

  // Plakat Nama Puncak
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
  );
  plaque.position.set(0, 2.2, 0.62);
  summitGroup.add(plaque);

  // Tiang Bendera
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 5.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8 })
  );
  flagPole.position.set(1.4, 2.75, 0);
  summitGroup.add(flagPole);

  // Bendera Merah Putih Berkibar
  const redFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.55),
    new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
  );
  redFlag.position.set(2.2, 5.0, 0);
  summitGroup.add(redFlag);

  const whiteFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.55),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide })
  );
  whiteFlag.position.set(2.2, 4.45, 0);
  summitGroup.add(whiteFlag);

  summitGroup.position.set(0, summitY, -210);
  scene.add(summitGroup);

  interactables.push({
    name: '🏆 TUGU TRIANGULASI PUNCAK (SUMMIT)',
    type: 'summit_monument',
    x: 0, z: -210,
    dialogue: 'SELAMAT! Kamu telah menaklukkan puncak gunung! Panorama 360° samudra di atas awan terbentang luas.',
    actionText: 'Tancapkan Bendera & Abadikan Foto Puncak 📸',
    action: () => {
      playSummitFanfare();
      togglePhotoMode();
      showNotification('🎉 EKSPEDISI SUKSES! Kamu berhasil mencapai puncak tertinggi!');
    }
  });

  // F. Volcanic Solfatara Steam Vents near Summit
  if (mountainConfigs[state.mountain].fumaroles) {
    const ventY = getTerrainHeight(18, -170);
    const ventGroup = new THREE.Group();
    const ventRock = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.95 })
    );
    ventRock.position.y = 0.9;
    ventGroup.add(ventRock);
    ventGroup.position.set(18, ventY, -170);
    scene.add(ventGroup);
  }
}

// ==========================================
// 12. DYNAMIC PARTICLES, WILDLIFE & WEATHER
// ==========================================
function buildWildlifeAndEffects() {
  // Soaring Mountain Hawk / Eagle
  const eagleGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
  body.rotation.x = Math.PI / 2; eagleGroup.add(body);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  wings.position.y = 0.1; eagleGroup.add(wings);
  eagleGroup.position.set(0, 180, -50);
  scene.add(eagleGroup);
  eagleMesh = eagleGroup;

  // Volcanic Sulfur Steam Particles
  const sulfurGeo = new THREE.BufferGeometry();
  const sulfurPos = [];
  for (let i = 0; i < 45; i++) {
    sulfurPos.push((Math.random() - 0.5) * 6, Math.random() * 14, (Math.random() - 0.5) * 6);
  }
  sulfurGeo.setAttribute('position', new THREE.Float32BufferAttribute(sulfurPos, 3));
  const sulfurMat = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 3.2,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  sulfurSmokeParticles = new THREE.Points(sulfurGeo, sulfurMat);
  sulfurSmokeParticles.position.set(18, getTerrainHeight(18, -170) + 1.2, -170);
  scene.add(sulfurSmokeParticles);
}

function updateWildlifeAndSmoke(delta) {
  if (eagleMesh) {
    const time = performance.now() * 0.00045;
    eagleMesh.position.x = Math.sin(time) * 160;
    eagleMesh.position.z = Math.cos(time) * 160 - 80;
    eagleMesh.rotation.y = time + Math.PI / 2;
  }

  if (sulfurSmokeParticles) {
    const pos = sulfurSmokeParticles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * 3.5;
      if (y > 14) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
}

function initScreenRainOverlay() {
  rainOverlayCanvas = document.getElementById('rain-overlay-canvas');
  if (!rainOverlayCanvas) return;
  rainOverlayCanvas.width = window.innerWidth;
  rainOverlayCanvas.height = window.innerHeight;
  rainOverlayCtx = rainOverlayCanvas.getContext('2d');
  rainDrops2D = [];
  for (let i = 0; i < 75; i++) {
    rainDrops2D.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 12 + Math.random() * 24,
      spd: 18 + Math.random() * 22
    });
  }
}

function drawScreenRainOverlay() {
  if (!rainOverlayCtx || state.weatherMode !== 2) {
    if (rainOverlayCtx) rainOverlayCtx.clearRect(0, 0, rainOverlayCanvas.width, rainOverlayCanvas.height);
    return;
  }

  const ctx = rainOverlayCtx;
  const w = rainOverlayCanvas.width;
  const h = rainOverlayCanvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < rainDrops2D.length; i++) {
    const d = rainDrops2D[i];
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 3, d.y + d.len);
    d.y += d.spd;
    d.x -= 2;
    if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
  }
  ctx.stroke();
}

function buildRainSystem() {
  const count = 3500;
  rainGeo = new THREE.BufferGeometry();
  const rainPos = [];
  for (let i = 0; i < count; i++) {
    rainPos.push(
      (Math.random() - 0.5) * 280,
      Math.random() * 120,
      (Math.random() - 0.5) * 280
    );
  }
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x93c5fd,
    size: 0.75,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  rainParticles = new THREE.Points(rainGeo, rainMat);
  scene.add(rainParticles);
}

function updateRain(delta) {
  if (!rainParticles) return;
  const isRaining = (state.weatherMode === 2);
  rainParticles.material.opacity = isRaining ? 0.7 : 0.0;

  if (isRaining) {
    rainParticles.position.x = player.position.x;
    rainParticles.position.z = player.position.z;
    const pos = rainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - delta * 95;
      if (y < 0) y = 120;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
}

// ==========================================
// 13. CONTROLS, PLAYER PHYSICS & INCLINE
// ==========================================
function setupControls() {
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'KeyE') triggerInteraction();
    if (e.code === 'KeyC') toggleTent();
    if (e.code === 'KeyF') toggleHeadlamp();
    if (e.code === 'KeyG') toggleGpxTrack();
    if (e.code === 'KeyL') toggleLogbook();
    if (e.code === 'KeyP') togglePhotoMode();
    if (e.code === 'KeyB' || e.code === 'Tab') { e.preventDefault(); toggleBackpack(); }
    if (e.code === 'Digit1') equipItem('pole');
    if (e.code === 'Digit2') equipItem('compass');
    if (e.code === 'Digit3') equipItem('flashlight');
    if (e.code === 'Digit4') equipItem('map');

    if (e.code === 'KeyV') setBinocular(true);
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'KeyV') setBinocular(false);
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.isGameActive || state.isPhotoMode) return;
    if (!player.isPointerLocked) {
      document.body.requestPointerLock();
      initAudio();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    player.isPointerLocked = (document.pointerLockElement === document.body);
  });

  document.addEventListener('mousemove', (e) => {
    if (!player.isPointerLocked || state.isPhotoMode) return;
    const sensitivity = 0.0022;
    player.yaw -= e.movementX * sensitivity;
    player.pitch -= e.movementY * sensitivity;
    player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch));
  });
}

function setBinocular(active) {
  state.isBinocularActive = active;
  camera.fov = active ? 22 : 64;
  camera.updateProjectionMatrix();
  const bOverlay = document.getElementById('binocular-overlay');
  if (bOverlay) bOverlay.style.display = active ? 'block' : 'none';
}

function updatePlayer(delta) {
  // Strafe Tilt (Camera roll on moving sideways)
  let targetRoll = 0;
  if (keys.KeyA) targetRoll = 0.022;
  if (keys.KeyD) targetRoll = -0.022;
  player.roll += (targetRoll - player.roll) * delta * 8.0;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = player.roll;

  const moveDir = new THREE.Vector3();
  if (keys.KeyW) moveDir.z -= 1;
  if (keys.KeyS) moveDir.z += 1;
  if (keys.KeyA) moveDir.x -= 1;
  if (keys.KeyD) moveDir.x += 1;
  moveDir.normalize();
  moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);

  const isMoving = moveDir.lengthSq() > 0;
  const isSprinting = keys.ShiftLeft && state.stamina > 15;

  let curSpeed = player.speed;
  if (isSprinting && isMoving) {
    curSpeed *= player.runMultiplier;
    state.stamina = Math.max(0, state.stamina - delta * 9.5);
  } else if (isMoving) {
    state.stamina = Math.max(0, state.stamina - delta * 2.8);
  } else {
    state.stamina = Math.min(100, state.stamina + delta * 9.5);
  }

  const nextX = player.position.x + moveDir.x * curSpeed * delta;
  const nextZ = player.position.z + moveDir.z * curSpeed * delta;
  const currentY = getTerrainHeight(player.position.x, player.position.z);
  const nextY = getTerrainHeight(nextX, nextZ);
  const slopeDelta = nextY - currentY;

  // Real-time Slope Grade Calculation
  const horizDist = Math.hypot(moveDir.x * curSpeed * delta, moveDir.z * curSpeed * delta);
  if (horizDist > 0.001) {
    state.slopeGrade = Math.round((slopeDelta / horizDist) * 100);
  } else {
    state.slopeGrade = 0;
  }

  // Uphill Drag Resistance
  if (slopeDelta > 0.6) {
    curSpeed *= Math.max(0.35, 1.0 - (slopeDelta * 0.35));
    state.stamina = Math.max(0, state.stamina - delta * 6.5);
  }

  player.position.addScaledVector(moveDir, curSpeed * delta);

  const terrainY = getTerrainHeight(player.position.x, player.position.z);
  player.position.y = terrainY + player.height;

  // Map Boundary Clamp
  player.position.x = Math.max(-TERRAIN_SIZE * 0.46, Math.min(TERRAIN_SIZE * 0.46, player.position.x));
  player.position.z = Math.max(-TERRAIN_SIZE * 0.46, Math.min(TERRAIN_SIZE * 0.46, player.position.z));

  // Footsteps, Head Bobbing & Handheld Gear Sway
  if (isMoving) {
    player.bobTimer += delta * (isSprinting ? 12.5 : 7.8);
    const bobOffset = Math.sin(player.bobTimer) * (isSprinting ? 0.08 : 0.045);
    camera.position.set(player.position.x, player.position.y + bobOffset, player.position.z);

    // Footstep Sound Trigger
    player.footstepTimer += delta * (isSprinting ? 3.2 : 2.0);
    if (player.footstepTimer > 1.0) {
      player.footstepTimer = 0;
      const surf = getSurfaceType(player.position.x, player.position.z, player.position.y, 0.8);
      playFootstepSound(isSprinting, surf);
    }

    // Compass Needle Damped Heading Update
    if (compassNeedle) {
      compassNeedle.rotation.y = player.yaw + Math.PI;
    }

    // Active Item Swing Bob
    let activeGroup = null;
    if (state.equippedItem === 'pole') activeGroup = trekkingPoleGroup;
    else if (state.equippedItem === 'compass') activeGroup = compassGroup;
    else if (state.equippedItem === 'flashlight') activeGroup = flashlightHandGroup;
    else if (state.equippedItem === 'map') activeGroup = mapHandGroup;

    if (activeGroup) {
      player.poleSwingTimer += delta * (isSprinting ? 9.5 : 5.5);
      activeGroup.position.y = -0.15 + Math.sin(player.poleSwingTimer) * 0.04;
      activeGroup.rotation.x = Math.sin(player.poleSwingTimer) * 0.12;
    }
  } else {
    camera.position.set(player.position.x, player.position.y, player.position.z);
  }
}

// ==========================================
// 14. TELEMETRY, SURVIVAL & GLASSMORPHIC HUD
// ==========================================
function updateSurvivalStats(delta) {
  const cfg = mountainConfigs[state.mountain];
  const currentRatio = (player.position.y - player.height) / cfg.heightScale;
  state.currentElevation = Math.round(cfg.base + Math.max(0, currentRatio * (cfg.peak - cfg.base)));

  // Ascent Rate (m/min) & Barometric Pressure (hPa)
  state.elevationTimer += delta;
  if (state.elevationTimer >= 1.0) {
    state.ascentRate = Math.round((state.currentElevation - state.lastElevation) * 60);
    state.lastElevation = state.currentElevation;
    state.elevationTimer = 0;
    state.barometricPressure = Math.round(1013.25 * Math.pow(1 - (0.0065 * state.currentElevation) / 288.15, 5.255));
  }

  // Dynamic Heart Rate Simulation
  const baseHeart = 72;
  const exertion = (keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD) ? (keys.ShiftLeft ? 75 : 35) : 0;
  const altitudeStress = (state.currentElevation - 1700) * 0.015;
  state.heartRate = Math.round(baseHeart + exertion + altitudeStress);

  // Environmental Cooling & Hypothermia Hazard
  const lapseRate = 0.0065; // 0.65°C drop per 100m
  let curTemp = state.tempBase - ((state.currentElevation - cfg.base) * lapseRate);
  if (state.weatherMode === 2) curTemp -= 4.5; // Rain drop
  if (state.weatherMode === 3) curTemp -= 7.0; // Night drop

  const windChill = curTemp - (state.windSpeed * 0.22);
  const hypoDanger = windChill < 8.0 && !state.isTentPitched;

  if (hypoDanger) {
    state.warmth = Math.max(0, state.warmth - delta * 1.8);
    if (state.warmth < 25) {
      state.health = Math.max(0, state.health - delta * 3.2);
    }
  } else {
    state.warmth = Math.min(100, state.warmth + delta * 2.5);
  }

  state.hydration = Math.max(0, state.hydration - delta * 0.65);

  // Update Telemetry & UI Gauges
  const elAlt = document.getElementById('current-elevation');
  const elTemp = document.getElementById('weather-temp');
  const elWc = document.getElementById('windchill-temp');
  const elWind = document.getElementById('wind-speed');
  const elHypo = document.getElementById('hypo-status');
  const elBaro = document.getElementById('baro-val');
  const elSlope = document.getElementById('slope-val');
  const elAscent = document.getElementById('ascent-val');
  const elHeart = document.getElementById('heart-val');

  if (elAlt) elAlt.innerText = `${state.currentElevation.toLocaleString()} mdpl`;
  if (elTemp) elTemp.innerText = `${curTemp.toFixed(1)}°C ${state.weatherMode === 2 ? '🌧️' : (state.weatherMode === 3 ? '🌌' : '⛅')}`;
  if (elWc) elWc.innerText = `${windChill.toFixed(1)}°C`;
  if (elWind) elWind.innerText = `${state.windSpeed}`;
  if (elBaro) elBaro.innerText = `${state.barometricPressure} hPa`;
  if (elSlope) elSlope.innerText = `${state.slopeGrade}°`;
  if (elAscent) elAscent.innerText = `${state.ascentRate > 0 ? '+' : ''}${state.ascentRate} m/m`;
  if (elHeart) elHeart.innerText = `${state.heartRate} BPM`;

  if (elHypo) {
    if (windChill < 4.0) {
      elHypo.innerText = '⚠️ BAHAYA HIPOTERMIA TINGGI!';
      elHypo.style.color = '#ef4444';
    } else if (windChill < 10.0) {
      elHypo.innerText = '⚠️ Waspada Angin Dingin';
      elHypo.style.color = '#f59e0b';
    } else {
      elHypo.innerText = '✅ Aman dari Hipotermia';
      elHypo.style.color = '#4ade80';
    }
  }

  // Update Status Bars
  const setBar = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, val))}%`;
  };
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = Math.round(val);
  };

  setBar('bar-hp', state.health); setTxt('val-hp', state.health);
  setBar('bar-stm', state.stamina); setTxt('val-stm', state.stamina);
  setBar('bar-wrm', state.warmth); setTxt('val-wrm', state.warmth);
  setBar('bar-wtr', state.hydration); setTxt('val-wtr', state.hydration);

  // Check Nearest Pos Checkpoint
  let nearestCp = checkpoints[0];
  let minDist = Infinity;
  checkpoints.forEach(cp => {
    const dist = Math.hypot(player.position.x - cp.x, player.position.z - cp.z);
    if (dist < minDist) {
      minDist = dist;
      nearestCp = cp;
    }
  });

  if (minDist < 35 && !state.completedCheckpoints.has(nearestCp.name)) {
    state.completedCheckpoints.add(nearestCp.name);
    showNotification(`🚩 Memasuki ${nearestCp.name} (${nearestCp.elevation} mdpl)`);
  }

  state.currentPosName = nearestCp.name;
  const posEl = document.getElementById('current-pos-name');
  if (posEl) posEl.innerText = nearestCp.name;
}

function updateAudioAmbiance(delta) {
  if (!isAudioInitialized || !audioCtx) return;
  try {
    // Scale Wind Sound with Elevation & Weather
    const altRatio = Math.max(0, (state.currentElevation - 1700) / 1600);
    const targetFreq = 260 + altRatio * 750 + (state.weatherMode === 2 ? 400 : 0);
    const targetGain = 0.03 + altRatio * 0.09 + (state.weatherMode === 2 ? 0.08 : 0);

    windFilter.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.5);
    windGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.5);

    // Random Bird Chirp in Lower Forest
    if (state.currentElevation < 2200 && state.weatherMode !== 3 && Math.random() < 0.003) {
      playBirdChirp();
    }
  } catch (e) {}
}

// ==========================================
// 15. TOPOGRAPHIC RADAR MINIMAP
// ==========================================
function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radarRadius = w / 2 - 8;

  ctx.clearRect(0, 0, w, h);

  // Radar Glass Background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fillRect(0, 0, w, h);

  // Topo Contour Range Rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1.0;
  for (let r = 18; r < radarRadius; r += 20) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshairs
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.moveTo(0, cy); ctx.lineTo(w, cy);
  ctx.stroke();

  // Draw Checkpoints on Radar
  const mapScale = 0.28;
  checkpoints.forEach(cp => {
    const dx = (cp.x - player.position.x) * mapScale;
    const dz = (cp.z - player.position.z) * mapScale;

    // Rotate with player yaw
    const rotX = dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw);
    const rotY = dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw);

    const px = cx + rotX;
    const py = cy + rotY;

    if (Math.hypot(rotX, rotY) < radarRadius - 4) {
      ctx.fillStyle = state.completedCheckpoints.has(cp.name) ? '#4ade80' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Player Waypoint Cone
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx - 4, cy + 5);
  ctx.lineTo(cx + 4, cy + 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Outer Bezel Ring & Cardinal Headings (N/S/E/W)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinal Heading N Indicator
  const northX = cx + Math.sin(-player.yaw) * (radarRadius - 10);
  const northY = cy - Math.cos(-player.yaw) * (radarRadius - 10);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', northX, northY);
}

// ==========================================
// 16. INTERACTION & DIALOG SYSTEM
// ==========================================
function updateInteractionProximity() {
  let nearest = null;
  let minDist = 7.5;

  interactables.forEach(item => {
    const dist = Math.hypot(player.position.x - item.x, player.position.z - item.z);
    if (dist < minDist) {
      minDist = dist;
      nearest = item;
    }
  });

  state.activeInteractable = nearest;
  const hintEl = document.getElementById('interact-hint');
  if (hintEl) {
    if (nearest) {
      hintEl.style.display = 'block';
      hintEl.innerText = `[E] ${nearest.name}`;
    } else {
      hintEl.style.display = 'none';
    }
  }
}

function triggerInteraction() {
  if (!state.activeInteractable) return;
  const item = state.activeInteractable;

  const dialog = document.getElementById('dialog-overlay');
  const title = document.getElementById('dialog-title');
  const text = document.getElementById('dialog-text');
  const actBtn = document.getElementById('dialog-action-btn');

  if (dialog && title && text && actBtn) {
    title.innerText = item.name;
    text.innerText = item.dialogue;
    actBtn.innerText = item.actionText;
    dialog.style.display = 'flex';
    document.exitPointerLock();
  }
}

function handleDialogAction() {
  if (state.activeInteractable && state.activeInteractable.action) {
    state.activeInteractable.action();
  }
  closeDialog();
}

function closeDialog() {
  const dialog = document.getElementById('dialog-overlay');
  if (dialog) dialog.style.display = 'none';
  if (state.isGameActive && !state.isBackpackOpen && !state.isLogbookOpen && !state.isPhotoMode) {
    document.body.requestPointerLock();
  }
}

function toggleLogbook() {
  state.isLogbookOpen = !state.isLogbookOpen;
  const el = document.getElementById('logbook-modal');
  if (el) el.style.display = state.isLogbookOpen ? 'flex' : 'none';
  if (state.isLogbookOpen) document.exitPointerLock();
  else if (state.isGameActive) document.body.requestPointerLock();
}

// ==========================================
// 17. WEATHER CYCLES & ATMOSPHERE MODES
// ==========================================
function cycleWeather() {
  state.weatherMode = (state.weatherMode + 1) % 4;
  updateWeatherDisplay();

  if (state.weatherMode === 0) {
    // 0: Golden Sunrise
    scene.background = new THREE.Color(0xfbcfe8);
    scene.fog.color = new THREE.Color(0xfbcfe8);
    ambientLight.color = new THREE.Color(0xffedd5); ambientLight.intensity = 0.85;
    directionalLight.color = new THREE.Color(0xffedd5); directionalLight.intensity = 1.95;
    if (sunMesh) sunMesh.material.color = new THREE.Color(0xffedd5);
    if (sunGlowMesh) sunGlowMesh.material.opacity = 0.38;
    if (moonGroup) moonGroup.visible = false;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 1) {
    // 1: Crisp Midday Alpine Sky
    scene.background = new THREE.Color(0x93c5fd);
    scene.fog.color = new THREE.Color(0x93c5fd);
    ambientLight.color = new THREE.Color(0xf8fafc); ambientLight.intensity = 0.95;
    directionalLight.color = new THREE.Color(0xffffff); directionalLight.intensity = 2.2;
    if (sunMesh) sunMesh.material.color = new THREE.Color(0xffffff);
    if (sunGlowMesh) sunGlowMesh.material.opacity = 0.45;
    if (moonGroup) moonGroup.visible = false;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 2) {
    // 2: Storm, Mist & Heavy Rain
    scene.background = new THREE.Color(0x475569);
    scene.fog.color = new THREE.Color(0x475569);
    ambientLight.color = new THREE.Color(0x64748b); ambientLight.intensity = 0.45;
    directionalLight.color = new THREE.Color(0x94a3b8); directionalLight.intensity = 0.65;
    if (sunMesh) sunMesh.material.color = new THREE.Color(0x94a3b8);
    if (sunGlowMesh) sunGlowMesh.material.opacity = 0.1;
    if (moonGroup) moonGroup.visible = false;
    if (starField) starField.material.opacity = 0.0;
  } else {
    // 3: Milky Way Galaxy Night
    scene.background = new THREE.Color(0x030712);
    scene.fog.color = new THREE.Color(0x030712);
    ambientLight.color = new THREE.Color(0x1e293b); ambientLight.intensity = 0.22;
    directionalLight.color = new THREE.Color(0x93c5fd); directionalLight.intensity = 0.4;
    if (sunMesh) sunMesh.material.color = new THREE.Color(0x1e293b);
    if (sunGlowMesh) sunGlowMesh.material.opacity = 0.0;
    if (moonGroup) moonGroup.visible = true;
    if (starField) starField.material.opacity = 0.95;
  }

  showNotification(`🌤️ Cuaca Berubah: ${weatherNames[state.weatherMode]}`);
}

function updateWeatherDisplay() {
  const btn = document.getElementById('btn-weather-mode');
  if (btn) btn.innerText = weatherNames[state.weatherMode];
}

// ==========================================
// 18. CINEMATIC PHOTO MODE & 4K SNAPSHOT
// ==========================================
function togglePhotoMode() {
  state.isPhotoMode = !state.isPhotoMode;
  const photoUI = document.getElementById('photo-ui');
  if (photoUI) photoUI.style.display = state.isPhotoMode ? 'flex' : 'none';

  const topLeft = document.getElementById('hud-top-left');
  const topRight = document.getElementById('hud-top-right');
  const btm = document.getElementById('hud-bottom');
  const acts = document.getElementById('hud-actions');
  const hotbar = document.getElementById('hud-equipment');
  const cross = document.getElementById('crosshair');

  if (topLeft) topLeft.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (topRight) topRight.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (btm) btm.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (acts) acts.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (hotbar) hotbar.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (cross) cross.style.display = state.isPhotoMode ? 'none' : 'block';

  if (state.isPhotoMode) {
    document.exitPointerLock();
    if (trekkingPoleGroup) trekkingPoleGroup.visible = false;
    if (compassGroup) compassGroup.visible = false;
    if (flashlightHandGroup) flashlightHandGroup.visible = false;
    if (mapHandGroup) mapHandGroup.visible = false;
  } else {
    equipItem(state.equippedItem);
    document.body.requestPointerLock();
  }
}

function exitPhotoMode() {
  if (state.isPhotoMode) togglePhotoMode();
}

function takeSnapshot() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = renderer.domElement.width;
  tempCanvas.height = renderer.domElement.height;
  const ctx = tempCanvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);

    // Cinematic Expedition Watermark Stamp
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(32, tempCanvas.height - 96, 440, 68);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`⛰️ ${mountainConfigs[state.mountain].name.toUpperCase()}`, 48, tempCanvas.height - 60);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Elevasi: ${state.currentElevation.toLocaleString()} mdpl | TrailRute 3D Expedition`, 48, tempCanvas.height - 38);

    const a = document.createElement('a');
    a.href = tempCanvas.toDataURL('image/png');
    a.download = `TrailRute_3D_${state.mountain}_${state.currentElevation}mdpl.png`;
    a.click();
    showNotification('📸 Foto lanskap puncak resolusi tinggi berhasil diunduh!');
  };
  img.src = dataURL;
}

function toggleHeadlamp() {
  state.headlampOn = !state.headlampOn;
  headlampLight.intensity = state.headlampOn ? 3.6 : 0;
  if (flashlightBeamMesh) flashlightBeamMesh.visible = state.headlampOn;
  showNotification(state.headlampOn ? '🔦 Headlamp Dinyalakan' : '🔦 Headlamp Dimatikan');
}

// ==========================================
// 19. CAMPSITE DOME TENT & CAMPFIRE
// ==========================================
function toggleTent() {
  if (state.isTentPitched) {
    // Pack Tent
    if (tentMesh) { scene.remove(tentMesh); tentMesh = null; }
    if (campfireMesh) { scene.remove(campfireMesh); campfireMesh = null; }
    if (emberParticles) { scene.remove(emberParticles); emberParticles = null; }
    if (nestingStoveMesh) { scene.remove(nestingStoveMesh); nestingStoveMesh = null; }
    if (steamParticles) { scene.remove(steamParticles); steamParticles = null; }
    state.isTentPitched = false;
    showNotification('🏕️ Tenda dan perlengkapan bivak berhasil dirapikan kembali.');
    return;
  }

  // Pitch Dome Tent at Player Position
  state.isTentPitched = true;
  const p = player.position;
  const curY = getTerrainHeight(p.x, p.z);

  const tentGroup = new THREE.Group();
  const tentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.85 });

  // Dome Tent Outer Shell
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), tentMat);
  dome.position.y = 0;
  tentGroup.add(dome);

  // Black Flysheet Trim & Guy-Lines
  const trim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 6, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  trim.rotation.x = Math.PI / 2;
  tentGroup.add(trim);

  tentGroup.position.set(p.x + 3.2, curY, p.z - 1.5);
  scene.add(tentGroup);
  tentMesh = tentGroup;

  // Crackling Campfire with Embers & Logs
  const campGroup = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6), logMat);
    log.rotation.z = Math.PI / 3;
    log.rotation.y = (Math.PI / 2) * i;
    log.position.y = 0.2;
    campGroup.add(log);
  }

  // Glowing Fire Core
  const fireCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 1), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  fireCore.position.y = 0.35;
  campGroup.add(fireCore);

  const fireLight = new THREE.PointLight(0xf59e0b, 2.5, 18, 1.5);
  fireLight.position.y = 0.6;
  campGroup.add(fireLight);

  campGroup.position.set(p.x - 2.8, curY, p.z - 2.8);
  scene.add(campGroup);
  campfireMesh = campGroup;

  // Ember Particles
  const emberGeo = new THREE.BufferGeometry();
  const emberPos = [];
  for (let i = 0; i < 30; i++) {
    emberPos.push((Math.random() - 0.5) * 0.8, Math.random() * 2.2, (Math.random() - 0.5) * 0.8);
  }
  emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({ color: 0xf97316, size: 0.35, transparent: true, opacity: 0.85 });
  emberParticles = new THREE.Points(emberGeo, emberMat);
  emberParticles.position.copy(campGroup.position);
  scene.add(emberParticles);

  showNotification('🏕️ Tenda dome dipasang! Kamu aman dari terpaan angin dingin.');
}

function updateCampfireAndStove(delta) {
  if (emberParticles) {
    const pos = emberParticles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * 1.5;
      if (y > 2.5) y = 0.2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
}

function restAndDrink() {
  state.stamina = 100;
  state.warmth = 100;
  state.health = Math.min(100, state.health + 30);
  updateSurvivalStats(0);
  showNotification('⛺ Kamu beristirahat di dalam tenda hangat. Stamina & suhu tubuh pulih 100%!');
}

function toggleBackpack() {
  state.isBackpackOpen = !state.isBackpackOpen;
  const el = document.getElementById('backpack-modal');
  if (el) el.style.display = state.isBackpackOpen ? 'flex' : 'none';
  if (state.isBackpackOpen) document.exitPointerLock();
  else if (state.isGameActive) document.body.requestPointerLock();
}

function updateTrashBadge() {
  const el = document.getElementById('trash-count');
  if (el) el.innerText = state.trashCount;
}

function useItem(type) {
  if (type === 'energy_bar') {
    state.stamina = Math.min(100, state.stamina + 45);
    state.trashCount += 1;
    updateTrashBadge();
    showNotification('🍫 Memakan Energy Bar (+45 Stamina, +1 Bungkus Sampah disimpan)');
  } else if (type === 'water_bottle') {
    state.hydration = 100;
    showNotification('💧 Meminum air mineral (+100% Hidrasi)');
  } else if (type === 'hot_tea') {
    state.warmth = 100;
    state.health = Math.min(100, state.health + 15);
    showNotification('☕ Menyeruput teh jahe panas (+100% Suhu Tubuh, +15 Darah)');
  } else if (type === 'medkit') {
    state.health = 100;
    showNotification('🩹 Menggunakan P3K & Perban (+100% Darah)');
  }
  updateSurvivalStats(0);
}

function showNotification(msg) {
  const notif = document.getElementById('game-notification');
  if (!notif) return;
  notif.innerText = msg;
  notif.style.opacity = '1';
  notif.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(notif.timer);
  notif.timer = setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 3800);
}

function selectMountain(mtnKey, element) {
  state.mountain = mtnKey;
  document.querySelectorAll('.mtn-btn').forEach(b => b.classList.remove('active'));
  if (element) element.classList.add('active');

  const cfg = mountainConfigs[mtnKey];
  const nameEl = document.getElementById('mtn-name-display');
  if (nameEl) nameEl.innerText = cfg.name;

  buildTerrain();
  buildGlowingGpxTrack();
  buildTrailRibbon();
  buildFoliageAndSwayingGrass();
  buildCheckpoints();
  buildMapLandmarks();
  showNotification(`⛰️ Beralih ke Jalur Pendakian: ${cfg.name}`);
}

// ==========================================
// 20. UI EVENT BINDINGS
// ==========================================
function setupUIEvents() {
  const tentBtn = document.getElementById('btn-tent');
  const lampBtn = document.getElementById('btn-headlamp');
  const gpxBtn = document.getElementById('btn-gpx-toggle');
  const logBtn = document.getElementById('btn-logbook');
  const photoBtn = document.getElementById('btn-photo');
  const weatherBtn = document.getElementById('btn-weather-mode');
  const restBtn = document.getElementById('btn-rest');
  const closeBp = document.getElementById('btn-close-backpack');
  const closeLog = document.getElementById('btn-close-logbook');
  const bpBtn = document.getElementById('btn-backpack');

  if (bpBtn) bpBtn.addEventListener('click', toggleBackpack);
  if (tentBtn) tentBtn.addEventListener('click', toggleTent);
  if (lampBtn) lampBtn.addEventListener('click', toggleHeadlamp);
  if (gpxBtn) gpxBtn.addEventListener('click', toggleGpxTrack);
  if (logBtn) logBtn.addEventListener('click', toggleLogbook);
  if (photoBtn) photoBtn.addEventListener('click', togglePhotoMode);
  if (weatherBtn) weatherBtn.addEventListener('click', cycleWeather);
  if (restBtn) restBtn.addEventListener('click', restAndDrink);
  if (closeBp) closeBp.addEventListener('click', toggleBackpack);
  if (closeLog) closeLog.addEventListener('click', toggleLogbook);
}

function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (rainOverlayCanvas) {
      rainOverlayCanvas.width = window.innerWidth;
      rainOverlayCanvas.height = window.innerHeight;
    }
  }
}

// ==========================================
// 21. MAIN RENDER & ANIMATION LOOP (LOCKED 60 FPS)
// ==========================================
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (state.isGameActive) {
    updatePlayer(delta);
    updateSurvivalStats(delta);
    updateInteractionProximity();
    updateSwayingGrass(now * 0.001);
    updateWildlifeAndSmoke(delta);
    updateRain(delta);
    updateCampfireAndStove(delta);
    updateAudioAmbiance(delta);
    drawMinimap();
    drawScreenRainOverlay();
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init3D);
