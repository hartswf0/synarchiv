// Build kit: palette, procedural textures, and a batcher that merges static parts into one mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DIM = {
  L: 18,          // carriage body length
  GAP: 1.0,       // gangway between bodies
  HW: 1.45,       // half width of the body
  FLOOR: 1.25,    // floor height above rail head
  WALL: 2.2,      // wall height to the cornice
  ROOF: 2.72,     // crown of the ceiling above the floor
  CARS: 8,
};
DIM.SPAN = DIM.L + DIM.GAP;
export const carX = i => -i * DIM.SPAN;

let seed = 20;
export const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
export const reseed = s => { seed = s >>> 0; };
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
function speckle(q, w, h, n, cols, len = 0) {
  for (let i = 0; i < n; i++) {
    q.strokeStyle = q.fillStyle = cols[(Math.random() * cols.length) | 0];
    const x = Math.random() * w, y = Math.random() * h;
    if (len) { q.beginPath(); q.moveTo(x, y); q.lineTo(x + (Math.random() - .5) * 3, y + Math.random() * len); q.stroke(); } else q.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
export function makeTextures() {
  const paint = canvasTex(256, 256, (q, w, h) => {
    q.fillStyle = '#ffffff'; q.fillRect(0, 0, w, h);
    speckle(q, w, h, 900, ['#00000010', '#0000001c', '#ffffff30'], 26);
    speckle(q, w, h, 500, ['#5a3a1c2a', '#00000022']);
    q.fillStyle = '#00000026'; for (let x = 0; x < w; x += 64) q.fillRect(x, 0, 2, h);
  }, 3, 1);
  const wood = canvasTex(256, 256, (q, w, h) => {
    q.fillStyle = '#8a6a4c'; q.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { q.fillStyle = (y / 32) % 2 ? '#7d5f44' : '#93714f'; q.fillRect(0, y, w, 31); q.fillStyle = '#2a1c12'; q.fillRect(0, y + 31, w, 1); }
    q.lineWidth = 1; speckle(q, h, w, 0, []);
    for (let i = 0; i < 700; i++) { q.strokeStyle = Math.random() > .5 ? '#c9a57a22' : '#2a1c1230'; const x = Math.random() * w, y = Math.random() * h; q.beginPath(); q.moveTo(x, y); q.lineTo(x + 20 + Math.random() * 60, y + Math.random() * 2 - 1); q.stroke(); }
  }, 6, 1);
  const leather = canvasTex(128, 128, (q, w, h) => {
    q.fillStyle = '#ffffff'; q.fillRect(0, 0, w, h); speckle(q, w, h, 1400, ['#00000018', '#ffffff22', '#00000030']);
  }, 2, 2);
  const ground = canvasTex(256, 256, (q, w, h) => {
    q.fillStyle = '#ffffff'; q.fillRect(0, 0, w, h); speckle(q, w, h, 2600, ['#00000014', '#ffffff40', '#5a2c1026', '#00000024']);
  }, 40, 40);
  return { paint, wood, leather, ground };
}

export function makeMaterials(tex) {
  const S = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0, ...o });
  const Lm = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  return {
    teal: S(0x1f6e6a, { map: tex.paint, roughness: .7 }),
    tealDark: S(0x154845, { map: tex.paint, roughness: .75 }),
    ext: S(0x2f8a80, { map: tex.paint, roughness: .55, metalness: .15 }),
    cream: S(0xd8c394, { map: tex.paint, roughness: .7 }),
    ceil: Lm(0xa8946f, { map: tex.paint }),
    roof: S(0x3a3d3c, { roughness: .6, metalness: .3 }),
    wood: S(0x6b4226, { roughness: .6 }),
    walnut: S(0x3a2416, { roughness: .55 }),
    floor: S(0xffffff, { map: tex.wood, roughness: .7 }),
    brass: S(0xc59a3e, { roughness: .32, metalness: .85 }),
    iron: S(0x23282a, { roughness: .6, metalness: .5 }),
    steel: S(0x8f9896, { roughness: .35, metalness: .8 }),
    leather: S(0x5c1a18, { map: tex.leather, roughness: .45 }),
    velvet: Lm(0x6a181c),
    carpet: Lm(0x5a1d1a),
    linen: Lm(0xe9e1cf),
    china: S(0xf2ecdf, { roughness: .3 }),
    soil: Lm(0x3b2a1d),
    leaf: Lm(0x3f6a37),
    leaf2: Lm(0x7d9a45),
    bloom: Lm(0xd9a02c),
    honey: S(0xe2a32b, { roughness: .35, emissive: 0x7a4a05, emissiveIntensity: .6 }),
    straw: Lm(0x8f6d3a),
    black: Lm(0x0c0d0e),
    crt: S(0x3b352d, { roughness: .6 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffc56e }),
    lampCool: new THREE.MeshBasicMaterial({ color: 0xbfe8e0 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff3b24 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4bb, transparent: true, opacity: .16, roughness: .05, metalness: .2, depthWrite: false, side: THREE.DoubleSide }),
    glassRoof: new THREE.MeshStandardMaterial({ color: 0xcfe6d4, transparent: true, opacity: .2, roughness: .1, depthWrite: false, side: THREE.DoubleSide }),
    stone: Lm(0x8a7558),
    ballast: Lm(0x6a5a4a),
  };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const UNIT = { box: new THREE.BoxGeometry(1, 1, 1), };
const cylCache = new Map(), sphCache = new Map();
/** Collects primitives per material and bakes them into one mesh each: a whole carriage costs about a dozen draw calls. */
export class Batch {
  constructor() { this.by = new Map(); }
  push(mat, geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    const g = geo.clone().applyMatrix4(_m);
    if (!this.by.has(mat)) this.by.set(mat, []);
    this.by.get(mat).push(g); return this;
  }
  box(mat, x, y, z, w, h, d, ry = 0, rz = 0, rx = 0) { return this.push(mat, UNIT.box, x, y, z, w, h, d, rx, ry, rz); }
  /** Box given by its bottom centre, the natural way to stand furniture on a floor. */
  stand(mat, x, y, z, w, h, d, ry = 0) { return this.box(mat, x, y + h / 2, z, w, h, d, ry); }
  cyl(mat, x, y, z, r1, r2, h, seg = 10, rx = 0, rz = 0) {
    const k = seg; if (!cylCache.has(k)) cylCache.set(k, new THREE.CylinderGeometry(1, 1, 1, seg));
    if (r1 === r2) return this.push(mat, cylCache.get(k), x, y, z, r1, h, r1, rx, 0, rz);
    return this.push(mat, new THREE.CylinderGeometry(r1, r2, 1, seg), x, y, z, 1, h, 1, rx, 0, rz);
  }
  sph(mat, x, y, z, rx, ry = rx, rz = rx, seg = 8) {
    if (!sphCache.has(seg)) sphCache.set(seg, new THREE.SphereGeometry(1, seg, Math.max(5, seg - 2)));
    return this.push(mat, sphCache.get(seg), x, y, z, rx, ry, rz);
  }
  plane(mat, x, y, z, w, h, ry = 0, rx = 0) { return this.push(mat, PLANE, x, y, z, w, h, 1, rx, ry, 0); }
  build(parent) {
    const out = [];
    for (const [mat, list] of this.by) {
      const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
      const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; if (mat.transparent) mesh.renderOrder = 2;
      parent.add(mesh); out.push(mesh);
    }
    this.by.clear(); return out;
  }
}
const PLANE = new THREE.PlaneGeometry(1, 1);

/** Cheap 2D value noise, used for terrain and for wandering motion. */
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => { let n = Math.imul(a, 374761393) + Math.imul(b, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
export const fbm = (x, y) => noise2(x, y) * .55 + noise2(x * 2.1 + 9, y * 2.1 + 4) * .3 + noise2(x * 4.3 + 2, y * 4.3 + 7) * .15;
