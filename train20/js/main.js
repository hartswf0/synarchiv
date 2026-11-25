// BEES ON A TRAIN — the sealed line. Boot, journey, passenger, input and the frame loop.
import * as THREE from 'three';
import { DIM, makeTextures, makeMaterials, clamp, damp, lerp } from './kit.js';
import { buildTrain, locate } from './train.js';
import { buildLand, LOOP, STOP_AT, ahead } from './land.js';
import { buildBees } from './bees.js';
import { createRig, SHOTS } from './rig.js';
import { buildWorlds } from './worlds.js';
import { loadCast, dressTraveler } from './cast.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';

const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xdcc096, 500, 4200);
const camera = new THREE.PerspectiveCamera(58, 1, .06, 6500);
const hemi = new THREE.HemisphereLight(0xfff0d6, 0x4e4438, 1.0), sunL = new THREE.DirectionalLight(0xffd29a, 2.4);
sunL.position.set(.55, .42, .72); scene.add(hemi, sunL);
const lamps = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffc27a, 0, 9, 1.6); scene.add(l); return l; });

const tex = makeTextures(), M = makeMaterials(tex), tl = new THREE.TextureLoader();
const sTex = f => { const t = tl.load('train20/assets/' + f); t.colorSpace = THREE.SRGBColorSpace; return t; };
M.panels = new THREE.MeshStandardMaterial({ map: (() => { const t = sTex('tex_panels.jpg'); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2.4; return t; })(), roughness: .8 });
M.screens = [0, 1, 2, 3].map(k => new THREE.MeshBasicMaterial({ color: [0x1f4d4a, 0x4a3a1c, 0x234046, 0x18302e][k] }));

const train = buildTrain(scene, M), land = buildLand(scene, M, tex, tl), bees = buildBees(scene, M, mobile), rig = createRig(camera);
const cars = train.cars, quiet = cars[1];
// posters and the route map: generated flats hung where a real carriage would hang them
for (const [file, car, x, w, h] of [['tex_poster.jpg', cars[1], DIM.L / 2 - .12, .62, .82], ['tex_ticket.jpg', cars[2], DIM.L / 2 - .12, .9, .52], ['tex_poster.jpg', cars[7], DIM.L / 2 - .12, .62, .82]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: sTex(file) })); m.position.set(x, 1.35, -.95); m.rotation.y = -Math.PI / 2; car.group.add(m);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(.02, h + .06, w + .06), M.brass); fr.position.set(x + .02, 1.35, -.95); car.group.add(fr);
}
// projector beam in the cinema
{ const c = cars[7], p = c.projector, len = p.x - c.portal.x, g = new THREE.CylinderGeometry(.04, 1.0, len, 12, 1, true).rotateZ(-Math.PI / 2);
  const beam = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(p.x - len / 2, (p.y + c.portal.y) / 2, p.z / 2); beam.rotation.y = Math.atan2(p.z, len) * -1; c.group.add(beam); }

// ---- state
const seat0 = quiet.playerSeat;
const actor = { x: quiet.x + seat0.x, z: seat0.z, dir: 1, yaw: Math.PI / 2, seated: true, seat: { car: quiet, ...seat0 }, speed: 0 };
const journey = { dist: +(params.get('at') || 600), speed: 0, cruise: 26, dwell: 0, phase: 'run', wheel: 0 };
const state = { t: 0, take: false, takeT: 0, takeI: 0, walkGoal: null, camCar: 1, log: [], paused: false, lastCar: -1, lastSeg: null, hud: true };
const input = { jx: 0, jy: 0, yaw: 0, pitch: 0, keys: new Set() };
const ui = createUI({ shots: SHOTS, mobile });
const audio = createAudio();
const stub = (title, sub = '') => { state.log.push({ t: +state.t.toFixed(1), km: +(journey.dist / 1000).toFixed(2), title, sub }); if (state.log.length > 400) state.log.shift(); ui.toast(title, sub); };
let worlds = null, cast = null, people = [], hero = null;

// ---- people
const SEATED = [['imani', 1, 5, 1], ['makeda', 2, 9, 1], ['june', 2, 14, 0], ['hanna', 1, 16, 0], ['june', 7, 9, 0], ['imani', 7, 22, 0], ['makeda', 1, 2, 0], ['berhanu', 2, 20, 1], ['hanna', 7, 14, 0], ['berhanu', 7, 30, 0]];
async function bootCast() {
  try {
    cast = await loadCast(p => ui.loading(`boarding passengers ${Math.round(p * 100)}%`));
    hero = dressTraveler(cast.make('berhanu'), M); scene.add(hero.root);
    const list = mobile ? SEATED.slice(0, 5) : SEATED;
    for (const [id, ci, si, talk] of list) {
      const c = cars[ci], s = c.seats[si % c.seats.length]; if (!s || (c === quiet && s === seat0)) continue;
      const p = cast.make(id, { still: true }); p.root.position.set(c.x + s.x, DIM.FLOOR + SEAT_Y, s.z); p.root.rotation.y = s.face > 0 ? Math.PI / 2 : -Math.PI / 2;
      p.set({ [talk ? 'sitting-talking' : 'sitting-idle']: 1 }); p.car = ci; scene.add(p.root); people.push(p);
    }
    // the conductor walks the train; the saxophonist of clip 1022 is a violinist here, standing at the end of the dining car
    const cond = cast.make('hanna'); cond.walk = { a: cars[6].x, b: cars[1].x + 6, dir: 1, x: cars[3].x }; scene.add(cond.root); people.push(cond);
    const mus = cast.make('imani', { still: true }); mus.root.position.set(cars[2].x + cars[2].stage.x, DIM.FLOOR, .25); mus.root.rotation.y = Math.PI / 2; mus.set({ 'idle-talking': 1 }); mus.car = 2; scene.add(mus.root); people.push(mus);
  } catch (e) { console.warn('cast unavailable', e); }
  ui.loading(null);
}
const SEAT_Y = -.04;

// ---- journey: cruise, slow for the halt, dwell, depart
function stepJourney(dt) {
  const d = ahead(STOP_AT, journey.dist);
  if (journey.phase === 'run') {
    let v = journey.cruise; if (d > 0 && d < 900) v = Math.min(v, Math.sqrt(2 * .42 * d) + .4);
    journey.speed = damp(journey.speed, v, v < journey.speed ? 2.5 : .25, dt);
    if (d > 0 && d < .6) { journey.phase = 'dwell'; journey.dwell = 16; journey.speed = 0; stub('Amba halt', 'the train stands for a quarter of a minute'); }
  } else { journey.dwell -= dt; if (journey.dwell <= 0) { journey.phase = 'run'; journey.dist += 1; stub('Departure', 'doors closed, all bees aboard'); } }
  journey.dist = (journey.dist + journey.speed * dt) % (LOOP * 1000);
  journey.wheel += journey.speed * dt / .46; train.spin(journey.wheel);
}

// ---- passenger
const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
function nearestSeat() { const { car } = locate(cars, actor.x); let best = null, bd = 1.25; for (const s of car.seats) { const d = Math.hypot(car.x + s.x - actor.x, s.z - actor.z); if (d < bd) { bd = d; best = { car, ...s }; } } return best; }
function stand() { if (!actor.seated) return; const { car } = locate(cars, actor.x); actor.seated = false; actor.z = clamp(car.aisleZ + Math.sign(actor.z - car.aisleZ) * car.aisleHalf, -1.2, 1.2); actor.x += actor.dir * .0; stub('The traveler stands', car.name); }
function sit() { const s = nearestSeat(); if (!s) return; actor.seated = true; actor.seat = s; actor.x = s.car.x + s.x; actor.z = s.z; actor.dir = s.face; stub('The traveler sits', s.car.name); }
function stepActor(dt) {
  let mx = 0, mz = 0;
  const k = input.keys, jx = input.jx + (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0), jy = input.jy + (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
  if (Math.abs(jx) + Math.abs(jy) > .08) {
    state.walkGoal = null; if (actor.seated) stand();
    if (rig.st.shot.inside && rig.st.shot.frame !== 'bee') { camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); mx = fwd.x * jy - fwd.z * jx; mz = fwd.z * jy + fwd.x * jx; }
    else { mx = jy; mz = jx; }
  } else if (state.walkGoal !== null && !actor.seated) { const d = state.walkGoal - actor.x; if (Math.abs(d) < .3) state.walkGoal = null; else mx = Math.sign(d) * .75; }
  const len = Math.hypot(mx, mz), sp = Math.min(1, len) * 1.45;
  if (len > .01 && !actor.seated) {
    actor.x += mx / len * sp * dt; actor.z += mz / len * sp * dt;
    const c7 = cars[7], c0 = cars[0]; actor.x = clamp(actor.x, c7.x + c7.walkMin, c0.x + c0.walkMax);
    if (Math.abs(mx) > .2 * len) actor.dir = Math.sign(mx);
    actor.yaw = dampAngle(actor.yaw, Math.atan2(mx, mz), 10, dt);
  } else if (actor.seated) actor.yaw = dampAngle(actor.yaw, actor.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 8, dt);
  const loc = locate(cars, actor.x);
  if (!actor.seated) actor.z = clamp(actor.z, loc.aisleZ - loc.half, loc.aisleZ + loc.half);
  actor.speed = len > .01 && !actor.seated ? sp : 0;
  if (loc.i !== state.lastCar) { state.lastCar = loc.i; stub(loc.car.name, loc.car.sub); ui.car(loc.car); }
  if (hero) {
    hero.root.position.set(actor.x, DIM.FLOOR + (actor.seated ? SEAT_Y : 0), actor.z); hero.root.rotation.y = actor.yaw;
    hero.locomote(actor.speed, dt, actor.seated); hero.update(dt, true); hero.dress();
    hero.root.visible = !(rig.st.shot.id === 'pov');
  }
  return loc;
}
const dampAngle = (a, b, k, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-k * dt)); };

// ---- the take: an unattended continuous performance
const TAKE = [['profile', 7], ['window', 6], ['follow', 9, 'rear'], ['aisle', 6], ['bee', 6], ['lean', 6], ['track', 7], ['follow', 9], ['cctv', 5], ['wheel', 4], ['drone', 8], ['lineside', 10], ['follow', 9], ['roof', 6], ['pov', 7], ['vista', 9], ['nose', 6], ['follow', 8, 'front'], ['tail', 6]];
function stepTake(dt) {
  if (!state.take) return; state.takeT -= dt; if (state.takeT > 0) return;
  const [shot, dur, go] = TAKE[state.takeI++ % TAKE.length]; setShot(shot, true); state.takeT = dur;
  if (go === 'rear') { if (actor.seated) stand(); state.walkGoal = cars[7].x + 3; } else if (go === 'front') { if (actor.seated) stand(); state.walkGoal = cars[1].x - 2; }
}
function setShot(id, fromTake = false) { if (!rig.set(id)) return; if (!fromTake) state.take = false; ui.shot(id, state.take); }

// ---- environment
const fogDay = new THREE.Color(0xdcc096), fogDusk = new THREE.Color(0xb98aa0), fogDark = new THREE.Color(0x07090c), sunDay = new THREE.Color(0xffd29a), sunDusk = new THREE.Color(0xff8f7a), col = new THREE.Color();
let dark = 0;
function stepEnv(dt, loc) {
  const e = land.env; dark = damp(dark, e.tunnel, 5, dt);
  scene.fog.color.copy(fogDay).lerp(fogDusk, e.dusk).lerp(fogDark, dark); scene.fog.far = lerp(4200, 160, dark); scene.fog.near = lerp(500, 4, dark);
  hemi.intensity = lerp(lerp(1.15, .75, e.dusk), .03, dark); sunL.intensity = lerp(lerp(2.4, 1.5, e.dusk), 0, dark); sunL.color.copy(sunDay).lerp(sunDusk, e.dusk);
  land.sky.material.uniforms.dark.value = dark; land.sky.material.uniforms.hor.value.set(0xf0cf8e).lerp(col.set(0xf2a6a0), e.dusk); land.sky.material.uniforms.top.value.set(0x356e7a).lerp(col.set(0x2b2a55), e.dusk);
  renderer.toneMappingExposure = lerp(1.08, 1.3, dark);
  const c = cars[state.camCar], inside = rig.st.shot.inside, power = (c.dim ? 2.2 : c.cool ? 4 : 4.6) * lerp(.55, 1.5, dark) * (inside ? 1 : .6);
  const xs = c.lamps.length ? c.lamps.slice().sort((a, b) => Math.abs(c.x + a - camera.position.x) - Math.abs(c.x + b - camera.position.x)) : [0];
  lamps.forEach((l, k) => { const x = xs[k % xs.length]; l.position.set(c.x + x, DIM.FLOOR + 1.95, 0); l.intensity = k < xs.length ? power : 0; l.color.setHex(c.cool ? 0x8fe0d8 : 0xffc27a); });
  for (const m of train.glowMats.values()) m.opacity = lerp(.5, .95, Math.max(dark, e.dusk * .6));
  if (e.segment !== state.lastSeg) { state.lastSeg = e.segment; if (e.segment) stub(e.segment.name, `km ${(journey.dist / 1000).toFixed(1)}`); }
  bees.state.swarmWant = (e.hive > .3 || e.viaduct > .5) ? 1 : state.forceSwarm ? 1 : 0; bees.state.side = 1;
  void loc;
}

// ---- frame
let slow = 0;
const clock = new THREE.Clock(), goal = new THREE.Vector3(), cup = new THREE.Vector3(quiet.x + quiet.props.cup.x, DIM.FLOOR + quiet.props.cup.y + .075, quiet.props.cup.z);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta(), dt = Math.min(raw, .05); if (state.paused) return; state.t += dt;
  // if the device cannot hold the frame rate, give up resolution before giving up the journey
  slow = raw > .045 ? slow + raw : Math.max(0, slow - raw * 2); if (slow > 2.5 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .5)); resize(); slow = 0; }
  stepJourney(dt);
  if (worlds && worlds.stage.active) {
    worlds.updateStage(dt, { x: input.jx + axis('d', 'a'), y: input.jy + axis('w', 's'), yaw: input.yaw, pitch: input.pitch }); input.yaw = input.pitch = 0;
    audio.update(journey.speed * .5, 1, 0); renderer.render(worlds.stage.scene, worlds.stage.camera); return;
  }
  const loc = stepActor(dt); stepTake(dt);
  const portal = worlds ? worlds.nearest(tmp.set(actor.x, DIM.FLOOR + 1.2, actor.z), 3.2) : null, own = worlds && worlds.portals.find(p => p.car === loc.car);
  const ctx = { a: actor, car: loc.car, aisleZ: loc.aisleZ, side: actor.seated ? Math.sign(actor.z) || 1 : (own && Math.abs(own.pos.z) > .5 ? Math.sign(own.pos.z) : 1), bee: bees.lead, t: state.t, dist: journey.dist, speed: journey.speed, noseX: train.noseX, tailX: train.tailX };
  rig.st.yaw += input.yaw; rig.st.pitch = clamp(rig.st.pitch + input.pitch, -1.1, 1.1); input.yaw = input.pitch = 0;
  rig.update(dt, ctx);
  state.camCar = rig.st.shot.inside ? locate(cars, camera.position.x).i : loc.i;
  land.update(journey.dist, camera.position.x); stepEnv(dt, loc);
  if (own) goal.copy(own.pos);
  bees.update(dt, state.t, { cars, camCar: Math.max(1, state.camCar), actor, cup, goal: own ? goal : null });
  for (const p of people) {
    if (p.walk) { const w = p.walk; w.x += w.dir * .8 * dt; if (w.x > w.b) w.dir = -1; if (w.x < w.a) w.dir = 1; const l = locate(cars, w.x); p.root.position.set(w.x, DIM.FLOOR, l.aisleZ + .12); p.root.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.locomote(.8, dt, false); p.update(dt, Math.abs(l.i - state.camCar) <= 1); p.root.visible = Math.abs(l.i - state.camCar) <= 2; }
    else { p.update(dt); p.root.visible = Math.abs(p.car - state.camCar) <= 2; }
  }
  for (const c of cars) c.group.visible = !rig.st.shot.inside || Math.abs(c.i - state.camCar) <= 3;
  if (worlds) worlds.update(state.t, state.camCar, M);
  ui.context(actor.seated ? 'Stand' : portal ? `Enter · ${portal.world.title}` : nearestSeat() ? 'Sit' : null, portal && !actor.seated ? portal : null);
  ui.status(journey, land.env, rig.st.shot);
  audio.update(journey.speed, rig.st.shot.inside ? 1 : .6, dark, bees.lead.p.distanceTo(camera.position));
  renderer.render(scene, camera);
}
const axis = (p, n) => (input.keys.has(p) ? 1 : 0) - (input.keys.has(n) ? 1 : 0);

// ---- actions
async function act() {
  if (worlds && worlds.stage.active) return worlds.exit();
  if (actor.seated) return stand();
  const portal = worlds && worlds.nearest(tmp.set(actor.x, DIM.FLOOR + 1.2, actor.z), 3.2);
  if (portal) { state.take = false; stub(`Through the threshold`, portal.world.title); return worlds.enter(portal); }
  sit();
}
function still() {
  const st = worlds && worlds.stage.active; renderer.render(st ? worlds.stage.scene : scene, st ? worlds.stage.camera : camera);
  canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `bees-on-a-train_${st ? worlds.stage.id : rig.st.shot.id}_${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
}
let rec = null;
function record() {
  if (rec) { rec.stop(); return false; }
  const stream = canvas.captureStream(30), type = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)), chunks = [];
  rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 9e6 }); rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type })); a.download = `bees-on-a-train_take_${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`; a.click(); rec = null; ui.recording(false); };
  rec.start(); ui.recording(true); return true;
}
const api = {
  version: '2.0.0', shots: () => SHOTS.map(s => s.id), camera: id => setShot(id), take: (on = !state.take) => { state.take = on; state.takeT = 0; ui.shot(rig.st.shot.id, on); return on; },
  act, stand, sit, still, record, swarm: (on = !state.forceSwarm) => (state.forceSwarm = on), jump: km => { journey.dist = km * 1000; journey.phase = 'run'; },
  walkTo: car => { if (actor.seated) stand(); state.walkGoal = cars[clamp(car, 0, 7)].x; }, enter: id => { const p = worlds.portals.find(p => p.ids.includes(id)); return p && worlds.enter(p, id); }, exit: () => worlds.exit(),
  next: d => { const s = worlds.stage; if (s.active) { s.portal.show(s.portal.index + d); return worlds.enter(s.portal); } }, live: () => worlds.toggleLive(),
  log: () => state.log.slice(), rig: (w, h) => rig.export({ a: actor, car: locate(cars, actor.x).car, aisleZ: 0, side: 1, bee: bees.lead, t: state.t, dist: journey.dist, speed: journey.speed, noseX: train.noseX, tailX: train.tailX }, w, h),
  observe: () => ({ t: +state.t.toFixed(2), km: +(journey.dist / 1000).toFixed(3), speed: +journey.speed.toFixed(1), phase: journey.phase, car: cars[state.lastCar]?.key, seated: actor.seated, x: +actor.x.toFixed(2), shot: rig.st.shot.id, take: state.take, world: worlds?.stage.active ? worlds.stage.id : null, segment: land.env.segment?.type || null, people: people.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  _: { scene, camera, renderer, train, land, rig, actor, journey, state, input, get people() { return people; }, get cast() { return cast; } },
};
window.trainFilm = api;
ui.bind({ api, input, audio, setShot, worldsRef: () => worlds, state });
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); input.keys.add(k);
  if (k === 'e' || k === 'enter') act(); else if (k === 't') api.take(); else if (k === 'c') setShot(SHOTS[(SHOTS.indexOf(rig.st.shot) + 1) % SHOTS.length].id); else if (k === 'p') still(); else if (k === 'h') ui.hud(state.hud = !state.hud); else if (k === 'escape' && worlds?.stage.active) worlds.exit(); else if (/^[1-9]$/.test(k)) setShot(SHOTS[+k - 1].id); });
addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase())); addEventListener('blur', () => input.keys.clear());

ui.loading('laying track');
frame();
buildWorlds({ scene, train, renderer, ui, toast: stub }).then(w => { worlds = w; if (params.get('world')) api.enter(params.get('world')); }).catch(e => console.warn('worlds unavailable', e));
bootCast().then(() => { if (params.get('shot')) setShot(params.get('shot')); else setShot('profile'); if (params.has('take')) api.take(true); stub('BEES ON A TRAIN', 'the sealed line · the train is moving, you cannot get off'); });
