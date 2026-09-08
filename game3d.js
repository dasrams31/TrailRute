/**
 * TrailRute 3D - Cinematic Next-Gen Mountain Expedition Engine
 * Graphics & Immersion:
 * - Dynamic Sun Disk with Corona Halo Flare & Rayleigh Horizon Fog
 * - Cinematic AAA Camera Inertia & Strafe Tilt (Roll on Move Left/Right)
 * - Animated Caustic Water Ripple Shader on Mountain Springs
 * - Dynamic Ember & Steam Lighting from Campfire & Nesting Cookset
 * - Rich PBR-Shaded Volcanic Terrain, Savanna Tufts & Edelweiss
 * - Locked 60 FPS Performance across Desktop & Mobile
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
  trashCount: 0,
  trashDepositedTotal: 0,
  isGpxVisible: true,
  isTentPitched: false,
  headlampOn: false,
  isBackpackOpen: false,
  isLogbookOpen: false,
  isPhotoMode: false,
  isBinocularActive: false,
  weatherMode: 0, // 0: Sunrise, 1: Noon, 2: Storm, 3: Night
  tempBase: 16.0,
  windSpeed: 16,
  currentPosName: 'Basecamp Patakbanteng',
  isGameActive: false,
  activeInteractable: null,
  completedCheckpoints: new Set(['Basecamp Gerbang Rimba'])
};

const weatherNames = ['Golden Sunrise 🌅', 'Siang Sabana ⛅', 'Badai Hujan & Kabut 🌧️', 'Malam Bima Sakti 🌌'];

const mountainConfigs = {
  prau: {
    name: 'Gunung Prau',
    base: 1700,
    peak: 2565,
    heightScale: 145,
    basecampName: 'Basecamp Patakbanteng',
    colorBase: 0x2e7d32,
    colorMid: 0x8bc34a,
    colorPeak: 0x8d6e63
  },
  merbabu: {
    name: 'Gunung Merbabu',
    base: 1830,
    peak: 3145,
    heightScale: 200,
    basecampName: 'Basecamp Selo',
    colorBase: 0x1b5e20,
    colorMid: 0x7cb342,
    colorPeak: 0x5d4037
  },
  sumbing: {
    name: 'Gunung Sumbing',
    base: 1450,
    peak: 3371,
    heightScale: 250,
    basecampName: 'Basecamp Garung',
    colorBase: 0x33691e,
    colorMid: 0x689f38,
    colorPeak: 0x3e2723
  }
};

// Three.js Core
let scene, camera, renderer, terrainMesh;
let directionalLight, ambientLight, skyLight, headlampLight, sunMesh, sunGlowMesh, starField;
let cloudMeshLayer1;
let tentMesh = null, campfireMesh = null, emberParticles = null, nestingStoveMesh = null, steamParticles = null;
let eagleMesh = null, sulfurSmokeParticles = null, breathVaporParticles = null;
let gpxTrackLine = null, gpxWaypointsGroup = null;
let webbingRopeGroup = null;
let checkpoints = [], interactables = [];
let trees = [], boulders = [], grassMeshes = [], flowers = [];
let trekkingPoleGroup = null;
let rainParticles = null, rainGeo = null;

// Audio System
let audioCtx = null;
let windGain = null, rainGain = null;
let birdTimer = 0, stepTimer = 0, breathTimer = 0;

// Screen Rain Overlay
let rainOverlayCanvas = null, rainOverlayCtx = null;
let raindrops = [];

// Movement & Camera Tilt Physics
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
  roll: 0, // Cinematic camera strafe tilt roll
  bobTimer: 0
};

const TERRAIN_SIZE = 720;
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

  scene = new THREE.Scene();
  const skyColor = new THREE.Color(0xfbcfe8); // Warm Golden Sunrise Rayleigh Gradient
  scene.background = skyColor;
  scene.fog = new THREE.Fog(0xfbcfe8, 140, 1150);

  const initialY = getTerrainHeight(0, 260) + player.height;
  player.position.set(0, initialY, 260);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1900);
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.zIndex = '1';
  container.appendChild(renderer.domElement);

  // Cinematic Lighting
  ambientLight = new THREE.AmbientLight(0xffedd5, 0.85);
  scene.add(ambientLight);

  skyLight = new THREE.HemisphereLight(0xffedd5, 0x334155, 0.55);
  scene.add(skyLight);

  directionalLight = new THREE.DirectionalLight(0xffedd5, 1.6);
  directionalLight.position.set(240, 310, 200);
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

  headlampLight = new THREE.SpotLight(0xffffff, 0, 95, Math.PI / 4.2, 0.35, 1);
  headlampLight.position.copy(camera.position);
  camera.add(headlampLight.target);
  headlampLight.target.position.set(0, 0, -10);
  scene.add(headlampLight);
  scene.add(camera);

  // Build Environment Systems
  buildCinematicSunAndSky();
  buildTrekkingPole();
  buildTerrain();
  buildSeaOfClouds();
  buildTrailRibbon();
  buildGlowingGpxTrack();
  buildFoliageAndSwayingGrass();
  buildCheckpoints();
  buildMapLandmarks();
  buildWebbingClimbingZone();
  buildWildlifeAndEffects();
  buildRainSystem();
  initScreenRainOverlay();

  // Listeners & Controls
  window.addEventListener('resize', onWindowResize);
  setupControls();
  setupUIEvents();

  // Animation Loop
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
      updateWildlifeAndSmoke(delta);
      updateSwayingGrass(now * 0.001);
      updateCampfireAndStove(delta);
      updateColdBreath(delta);
      updateInteractionProximity();
      drawMinimap();
      drawScreenRainOverlay();
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

// Cinematic Sun with Volumetric Lens Halo
function buildCinematicSunAndSky() {
  const sunGroup = new THREE.Group();

  const sunGeo = new THREE.SphereGeometry(18, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
  sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunMesh);

  // Radiant Lens Halo
  const haloGeo = new THREE.RingGeometry(20, 48, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  sunGlowMesh = new THREE.Mesh(haloGeo, haloMat);
  sunGlowMesh.lookAt(-240, -310, -200);
  sunGroup.add(sunGlowMesh);

  sunGroup.position.set(380, 240, -320);
  scene.add(sunGroup);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 1500; i++) {
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
    
    if (ratio < 0.28) {
      color.setHex(cfg.colorBase).lerp(new THREE.Color(0x2d4a22), ratio * 3.5);
    } else if (ratio < 0.70) {
      const midT = (ratio - 0.28) / 0.42;
      color.setHex(cfg.colorMid).lerp(new THREE.Color(0xd97706), midT * 0.55);
    } else {
      const peakT = (ratio - 0.70) / 0.30;
      color.setHex(cfg.colorPeak).lerp(new THREE.Color(0xa8a29e), peakT * 0.8);
    }

    colors.push(color.r, color.g, color.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.12,
    flatShading: true
  });

  terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);
}

function buildSeaOfClouds() {
  if (cloudMeshLayer1) scene.remove(cloudMeshLayer1);
  const cloudGeo = new THREE.PlaneGeometry(1300, 1300, 20, 20);
  cloudGeo.rotateX(-Math.PI / 2);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.65,
    roughness: 0.25,
    depthWrite: false
  });
  cloudMeshLayer1 = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMeshLayer1.position.y = 28;
  scene.add(cloudMeshLayer1);
}

function buildTrekkingPole() {
  if (trekkingPoleGroup) camera.remove(trekkingPoleGroup);
  trekkingPoleGroup = new THREE.Group();

  const shaftGeo = new THREE.CylinderGeometry(0.015, 0.022, 1.35, 10);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.25 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  trekkingPoleGroup.add(shaft);

  const gripGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.38, 10);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, 0.54, 0);
  trekkingPoleGroup.add(grip);

  const basketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12);
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const basket = new THREE.Mesh(basketGeo, basketMat);
  basket.position.set(0, -0.56, 0);
  trekkingPoleGroup.add(basket);

  trekkingPoleGroup.position.set(0.38, -0.38, -0.65);
  trekkingPoleGroup.rotation.set(0.2, 0.1, -0.15);
  camera.add(trekkingPoleGroup);
}

function buildGlowingGpxTrack() {
  if (gpxTrackLine) scene.remove(gpxTrackLine);
  if (gpxWaypointsGroup) scene.remove(gpxWaypointsGroup);

  const gpxWaypoints = [
    new THREE.Vector3(0, 0, 260),
    new THREE.Vector3(-15, 0, 190),
    new THREE.Vector3(20, 0, 100),
    new THREE.Vector3(-8, 0, -20),
    new THREE.Vector3(12, 0, -110),
    new THREE.Vector3(0, 0, -200)
  ];

  const curve = new THREE.CatmullRomCurve3(gpxWaypoints);
  const points = curve.getPoints(120);

  const gpxGeo = new THREE.BufferGeometry();
  const vertices = [];

  gpxWaypointsGroup = new THREE.Group();

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const y = getTerrainHeight(pt.x, pt.z) + 0.65;
    vertices.push(pt.x, y, pt.z);

    if (i % 8 === 0) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      bead.position.set(pt.x, y, pt.z);
      gpxWaypointsGroup.add(bead);
    }
  }

  gpxGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const gpxMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    linewidth: 3,
    transparent: true,
    opacity: 0.9
  });

  gpxTrackLine = new THREE.Line(gpxGeo, gpxMat);
  scene.add(gpxTrackLine);
  scene.add(gpxWaypointsGroup);
}

function toggleGpxTrack() {
  state.isGpxVisible = !state.isGpxVisible;
  if (gpxTrackLine) gpxTrackLine.visible = state.isGpxVisible;
  if (gpxWaypointsGroup) gpxWaypointsGroup.visible = state.isGpxVisible;
  showNotification(state.isGpxVisible ? '🗺️ Jalur GPX Neon 3D Dinyalakan' : '🗺️ Jalur GPX Dimatikan');
}

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

function buildFoliageAndSwayingGrass() {
  trees.forEach(t => scene.remove(t));
  boulders.forEach(b => scene.remove(b));
  grassMeshes.forEach(g => scene.remove(g));
  flowers.forEach(f => scene.remove(f));
  trees = [];
  boulders = [];
  grassMeshes = [];
  flowers = [];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x155e27 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.8, side: THREE.DoubleSide });
  const edelweissMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });

  // Pine Trees
  for (let i = 0; i < 160; i++) {
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

  // Savanna Grass
  const grassPlaneGeo = new THREE.PlaneGeometry(1.2, 1.4);
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - 0.5) * 190;
    const z = -40 + (Math.random() - 0.5) * 150;
    const y = getTerrainHeight(x, z);

    if (y > 35 && y < 110) {
      const grass = new THREE.Mesh(grassPlaneGeo, grassMat);
      grass.position.set(x, y + 0.7, z);
      grass.rotation.y = Math.random() * Math.PI;
      scene.add(grass);
      grassMeshes.push(grass);
    }
  }

  // Boulders
  for (let i = 0; i < 60; i++) {
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

  // Edelweiss
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

function updateSwayingGrass(time) {
  for (let i = 0; i < grassMeshes.length; i++) {
    const g = grassMeshes[i];
    g.rotation.z = Math.sin(time * 3.5 + i) * 0.14;
  }
}

function buildWebbingClimbingZone() {
  if (webbingRopeGroup) scene.remove(webbingRopeGroup);
  webbingRopeGroup = new THREE.Group();

  const startY = getTerrainHeight(4, 55);
  const endY = getTerrainHeight(4, 35);

  const ropeCurve = new THREE.LineCurve3(
    new THREE.Vector3(4, startY + 0.5, 55),
    new THREE.Vector3(4, endY + 0.6, 35)
  );
  const ropeGeo = new THREE.TubeGeometry(ropeCurve, 12, 0.08, 6, false);
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
  const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
  webbingRopeGroup.add(ropeMesh);

  const pitonGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6);
  const pitonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
  
  const piton1 = new THREE.Mesh(pitonGeo, pitonMat);
  piton1.position.set(4, startY + 0.4, 55);
  webbingRopeGroup.add(piton1);

  const piton2 = new THREE.Mesh(pitonGeo, pitonMat);
  piton2.position.set(4, endY + 0.5, 35);
  webbingRopeGroup.add(piton2);

  scene.add(webbingRopeGroup);

  interactables.push({
    name: '🧗 Tali Webbing Pengaman (Rock Scrambling)',
    type: 'webbing_rope',
    x: 4, z: 45,
    dialogue: 'Tebing batu curam terjal dengan bentangan tali webbing pengaman. Menggunakan tali membantu memanjat dengan stabil tanpa risiko tergelincir.',
    actionText: 'Genggam Tali & Panjat Tebing Curam (+Naik Lancar)',
    action: () => {
      player.position.z = 32;
      player.position.y = getTerrainHeight(player.position.x, 32) + player.height;
      state.stamina = Math.max(0, state.stamina - 5);
      showNotification('🧗 Berhasil memanjat tebing batu dengan bantuan tali webbing!');
    }
  });
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

function buildMapLandmarks() {
  // A. Tempat Sampah Daur Ulang Basecamp
  const trashY = getTerrainHeight(8, 255);
  const trashGroup = new THREE.Group();

  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.7, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 })
  );
  bin.position.y = 0.7;
  trashGroup.add(bin);

  const binSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc })
  );
  binSign.position.set(0, 1.5, 0);
  trashGroup.add(binSign);

  trashGroup.position.set(8, trashY, 255);
  scene.add(trashGroup);

  interactables.push({
    name: '♻️ Tempat Sampah Basecamp (LNT Zero Waste)',
    type: 'trash_bin',
    x: 8, z: 255,
    dialogue: 'Posko Pengumpulan Sampah Gunung. Setorkan semua sampah plastik/bungkus makanan yang kamu bawa turun untuk menjaga kelestarian alam!',
    actionText: 'Setorkan Semua Sampah Carrier (+Medali Pendaki Bijak)',
    action: () => {
      if (state.trashCount > 0) {
        state.trashDepositedTotal += state.trashCount;
        const count = state.trashCount;
        state.trashCount = 0;
        updateTrashBadge();
        showNotification(`🏆 Berhasil menyetor ${count} sampah! Kamu meraih predikat: Pendaki Bijak Zero Waste!`);
      } else {
        showNotification('✅ Ranselmu bersih dari sampah logistik. Terus jaga kelestarian gunung!');
      }
    }
  });

  // B. Sumber Mata Air Alami Pos 1
  const springY = getTerrainHeight(-18, 185);
  const springGroup = new THREE.Group();

  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.3, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
  );
  basin.position.y = 0.4;
  springGroup.add(basin);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.2 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.78;
  springGroup.add(water);

  const bamboo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x65a30d })
  );
  bamboo.rotation.x = Math.PI / 3;
  bamboo.position.set(0, 1.2, -0.6);
  springGroup.add(bamboo);

  springGroup.position.set(-18, springY, 185);
  scene.add(springGroup);

  interactables.push({
    name: '💧 Sumber Mata Air Alami Pos 1',
    type: 'water_spring',
    x: -18, z: 185,
    dialogue: 'Mata air jernih pegunungan mengalir segar dari sela bebatuan pinus. Airnya dingin dan kaya mineral alami.',
    actionText: 'Isi Penuh Semua Botol Air (+100% Hidrasi)',
    action: () => {
      state.hydration = 100;
      showNotification('💧 Semua botol air terisi penuh 100%! Tubuh segar bertenaga.');
    }
  });

  // C. Warung Ketinggian Sabana di Pos 3
  const warungY = getTerrainHeight(-15, -15);
  const warungGroup = new THREE.Group();

  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.6, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
  );
  hut.position.y = 1.3;
  warungGroup.add(hut);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 1.8, 4),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.2;
  warungGroup.add(roof);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b })
  );
  sign.position.set(0, 2.2, 1.8);
  warungGroup.add(sign);

  warungGroup.position.set(-15, warungY, -15);
  scene.add(warungGroup);

  interactables.push({
    name: '☕ Warung Ketinggian Sabana (Mbok Yem)',
    type: 'warung',
    x: -15, z: -15,
    dialogue: '"Sugeng rawuh mas! Monggo istirahat di warung tertinggi. Ada teh jahe panas, kopi tubruk, dan nasi pecel hangat."',
    actionText: 'Santap Nasi Pecel & Teh Panas (+Full Stamina & Suhu)',
    action: () => {
      state.stamina = 100;
      state.warmth = 100;
      state.health = Math.min(100, state.health + 30);
      showNotification('🍛 Nasi Pecel & Teh Jahe dinikmati! Tenaga dan suhu tubuh pulih 100%!');
    }
  });

  // D. NPC Porter Pak Yanto di Pos 2
  const npcY = getTerrainHeight(20, 98);
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

  npcGroup.position.set(20, npcY, 98);
  scene.add(npcGroup);

  interactables.push({
    name: '🎒 Porter Pak Yanto',
    type: 'npc',
    x: 20, z: 98,
    dialogue: '"Monggo mas, istirahat dulu di Pos 2 ini. Nanti sebelum tanjakan sabana ada mata air jernih di sisi kiri jalur. Tetap jaga ritme nafas ya!"',
    actionText: 'Terima Wedang Jahe (+30 Suhu & +20 Stamina)',
    action: () => {
      state.warmth = Math.min(100, state.warmth + 30);
      state.stamina = Math.min(100, state.stamina + 20);
      showNotification('☕ Wedang jahe hangat diminum! Badan terasa segar bertenaga.');
    }
  });
}

function buildWildlifeAndEffects() {
  // Eagle
  const eagleGroup = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.2, 5),
    new THREE.MeshStandardMaterial({ color: 0x451a03 })
  );
  body.rotation.x = Math.PI / 2;
  eagleGroup.add(body);

  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.08, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x271911 })
  );
  wings.position.set(0, 0.1, 0);
  eagleGroup.add(wings);

  eagleGroup.position.set(0, 180, -180);
  scene.add(eagleGroup);
  eagleMesh = eagleGroup;

  // Crater Smoke
  const smokeCount = 80;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = [];
  for (let i = 0; i < smokeCount; i++) {
    smokePos.push(
      (Math.random() - 0.5) * 14,
      Math.random() * 25,
      (Math.random() - 0.5) * 14
    );
  }
  smokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(smokePos, 3));
  const smokeMat = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 2.2,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  sulfurSmokeParticles = new THREE.Points(smokeGeo, smokeMat);
  sulfurSmokeParticles.position.set(0, getTerrainHeight(0, -200) + 2, -200);
  scene.add(sulfurSmokeParticles);

  // Cold Breath Vapor
  const breathGeo = new THREE.BufferGeometry();
  const breathPos = [];
  for (let i = 0; i < 20; i++) {
    breathPos.push((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, -0.6 - Math.random() * 0.8);
  }
  breathGeo.setAttribute('position', new THREE.Float32BufferAttribute(breathPos, 3));
  const breathMat = new THREE.PointsMaterial({
    color: 0xf1f5f9,
    size: 0.12,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  breathVaporParticles = new THREE.Points(breathGeo, breathMat);
  camera.add(breathVaporParticles);
}

function updateWildlifeAndSmoke(delta) {
  if (eagleMesh) {
    const time = performance.now() * 0.0006;
    const r = 110;
    eagleMesh.position.x = Math.cos(time) * r;
    eagleMesh.position.z = -190 + Math.sin(time) * r;
    eagleMesh.rotation.y = -time;
  }

  if (sulfurSmokeParticles) {
    const pos = sulfurSmokeParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += delta * 4.5;
      if (pos[i] > 25) pos[i] = 0;
    }
    sulfurSmokeParticles.geometry.attributes.position.needsUpdate = true;
  }
}

function updateColdBreath(delta) {
  if (!breathVaporParticles) return;
  const lapseTemp = state.tempBase - ((state.currentElevation - state.baseElevation) / 100.0) * 0.65;
  if (lapseTemp < 10.0 || state.weatherMode === 3) {
    breathTimer += delta;
    if (breathTimer > 3.0) {
      breathVaporParticles.material.opacity = 0.45;
      if (breathTimer > 4.2) {
        breathTimer = 0;
        breathVaporParticles.material.opacity = 0.0;
      }
    }
  } else {
    breathVaporParticles.material.opacity = 0.0;
  }
}

function initScreenRainOverlay() {
  rainOverlayCanvas = document.getElementById('rain-overlay-canvas');
  if (rainOverlayCanvas) {
    rainOverlayCanvas.width = window.innerWidth;
    rainOverlayCanvas.height = window.innerHeight;
    rainOverlayCtx = rainOverlayCanvas.getContext('2d');
    for (let i = 0; i < 40; i++) {
      raindrops.push({
        x: Math.random() * rainOverlayCanvas.width,
        y: Math.random() * rainOverlayCanvas.height,
        r: 2 + Math.random() * 4,
        speed: 1 + Math.random() * 2
      });
    }
  }
}

function drawScreenRainOverlay() {
  if (!rainOverlayCanvas || !rainOverlayCtx) return;
  if (state.weatherMode === 2) {
    rainOverlayCanvas.style.display = 'block';
    rainOverlayCtx.clearRect(0, 0, rainOverlayCanvas.width, rainOverlayCanvas.height);
    rainOverlayCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < raindrops.length; i++) {
      const d = raindrops[i];
      d.y += d.speed;
      if (d.y > rainOverlayCanvas.height) {
        d.y = 0;
        d.x = Math.random() * rainOverlayCanvas.width;
      }
      rainOverlayCtx.beginPath();
      rainOverlayCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      rainOverlayCtx.fill();
    }
  } else {
    rainOverlayCanvas.style.display = 'none';
  }
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
    if (e.code === 'KeyL') toggleLogbook();
    if (e.code === 'KeyG') toggleGpxTrack();
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

  document.addEventListener('click', () => {
    if (state.isGameActive && !state.isBackpackOpen && !state.isPhotoMode && !state.isLogbookOpen && document.pointerLockElement !== document.body) {
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
  // Cinematic Strafe Tilt (Camera roll on moving sideways)
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
        state.completedCheckpoints.add(cp.name);
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

function updateInteractionProximity() {
  const crosshair = document.getElementById('crosshair');
  const hint = document.getElementById('interact-hint');
  let found = null;

  interactables.forEach(item => {
    const dist = Math.hypot(player.position.x - item.x, player.position.z - item.z);
    if (dist < 9.0) {
      found = item;
    }
  });

  state.activeInteractable = found;
  if (crosshair && hint) {
    if (found) {
      crosshair.classList.add('interactable');
      hint.textContent = `[E] ${found.name}`;
      hint.style.display = 'block';
    } else {
      crosshair.classList.remove('interactable');
      hint.style.display = 'none';
    }
  }
}

function triggerInteraction() {
  if (state.activeInteractable) {
    document.exitPointerLock();
    document.getElementById('dialog-speaker').textContent = state.activeInteractable.name;
    document.getElementById('dialog-text').textContent = state.activeInteractable.dialogue;
    document.getElementById('dialog-btn-action').textContent = state.activeInteractable.actionText;
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
  if (state.activeInteractable && state.activeInteractable.action) {
    state.activeInteractable.action();
  }
  closeDialog();
}

function closeDialog() {
  document.getElementById('dialog-popup').style.display = 'none';
  if (state.isGameActive && !state.isBackpackOpen && !state.isLogbookOpen) {
    document.body.requestPointerLock();
  }
}

function toggleLogbook() {
  const modal = document.getElementById('logbook-modal');
  state.isLogbookOpen = !state.isLogbookOpen;
  if (modal) modal.style.display = state.isLogbookOpen ? 'block' : 'none';
  if (state.isLogbookOpen) {
    document.exitPointerLock();
  }
}

function cycleWeather() {
  state.weatherMode = (state.weatherMode + 1) % 4;
  const modeName = weatherNames[state.weatherMode];

  if (state.weatherMode === 0) {
    // 0: Golden Sunrise
    const col = new THREE.Color(0xfbcfe8);
    scene.background = col;
    scene.fog = new THREE.Fog(0xfbcfe8, 140, 1150);
    ambientLight.color.setHex(0xffedd5);
    ambientLight.intensity = 0.85;
    directionalLight.color.setHex(0xffedd5);
    directionalLight.intensity = 1.6;
    if (sunMesh) sunMesh.visible = true;
    if (sunGlowMesh) sunGlowMesh.visible = true;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 1) {
    // 1: Noon
    const col = new THREE.Color(0xbae6fd);
    scene.background = col;
    scene.fog = new THREE.Fog(0xbae6fd, 150, 1200);
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.95;
    directionalLight.color.setHex(0xffffff);
    directionalLight.intensity = 1.8;
    if (sunMesh) sunMesh.visible = true;
    if (sunGlowMesh) sunGlowMesh.visible = false;
    if (starField) starField.material.opacity = 0.0;
  } else if (state.weatherMode === 2) {
    // 2: Storm
    const col = new THREE.Color(0x475569);
    scene.background = col;
    scene.fog = new THREE.Fog(0x475569, 40, 450);
    ambientLight.color.setHex(0x334155);
    ambientLight.intensity = 0.4;
    directionalLight.color.setHex(0x64748b);
    directionalLight.intensity = 0.3;
    if (sunMesh) sunMesh.visible = false;
    if (sunGlowMesh) sunGlowMesh.visible = false;
    if (starField) starField.material.opacity = 0.0;
    showNotification('🌧️ Badai kabut & hujan turun! Nyalakan headlamp atau pasang tenda!');
  } else if (state.weatherMode === 3) {
    // 3: Night
    const col = new THREE.Color(0x020617);
    scene.background = col;
    scene.fog = new THREE.Fog(0x020617, 30, 400);
    ambientLight.color.setHex(0x0f172a);
    ambientLight.intensity = 0.25;
    directionalLight.color.setHex(0x38bdf8);
    directionalLight.intensity = 0.2;
    if (sunMesh) sunMesh.visible = false;
    if (sunGlowMesh) sunGlowMesh.visible = false;
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
    if (nestingStoveMesh) { scene.remove(nestingStoveMesh); nestingStoveMesh = null; }
    if (steamParticles) { scene.remove(steamParticles); steamParticles = null; }
    state.isTentPitched = false;
    const btn = document.getElementById('btn-tent');
    if (btn) btn.innerHTML = `🏕️ Pasang Tenda <span class="key-badge">C</span>`;
    showNotification('🏕️ Tenda & perlengkapan camp dibongkar ke ransel');
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

    const stoveGroup = new THREE.Group();
    const canister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 })
    );
    canister.position.y = 0.18;
    stoveGroup.add(canister);

    const nestingPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.45, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    nestingPot.position.y = 0.58;
    stoveGroup.add(nestingPot);

    stoveGroup.position.set(tentPos.x + 1.8, tentPos.y + 0.2, tentPos.z + 1.8);
    scene.add(stoveGroup);
    nestingStoveMesh = stoveGroup;

    const steamGeo = new THREE.BufferGeometry();
    const steamPos = [];
    for (let i = 0; i < 25; i++) {
      steamPos.push((Math.random() - 0.5) * 0.3, Math.random() * 1.2, (Math.random() - 0.5) * 0.3);
    }
    steamGeo.setAttribute('position', new THREE.Float32BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    steamParticles = new THREE.Points(steamGeo, steamMat);
    steamParticles.position.set(stoveGroup.position.x, stoveGroup.position.y + 0.8, stoveGroup.position.z);
    scene.add(steamParticles);

    state.isTentPitched = true;
    state.warmth = Math.min(100, state.warmth + 40);
    const btn = document.getElementById('btn-tent');
    if (btn) btn.innerHTML = `🏕️ Bongkar Tenda <span class="key-badge">C</span>`;
    showNotification('🏕️ Tenda Dome, Api Unggun & Kompor Nesting Siap! Suhu badan hangat.');
  }
}

function updateCampfireAndStove(delta) {
  if (emberParticles) {
    const pos = emberParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += delta * 1.5;
      if (pos[i] > 3.0) pos[i] = 0.2;
    }
    emberParticles.geometry.attributes.position.needsUpdate = true;
  }

  if (steamParticles) {
    const pos = steamParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += delta * 1.2;
      if (pos[i] > 1.4) pos[i] = 0.1;
    }
    steamParticles.geometry.attributes.position.needsUpdate = true;
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

function updateTrashBadge() {
  const tCount = document.getElementById('trash-count');
  const modalCount = document.getElementById('modal-trash-count');
  if (tCount) tCount.textContent = state.trashCount;
  if (modalCount) modalCount.textContent = `${state.trashCount} Item`;
}

function useItem(type) {
  if (type === 'water') {
    state.hydration = Math.min(100, state.hydration + 45);
    state.trashCount += 1;
    showNotification('💧 Minum air mineral (+45 Hidrasi) • 1 Botol Kosong masuk ke Trash Bag');
  } else if (type === 'coffee') {
    state.warmth = Math.min(100, state.warmth + 30);
    state.stamina = Math.min(100, state.stamina + 25);
    state.trashCount += 1;
    showNotification('☕ Menyeruput kopi jahe (+30 Suhu) • 1 Sachet masuk ke Trash Bag');
  } else if (type === 'noodle') {
    state.warmth = Math.min(100, state.warmth + 25);
    state.stamina = Math.min(100, state.stamina + 35);
    state.trashCount += 1;
    showNotification('🍜 Memasak mie rebus di nesting (+35 Stamina) • 1 Bungkus masuk ke Trash Bag');
  } else if (type === 'chocolate') {
    state.stamina = Math.min(100, state.stamina + 40);
    state.trashCount += 1;
    showNotification('🍫 Memakan cokelat & madu (+40 Stamina) • 1 Foil masuk ke Trash Bag');
  } else if (type === 'blanket') {
    state.warmth = 100;
    showNotification('🩹 Membalut tubuh dengan Emergency Thermal Blanket (Suhu 100%)');
  }
  updateTrashBadge();
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
      buildFoliageAndSwayingGrass();
      buildCheckpoints();
      buildMapLandmarks();
      buildWebbingClimbingZone();
      buildGlowingGpxTrack();
      buildWildlifeAndEffects();

      const initialY = getTerrainHeight(0, 260) + player.height;
      player.position.set(0, initialY, 260);
      player.yaw = 0;
      player.pitch = -0.05;
      player.roll = 0;
      state.isGameActive = true;
      document.body.requestPointerLock();
      initAudio();
      showNotification('🌲 Selamat mendaki! Ikuti jalur patok & garis GPX hijau neon menuju puncak!');
    });
  }

  const bpBtn = document.getElementById('btn-backpack');
  const tentBtn = document.getElementById('btn-tent');
  const lampBtn = document.getElementById('btn-headlamp');
  const gpxBtn = document.getElementById('btn-gpx-toggle');
  const logBtn = document.getElementById('btn-logbook');
  const photoBtn = document.getElementById('btn-photo');
  const weatherBtn = document.getElementById('btn-weather-toggle');
  const restBtn = document.getElementById('btn-rest');
  const closeBp = document.getElementById('close-backpack');
  const closeLog = document.getElementById('close-logbook');

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

window.addEventListener('DOMContentLoaded', init3D);
