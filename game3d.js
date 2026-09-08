/**
 * TrailRute 3D - Ultra-Reliable, 100% Guaranteed Visible 3D Mountain Engine
 * Fixes:
 * - Proper terrain surface height initialization (Camera is never underground!)
 * - Crisp Linear Fog & Vibrant Mountain Blue Sky Background
 * - Robust Standard Meshes (No zero-determinant instancing matrix bugs)
 * - Explicit WebGL Canvas Styling (width: 100%, height: 100%, z-index: 1)
 * - Safe Shadow & Lighting Setup for All GPUs (Intel, Nvidia, Apple, Mobile)
 */

// Global Game State
const state = {
  mountain: 'prau',
  baseElevation: 1700,
  maxElevation: 2565,
  currentElevation: 1700,
  health: 100,
  stamina: 100,
  warmth: 100,
  hydration: 100,
  isTentPitched: false,
  headlampOn: false,
  isBackpackOpen: false,
  isPhotoMode: false,
  isBinocularActive: false,
  weatherMode: 0, // 0: Cerah Pagi, 1: Siang, 2: Hujan, 3: Malam
  tempBase: 16.0,
  windSpeed: 16,
  currentPosName: 'Basecamp Patakbanteng',
  isGameActive: false,
  activeNPC: null
};

const weatherNames = ['Pagi Cerah Sejuk ☀️', 'Siang Sabana ⛅', 'Badai Hujan & Kabut 🌧️', 'Malam Bintang 🌌'];

const mountainConfigs = {
  prau: {
    name: 'Gunung Prau',
    base: 1700,
    peak: 2565,
    heightScale: 140,
    basecampName: 'Basecamp Patakbanteng',
    colorBase: 0x2e7d32,
    colorMid: 0x8bc34a,
    colorPeak: 0x8d6e63
  },
  merbabu: {
    name: 'Gunung Merbabu',
    base: 1830,
    peak: 3145,
    heightScale: 195,
    basecampName: 'Basecamp Selo',
    colorBase: 0x1b5e20,
    colorMid: 0x7cb342,
    colorPeak: 0x5d4037
  },
  sumbing: {
    name: 'Gunung Sumbing',
    base: 1450,
    peak: 3371,
    heightScale: 245,
    basecampName: 'Basecamp Garung',
    colorBase: 0x33691e,
    colorMid: 0x689f38,
    colorPeak: 0x3e2723
  }
};

// Three.js Core
let scene, camera, renderer, terrainMesh;
let directionalLight, ambientLight, skyLight, headlampLight, sunMesh, moonMesh, starField;
let cloudMeshLayer1;
let tentMesh = null, campfireMesh = null, emberParticles = null;
let checkpoints = [], npcs = [];
let trees = [], boulders = [], flowers = [];
let trekkingPoleGroup = null;
let rainParticles = null, rainGeo = null;

// Audio System
let audioCtx = null;
let windGain = null, rainGain = null;
let birdTimer = 0, stepTimer = 0;

// Movement & Physics
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ShiftLeft: false, Space: false };
const player = {
  position: new THREE.Vector3(0, 10, 260),
  velocity: new THREE.Vector3(),
  speed: 18,
  runMultiplier: 1.6,
  isGrounded: true,
  height: 2.2,
  pitch: -0.05,
  yaw: 0,
  bobTimer: 0
};

const TERRAIN_SIZE = 700;
const TERRAIN_SEGMENTS = 120;

// Procedural Audio Engine
function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Wind Sound
    const windSource = audioCtx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(320, audioCtx.currentTime);

    windGain = audioCtx.createGain();
    windGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(audioCtx.destination);
    windSource.start(0);

    // Rain Sound
    const rainSource = audioCtx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.setValueAtTime(1100, audioCtx.currentTime);
    rainFilter.Q.setValueAtTime(0.8, audioCtx.currentTime);

    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    rainSource.start(0);
  } catch (e) {}
}

function playFootstepSound(isSprinting) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const freq = 85 + Math.random() * 45;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.08);

    const vol = isSprinting ? 0.09 : 0.045;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playBirdChirp() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(2400 + Math.random() * 400, now);
    osc.frequency.linearRampToValueAtTime(3200 + Math.random() * 400, now + 0.06);
    osc.frequency.linearRampToValueAtTime(2600, now + 0.12);

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
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.55);
      } catch (e) {}
    }, idx * 140);
  });
}

// Main 3D Engine Initialization
function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Scene with crisp mountain blue sky
  scene = new THREE.Scene();
  const skyColor = new THREE.Color(0x87ceeb); // Clear Alpine Blue Sky
  scene.background = skyColor;
  scene.fog = new THREE.Fog(0x87ceeb, 120, 1100);

  // 2. Camera Setup
  const initialY = getTerrainHeight(0, 260) + player.height;
  player.position.set(0, initialY, 260);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1800);
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // 3. Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.zIndex = '1';
  container.appendChild(renderer.domElement);

  // 4. Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  skyLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.45);
  scene.add(skyLight);

  directionalLight = new THREE.DirectionalLight(0xfff3e0, 1.4);
  directionalLight.position.set(200, 320, 180);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 900;
  directionalLight.shadow.camera.left = -300;
  directionalLight.shadow.camera.right = 300;
  directionalLight.shadow.camera.top = 300;
  directionalLight.shadow.camera.bottom = -300;
  scene.add(directionalLight);

  // Headlamp
  headlampLight = new THREE.SpotLight(0xffffff, 0, 95, Math.PI / 4.2, 0.35, 1);
  headlampLight.position.copy(camera.position);
  camera.add(headlampLight.target);
  headlampLight.target.position.set(0, 0, -10);
  scene.add(headlampLight);
  scene.add(camera);

  // 5. Build Game World
  buildCelestialBodies();
  buildTrekkingPole();
  buildTerrain();
  buildSeaOfClouds();
  buildTrailRibbon();
  buildFoliageAndRocks();
  buildCheckpoints();
  buildNPCs();
  buildRainSystem();

  // 6. Listeners & Controls
  window.addEventListener('resize', onWindowResize);
  setupControls();
  setupUIEvents();

  // 7. Render Loop
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (state.isGameActive) {
      updatePlayer(delta);
      updateSurvivalStats(delta);
      updateWeatherDisplay();
      updateAudioAmbiance(delta);
      updateRain(delta);
      updateCampfireEmbers(delta);
      updateNPCProximity();
      drawMinimap();
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

// Celestial Sun & Stars
function buildCelestialBodies() {
  const sunGeo = new THREE.SphereGeometry(20, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
  sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.set(380, 240, -320);
  scene.add(sunMesh);

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 1200; i++) {
    const theta = Math.random() * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * Math.random() - 1.0);
    const r = 850;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi));
    const z = r * Math.sin(phi) * Math.sin(theta);
    starPos.push(x, y, z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);
}

// Height Formula for Slopes & Summits
function getTerrainHeight(x, z) {
  const cfg = mountainConfigs[state.mountain];
  const peakX = 0;
  const peakZ = -210;
  const distToPeak = Math.hypot(x - peakX, z - peakZ);
  
  let h = Math.max(0, (1.0 - (distToPeak / (TERRAIN_SIZE * 0.72)))) * cfg.heightScale;
  h += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 18;
  h += Math.sin(x * 0.065 + z * 0.045) * 6.5;
  h += Math.cos(x * 0.12 - z * 0.08) * 2.5;

  if (z > 230) {
    h = Math.max(2, h * 0.25);
  }
  return h;
}

// Build 3D Mountain Terrain
function buildTerrain() {
  if (terrainMesh) scene.remove(terrainMesh);

  terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  const cfg = mountainConfigs[state.mountain];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const ratio = Math.min(1.0, Math.max(0, y / cfg.heightScale));
    
    if (ratio < 0.30) {
      color.setHex(cfg.colorBase);
    } else if (ratio < 0.72) {
      color.setHex(cfg.colorMid);
    } else {
      color.setHex(cfg.colorPeak);
    }

    colors.push(color.r, color.g, color.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true
  });

  terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);
}

// Sea of Clouds in Low Valleys
function buildSeaOfClouds() {
  if (cloudMeshLayer1) scene.remove(cloudMeshLayer1);
  const cloudGeo = new THREE.PlaneGeometry(1200, 1200, 16, 16);
  cloudGeo.rotateX(-Math.PI / 2);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    depthWrite: false
  });
  cloudMeshLayer1 = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMeshLayer1.position.y = 28;
  scene.add(cloudMeshLayer1);
}

// First-Person Trekking Pole Model
function buildTrekkingPole() {
  if (trekkingPoleGroup) camera.remove(trekkingPoleGroup);
  trekkingPoleGroup = new THREE.Group();

  const shaftGeo = new THREE.CylinderGeometry(0.015, 0.022, 1.35, 8);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.25 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  trekkingPoleGroup.add(shaft);

  const gripGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.38, 8);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, 0.54, 0);
  trekkingPoleGroup.add(grip);

  const basketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10);
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const basket = new THREE.Mesh(basketGeo, basketMat);
  basket.position.set(0, -0.56, 0);
  trekkingPoleGroup.add(basket);

  trekkingPoleGroup.position.set(0.38, -0.38, -0.65);
  trekkingPoleGroup.rotation.set(0.2, 0.1, -0.15);
  camera.add(trekkingPoleGroup);
}

// Trail Line Connecting Checkpoints
function buildTrailRibbon() {
  const trailWaypoints = [
    new THREE.Vector3(0, 0, 260),
    new THREE.Vector3(-15, 0, 190),
    new THREE.Vector3(20, 0, 100),
    new THREE.Vector3(-8, 0, -20),
    new THREE.Vector3(12, 0, -110),
    new THREE.Vector3(0, 0, -200)
  ];

  const curve = new THREE.CatmullRomCurve3(trailWaypoints);
  const points = curve.getPoints(80);

  const pathGeo = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const y = getTerrainHeight(pt.x, pt.z) + 0.35;
    vertices.push(pt.x, y, pt.z);
  }

  pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const pathMat = new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 3 });
  const trailLine = new THREE.Line(pathGeo, pathMat);
  scene.add(trailLine);
}

// Trees, Boulders & Edelweiss Flowers
function buildFoliageAndRocks() {
  trees.forEach(t => scene.remove(t));
  boulders.forEach(b => scene.remove(b));
  flowers.forEach(f => scene.remove(f));
  trees = [];
  boulders = [];
  flowers = [];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x155e27 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
  const edelweissMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });

  // 1. Pine Trees
  for (let i = 0; i < 180; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.7);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.7);
    const y = getTerrainHeight(x, z);

    if (y > 6 && y < 95 && (Math.abs(x) > 6 || z > 200 || z < -100)) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 4.0, 5), trunkMat);
      trunk.position.y = 2.0;
      trunk.castShadow = true;
      tree.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.0, 5), leafMat);
      f1.position.y = 4.8;
      f1.castShadow = true;
      tree.add(f1);

      tree.position.set(x, y, z);
      scene.add(tree);
      trees.push(tree);
    }
  }

  // 2. Boulders
  for (let i = 0; i < 70; i++) {
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.65);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE * 0.65);
    const y = getTerrainHeight(x, z);

    if (y > 25) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat);
      rock.position.set(x, y + 0.4, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(rock);
      boulders.push(rock);
    }
  }

  // 3. Edelweiss
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = -120 + (Math.random() - 0.5) * 120;
    const y = getTerrainHeight(x, z);

    if (y > 75) {
      const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), edelweissMat);
      flower.position.set(x, y + 0.3, z);
      scene.add(flower);
      flowers.push(flower);
    }
  }
}

function buildCheckpoints() {
  checkpoints.forEach(cp => {
    if (cp.mesh) scene.remove(cp.mesh);
  });

  checkpoints = [
    { name: 'Basecamp Gerbang Rimba', z: 260, x: 0, altPct: 0.0 },
    { name: 'Pos 1 (Mata Air Pinus)', z: 190, x: -15, altPct: 0.25 },
    { name: 'Pos 2 (Batu Tulis)', z: 100, x: 20, altPct: 0.5 },
    { name: 'Pos 3 (Sabana Camp)', z: -20, x: -8, altPct: 0.75, canCamp: true },
    { name: '🏆 PUNCAK TERTINGGI (Summit)', z: -200, x: 0, altPct: 1.0, isSummit: true }
  ];

  checkpoints.forEach(cp => {
    const y = getTerrainHeight(cp.x, cp.z);
    const cpGroup = new THREE.Group();

    if (cp.isSummit) {
      const tugu = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 3.0, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
      );
      tugu.position.y = 1.5;
      cpGroup.add(tugu);

      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 5.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      tiang.position.set(0, 4.0, 0);
      cpGroup.add(tiang);

      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.0, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      flag.position.set(0.8, 4.5, 0);
      cpGroup.add(flag);
    } else {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      pole.position.y = 1.9;
      cpGroup.add(pole);

      const badgeColor = cp.canCamp ? 0x10b981 : 0x0284c7;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: badgeColor })
      );
      board.position.set(0.75, 3.2, 0);
      cpGroup.add(board);
    }

    cpGroup.position.set(cp.x, y, cp.z);
    scene.add(cpGroup);
    cp.mesh = cpGroup;
    cp.elevation = Math.round(state.baseElevation + (state.maxElevation - state.baseElevation) * cp.altPct);
  });
}

function buildNPCs() {
  npcs.forEach(n => {
    if (n.mesh) scene.remove(n.mesh);
  });
  npcs = [];

  const npcData = [
    {
      name: '🎒 Porter Pak Yanto',
      x: 20, z: 98,
      dialogue: '"Monggo mas, istirahat dulu di Pos 2 ini. Nanti sebelum tanjakan sabana ada mata air jernih di sisi kiri jalur. Tetap jaga ritme nafas ya!"',
      actionText: 'Terima Wedang Jahe (+30 Suhu & +20 Stamina)',
      actionType: 'tea'
    },
    {
      name: '🏕️ Mas Dimas (Pendaki Solo)',
      x: -12, z: -22,
      dialogue: '"Halo bro! Tempat camp Sabana ini aman dari terpaan angin badai. Besok dini hari jam 03.30 kita summit attack bareng yuk ke puncak!"',
      actionText: 'Makan Biskuit Bersama (+35 Stamina)',
      actionType: 'snack'
    }
  ];

  npcData.forEach(data => {
    const y = getTerrainHeight(data.x, data.z);
    const npcGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2563eb })
    );
    body.position.y = 0.9;
    npcGroup.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffedd5 })
    );
    head.position.y = 1.8;
    npcGroup.add(head);

    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.1, 6),
      new THREE.MeshStandardMaterial({ color: 0xd97706 })
    );
    hat.position.y = 2.05;
    npcGroup.add(hat);

    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.9, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    pack.position.set(0, 1.1, -0.3);
    npcGroup.add(pack);

    npcGroup.position.set(data.x, y, data.z);
    scene.add(npcGroup);

    data.mesh = npcGroup;
    npcs.push(data);
  });
}

function buildRainSystem() {
  const rainCount = 1000;
  rainGeo = new THREE.BufferGeometry();
  const rainPos = [];

  for (let i = 0; i < rainCount; i++) {
    rainPos.push(
      (Math.random() - 0.5) * 160,
      Math.random() * 70,
      (Math.random() - 0.5) * 160
    );
  }

  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x93c5fd,
    size: 0.35,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });

  rainParticles = new THREE.Points(rainGeo, rainMat);
  scene.add(rainParticles);
}

function updateRain(delta) {
  if (!rainParticles) return;
  if (state.weatherMode === 2) {
    rainParticles.material.opacity = 0.85;
    const pos = rainGeo.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] -= delta * 60;
      if (pos[i] < 0) {
        pos[i] = 70;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
    rainParticles.position.set(player.position.x, 0, player.position.z);
  } else {
    rainParticles.material.opacity = 0.0;
  }
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === 'KeyF') toggleHeadlamp();
    if (e.code === 'KeyC') toggleTent();
    if (e.code === 'KeyP') togglePhotoMode();
    if (e.code === 'KeyT') cycleWeather();
    if (e.code === 'KeyE') triggerInteraction();
    if (e.code === 'KeyR') restAndDrink();
    if (e.code === 'Tab' || e.code === 'KeyB') {
      e.preventDefault();
      toggleBackpack();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
  });

  // Binoculars (Right click)
  document.addEventListener('mousedown', (e) => {
    if (e.button === 2 && state.isGameActive && !state.isBackpackOpen) {
      e.preventDefault();
      setBinocular(true);
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && state.isGameActive) {
      e.preventDefault();
      setBinocular(false);
    }
  });
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Mouse Look
  document.addEventListener('click', () => {
    if (state.isGameActive && !state.isBackpackOpen && !state.isPhotoMode && document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      const sens = state.isBinocularActive ? 0.0008 : 0.0022;
      player.yaw -= e.movementX * sens;
      player.pitch -= e.movementY * sens;
      player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
    }
  });
}

function setBinocular(active) {
  state.isBinocularActive = active;
  camera.fov = active ? 20 : 65;
  camera.updateProjectionMatrix();
  const ov = document.getElementById('binocular-overlay');
  if (ov) ov.style.display = active ? 'block' : 'none';
  if (trekkingPoleGroup) trekkingPoleGroup.visible = !active;
}

function updatePlayer(delta) {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

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
    state.stamina = Math.max(0, state.stamina - delta * 9);
  } else if (isMoving) {
    state.stamina = Math.max(0, state.stamina - delta * 2.5);
  } else {
    state.stamina = Math.min(100, state.stamina + delta * 9);
  }

  const nextX = player.position.x + moveDir.x * curSpeed * delta;
  const nextZ = player.position.z + moveDir.z * curSpeed * delta;
  const currentY = getTerrainHeight(player.position.x, player.position.z);
  const nextY = getTerrainHeight(nextX, nextZ);
  const slopeDelta = nextY - currentY;

  if (slopeDelta > 0.8) {
    curSpeed *= Math.max(0.35, 1.0 - (slopeDelta * 0.3));
    state.stamina = Math.max(0, state.stamina - delta * 6);
  }

  player.position.addScaledVector(moveDir, curSpeed * delta);

  const terrainY = getTerrainHeight(player.position.x, player.position.z);
  player.position.y = terrainY + player.height;

  player.position.x = Math.max(-TERRAIN_SIZE * 0.46, Math.min(TERRAIN_SIZE * 0.46, player.position.x));
  player.position.z = Math.max(-TERRAIN_SIZE * 0.46, Math.min(TERRAIN_SIZE * 0.46, player.position.z));

  if (isMoving) {
    player.bobTimer += delta * (isSprinting ? 12 : 7.5);
    const bobOffset = Math.sin(player.bobTimer) * (isSprinting ? 0.08 : 0.04);
    camera.position.set(player.position.x, player.position.y + bobOffset, player.position.z);

    if (trekkingPoleGroup) {
      trekkingPoleGroup.position.y = -0.38 + Math.cos(player.bobTimer) * 0.06;
      trekkingPoleGroup.position.z = -0.65 + Math.sin(player.bobTimer) * 0.08;
      trekkingPoleGroup.rotation.x = 0.2 + Math.sin(player.bobTimer) * 0.18;
    }

    stepTimer += delta * (isSprinting ? 2.6 : 1.7);
    if (stepTimer >= 1.0) {
      stepTimer = 0;
      playFootstepSound(isSprinting);
    }
  } else {
    camera.position.copy(player.position);
    if (trekkingPoleGroup) {
      trekkingPoleGroup.position.set(0.38, -0.38, -0.65);
      trekkingPoleGroup.rotation.set(0.2, 0.1, -0.15);
    }
  }

  if (headlampLight) {
    headlampLight.position.copy(camera.position);
  }

  const cfg = mountainConfigs[state.mountain];
  const elevRatio = Math.min(1.0, Math.max(0, terrainY / cfg.heightScale));
  state.currentElevation = Math.round(state.baseElevation + (state.maxElevation - state.baseElevation) * elevRatio);
  const elevEl = document.getElementById('current-elevation');
  if (elevEl) elevEl.textContent = `${state.currentElevation.toLocaleString()} mdpl`;

  checkpoints.forEach(cp => {
    const dist = Math.hypot(player.position.x - cp.x, player.position.z - cp.z);
    if (dist < 16) {
      if (state.currentPosName !== cp.name) {
        state.currentPosName = cp.name;
        const posEl = document.getElementById('current-pos-name');
        if (posEl) posEl.textContent = cp.name;
        showNotification(`🚩 Tiba di: ${cp.name} (${cp.elevation} mdpl)`);
        if (cp.isSummit) {
          playSummitFanfare();
        }
      }
    }
  });
}

function updateSurvivalStats(delta) {
  state.hydration = Math.max(0, state.hydration - delta * 0.7);

  const lapseTemp = state.tempBase - ((state.currentElevation - state.baseElevation) / 100.0) * 0.65;
  const windV = state.windSpeed;
  const windChill = 13.12 + 0.6215 * lapseTemp - 11.37 * Math.pow(windV, 0.16) + 0.3965 * lapseTemp * Math.pow(windV, 0.16);
  const stormModifier = state.weatherMode === 2 ? 1.8 : 1.0;

  if (windChill < 12 && !state.isTentPitched) {
    state.warmth = Math.max(0, state.warmth - delta * 1.1 * stormModifier);
  }

  const hypoBadge = document.getElementById('hypo-status');
  if (hypoBadge) {
    if (state.warmth < 25) {
      state.health = Math.max(0, state.health - delta * 2.8);
      hypoBadge.textContent = '⚠️ BAHAYA HIPOTERMIA! (Pasang Tenda/Pakai Blanket)';
      hypoBadge.style.color = '#ef4444';
    } else if (state.warmth < 50) {
      hypoBadge.textContent = 'Suhu Dingin Menusuk (Gunakan Jaket/Kopi)';
      hypoBadge.style.color = '#facc15';
    } else {
      hypoBadge.textContent = 'Suhu Tubuh Normal (Aman)';
      hypoBadge.style.color = '#4ade80';
    }
  }

  const hpVal = document.getElementById('val-hp');
  const stmVal = document.getElementById('val-stm');
  const wrmVal = document.getElementById('val-wrm');
  const wtrVal = document.getElementById('val-wtr');

  if (hpVal) hpVal.textContent = Math.round(state.health);
  if (stmVal) stmVal.textContent = Math.round(state.stamina);
  if (wrmVal) wrmVal.textContent = Math.round(state.warmth);
  if (wtrVal) wtrVal.textContent = Math.round(state.hydration);

  const barHp = document.getElementById('bar-hp');
  const barStm = document.getElementById('bar-stm');
  const barWrm = document.getElementById('bar-wrm');
  const barWtr = document.getElementById('bar-wtr');

  if (barHp) barHp.style.width = `${state.health}%`;
  if (barStm) barStm.style.width = `${state.stamina}%`;
  if (barWrm) barWrm.style.width = `${state.warmth}%`;
  if (barWtr) barWtr.style.width = `${state.hydration}%`;

  if (state.health <= 0) {
    state.isGameActive = false;
    document.exitPointerLock();
    alert('⚠️ Kondisi fisik kritis! Tim SAR lereng gunung menjemputmu untuk evakuasi darurat.');
    location.reload();
  }
}

function updateAudioAmbiance(delta) {
  if (windGain && audioCtx && audioCtx.state === 'running') {
    const altRatio = (state.currentElevation - state.baseElevation) / (state.maxElevation - state.baseElevation);
    const targetVol = state.isTentPitched ? 0.02 : (0.04 + altRatio * 0.12);
    windGain.gain.setValueAtTime(targetVol, audioCtx.currentTime);
  }

  if (rainGain && audioCtx && audioCtx.state === 'running') {
    const rainVol = state.weatherMode === 2 ? 0.15 : 0.0;
    rainGain.gain.setValueAtTime(rainVol, audioCtx.currentTime);
  }

  birdTimer += delta;
  if (birdTimer > 8.0) {
    birdTimer = 0;
    if (state.currentElevation < state.baseElevation + 400 && !state.isTentPitched && state.weatherMode !== 2) {
      playBirdChirp();
    }
  }
}

function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.stroke();

  const mapScale = 0.22;
  checkpoints.forEach(cp => {
    const rx = (cp.x - player.position.x) * mapScale;
    const rz = (cp.z - player.position.z) * mapScale;
    const px = cx + rx;
    const py = cy + rz;

    if (Math.hypot(rx, rz) < cx - 6) {
      ctx.fillStyle = cp.isSummit ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, cp.isSummit ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-player.yaw + Math.PI);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function updateNPCProximity() {
  const crosshair = document.getElementById('crosshair');
  let foundNPC = null;

  npcs.forEach(npc => {
    const dist = Math.hypot(player.position.x - npc.x, player.position.z - npc.z);
    if (dist < 8.0) {
      foundNPC = npc;
    }
  });

  state.activeNPC = foundNPC;
  if (crosshair) {
    if (foundNPC) {
      crosshair.classList.add('interactable');
    } else {
      crosshair.classList.remove('interactable');
    }
  }
}

function triggerInteraction() {
  if (state.activeNPC) {
    document.exitPointerLock();
    document.getElementById('dialog-speaker').textContent = state.activeNPC.name;
    document.getElementById('dialog-text').textContent = state.activeNPC.dialogue;
    document.getElementById('dialog-btn-action').textContent = state.activeNPC.actionText;
    document.getElementById('dialog-popup').style.display = 'block';
  } else {
    const summitCP = checkpoints.find(c => c.isSummit);
    if (summitCP && Math.hypot(player.position.x - summitCP.x, player.position.z - summitCP.z) < 12) {
      showNotification('🏆 Tugu Puncak Triangulasi: Menikmati Mahakarya Lautan Awan!');
      playSummitFanfare();
    }
  }
}

function handleDialogAction() {
  if (state.activeNPC) {
    if (state.activeNPC.actionType === 'tea') {
      state.warmth = Math.min(100, state.warmth + 30);
      state.stamina = Math.min(100, state.stamina + 20);
      showNotification('☕ Wedang jahe hangat diminum! Badan terasa segar bertenaga.');
    } else if (state.activeNPC.actionType === 'snack') {
      state.stamina = Math.min(100, state.stamina + 35);
      showNotification('🍫 Menikmati biskuit & bertukar cerita pendakian.');
    }
  }
  closeDialog();
}

function closeDialog() {
  document.getElementById('dialog-popup').style.display = 'none';
  if (state.isGameActive && !state.isBackpackOpen) {
    document.body.requestPointerLock();
  }
}

function cycleWeather() {
  state.weatherMode = (state.weatherMode + 1) % 4;
  const modeName = weatherNames[state.weatherMode];

  if (state.weatherMode === 0) {
    const col = new THREE.Color(0x87ceeb);
    scene.background = col;
    scene.fog = new THREE.Fog(0x87ceeb, 120, 1100);
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.75;
    directionalLight.color.setHex(0xfff3e0);
    directionalLight.intensity = 1.4;
    if (sunMesh) sunMesh.visible = true;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 1) {
    const col = new THREE.Color(0xbae6fd);
    scene.background = col;
    scene.fog = new THREE.Fog(0xbae6fd, 150, 1200);
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.95;
    directionalLight.color.setHex(0xffffff);
    directionalLight.intensity = 1.8;
    if (sunMesh) sunMesh.visible = true;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 2) {
    const col = new THREE.Color(0x475569);
    scene.background = col;
    scene.fog = new THREE.Fog(0x475569, 40, 450);
    ambientLight.color.setHex(0x334155);
    ambientLight.intensity = 0.4;
    directionalLight.color.setHex(0x64748b);
    directionalLight.intensity = 0.3;
    if (sunMesh) sunMesh.visible = false;
    if (starField) starField.material.opacity = 0.0;
    showNotification('🌧️ Badai kabut & hujan turun! Nyalakan headlamp atau pasang tenda!');
  } else if (state.weatherMode === 3) {
    const col = new THREE.Color(0x020617);
    scene.background = col;
    scene.fog = new THREE.Fog(0x020617, 30, 400);
    ambientLight.color.setHex(0x0f172a);
    ambientLight.intensity = 0.25;
    directionalLight.color.setHex(0x38bdf8);
    directionalLight.intensity = 0.2;
    if (sunMesh) sunMesh.visible = false;
    if (starField) starField.material.opacity = 0.85;
    showNotification('🌌 Malam berbintang tiba! Nyalakan Headlamp atau Api Unggun Camp.');
  }

  showNotification(`⛅ Kondisi Cuaca: ${modeName}`);
}

function updateWeatherDisplay() {
  const lapseTemp = (state.tempBase - ((state.currentElevation - state.baseElevation) / 100.0) * 0.65).toFixed(1);
  const windChill = (13.12 + 0.6215 * lapseTemp - 11.37 * Math.pow(state.windSpeed, 0.16) + 0.3965 * lapseTemp * Math.pow(state.windSpeed, 0.16)).toFixed(1);

  const wTemp = document.getElementById('weather-temp');
  const wChill = document.getElementById('windchill-temp');
  const wSpd = document.getElementById('wind-speed');

  if (wTemp) wTemp.textContent = `${lapseTemp}°C ⛅`;
  if (wChill) wChill.textContent = `${windChill}°C`;
  if (wSpd) wSpd.textContent = state.windSpeed;
}

function togglePhotoMode() {
  state.isPhotoMode = !state.isPhotoMode;
  const photoUI = document.getElementById('photo-ui');
  if (photoUI) photoUI.style.display = state.isPhotoMode ? 'flex' : 'none';

  const topLeft = document.getElementById('hud-top-left');
  const topRight = document.getElementById('hud-top-right');
  const btm = document.getElementById('hud-bottom');
  const acts = document.getElementById('hud-actions');
  const cross = document.getElementById('crosshair');

  if (topLeft) topLeft.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (topRight) topRight.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (btm) btm.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (acts) acts.style.display = state.isPhotoMode ? 'none' : 'flex';
  if (cross) cross.style.display = state.isPhotoMode ? 'none' : 'block';

  if (state.isPhotoMode) {
    document.exitPointerLock();
    if (trekkingPoleGroup) trekkingPoleGroup.visible = false;
  } else {
    if (trekkingPoleGroup) trekkingPoleGroup.visible = true;
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

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(30, tempCanvas.height - 90, 420, 60);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`⛰️ ${mountainConfigs[state.mountain].name.toUpperCase()}`, 45, tempCanvas.height - 56);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Ketinggian: ${state.currentElevation.toLocaleString()} mdpl | TrailRute 3D`, 45, tempCanvas.height - 38);

    const a = document.createElement('a');
    a.href = tempCanvas.toDataURL('image/png');
    a.download = `TrailRute_3D_${state.mountain}_${state.currentElevation}mdpl.png`;
    a.click();
    showNotification('📸 Foto lanskap puncak berhasil diunduh!');
  };
  img.src = dataURL;
}

function toggleHeadlamp() {
  state.headlampOn = !state.headlampOn;
  headlampLight.intensity = state.headlampOn ? 3.0 : 0;
  showNotification(state.headlampOn ? '🔦 Headlamp Dinyalakan' : '🔦 Headlamp Dimatikan');
}

function toggleTent() {
  if (state.isTentPitched) {
    if (tentMesh) { scene.remove(tentMesh); tentMesh = null; }
    if (campfireMesh) { scene.remove(campfireMesh); campfireMesh = null; }
    if (emberParticles) { scene.remove(emberParticles); emberParticles = null; }
    state.isTentPitched = false;
    const btn = document.getElementById('btn-tent');
    if (btn) btn.innerHTML = `🏕️ Pasang Tenda <span class="key-badge">C</span>`;
    showNotification('🏕️ Tenda & camp dibongkar kembali ke ransel');
  } else {
    const tentGroup = new THREE.Group();
    const tentDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.35 })
    );
    tentGroup.add(tentDome);

    const fwd = new THREE.Vector3(0, 0, -5.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
    const tentPos = player.position.clone().add(fwd);
    tentPos.y = getTerrainHeight(tentPos.x, tentPos.z);
    tentGroup.position.copy(tentPos);

    scene.add(tentGroup);
    tentMesh = tentGroup;

    const fireGroup = new THREE.Group();
    const fireLight = new THREE.PointLight(0xff7700, 2.5, 18);
    fireLight.position.set(0, 0.8, 0);
    fireGroup.add(fireLight);

    const rocks = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.2, 8, 10),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    rocks.rotation.x = Math.PI / 2;
    fireGroup.add(rocks);

    fireGroup.position.set(tentPos.x + 3.2, tentPos.y + 0.2, tentPos.z + 1.2);
    scene.add(fireGroup);
    campfireMesh = fireGroup;

    const emberGeo = new THREE.BufferGeometry();
    const emberPos = [];
    for (let i = 0; i < 30; i++) {
      emberPos.push((Math.random() - 0.5) * 1.2, Math.random() * 2.5, (Math.random() - 0.5) * 1.2);
    }
    emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    emberParticles = new THREE.Points(emberGeo, emberMat);
    emberParticles.position.copy(fireGroup.position);
    scene.add(emberParticles);

    state.isTentPitched = true;
    state.warmth = Math.min(100, state.warmth + 40);
    const btn = document.getElementById('btn-tent');
    if (btn) btn.innerHTML = `🏕️ Bongkar Tenda <span class="key-badge">C</span>`;
    showNotification('🏕️ Tenda Dome & Api Unggun berdiri! Suhu tubuh pulih hangat.');
  }
}

function updateCampfireEmbers(delta) {
  if (emberParticles) {
    const pos = emberParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += delta * 1.5;
      if (pos[i] > 3.0) pos[i] = 0.2;
    }
    emberParticles.geometry.attributes.position.needsUpdate = true;
  }
}

function restAndDrink() {
  state.stamina = Math.min(100, state.stamina + 30);
  state.hydration = Math.min(100, state.hydration + 25);
  showNotification('☕ Rehat sejenak menikmati pemandangan alam.');
}

function toggleBackpack() {
  const modal = document.getElementById('backpack-modal');
  state.isBackpackOpen = !state.isBackpackOpen;
  if (modal) modal.style.display = state.isBackpackOpen ? 'block' : 'none';
  if (state.isBackpackOpen) {
    document.exitPointerLock();
  }
}

function useItem(type) {
  if (type === 'water') {
    state.hydration = Math.min(100, state.hydration + 45);
    showNotification('💧 Minum air mineral segar (+45 Hidrasi)');
  } else if (type === 'coffee') {
    state.warmth = Math.min(100, state.warmth + 30);
    state.stamina = Math.min(100, state.stamina + 25);
    showNotification('☕ Menyeruput kopi jahe panas (+30 Suhu & +25 Stamina)');
  } else if (type === 'noodle') {
    state.warmth = Math.min(100, state.warmth + 25);
    state.stamina = Math.min(100, state.stamina + 35);
    showNotification('🍜 Menikmati mie rebus telur hangat (+25 Suhu & +35 Stamina)');
  } else if (type === 'chocolate') {
    state.stamina = Math.min(100, state.stamina + 40);
    showNotification('🍫 Memakan cokelat & madu sachet (+40 Stamina)');
  } else if (type === 'blanket') {
    state.warmth = 100;
    showNotification('🩹 Membalut tubuh dengan Emergency Thermal Blanket (Suhu 100%)');
  }
  toggleBackpack();
}

function showNotification(msg) {
  const banner = document.getElementById('notif-banner');
  if (banner) {
    banner.textContent = msg;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 3200);
  }
}

function selectMountain(mtnKey, element) {
  document.querySelectorAll('.mtn-card').forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');
  state.mountain = mtnKey;
  const cfg = mountainConfigs[mtnKey];
  state.baseElevation = cfg.base;
  state.maxElevation = cfg.peak;
  state.currentPosName = cfg.basecampName;
  const nameEl = document.getElementById('mtn-name-display');
  const posEl = document.getElementById('current-pos-name');
  if (nameEl) nameEl.textContent = cfg.name;
  if (posEl) posEl.textContent = cfg.basecampName;
}

function setupUIEvents() {
  const startBtn = document.getElementById('btn-start-game');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const overlay = document.getElementById('overlay-screen');
      if (overlay) overlay.style.display = 'none';

      buildTerrain();
      buildFoliageAndRocks();
      buildCheckpoints();
      buildNPCs();

      const initialY = getTerrainHeight(0, 260) + player.height;
      player.position.set(0, initialY, 260);
      player.yaw = 0;
      player.pitch = -0.05;
      state.isGameActive = true;
      document.body.requestPointerLock();
      initAudio();
      showNotification('🌲 Selamat mendaki! Ikuti jalur patok merah-putih menuju puncak!');
    });
  }

  const bpBtn = document.getElementById('btn-backpack');
  const tentBtn = document.getElementById('btn-tent');
  const lampBtn = document.getElementById('btn-headlamp');
  const photoBtn = document.getElementById('btn-photo');
  const weatherBtn = document.getElementById('btn-weather-toggle');
  const restBtn = document.getElementById('btn-rest');
  const closeBp = document.getElementById('close-backpack');

  if (bpBtn) bpBtn.addEventListener('click', toggleBackpack);
  if (tentBtn) tentBtn.addEventListener('click', toggleTent);
  if (lampBtn) lampBtn.addEventListener('click', toggleHeadlamp);
  if (photoBtn) photoBtn.addEventListener('click', togglePhotoMode);
  if (weatherBtn) weatherBtn.addEventListener('click', cycleWeather);
  if (restBtn) restBtn.addEventListener('click', restAndDrink);
  if (closeBp) closeBp.addEventListener('click', toggleBackpack);
}

function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', init3D);
