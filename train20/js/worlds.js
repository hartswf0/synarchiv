// Thresholds and the worlds behind them.
// On the train, a threshold is a pane that shows its world with depth parallax, like looking through a window.
// Stepping through builds the same image and depth map into a relief you can move inside; for footage worlds
// the clip itself can play across that relief. A world is two files and a registry entry, so any future
// generation (a Genie take, an Atlas reconstruction, a splat) slots in the same way.
import * as THREE from 'three';
import { DIM, clamp, damp } from './kit.js';

const ASSETS = 'train20/assets/worlds/';
const PANE_VERT = `varying vec2 vUv; varying vec3 vView;
void main(){ vUv=uv; vec3 camObj=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz; vView=camObj-position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const PANE_FRAG = `uniform sampler2D map, depthMap; uniform vec2 fit; uniform float hasDepth, glow, time, dim; varying vec2 vUv; varying vec3 vView;
float inv(vec2 u){ vec4 d=texture2D(depthMap,u); return d.r+d.g/255.; }
void main(){
  vec2 uv=(vUv-.5)*fit+.5; vec3 v=normalize(vView); vec2 off=-v.xy/max(v.z,.25);
  if(hasDepth>.5){ float d=inv(uv); d=inv(uv+off*(1.-d)*.05); uv+=off*(1.-d)*.06; }
  uv=clamp(uv,vec2(.002),vec2(.998));
  vec3 c=texture2D(map,uv).rgb*dim;
  vec2 e=abs(vUv-.5)*2.; float edge=smoothstep(.86,1.,max(e.x,e.y));
  c=mix(c,vec3(1.,.72,.3),edge*(.35+.3*sin(time*2.))*glow);
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`;

export async function buildWorlds({ scene, train, renderer, ui, toast }) {
  const data = await (await fetch('train20/data/worlds.json')).json();
  // footage lives in the el-desierto pages; ?footage=<url> points the train at another mirror
  const base = new URLSearchParams(location.search).get('footage') || (location.hostname.endsWith('github.io') ? '/el-desierto/' : data.footageBase);
  const loader = new THREE.TextureLoader(), texCache = new Map();
  const tex = (file, srgb = true) => { if (!texCache.has(file)) { const t = loader.load(ASSETS + file); if (srgb) t.colorSpace = THREE.SRGBColorSpace; else { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; } texCache.set(file, t); } return texCache.get(file); };
  const preview = id => `${base}PREVIEWS/${id}.mp4`;

  // ---- thresholds on the train
  const portals = [];
  for (const car of train.cars) {
    const p = car.portal, ids = data.cars[car.key]; if (!p || !ids) continue;
    const mat = new THREE.ShaderMaterial({ vertexShader: PANE_VERT, fragmentShader: PANE_FRAG, uniforms: { map: { value: null }, depthMap: { value: null }, fit: { value: new THREE.Vector2(1, 1) }, hasDepth: { value: 1 }, glow: { value: 1 }, time: { value: 0 }, dim: { value: 1 } } });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat); mesh.position.set(p.x, p.y, p.z); mesh.rotation.y = p.ry; car.group.add(mesh);
    const portal = { car, mesh, mat, ids, index: 0, w: p.w, h: p.h, pos: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1).applyEuler(mesh.rotation) };
    mesh.updateMatrixWorld(true); mesh.getWorldPosition(portal.pos);
    portal.show = (k) => {
      portal.index = ((k % ids.length) + ids.length) % ids.length; const id = ids[portal.index], w = data.worlds[id]; portal.id = id; portal.world = w;
      mat.uniforms.map.value = tex(id + '.jpg'); mat.uniforms.depthMap.value = tex(id + '.depth.png', false);
      const pa = p.w / p.h; mat.uniforms.fit.value.set(pa > w.aspect ? 1 : pa / w.aspect, pa > w.aspect ? w.aspect / pa : 1).multiplyScalar(.9);
    };
    portal.show(0); portals.push(portal);
  }
  // ---- surveillance wall: footage on the monitors, started only when someone is in the car to watch
  const feeds = [];
  function startFeeds(M) {
    if (feeds.length) return;
    M.screens.slice(0, 3).forEach((m, k) => {
      const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      let n = k; const next = () => { v.src = preview(data.screens[n++ % data.screens.length]); v.play().catch(() => {}); };
      v.addEventListener('error', () => { m.color.setHex(0x244a48); }); next(); setInterval(next, 14000 + k * 3000);
      const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.color.setHex(0xffffff); m.needsUpdate = true; feeds.push(v);
    });
  }

  // ---- inside a world
  const stage = { active: false, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(60, 1, .02, 400), portal: null, world: null, id: null, mesh: null, back: null, move: new THREE.Vector3(), yaw: 0, pitch: 0, t: 0, video: null, scale: 1, live: false };
  stage.scene.background = new THREE.Color(0x050403);
  const depthCanvas = document.createElement('canvas');
  async function relief(id, w) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSETS + id + '.depth.png'; });
    depthCanvas.width = img.width; depthCanvas.height = img.height; const cx = depthCanvas.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, img.width, img.height).data, W = img.width, H = img.height, pos = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2), Z = new Float32Array(W * H);
    const ty = Math.tan(THREE.MathUtils.degToRad(w.fovY) / 2), tx = ty * w.aspect, s = 2 / w.near; stage.scale = s;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, inv = (px[k * 4] * 256 + px[k * 4 + 1]) / 65535, z = 1 / (inv * (1 / w.near - 1 / w.far) + 1 / w.far) * s, u = (x + .5) / W, v = (y + .5) / H;
      Z[k] = z; pos[k * 3] = (u * 2 - 1) * tx * z; pos[k * 3 + 1] = (1 - v * 2) * ty * z; pos[k * 3 + 2] = -z; uv[k * 2] = u; uv[k * 2 + 1] = 1 - v;
    }
    const idx = [], ok = (a, b, c) => { const mn = Math.min(Z[a], Z[b], Z[c]), mx = Math.max(Z[a], Z[b], Z[c]); return mx / mn < 1.22; };
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const a = y * W + x, b = a + 1, c = a + W, d = c + 1; if (ok(a, c, b)) idx.push(a, c, b); if (ok(b, c, d)) idx.push(b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    return { g, far: w.far * s, tx, ty };
  }
  function clearStage() { for (const k of ['mesh', 'back']) if (stage[k]) { stage.scene.remove(stage[k]); stage[k].geometry.dispose(); stage[k].material.dispose(); stage[k] = null; } stopLive(); }
  async function enter(portal, id = portal.id) {
    const w = data.worlds[id]; if (!w) return false;
    ui.fade(true); await new Promise(r => setTimeout(r, 380));
    clearStage();
    const map = tex(id + '.jpg'), r = await relief(id, w);
    stage.mesh = new THREE.Mesh(r.g, new THREE.MeshBasicMaterial({ map })); stage.scene.add(stage.mesh);
    const bz = r.far * 1.04; stage.back = new THREE.Mesh(new THREE.PlaneGeometry(r.tx * bz * 2 * (w.aspect < 1 ? 5 : 2), r.ty * bz * 2 * 1.9), new THREE.MeshBasicMaterial({ map, color: 0x4a443c })); stage.back.position.z = -bz; stage.scene.add(stage.back);
    Object.assign(stage, { active: true, portal, world: w, id, yaw: 0, pitch: 0, t: 0 }); stage.move.set(0, 0, 0);
    stage.camera.fov = w.fovY; ui.world(w, id, portal); ui.fade(false); toast(w.title, w.source);
    return true;
  }
  async function exit() { if (!stage.active) return; ui.fade(true); await new Promise(r => setTimeout(r, 300)); clearStage(); stage.active = false; ui.world(null); ui.fade(false); }
  /** Play the clip across the relief: the depth is from one frame, so loop a short window around it. */
  function toggleLive() {
    const w = stage.world; if (!w || !w.clip) return false;
    if (stage.live) { stopLive(); stage.mesh.material.map = stage.back.material.map = tex(stage.id + '.jpg'); return false; }
    const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.src = preview(w.clip);
    const [a, b] = w.loop || [Math.max(0, w.t - .5), w.t + .6];
    v.addEventListener('loadedmetadata', () => { v.currentTime = a; v.play().catch(() => {}); });
    v.addEventListener('timeupdate', () => { if (v.currentTime > b || v.currentTime < a - .2) v.currentTime = a; });
    v.addEventListener('error', () => { toast('Footage unavailable here', 'the clip is served from the el-desierto pages'); stopLive(); });
    const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; stage.mesh.material.map = t; stage.video = v; stage.live = true; return true;
  }
  function stopLive() { if (stage.video) { stage.video.pause(); stage.video.removeAttribute('src'); stage.video.load(); stage.video = null; } stage.live = false; }
  function updateStage(dt, input) {
    stage.t += dt; const w = stage.world, m = stage.move;
    m.x = clamp(m.x + input.x * dt * .7, -.55, .55); m.z = clamp(m.z + input.y * dt * .8, -.35, 1.0); m.y = clamp(m.y, -.2, .2);
    stage.yaw = clamp(stage.yaw + input.yaw, -.62, .62); stage.pitch = clamp(stage.pitch + input.pitch, -.36, .36);
    const c = stage.camera; c.position.set(m.x + Math.sin(stage.t * .23) * .09, m.y + Math.sin(stage.t * .31) * .035, -m.z - (Math.sin(stage.t * .12) * .5 + .5) * .16);
    c.rotation.set(stage.pitch, stage.yaw - c.position.x * .08, 0, 'YXZ');
    const portrait = innerHeight > innerWidth, wa = innerWidth / innerHeight;
    c.aspect = wa; c.fov = wa < w.aspect ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(w.fovY) / 2) * Math.min(1.6, w.aspect / wa) * .92)) : w.fovY * .96; c.updateProjectionMatrix();
    void portrait;
  }
  function nearest(pos, maxDist = 2.6) { let best = null, bd = maxDist; for (const p of portals) { const d = p.pos.distanceTo(pos); if (d < bd) { bd = d; best = p; } } return best; }
  function update(t, camCar, M) { for (const p of portals) { p.mat.uniforms.time.value = t; p.mesh.visible = Math.abs(p.car.i - camCar) <= 2; } if (camCar >= 5) startFeeds(M); }
  return { data, portals, stage, enter, exit, toggleLive, updateStage, nearest, update, preview, tex };
}
