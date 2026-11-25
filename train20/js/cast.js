// The passengers: the Dawn Wellhead figures and Mesh2Motion clips from make-photo (both CC0),
// driven through the same retargeter the Motion Lab uses.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { makeRetarget, clipGroundSpeed } from './retarget.js';
import { damp } from './kit.js';

const BASE = 'train20/assets/';
const CLIPS = ['walk', 'walk-relaxed', 'idle-subtle', 'idle-listening', 'idle-talking', 'idle-foldarms', 'sitting-idle', 'sitting-talking', 'head-nod', 'greeting'];
// The figures arrive in neutral studio greys; each passenger is dressed here by material name.
export const CASTING = {
  berhanu: { file: 'Berhanu', role: 'The traveler', idle: 'idle-subtle', wear: { shirt: 0x3b2a1e, pants: 0x1f1c1a, boots: 0x18120e, linen: 0x7a5636, edge: 0x4d3420, darkcloth: 0x2a1d16 } },
  imani: { file: 'Imani', role: 'The violinist', idle: 'idle-listening', wear: { shirt: 0x22314f, pants: 0x1b1d2a, boots: 0x15110f, linen: 0xc9a24a, edge: 0x7a1f1d, darkcloth: 0x1b2238 } },
  makeda: { file: 'Makeda', role: 'The beekeeper', idle: 'idle-foldarms', wear: { shirt: 0x6a2420, pants: 0x3a2a22, boots: 0x1a1410, linen: 0xe6dcc4, edge: 0xb98a2e, darkcloth: 0x4a1a18 } },
  june: { file: 'June', role: 'The child', idle: 'idle-subtle', wear: { shirt: 0x2f6a5c, pants: 0x3a3226, boots: 0x1a1410, linen: 0xd9c9a0, edge: 0x7a1f1d, darkcloth: 0x244a42 } },
  hanna: { file: 'Hanna', role: 'The conductor', idle: 'idle-talking', wear: { shirt: 0x17333b, pants: 0x12262c, boots: 0x0e0c0b, linen: 0x17333b, edge: 0xc59a3e, darkcloth: 0x12262c } },
};

export async function loadCast(onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const load = u => new Promise((res, rej) => loader.load(BASE + u, res, undefined, rej));
  const skel = await load('clips/skeleton.glb'), clips = {};
  await Promise.all(CLIPS.map(async n => { try { clips[n] = (await load(`clips/${n}.glb`)).animations[0]; } catch (e) { /* a missing clip only narrows the repertoire */ } }));
  const walkSpeed = clipGroundSpeed(SkeletonUtils.clone(skel.scene), clips.walk) || 1.3;
  const figures = {}; let done = 0;
  await Promise.all(Object.entries(CASTING).map(async ([id, c]) => { figures[id] = (await load(`people/${c.file}.glb`)).scene; onProgress(++done / 5); }));

  /** One person. `still` people are posed once and then left alone, which is what makes a full carriage affordable. */
  function make(id, { still = false, tint = null } = {}) {
    const fig = SkeletonUtils.clone(figures[id]), src = SkeletonUtils.clone(skel.scene);
    const wear = CASTING[id].wear;
    fig.traverse(o => { if (o.isMesh) { o.frustumCulled = false; const hex = wear[o.material.name]; if (hex !== undefined || tint) { o.material = o.material.clone(); if (hex !== undefined) o.material.color.setHex(hex); if (tint) o.material.color.multiply(tint); } } });
    const root = new THREE.Group(); root.add(fig, src);   // the hidden clip skeleton rides along so both share the root's heading
    const rt = makeRetarget(src, fig), mixer = new THREE.AnimationMixer(src), act = {};
    for (const [n, clip] of Object.entries(clips)) { const a = mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); act[n] = a; }
    const p = { id, root, fig, rt, mixer, act, still, weights: {}, want: {}, posed: 0, speed: 0, role: CASTING[id].role, idle: CASTING[id].idle, head: rt.D.head, phase: Math.random() * 10 };
    mixer.setTime(p.phase);
    p.set = (w) => { p.want = w; if (still) p.posed = 0; };
    p.update = (dt, visible = true) => {
      if (still && p.posed > 2) return;
      let changed = false;
      for (const n in act) { const t = p.want[n] || 0, c = p.weights[n] || 0, v = Math.abs(t - c) < .004 ? t : damp(c, t, still ? 60 : 9, dt); if (v !== c) changed = true; p.weights[n] = v; act[n].setEffectiveWeight(v); }
      if (!visible && !changed) return;
      mixer.update(dt); rt.apply(); if (still) p.posed++;
    };
    /** Locomotion blend: idle below a stroll, walk clip rate matched to ground speed so feet do not slide. */
    p.locomote = (speed, dt, seated) => {
      p.speed = damp(p.speed, speed, 6, dt);
      if (seated) return p.set({ 'sitting-idle': 1 });
      const w = Math.min(1, p.speed / .35); p.set({ [p.idle]: 1 - w, walk: w });
      if (act.walk) act.walk.timeScale = p.speed > .05 ? p.speed / (walkSpeed * rt.ratio) : 1;
    };
    return p;
  }
  return { make, clips, walkSpeed };
}

/** Hat and scarf for the traveler, carried on the head bone. */
export function dressTraveler(p, M) {
  const g = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.21, .22, .012, 20), M.walnut), crown = new THREE.Mesh(new THREE.CylinderGeometry(.095, .105, .11, 16), M.walnut), bandM = new THREE.Mesh(new THREE.CylinderGeometry(.107, .107, .025, 16), M.brass);
  crown.position.y = .06; bandM.position.y = .02; g.add(brim, crown, bandM);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(.082, .04, 6, 14), M.carpet); scarf.rotation.x = Math.PI / 2;
  p.root.add(g, scarf);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), iq = new THREE.Quaternion();
  p.dress = () => {
    p.root.getWorldQuaternion(iq).invert();
    p.head.getWorldPosition(v); p.root.worldToLocal(v); p.head.getWorldQuaternion(q).premultiply(iq);
    g.position.copy(v).add(new THREE.Vector3(0, .165, .0).applyQuaternion(q)); g.quaternion.copy(q);
    scarf.position.copy(v).add(new THREE.Vector3(0, -.105, -.015).applyQuaternion(q));
  };
  return p;
}
