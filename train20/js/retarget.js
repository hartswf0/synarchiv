// Mesh2Motion (CC0) human clips onto the MakeHuman-rigged Dawn Wellhead figures.
// Each figure owns a hidden source skeleton with an AnimationMixer; every frame the source pose is copied
// onto the figure as world-space rotation deltas from rest, so differing rest poses do not matter.
import * as THREE from 'three';
const MAP = { pelvis: 'root', spine_01: 'spine05', spine_02: 'spine03', spine_03: 'spine01', neck_01: 'C7', head: 'head',
  clavicle_l: 'clavicleL', upperarm_l: 'upperarm01L', lowerarm_l: 'lowerarm01L', hand_l: 'wristL',
  clavicle_r: 'clavicleR', upperarm_r: 'upperarm01R', lowerarm_r: 'lowerarm01R', hand_r: 'wristR',
  thigh_l: 'upperleg01L', calf_l: 'lowerleg01L', foot_l: 'footL', ball_l: 'toe1-1L',
  thigh_r: 'upperleg01R', calf_r: 'lowerleg01R', foot_r: 'footR', ball_r: 'toe1-1R',
  thumb_01_l: 'finger1-1L', thumb_02_l: 'finger1-2L', thumb_03_l: 'finger1-3L', index_01_l: 'finger2-1L', index_02_l: 'finger2-2L', index_03_l: 'finger2-3L',
  middle_01_l: 'finger3-1L', middle_02_l: 'finger3-2L', middle_03_l: 'finger3-3L', ring_01_l: 'finger4-1L', ring_02_l: 'finger4-2L', ring_03_l: 'finger4-3L',
  pinky_01_l: 'finger5-1L', pinky_02_l: 'finger5-2L', pinky_03_l: 'finger5-3L',
  thumb_01_r: 'finger1-1R', thumb_02_r: 'finger1-2R', thumb_03_r: 'finger1-3R', index_01_r: 'finger2-1R', index_02_r: 'finger2-2R', index_03_r: 'finger2-3R',
  middle_01_r: 'finger3-1R', middle_02_r: 'finger3-2R', middle_03_r: 'finger3-3R', ring_01_r: 'finger4-1R', ring_02_r: 'finger4-2R', ring_03_r: 'finger4-3R',
  pinky_01_r: 'finger5-1R', pinky_02_r: 'finger5-2R', pinky_03_r: 'finger5-3R' };
// Each bone's direction is taken toward this child; the figure's rest pose is turned to match the clip skeleton's rest pose
// bone by bone, so a T-pose clip on an A-pose figure does not leave the arms 45 degrees off.
const CHILD = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head',
  clavicle_l: 'upperarm_l', upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l', hand_l: 'middle_01_l',
  clavicle_r: 'upperarm_r', upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', hand_r: 'middle_01_r',
  thigh_l: 'calf_l', calf_l: 'foot_l', foot_l: 'ball_l', thigh_r: 'calf_r', calf_r: 'foot_r', foot_r: 'ball_r' };
for (const s of ['l', 'r']) for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) { CHILD[`${f}_01_${s}`] = `${f}_02_${s}`; CHILD[`${f}_02_${s}`] = `${f}_03_${s}`; }
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function bonesByName(root) { const m = {}; root.traverse(o => { if (o.isBone || o.type === 'Bone') m[o.name] = o; }); return m; }
export function makeRetarget(src, dst) {
  // src: Object3D root of the Mesh2Motion skeleton. dst: Object3D root of the Dawn figure. Both at rest, unparented transforms identity.
  const S = bonesByName(src), D = bonesByName(dst);
  src.updateMatrixWorld(true); dst.updateMatrixWorld(true);
  const pairs = [];
  const wp = b => b.getWorldPosition(new THREE.Vector3());
  for (const [s, d] of Object.entries(MAP)) if (S[s] && D[d]) {
    const sr = S[s].getWorldQuaternion(new THREE.Quaternion()), dr = D[d].getWorldQuaternion(new THREE.Quaternion());
    const c = CHILD[s];
    if (c && S[c] && D[MAP[c]]) {
      const sd = wp(S[c]).sub(wp(S[s])).normalize(), td = wp(D[MAP[c]]).sub(wp(D[d])).normalize();
      if (sd.lengthSq() > .5 && td.lengthSq() > .5) dr.premultiply(new THREE.Quaternion().setFromUnitVectors(td, sd));   // figure rest, as if posed like the clip rest
    }
    pairs.push({ s: S[s], d: D[d], srInv: sr.clone().invert(), dr, depth: (() => { let n = 0; for (let p = D[d]; p; p = p.parent) n++; return n; })() });
  }
  pairs.sort((a, b) => a.depth - b.depth);
  const hipS = S.pelvis.getWorldPosition(new THREE.Vector3()), hipD = D.root.getWorldPosition(new THREE.Vector3()), ratio = hipD.y / hipS.y;
  const srcRoot = src, dstRoot = dst, restHipLocal = D.root.position.clone();
  const missing = Object.entries(MAP).filter(([s, d]) => !S[s] || !D[d]).map(([s, d]) => s + '>' + d);
  return {
    D, S, ratio, missing,
    apply() {
      srcRoot.updateMatrixWorld(true); dstRoot.updateMatrixWorld(true);
      const inv = new THREE.Quaternion();
      for (const p of pairs) {
        p.s.getWorldQuaternion(q1);                              // source world now
        q1.multiply(p.srInv);                                     // delta from source rest (world)
        q2.copy(q1).multiply(p.dr);                               // target world wanted
        p.d.parent.getWorldQuaternion(inv).invert();
        p.d.quaternion.copy(inv.multiply(q2));
        p.d.updateMatrixWorld(true);
      }
      // hips: source pelvis offset from rest, in source-root space, scaled to the figure
      S.pelvis.getWorldPosition(v1); srcRoot.worldToLocal(v1); v1.sub(hipS).multiplyScalar(ratio);
      v2.copy(hipD).add(v1); D.root.parent.worldToLocal(dstRoot.localToWorld(v2));
      D.root.position.copy(v2); D.root.updateMatrixWorld(true);
    }
  };
}
// Ground speed of an in-place clip: the planted foot moves backwards under the pelvis at the walking speed.
export function clipGroundSpeed(skel, clip, footNames = ['foot_l', 'foot_r'], up = 'y', fwd = 'z') {
  // only frames where the lower foot is actually on the ground count, so running clips with a flight phase measure true
  const mixer = new THREE.AnimationMixer(skel), a = mixer.clipAction(clip); a.play();
  const B = bonesByName(skel), feet = footNames.map(n => B[n]), N = 160, dt = clip.duration / N, pts = [];
  for (let i = 0; i <= N; i++) { mixer.setTime(i * dt); skel.updateMatrixWorld(true); pts.push(feet.map(f => f.getWorldPosition(new THREE.Vector3()))); }
  let floor = Infinity; for (const p of pts) for (const v of p) floor = Math.min(floor, v[up]);
  const vs = [];
  for (let i = 1; i <= N; i++) for (let f = 0; f < feet.length; f++) {
    if (pts[i][f][up] > floor + .03 || pts[i - 1][f][up] > floor + .03) continue;
    vs.push(-(pts[i][f][fwd] - pts[i - 1][f][fwd]) / dt);
  }
  a.stop(); mixer.uncacheRoot(skel);
  if (!vs.length) return 0; vs.sort((x, y) => x - y); return vs[vs.length >> 1];        // median, robust to the touch-down frames
}
// Analytic two-bone IK in world space: rotate a (hip) and b (knee) so that c (ankle) reaches target.
const ta = new THREE.Vector3(), tb = new THREE.Vector3(), tc = new THREE.Vector3(), tt = new THREE.Vector3(), ax = new THREE.Vector3(), w = new THREE.Quaternion(), pw = new THREE.Quaternion();
function rotateWorld(bone, q) { bone.getWorldQuaternion(w); w.premultiply(q); bone.parent.getWorldQuaternion(pw).invert(); bone.quaternion.copy(pw.multiply(w)); bone.updateMatrixWorld(true); }
export function twoBoneIK(a, b, c, target, pole) {
  a.getWorldPosition(ta); b.getWorldPosition(tb); c.getWorldPosition(tc);
  const lab = ta.distanceTo(tb), lbc = tb.distanceTo(tc), lat = Math.min(ta.distanceTo(target), lab + lbc - 1e-4);
  const cur = Math.acos(THREE.MathUtils.clamp((lab * lab + lbc * lbc - ta.distanceTo(tc) ** 2) / (2 * lab * lbc), -1, 1));
  const want = Math.acos(THREE.MathUtils.clamp((lab * lab + lbc * lbc - lat * lat) / (2 * lab * lbc), -1, 1));
  ax.subVectors(tc, ta).cross(tt.subVectors(tb, ta)); if (ax.lengthSq() < 1e-10) ax.copy(pole); ax.normalize();
  rotateWorld(b, new THREE.Quaternion().setFromAxisAngle(ax, cur - want));
  c.getWorldPosition(tc); a.getWorldPosition(ta);
  rotateWorld(a, new THREE.Quaternion().setFromUnitVectors(tt.subVectors(tc, ta).normalize(), new THREE.Vector3().subVectors(target, ta).normalize()));
}
