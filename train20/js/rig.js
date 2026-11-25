// The camera rig. Every shot is a small function of the same context, so a camera position is data:
// where the lens sits relative to the passenger, the carriage, the train, a bee or the land.
// The same table is exported as posed pinhole cameras (rig.export) for any generator that takes target cameras.
import * as THREE from 'three';
import { DIM, clamp, damp, noise2 } from './kit.js';

const { L, HW, FLOOR: F, ROOF } = DIM;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** frame: what the shot is attached to. inside: lens is in the carriage (so it gets wall clamping and lamp light). */
export const SHOTS = [
  { id: 'follow', label: 'Follow', frame: 'passenger', inside: true, fov: 58, lens: '28mm corridor',
    at: c => c.a.seated ? { pos: V(c.a.x - c.a.dir * 1.55, F + 1.52, c.a.z - c.side * 1.0), look: V(c.a.x + c.a.dir * .9, F + 1.12, c.a.z + c.side * .9) }
      : { pos: V(c.a.x - c.a.dir * 2.5, F + 1.72, c.aisleZ + .1), look: V(c.a.x + c.a.dir * 3, F + 1.3, c.a.z) } },
  { id: 'profile', label: 'Profile', frame: 'passenger', inside: true, fov: 34, lens: '50mm face-in-glass',
    at: c => ({ pos: V(c.a.x + c.a.dir * 1.05, F + 1.22, c.a.z - c.side * 1.15), look: V(c.a.x, F + (c.a.seated ? 1.12 : 1.5), c.a.z + c.side * .15) }) },
  { id: 'pov', label: 'Eyes', frame: 'passenger', inside: true, fov: 68, lens: 'point of view',
    at: c => ({ pos: V(c.a.x + c.a.dir * .12, F + (c.a.seated ? 1.2 : 1.62), c.a.z), look: c.a.seated ? V(c.a.x + c.a.dir * 3, F + 1.1, c.a.z + c.side * 4) : V(c.a.x + c.a.dir * 4, F + 1.45, c.a.z) }) },
  { id: 'aisle', label: 'Aisle', frame: 'carriage', inside: true, fov: 30, lens: 'long axial',
    at: c => ({ pos: V(c.car.x + c.a.dir * -(L / 2 - 1.2) + c.a.dir * ((c.t * .25) % 4), F + 1.42, c.car.aisleZ), look: V(c.car.x + c.a.dir * L / 2, F + 1.25, c.car.aisleZ) }) },
  { id: 'window', label: 'Window', frame: 'carriage', inside: true, fov: 60, lens: 'glass threshold',
    at: c => ({ pos: V(c.a.x + .3, F + 1.42, c.side * (HW - .3)), look: V(c.a.x + 14, F + 1.1, c.side * 40) }) },
  { id: 'cctv', label: 'CCTV', frame: 'carriage', inside: true, fov: 82, lens: 'fixed surveillance',
    at: c => ({ pos: V(c.car.x + L / 2 - .5, F + 2.12, HW - .32), look: V(c.car.x - 2.5, F + .7, -.5) }) },
  { id: 'bee', label: 'Bee cam', frame: 'bee', inside: true, fov: 86, lens: 'macro wide',
    at: c => ({ pos: V(c.bee.p.x - c.bee.v.x * .34, c.bee.p.y + .07, c.bee.p.z - c.bee.v.z * .34), look: V(c.bee.p.x + c.bee.v.x, c.bee.p.y - .02, c.bee.p.z + c.bee.v.z) }) },
  { id: 'lean', label: 'Lean out', frame: 'train', fov: 52, lens: 'out of the window',
    at: c => ({ pos: V(c.a.x, F + 1.5, c.side * (HW + .6)), look: V(c.a.x + 40, F + 1.2, c.side * (HW + 2.6)) }) },
  { id: 'track', label: 'Tracking', frame: 'train', fov: 36, lens: 'lateral tracking',
    at: c => ({ pos: V(c.a.x + 3, F + 1.25, c.side * 9.5), look: V(c.a.x, F + 1.2, 0) }) },
  { id: 'wheel', label: 'Wheels', frame: 'train', fov: 56, lens: 'low bogie', shake: 1,
    at: c => ({ pos: V(c.car.x - L / 2 + 1.2, .62, HW + 1.15), look: V(c.car.x - L / 2 + 5, .5, .6) }) },
  { id: 'roof', label: 'Roof', frame: 'train', fov: 62, lens: 'exterior shell',
    at: c => ({ pos: V(c.a.x - 4, F + ROOF + 1.25, .3), look: V(c.a.x + 40, F + ROOF - .6, 0) }) },
  { id: 'nose', label: 'Engine', frame: 'train', fov: 44, lens: 'riding the nose',
    at: c => ({ pos: V(c.noseX + 11, 2.6, 4.2 * c.side), look: V(c.noseX - 12, 2.2, 0) }) },
  { id: 'tail', label: 'Tail', frame: 'train', fov: 58, lens: 'rails receding',
    at: c => ({ pos: V(c.tailX - 2.2, F + 1.6, .0), look: V(c.tailX - 80, .5, 0) }) },
  { id: 'drone', label: 'Witness', frame: 'train', fov: 38, lens: 'divine overhead',
    at: c => ({ pos: V(c.a.x - 46 + Math.sin(c.t * .08) * 16, 38 + Math.sin(c.t * .05) * 6, 52 * c.side), look: V(c.a.x + 6, 2, 0) }) },
  { id: 'lineside', label: 'Lumière', frame: 'land', fov: 30, lens: '45° platform angle',
    at: (c, s) => { if (s.wx === undefined || s.wx - c.dist < c.tailX - 70) s.wx = c.dist + 240 + c.speed * 4; return { pos: V(s.wx - c.dist, 1.7, 7.5), look: V(Math.max(c.noseX - 6, s.wx - c.dist - 60), 2.4, 0) }; } },
  { id: 'vista', label: 'Vista', frame: 'land', fov: 24, lens: 'landscape of collapse',
    at: (c, s) => { if (s.wx === undefined || s.wx - c.dist < c.tailX - 260) s.wx = c.dist + 420; return { pos: V(s.wx - c.dist, 46, 170 * c.side), look: V(clamp(s.wx - c.dist, c.tailX + 40, c.noseX - 30), 3, 0) }; } },
];
export const byId = Object.fromEntries(SHOTS.map(s => [s.id, s]));

export function createRig(camera) {
  const st = { shot: SHOTS[0], mem: {}, yaw: 0, pitch: 0, zoom: 1, pos: V(0, 0, 0), look: V(0, 0, 0), fov: 58, cut: true };
  const dir = V(0, 0, 0), sph = new THREE.Spherical();
  function set(id) { const s = byId[id]; if (!s) return false; st.shot = s; st.mem = {}; st.yaw = st.pitch = 0; st.zoom = 1; st.cut = true; return true; }
  function update(dt, ctx) {
    const s = st.shot, r = s.at(ctx, st.mem);
    if (s.inside) {   // keep the lens inside the carriage it is in
      const lx = r.pos.x - ctx.car.x, end = Math.abs(lx) > L / 2 - .25;
      if (ctx.car.i === 0) r.pos.x = clamp(r.pos.x, ctx.car.x - L / 2 + .35, ctx.car.x - L / 2 + 2.85);
      r.pos.z = clamp(r.pos.z, end ? -.3 : -(HW - .22), end ? .3 : HW - .22); r.pos.y = clamp(r.pos.y, F + .25, F + 2.3);
    }
    const k = st.cut ? 1e3 : s.frame === 'bee' ? 5 : s.inside ? 7 : 4;
    st.pos.x = damp(st.pos.x, r.pos.x, k, dt); st.pos.y = damp(st.pos.y, r.pos.y, k, dt); st.pos.z = damp(st.pos.z, r.pos.z, k, dt);
    st.look.x = damp(st.look.x, r.look.x, k, dt); st.look.y = damp(st.look.y, r.look.y, k, dt); st.look.z = damp(st.look.z, r.look.z, k, dt);
    st.fov = damp(st.fov, clamp(s.fov * st.zoom, 12, 100), st.cut ? 1e3 : 6, dt); st.cut = false;
    // operator: drag re-aims the head around the mounted position
    dir.copy(st.look).sub(st.pos); sph.setFromVector3(dir); sph.theta -= st.yaw; sph.phi = clamp(sph.phi - st.pitch, .25, 2.9); dir.setFromSpherical(sph);
    camera.position.copy(st.pos);
    const sway = ctx.speed / 26, n = (a) => (noise2(ctx.t * a, a * 7) - .5);
    camera.position.y += n(5) * .012 * sway * (s.shake ? 4 : 1); camera.position.z += n(3.1) * .01 * sway;
    camera.lookAt(st.pos.x + dir.x, st.pos.y + dir.y, st.pos.z + dir.z);
    camera.rotation.z += n(1.3) * .006 * sway + (s.shake ? n(11) * .01 : 0);
    if (Math.abs(camera.fov - st.fov) > .01) { camera.fov = st.fov; camera.updateProjectionMatrix(); }
  }
  /** Every shot as a posed pinhole camera in the train frame (three.js axes, metres): the hand-off to image, video or world generators. */
  function exportRig(ctx, width = 1280, height = 720) {
    const cam = new THREE.PerspectiveCamera();
    return { frame: 'train (+X travel, +Y up, origin on the rail under the locomotive)', coordinateSystem: 'rub', width, height, shots: SHOTS.map(s => {
      const r = s.at(ctx, {}); cam.position.copy(r.pos); cam.lookAt(r.look); const fy = height / 2 / Math.tan(THREE.MathUtils.degToRad(s.fov) / 2);
      return { id: s.id, label: s.label, attachedTo: s.frame, lens: s.lens, fovY: s.fov,
        camera: { extrinsics: { coordinateSystem: 'rub', position: r.pos.toArray().map(v => +v.toFixed(3)), quaternion: cam.quaternion.toArray().map(v => +v.toFixed(5)) }, intrinsics: { width, height, fx: +fy.toFixed(2), fy: +fy.toFixed(2), cx: width / 2, cy: height / 2 } } };
    }) };
  }
  return { st, set, update, export: exportRig };
}
