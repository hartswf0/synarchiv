// The world outside. The train never moves: the land is a treadmill re-sampled from one continuous route,
// so a viaduct, two tunnels, a lake, a station and the impossible hive all arrive in order and recede behind.
import * as THREE from 'three';
import { Batch, DIM, fbm, noise2, smooth, lerp, clamp } from './kit.js';

export const LOOP = 9000;
export const ROUTE = [
  { a: 1300, b: 1950, type: 'viaduct', name: 'Awash viaduct' },
  { a: 2900, b: 3500, type: 'tunnel', name: 'Tunnel blue' },
  { a: 3900, b: 5050, type: 'lake', name: 'Salt lake at dusk' },
  { a: 5330, b: 5560, type: 'station', name: 'Amba halt' },
  { a: 6300, b: 7300, type: 'hive', name: 'The impossible hive' },
  { a: 7700, b: 8060, type: 'tunnel', name: 'Second bore' },
];
export const STOP_AT = 5440 + 40;           // distance at which the middle of the train stands at the platform
const wrap = (v, p) => ((v % p) + p) % p;
/** Signed shortest offset from the travelled distance to a point on the looping route. */
export const ahead = (wx, dist) => { let d = wrap(wx - dist, LOOP); if (d > LOOP / 2) d -= LOOP; return d; };
const band = (s, wx, ramp) => { const x = wrap(wx, LOOP); return smooth(s.a - ramp, s.a, x) * (1 - smooth(s.b, s.b + ramp, x)); };
export function factors(wx) {
  const f = { viaduct: 0, tunnel: 0, lake: 0, station: 0, hive: 0 };
  for (const s of ROUTE) f[s.type] = Math.max(f[s.type], band(s, wx, s.type === 'tunnel' ? 36 : s.type === 'lake' ? 300 : 110));
  return f;
}
export function heightAt(wx, z) {
  const az = Math.abs(z), f = factors(wx);
  let h = fbm(wx / 300 + 3, z / 300 + 5) * 95 * smooth(14, 320, az) + (fbm(wx / 46, z / 46) - .5) * 7 * smooth(6, 50, az) - 1.1 * smooth(4, 9, az);
  if (z < 0) h += noise2(wx / 900, 7) * 60 * smooth(200, 700, az);
  if (f.viaduct) h = lerp(h, -44 + fbm(wx / 70, z / 70) * 14 + smooth(120, 420, az) * 60, f.viaduct * (1 - smooth(300, 520, az)));
  if (f.lake && z < 0) h = lerp(h, -5, f.lake * smooth(26, 60, az) * (1 - smooth(520, 760, az)));
  if (f.station) h = lerp(h, -1.1, f.station * (1 - smooth(40, 90, az)));
  if (f.tunnel) h = lerp(h, 15 + fbm(wx / 60, z / 60 + 9) * 16, f.tunnel * (1 - smooth(110, 300, az)));
  return h;
}

export function buildLand(scene, M, tex, loader) {
  const root = new THREE.Group(); root.name = 'land'; scene.add(root);
  // ---- sky and painted horizon
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5200, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(0x356e7a) }, hor: { value: new THREE.Color(0xf0cf8e) }, dark: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; uniform vec3 top,hor; uniform float dark; void main(){ float h=clamp(normalize(p).y*1.6+.08,0.,1.); gl_FragColor=vec4(mix(hor,top,pow(h,.7))*(1.-dark),1.); }' }));
  sky.renderOrder = -10; root.add(sky);
  const fade = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#000'); gr.addColorStop(.3, '#fff'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
  function panorama(file, opacity) {
    const t = loader.load(file); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.x = 4;
    const R = 4300, Hh = 2 * Math.PI * R / 4 * (9 / 16);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Hh, 48, 1, true), new THREE.MeshBasicMaterial({ map: t, alphaMap: fade, transparent: true, opacity, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.position.y = Hh * .5 - Hh * .47; m.renderOrder = -9; root.add(m); return m;
  }
  const panA = panorama('train20/assets/panorama_a.jpg', 1), panB = panorama('train20/assets/panorama_b.jpg', 0);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(150, 24), new THREE.MeshBasicMaterial({ color: 0xfff0c2, fog: false, transparent: true, opacity: .9, depthWrite: false }));
  sun.position.set(2600, 620, 3200); sun.lookAt(0, 0, 0); sun.renderOrder = -8; root.add(sun);

  // ---- terrain treadmill
  const CX = 12, NX = 96, ROWS = [4.7, 7, 11, 18, 30, 48, 75, 115, 170, 250, 360, 520, 760, 1100];
  const terr = [];
  for (const side of [-1, 1]) {
    const g = new THREE.BufferGeometry(), nv = (NX + 1) * ROWS.length;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    const idx = [];
    for (let j = 0; j < NX; j++) for (let r = 0; r < ROWS.length - 1; r++) { const a = j * ROWS.length + r, b = a + ROWS.length; side > 0 ? idx.push(a, a + 1, b, b, a + 1, b + 1) : idx.push(a, b, a + 1, b, b + 1, a + 1); }
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); mesh.frustumCulled = false; root.add(mesh); terr.push({ side, g, mesh });
  }
  const cA = new THREE.Color(), cOchre = new THREE.Color(0x94703f), cGold = new THREE.Color(0xc09a58), cRock = new THREE.Color(0x7b5a6c), cGreen = new THREE.Color(0x6f7f3f), cDeep = new THREE.Color(0x3d3a45), cCut = new THREE.Color(0x6e5038), cScrub = new THREE.Color(0x5f6a38), cRed = new THREE.Color(0x8a4a30);
  let lastCell = null;
  function resample(cell) {
    for (const t of terr) {
      const P = t.g.attributes.position.array, C = t.g.attributes.color.array; let k = 0;
      for (let j = 0; j <= NX; j++) {
        const wx = (cell + j - NX / 2) * CX, f = factors(wx);
        for (let r = 0; r < ROWS.length; r++) {
          const z = t.side * ROWS[r], h = heightAt(wx, z), n = noise2(wx / 31, z / 31);
          P[k] = (j - NX / 2) * CX; P[k + 1] = h; P[k + 2] = z;
          cA.copy(cOchre).lerp(cGold, n).lerp(cScrub, smooth(.52, .7, noise2(wx / 140 + 3, z / 140)) * .65).lerp(cRed, smooth(.6, .8, noise2(wx / 420, z / 260 + 8)) * .5).lerp(cRock, smooth(40, 120, h)).lerp(cGreen, smooth(-1.5, -3.2, h) * .7 + (f.station * .4)).lerp(cDeep, smooth(-12, -40, h) * .75);
          if (f.tunnel > .2 && r < 4) cA.lerp(cCut, .7);
          C[k] = cA.r; C[k + 1] = cA.g; C[k + 2] = cA.b; k += 3;
        }
      }
      t.g.attributes.position.needsUpdate = t.g.attributes.color.needsUpdate = true;
    }
  }
  // ---- permanent way
  const way = new Batch();
  way.box(M.ballast, 0, -.42, 0, 1200, .5, 4.2); way.box(M.ballast, 0, -.85, 0, 1200, .5, 9.6);
  for (const s of [-1, 1]) way.box(M.steel, 0, -.07, s * .76, 1200, .14, .07);
  way.build(root);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(.24, .12, 2.5), M.walnut, 640), SP = .72, mat4 = new THREE.Matrix4();
  for (let k = 0; k < 640; k++) sleepers.setMatrixAt(k, mat4.makeTranslation((k - 320) * SP, -.16, 0));
  sleepers.frustumCulled = false; root.add(sleepers);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 2400), new THREE.MeshStandardMaterial({ color: 0x2f6b72, roughness: .12, metalness: .55 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -3; root.add(water);

  // ---- scattered instances that recycle along the line
  const PER = NX * CX, one = new THREE.Vector3(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let rs = 7; const rr = () => ((rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296);
  function scatter(n, parts, zr, sr, opt = {}) {
    const meshes = parts.map(([g, m]) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; root.add(im); return im; });
    const items = []; for (let k = 0; k < n; k++) { const z = (zr[0] + rr() * (zr[1] - zr[0])) * (opt.side || (rr() > .5 ? 1 : -1)); items.push({ x: opt.even ? k * PER / n : rr() * PER, z, s: sr[0] + rr() * (sr[1] - sr[0]), a: rr() * 6.28 }); }
    return { update(dist) {
      for (let k = 0; k < n; k++) {
        const it = items[k], lx = wrap(it.x - dist + PER / 2, PER) - PER / 2, wx = dist + lx, h = opt.flat ?? heightAt(wx, it.z), f = factors(wx);
        const hide = h < -2.9 || (f.tunnel > .05 && !opt.flat) || (opt.flat !== undefined && (f.tunnel > .5 || f.viaduct > .5)) || (f.station > .3 && Math.abs(it.z) < 30);
        one.setScalar(hide ? 0 : it.s); q.setFromAxisAngle(up, opt.fixed ? 0 : it.a); mat4.compose(pos.set(lx, h, it.z), q, one);
        for (const im of meshes) im.setMatrixAt(k, mat4);
      }
      for (const im of meshes) im.instanceMatrix.needsUpdate = true;
    } };
  }
  const G = (g, x, y, z) => g.translate(x, y, z);
  const sc = [
    scatter(70, [[G(new THREE.CylinderGeometry(.12, .2, 3.2, 5), 0, 1.6, 0), M.walnut], [G(new THREE.SphereGeometry(1, 7, 4).scale(2.3, .5, 2.3), 0, 3.5, 0), new THREE.MeshLambertMaterial({ color: 0x5d6b33, flatShading: true })]], [14, 300], [.7, 1.5]),
    scatter(60, [[new THREE.IcosahedronGeometry(1, 0).scale(1, .6, 1), new THREE.MeshLambertMaterial({ color: 0x8a6a52, flatShading: true })]], [7, 160], [.4, 2.6]),
    scatter(18, [[G(new THREE.CylinderGeometry(2.2, 2.2, 2.4, 10), 0, 1.2, 0), new THREE.MeshLambertMaterial({ color: 0xb8925c })], [G(new THREE.ConeGeometry(3, 2.2, 10), 0, 3.5, 0), M.straw]], [40, 260], [.8, 1.2]),
    scatter(22, [[G(new THREE.BoxGeometry(.16, 7.5, .16), 0, 3.4, 0), M.walnut], [G(new THREE.BoxGeometry(.1, .1, 1.7), 0, 6.6, 0), M.walnut]], [6.6, 6.6], [1, 1], { even: true, side: -1, flat: -.6, fixed: true }),
    scatter(26, [[G(new THREE.BoxGeometry(.5, .34, .4), 0, .17, 0), M.cream], [G(new THREE.BoxGeometry(.56, .05, .46), 0, .37, 0), M.roof]], [9, 40], [1, 1.3]),
  ];
  // ---- viaduct piers, tunnels, station, hive
  const via = ROUTE.filter(s => s.type === 'viaduct').map(s => {
    const g = new THREE.Group(), b = new Batch(), len = s.b - s.a + 160;
    for (let x = -len / 2; x <= len / 2; x += 26) { b.box(M.stone, x, -24.6, 0, 3.4, 47, 6.4); b.box(M.stone, x, -2.4, 0, 6, 2, 7); }
    b.box(M.stone, 0, -1.7, 0, len, 1.6, 7.4); for (const z of [-3.6, 3.6]) b.box(M.stone, 0, -.5, z, len, 1.1, .4);
    b.build(g); root.add(g); return { g, mid: (s.a + s.b) / 2 };
  });
  const tunnels = ROUTE.filter(s => s.type === 'tunnel').map(s => {
    const g = new THREE.Group(), len = s.b - s.a, b = new Batch();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, len, 16, 1, true).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1a1c20, side: THREE.BackSide }));
    tube.position.y = -.6; g.add(tube);
    b.box(M.stone, 0, 11, 0, len, 13, 9.4);
    for (const e of [-1, 1]) { for (const z of [-1, 1]) b.box(M.stone, e * len / 2, 2, z * 5.4, 1.4, 6, 2); b.box(M.stone, e * len / 2, 5.4, 0, 1.6, 1.2, 12.6); }
    for (let x = -len / 2 + 20; x < len / 2; x += 40) b.box(M.lampCool, x, 3.9, 0, .5, .08, .2);
    b.build(g); root.add(g); return { g, mid: (s.a + s.b) / 2 };
  });
  const station = new THREE.Group(); root.add(station);
  { const b = new Batch(), pz = -(DIM.HW + .22), top = DIM.FLOOR - .08;
    b.box(M.stone, 0, top / 2 - .6, pz - 3.2, 150, top + 1.2, 6.4); b.box(M.cream, 0, top + .005, pz - .25, 150, .02, .3);
    b.box(M.teal, -6, top + 2.2, pz - 7.4, 30, 4.4, 5); b.box(M.cream, -6, top + 3.3, pz - 4.88, 30, 1.2, .04); b.box(M.roof, -6, top + 4.6, pz - 5.6, 33, .25, 9.5, 0, 0, -.08);
    for (let x = -20; x <= 8; x += 7) { b.box(M.walnut, x, top + 1.25, pz - 4.86, 1.2, 2.5, .08); b.box(M.brass, x + 3.4, top + 2, pz - 1.4, .12, 4, .12); b.box(M.lamp, x + 3.4, top + 3.3, pz - 1.4, .3, .4, .3); }
    b.cyl(M.brass, -6, top + 3.9, pz - 4.7, .55, .55, .16, 18, Math.PI / 2); b.cyl(M.china, -6, top + 3.9, pz - 4.6, .46, .46, .05, 18, Math.PI / 2);
    for (const x of [14, 16, 19, -30, -33]) { b.stand(M.wood, x, top, pz - 2.4, 1.1, .9, 1.1); if (x % 2) b.stand(M.cream, x, top + .9, pz - 2.4, .8, .6, .8); }
    for (const x of [-24, 4, 24]) { b.stand(M.walnut, x, top + .4, pz - 3.6, 2.2, .08, .5); b.box(M.walnut, x, top + .8, pz - 3.84, 2.2, .5, .06); }
    // waiting figures in white shawls: silhouettes, the detailed cast rides the train
    let k = 0; for (const x of [-38, -22, -21, -9, 3, 5, 11, 27, 41]) { const z = pz - 1.3 - (k++ % 3) * .9, tall = 1.5 + (k % 3) * .12; b.cyl(k % 2 ? M.linen : M.cream, x, top + tall / 2, z, .16, .3, tall, 8); b.sph(M.walnut, x, top + tall + .1, z, .12); }
    b.build(station); }
  const hive = new THREE.Group(); root.add(hive);
  { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.sin(Math.PI * (.12 + t * .88)) * 70 * (1 - t * .25) + (i % 2) * 5, t * 190)); }
    hive.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshStandardMaterial({ color: 0xd49a2a, emissive: 0x8a4a06, emissiveIntensity: .7, roughness: .5, flatShading: true })));
    const door = new THREE.Mesh(new THREE.PlaneGeometry(16, 30), new THREE.MeshBasicMaterial({ color: 0xfff2b0 })); door.position.set(0, 15, 71); hive.add(door); }
  const HIVE_WX = 6850, HIVE_Z = -640;

  const env = { tunnel: 0, dusk: 0, viaduct: 0, station: 0, hive: 0, segment: null };
  const place = (g, wx, dist, limit = 2400) => { const d = ahead(wx, dist); g.visible = Math.abs(d) < limit; g.position.x = d; return d; };
  function update(dist, camX = 0) {
    const cell = Math.floor(dist / CX);
    if (cell !== lastCell) { resample(cell); lastCell = cell; }
    const off = -(dist - cell * CX);
    for (const t of terr) t.mesh.position.x = off;
    sleepers.position.x = -wrap(dist, SP);
    for (const s of sc) s.update(dist);
    via.forEach(v => place(v.g, v.mid, dist)); tunnels.forEach(t => place(t.g, t.mid, dist)); place(station, 5440, dist, 1400);
    const hd = place(hive, HIVE_WX, dist, 4200); hive.position.z = HIVE_Z; hive.position.y = heightAt(HIVE_WX, HIVE_Z) - 8; hive.rotation.y = -hd / 2400;
    const f = factors(dist + camX), fc = factors(dist);
    env.tunnel = f.tunnel > .5 ? 1 : 0; env.dusk = fc.lake; env.viaduct = f.viaduct; env.station = f.station; env.hive = fc.hive;
    env.segment = ROUTE.find(s => { const x = wrap(dist, LOOP); return x >= s.a - 80 && x <= s.b + 80; }) || null;
    water.position.y = lerp(-3, -40, fc.viaduct > .02 ? 1 : 0);
    panB.material.opacity = env.dusk; sun.material.opacity = .9 * (1 - env.dusk * .7);
  }
  return { root, update, env, sky, sun };
}
