// Bees: inhabitants, narrative force and camera guide. One lead bee, a drift of ordinary ones, and a swarm outside.
import * as THREE from 'three';
import { DIM, noise2, damp, clamp } from './kit.js';

export function buildBees(scene, M, mobile) {
  const N = mobile ? 70 : 150, geo = new THREE.SphereGeometry(1, 6, 5).scale(.034, .018, .018);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2b21e }), N); mesh.frustumCulled = false; scene.add(mesh);
  const wing = new THREE.InstancedMesh(new THREE.PlaneGeometry(.05, .07).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4d6, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }), N); wing.frustumCulled = false; scene.add(wing);
  const bees = []; for (let k = 0; k < N; k++) bees.push({ p: new THREE.Vector3(0, -50, 0), home: new THREE.Vector3(), r: .3 + Math.random() * .9, ph: Math.random() * 100, car: -9, sp: .6 + Math.random() });
  const lead = { p: new THREE.Vector3(-23, 2.4, 1.1), v: new THREE.Vector3(1, 0, 0), target: new THREE.Vector3(), landed: 0 };
  // exterior swarm: a ribbon of points that paces the train
  const SN = mobile ? 500 : 1400, sp = new Float32Array(SN * 3), seeds = new Float32Array(SN * 3);
  for (let k = 0; k < SN * 3; k++) seeds[k] = Math.random();
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(16, 16, 13, 7, .5, 0, 7); g.fill(); return new THREE.CanvasTexture(c); })();
  const swarm = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x241606, size: .34, map: dot, alphaTest: .4, sizeAttenuation: true, transparent: true, opacity: 0 })); swarm.frustumCulled = false; scene.add(swarm);
  const state = { swarm: 0, swarmWant: 0, side: 1 };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler(), tmp = new THREE.Vector3();

  function rehome(b, cars, ci) {
    const c = cars[clamp(ci, 1, cars.length - 1)]; b.car = c.i;
    const spots = c.hives.length ? c.hives : c.lamps.map(x => ({ x, y: DIM.ROOF - .4, z: 0 }));
    const h = spots[(Math.random() * spots.length) | 0], spread = c.hives.length ? .5 : 1;
    b.home.set(c.x + h.x + (Math.random() - .5) * 2.5 * spread, DIM.FLOOR + h.y + Math.random() * .7, clamp(h.z + (Math.random() - .5) * 1.6 * spread, -1.25, 1.25));
    b.r = c.hives.length ? .2 + Math.random() * .7 : .3 + Math.random() * .9;
  }
  function update(dt, t, ctx) {
    const { cars, camCar, actor } = ctx;
    // lead bee: rests on the coffee cup while the traveler sits, then leads toward the nearest threshold
    if (actor.seated && ctx.cup) { lead.target.copy(ctx.cup); lead.landed = damp(lead.landed, lead.p.distanceTo(ctx.cup) < .12 ? 1 : 0, 3, dt); }
    else { lead.landed = damp(lead.landed, 0, 6, dt); lead.target.set(actor.x + actor.dir * 1.5, DIM.FLOOR + 1.5, actor.z * .4); if (ctx.goal) { tmp.copy(ctx.goal).sub(lead.target); const d = tmp.length(); lead.target.addScaledVector(tmp, Math.min(1, 1.2 / Math.max(d, .01))); } }
    const wob = 1 - lead.landed;
    tmp.copy(lead.target); tmp.x += Math.sin(t * 2.3) * .22 * wob; tmp.y += Math.sin(t * 3.1) * .12 * wob + (lead.landed ? .012 : 0); tmp.z += Math.cos(t * 1.7) * .2 * wob;
    lead.v.copy(tmp).sub(lead.p); const dl = lead.v.length(); lead.p.addScaledVector(lead.v, Math.min(1, dt * (dl > 3 ? 6 : 2.6)));
    if (dl > .001) lead.v.multiplyScalar(1 / dl);
    for (let k = 0; k < N; k++) {
      const b = bees[k];
      if (k === 0) b.p.copy(lead.p);
      else {
        if (Math.abs(b.car - camCar) > 1) rehome(b, cars, camCar + (k % 3) - 1);
        const a = t * b.sp + b.ph;
        b.p.set(b.home.x + Math.sin(a) * b.r + (noise2(a * .3, k) - .5), b.home.y + Math.sin(a * 1.7 + k) * .25, clamp(b.home.z + Math.cos(a * 1.3) * b.r * .7, -1.33, 1.33));
      }
      e.set(0, k === 0 ? Math.atan2(-lead.v.z, lead.v.x) : t * b.sp * 1.3 + b.ph, 0); q.setFromEuler(e);
      s.setScalar(k === 0 ? 1.5 : 1); m.compose(b.p, q, s); mesh.setMatrixAt(k, m);
      s.set(1, 1, .4 + Math.abs(Math.sin(t * 90 + k)) * 1.2); if (k === 0 && lead.landed > .8) s.z = .5;
      tmp.copy(b.p).y += .016; m.compose(tmp, q, s); wing.setMatrixAt(k, m);
    }
    mesh.instanceMatrix.needsUpdate = wing.instanceMatrix.needsUpdate = true;
    // swarm ribbon
    state.swarm = damp(state.swarm, state.swarmWant, .8, dt); swarm.material.opacity = Math.min(1, state.swarm * 1.2); swarm.visible = state.swarm > .01;
    if (swarm.visible) {
      for (let k = 0; k < SN; k++) {
        const u = seeds[k * 3], v = seeds[k * 3 + 1], w = seeds[k * 3 + 2], along = ((u + t * (.02 + w * .03)) % 1) * 190 - 150, a = along * .09 + t * (1 + w) + v * 6.28, rad = 1.2 + v * 4.5 * (.6 + .4 * Math.sin(along * .05 + t));
        sp[k * 3] = along; sp[k * 3 + 1] = 5 + Math.sin(along * .035 + t * .6) * 2.2 + Math.sin(a) * rad * .6; sp[k * 3 + 2] = state.side * (7.5 + Math.sin(along * .028 + t * .4) * 3 + Math.cos(a) * rad);
      }
      sg.attributes.position.needsUpdate = true;
    }
  }
  return { update, lead, state, count: N };
}
