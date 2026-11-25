// The train: a locomotive and seven carriages, each a different room of the same sealed line.
// Everything is built in the train's own frame (+X is the direction of travel); the world moves, the train does not.
import * as THREE from 'three';
import { Batch, DIM, carX, rnd, reseed } from './kit.js';

const { L, HW, WALL, ROOF, GAP } = DIM;
const NW = 7, PITCH = (L - 1.4) / NW, WW = 1.66, SILL = .86, HEAD = 1.98;
const bayX = j => -L / 2 + .7 + PITCH * (j + .5);

export const CARS = [
  { key: 'loco', name: 'Locomotive', sub: 'the mechanism driving the world forward', windows: 'none' },
  { key: 'quiet', name: 'Quiet car', sub: 'ordinary human experience', windows: 'both' },
  { key: 'dining', name: 'Dining car', sub: 'social conflict and absurdity', windows: 'both' },
  { key: 'greenhouse', name: 'Greenhouse car', sub: 'an ecosystem under glass', windows: 'both', glassRoof: true },
  { key: 'apiary', name: 'Apiary car', sub: 'painted hive panels as portals', windows: 'none' },
  { key: 'mirror', name: 'Mirror corridor', sub: 'alternate historical periods', windows: 'both' },
  { key: 'surveillance', name: 'Surveillance car', sub: 'every camera is a drone is a hive', windows: 'none' },
  { key: 'cinema', name: 'Cinema car', sub: 'recorded pasts and possible futures', windows: 'none' },
];

function shell(b, M, car, i) {
  const glassRoof = !!car.glassRoof, last = i === DIM.CARS - 1;
  // floor, runner, underframe
  b.box(M.floor, 0, -.06, 0, L, .12, HW * 2);
  b.box(M.iron, 0, -.34, 0, L - .5, .44, 2.3);
  for (const x of [-3.2, 0, 3.4]) b.box(M.iron, x, -.72, (x ? .55 : -.5), 1.6, .5, .8);
  for (const s of [-1, 1]) {
    const z = s * HW, zo = s * (HW + .055);
    if (car.windows === 'both') {
      b.box(M.teal, 0, SILL / 2, z, L, SILL, .1);
      b.box(M.teal, 0, (HEAD + WALL) / 2, z, L, WALL - HEAD, .1);
      for (let j = 0; j <= NW; j++) {
        const x = -L / 2 + .7 + PITCH * j, w = (j === 0 || j === NW) ? PITCH - WW + 1.4 : PITCH - WW;
        const cx = j === 0 ? -L / 2 + w / 2 : j === NW ? L / 2 - w / 2 : x;
        b.box(M.teal, cx, (SILL + HEAD) / 2, z, w, HEAD - SILL, .1);
        b.box(M.cream, cx, (SILL + HEAD) / 2, zo, w, HEAD - SILL, .02);
      }
      for (let j = 0; j < NW; j++) {
        const x = bayX(j), zi = s * (HW - .07);
        b.box(M.wood, x, SILL - .02, zi, WW + .1, .06, .16);            // sill shelf
        b.box(M.wood, x, HEAD + .02, zi, WW + .1, .05, .07);
        for (const e of [-1, 1]) b.box(M.wood, x + e * (WW / 2 + .02), (SILL + HEAD) / 2, zi, .05, HEAD - SILL, .07);
        b.box(M.wood, x, SILL + .34, s * (HW - .02), WW, .035, .035);    // drop-light bar
        b.plane(M.glass, x, (SILL + HEAD) / 2, z, WW, HEAD - SILL, s > 0 ? Math.PI : 0);
      }
      b.box(M.brass, 0, SILL + .005, s * (HW - .075), L - .3, .02, .03);
    } else {
      b.box(M.teal, 0, WALL / 2, z, L, WALL, .1);
      b.box(M.cream, 0, (SILL + HEAD) / 2, zo, L - 1.4, HEAD - SILL, .02);
    }
    // exterior livery: dark teal skirt, cream window band, brass waistline
    b.box(M.ext, 0, SILL / 2 - .2, zo, L, SILL + .4, .02);
    b.box(M.ext, 0, (HEAD + WALL) / 2, zo, L, WALL - HEAD, .02);
    b.box(M.brass, 0, SILL, s * (HW + .07), L, .05, .02);
    b.box(M.walnut, 0, .07, s * (HW - .07), L - .2, .14, .04);          // skirting
    // luggage rack
    if (car.key === 'quiet' || car.key === 'dining') {
      for (const dz of [.12, .3, .46]) b.box(M.brass, 0, 1.93, s * (HW - dz), L - 1.2, .018, .018);
      for (let j = 0; j <= NW; j++) b.box(M.brass, -L / 2 + .7 + PITCH * j, 1.87, s * (HW - .28), .03, .14, .44);
    }
  }
  // arched ceiling and roof
  const sag = ROOF - WALL, R = (HW * HW + sag * sag) / (2 * sag), cy = ROOF - R, a = Math.asin(HW / R), n = 8, da = 2 * a / n, seg = 2 * R * Math.sin(da / 2) + .03;
  for (let k = 0; k < n; k++) {
    const t = -a + da * (k + .5), z = R * Math.sin(t), y = cy + R * Math.cos(t);
    if (glassRoof) b.box(M.glassRoof, 0, y, z, L - .3, .02, seg, 0, 0, t);
    else { b.box(M.ceil, 0, y, z, L, .05, seg, 0, 0, t); b.box(M.roof, 0, y + .07, z * 1.03, L + .04, .06, seg + .04, 0, 0, t); }
  }
  if (glassRoof) for (let j = 0; j <= NW; j++) for (let k = 0; k < n; k++) {
    const t = -a + da * (k + .5); b.box(M.tealDark, -L / 2 + .7 + PITCH * j, cy + R * Math.cos(t), R * Math.sin(t), .09, .07, seg, 0, 0, t);
  }
  for (const s of [-1, 1]) b.box(M.brass, 0, WALL + .01, s * (HW - .09), L, .04, .06);  // cornice
  if (!glassRoof) for (const x of [-5, 0, 5]) b.cyl(M.roof, x, ROOF + .16, 0, .22, .3, .18, 10);
  // end walls with an open gangway door
  for (const e of [-1, 1]) {
    const x = e * (L / 2 - .05), closed = (last && e < 0);
    for (const s of [-1, 1]) b.box(M.tealDark, x, WALL / 2, s * (HW + .42) / 2, .1, WALL, HW - .42);
    b.box(M.tealDark, x, (2.05 + ROOF) / 2, 0, .1, ROOF - 2.05, HW * 2 - .1);
    for (const s of [-1, 1]) b.box(M.brass, x - e * .01, 1.02, s * .43, .13, 2.05, .045);
    b.box(M.brass, x - e * .01, 2.06, 0, .13, .045, .9);
    b.box(M.ext, x + e * .06, WALL / 2 - .2, 0, .02, WALL + .4, HW * 2 + .1);
    if (closed) { b.box(M.walnut, x, 1.02, 0, .06, 2.04, .84); b.box(M.red, x + e * .09, 1.3, .9, .04, .14, .14); b.box(M.red, x + e * .09, 1.3, -.9, .04, .14, .14); }
    else {
      b.box(M.walnut, x - e * .02, 1.02, .62, .05, 2.02, .42);      // sliding door, parked open
      // gangway bellows
      const gx = e * (L / 2 + GAP / 4);
      b.box(M.black, gx, -.03, 0, GAP / 2 + .02, .06, 1.1); b.box(M.black, gx, 2.1, 0, GAP / 2 + .02, .06, 1.1);
      for (const s of [-1, 1]) b.box(M.black, gx, 1.03, s * .55, GAP / 2 + .02, 2.2, .06);
    }
  }
  // bogies
  for (const e of [-1, 1]) {
    const x = e * (L / 2 - 3);
    for (const s of [-1, 1]) { b.box(M.iron, x, -.82, s * .98, 3.1, .22, .12); b.box(M.iron, x, -.62, s * .98, .5, .5, .16); }
    b.box(M.iron, x, -.85, 0, .5, .2, 2);
  }
  b.box(M.iron, L / 2 + GAP / 2 - .1, -.5, 0, GAP, .16, .2);
}

function bench(b, M, x, z, face, d = .98, seats = null) {
  b.stand(M.walnut, x, 0, z, .46, .36, d);
  b.stand(M.leather, x, .36, z, .52, .13, d + .02);
  b.box(M.leather, x - face * .25, .82, z, .13, .8, d + .02);
  b.box(M.brass, x - face * .25, 1.235, z, .15, .03, d + .05);
  const aisle = z - Math.sign(z) * (d / 2 + .02);
  b.box(M.brass, x - face * .02, .56, aisle, .5, .03, .03); b.box(M.brass, x + face * .22, .42, aisle, .03, .3, .03);
  if (seats) for (const dz of d > .7 ? [.24, -.24] : [0]) seats.push({ x: x + face * .02, z: z + Math.sign(z) * dz, face });
}
function table(b, M, x, z, w = .62, d = .84, linen = false) {
  b.box(M.wood, x, .71, z, w, .045, d); b.cyl(M.brass, x, .35, z - Math.sign(z) * .12, .035, .035, .7, 8); b.cyl(M.brass, x, .015, z - Math.sign(z) * .12, .2, .22, .03, 10);
  if (linen) { b.box(M.linen, x, .74, z, w + .06, .012, d + .04); b.box(M.linen, x, .65, z - Math.sign(z) * (d / 2 + .02), w + .06, .18, .01); }
  else b.box(M.brass, x, .735, z, w + .02, .012, d + .02);
}
function cup(b, M, x, y, z) { b.cyl(M.china, x, y + .035, z, .04, .03, .07, 10); b.cyl(M.china, x, y + .004, z, .07, .07, .008, 10); b.cyl(M.walnut, x, y + .066, z, .033, .033, .006, 10); }

const FIT = {
  quiet(b, M, c) {
    b.box(M.carpet, 0, .006, 0, L - .4, .012, .8);
    for (let j = 0; j < NW; j++) for (const s of [-1, 1]) {
      const x = bayX(j), z = s * .95;
      table(b, M, x, s * 1.03); bench(b, M, x - .74, z, 1, .98, c.seats); bench(b, M, x + .74, z, -1, .98, c.seats);
      if ((j + s) % 3 === 0) cup(b, M, x + .1, .742, s * 1.1);
    }
    c.props.cup = { x: bayX(4) - .12, y: .742, z: 1.12 }; cup(b, M, c.props.cup.x, .742, c.props.cup.z);
    c.portal = { x: bayX(1), y: (SILL + HEAD) / 2, z: -(HW - .09), ry: 0, w: WW - .04, h: HEAD - SILL - .04 };
    c.playerSeat = c.seats.find(s => Math.abs(s.x - (bayX(4) - .72)) < .05 && s.z > 1);
  },
  dining(b, M, c) {
    b.box(M.carpet, 0, .006, 0, L - .4, .012, .8);
    for (let j = 0; j < NW; j++) for (const s of [-1, 1]) {
      const x = bayX(j), z = s * .98;
      table(b, M, x, z, .8, .86, true);
      bench(b, M, x - .82, z, 1, .92, c.seats); bench(b, M, x + .82, z, -1, .92, c.seats);
      b.cyl(M.brass, x, .93, s * 1.25, .012, .012, .36, 6); b.cyl(M.lamp, x, 1.13, s * 1.25, .05, .1, .11, 10); c.glows.push([x, 1.13, s * 1.25, .5]);
      cup(b, M, x - .2, .748, z + s * .02); cup(b, M, x + .22, .748, z - s * .15);
      b.cyl(M.china, x + .05, .752, z + s * .2, .11, .11, .01, 12);
    }
    // sideboard with samovar by the forward door
    b.stand(M.walnut, L / 2 - .5, 0, -.95, .6, .95, .8); b.cyl(M.brass, L / 2 - .5, 1.17, -.95, .14, .11, .44, 12); b.sph(M.brass, L / 2 - .5, 1.42, -.95, .1);
    c.portal = { x: bayX(5), y: (SILL + HEAD) / 2, z: HW - .09, ry: Math.PI, w: WW - .04, h: HEAD - SILL - .04 };
    c.stage = { x: -L / 2 + 1.5, z: .0 };
  },
  greenhouse(b, M, c) {
    b.box(M.iron, 0, .01, 0, L - .4, .02, .84);
    reseed(73);
    for (const s of [-1, 1]) {
      b.stand(M.walnut, 0, 0, s * .98, L - 2.6, .46, .86); b.box(M.soil, 0, .47, s * .98, L - 2.7, .04, .8);
      for (let k = 0; k < 70; k++) {
        const x = (rnd() - .5) * (L - 3), z = s * (.74 + rnd() * .6), kind = rnd();
        if (kind < .35) { const r = .14 + rnd() * .16; b.sph(rnd() > .5 ? M.leaf : M.leaf2, x, .5 + r * .8, z, r, r * (1 + rnd() * .6), r, 6); }
        else if (kind < .6) { const h = .8 + rnd() * .9; b.cyl(M.walnut, x, .5 + h / 2, z, .03, .045, h, 5); b.sph(M.leaf, x, .5 + h, z, .2 + rnd() * .12, .2, .22, 6); if (rnd() > .5) b.sph(M.bloom, x + .2, .45 + h, z + .1, .06); }
        else if (kind < .85) for (let q = 0; q < 5; q++) { const an = q * 1.26 + rnd(); b.box(M.leaf2, x + Math.cos(an) * .1, .82, z + Math.sin(an) * .1, .02, .62, .13, an, .3); }
        else for (let q = 0; q < 4; q++) b.sph(q % 2 ? M.bloom : M.linen, x + (rnd() - .5) * .3, .58 + rnd() * .2, z + (rnd() - .5) * .3, .045);
      }
      for (const x of [-5.6, 1.4, 6.2]) { const xx = x + s * 1.1; for (let k = 0; k < 2; k++) b.stand(k ? M.cream : M.bloom, xx, .5 + k * .3, s * 1.05, .52, .28, .44); b.stand(M.roof, xx, 1.1, s * 1.05, .6, .04, .52); b.box(M.black, xx, .56, s * (1.05 - .225), .16, .03, .01); c.hives.push({ x: xx, y: .58, z: s * .8 }); }
      for (let k = 0; k < 9; k++) { const x = (rnd() - .5) * (L - 2); b.box(M.leaf, x, WALL - .3 - rnd() * .3, s * (HW - .2), .05, .6 + rnd() * .5, .05); }
    }
    c.portal = { x: bayX(3), y: 1.02, z: -(HW - .12), ry: 0, w: 1.0, h: 1.9, door: true };
    c.aisleHalf = .34;
  },
  apiary(b, M, c) {
    b.box(M.carpet, 0, .006, 0, L - .4, .012, .9);
    for (const s of [-1, 1]) {
      b.plane(M.panels, 0, 1.22, s * (HW - .06), L - 1.6, 1.9, s > 0 ? Math.PI : 0);
      b.box(M.walnut, 0, .2, s * (HW - .1), L - 1.5, .1, .1); b.box(M.brass, 0, 2.19, s * (HW - .08), L - 1.5, .03, .05);
      for (const x of [-5.2, 0, 5.2]) {
        const xx = x + s * 1.3, z = s * 1.08;
        b.stand(M.walnut, xx, 0, z, 1.1, .78, .5);
        b.box(M.honey, xx, 1.12, z, .7, .56, .1); b.box(M.walnut, xx, 1.12, z + s * .07, .78, .64, .03);
        b.box(M.glass, xx, 1.14, z, 1.0, .72, .42); for (const e of [-1, 1]) b.box(M.brass, xx + e * .5, 1.14, z - s * .21, .025, .72, .025);
        c.glows.push([xx, 1.15, z - s * .2, .9]); c.hives.push({ x: xx, y: 1.2, z: z - s * .25 });
      }
    }
    reseed(108);
    for (let k = 0; k < 11; k++) { const x = -L / 2 + 1.6 + k * 1.5, z = (k % 2 ? .5 : -.5) * (.6 + rnd() * .5); b.cyl(M.straw, x, 2.2 + rnd() * .1, z, .11, .095, .46, 9, Math.PI / 2, rnd() * .4); b.cyl(M.walnut, x, 2.42, z, .01, .01, .3, 4); }
    c.portal = { x: 2.6, y: 1.25, z: HW - .12, ry: Math.PI, w: 1.9, h: 1.2 };
  },
  mirror(b, M, c) {
    const pz = -.3, x0 = -L / 2 + 1.3, x1 = L / 2 - 1.3;
    b.box(M.carpet, 0, .006, .56, L - .4, .012, .8);
    b.box(M.teal, 0, WALL / 2, pz, x1 - x0, WALL, .08);
    for (const x of [x0, x1]) b.box(M.teal, x, WALL / 2, (pz - HW) / 2, .08, WALL, HW + pz);
    b.box(M.brass, 0, .9, pz + .05, x1 - x0, .03, .03); b.box(M.walnut, 0, .08, pz + .05, x1 - x0, .16, .03);
    for (let j = 0; j < NW; j++) {
      const x = bayX(j); if (j === 3) continue;
      b.box(M.walnut, x - .3, 1.0, pz + .05, .72, 1.96, .04); b.box(M.brass, x - .02, 1.0, pz + .08, .03, .14, .03);
      b.box(M.lamp, x - .3, 1.55, pz + .075, .4, .3, .01); c.glows.push([x - .3, 1.55, pz + .1, .35]);
      b.box(M.brass, x + .55, 1.72, pz + .08, .06, .16, .06); b.sph(M.lamp, x + .55, 1.85, pz + .12, .06); c.glows.push([x + .55, 1.85, pz + .14, .6]);
    }
    // the mirror of the station
    const mx = bayX(3);
    b.box(M.brass, mx, 1.12, pz + .05, 1.36, 2.12, .05); b.sph(M.brass, mx, 2.2, pz + .07, .2, .1, .04);
    c.portal = { x: mx, y: 1.12, z: pz + .085, ry: 0, w: 1.2, h: 1.96 };
    c.aisleZ = .56; c.aisleHalf = .5;
  },
  surveillance(b, M, c) {
    b.box(M.iron, 0, .008, 0, L - .4, .016, 1.0);
    reseed(993); let k = 0;
    for (const s of [-1, 1]) for (let j = 0; j < NW; j++) {
      const x0 = bayX(j);
      if (s < 0 && j === 3) continue;
      b.stand(M.iron, x0, 0, s * 1.14, PITCH - .12, .34, .5);
      for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) {
        const x = x0 + (q - .5) * 1.1, y = .64 + r * .6, z = s * 1.14;
        if (rnd() < .16) { b.box(M.crt, x, y, z, 1.0, .54, .5); for (const e of [-1, 1]) b.cyl(M.steel, x + e * .22, y + .04, z - s * .26, .15, .15, .03, 12, Math.PI / 2); continue; }
        b.box(M.crt, x, y, z, 1.0, .56, .5);
        b.plane(M.screens[k++ % M.screens.length], x, y, z - s * .256, .8, .46, s > 0 ? Math.PI : 0);
      }
      if (j % 2 === 0) c.glows.push([x0, 1.3, s * .8, 1.2, 0x7fd8cf]);
    }
    for (let i = 0; i < 14; i++) b.box(M.black, (rnd() - .5) * (L - 2), .02, (rnd() - .5) * 1.6, 1.5 + rnd() * 2, .03, .03, rnd() * .6 - .3);
    b.cyl(M.iron, 1.2, .25, .5, .04, .2, .5, 8); b.stand(M.leather, 1.2, .5, .5, .46, .08, .46); b.box(M.leather, 1.42, .85, .5, .06, .6, .44);
    c.portal = { x: bayX(3), y: 1.25, z: -(HW - .14), ry: 0, w: 2.0, h: 1.5 };
    c.cool = true;
  },
  cinema(b, M, c) {
    b.box(M.carpet, 0, .006, 0, L - .4, .012, HW * 2 - .2);
    for (const s of [-1, 1]) for (let j = 0; j < 9; j++) b.box(M.velvet, -L / 2 + 1 + j * 2, 1.1, s * (HW - .1 - (j % 2) * .04), 1.9, 2.1, .06);
    for (let r = 0; r < 9; r++) {
      const x = -L / 2 + 4.6 + r * 1.12;
      for (const s of [-1, 1]) for (const zc of [.62, 1.12]) {
        const z = s * zc; b.stand(M.walnut, x, 0, z, .44, .34, .46); b.stand(M.velvet, x, .34, z, .48, .12, .46); b.box(M.velvet, x + .24, .78, z, .1, .78, .46);
        c.seats.push({ x: x - .02, z, face: -1 });
      }
    }
    const sx = -L / 2 + .3;
    b.box(M.black, sx - .05, 1.25, 0, .06, 2.3, 2.5); for (const s of [-1, 1]) b.box(M.velvet, sx + .1, 1.2, s * 1.22, .14, 2.3, .4); b.box(M.velvet, sx + .1, 2.34, 0, .16, .3, 2.7);
    b.stand(M.iron, L / 2 - 2.4, 0, -.75, .3, 1.2, .3); b.box(M.brass, L / 2 - 2.5, 1.36, -.75, .5, .3, .24); b.cyl(M.brass, L / 2 - 2.8, 1.36, -.75, .06, .08, .2, 10, 0, Math.PI / 2);
    for (const e of [0, 1]) b.cyl(M.iron, L / 2 - 2.4 + e * .22 - .1, 1.66, -.75, .16, .16, .04, 14, Math.PI / 2);
    c.projector = { x: L / 2 - 2.9, y: 1.36, z: -.75 };
    c.portal = { x: sx, y: 1.22, z: 0, ry: Math.PI / 2, w: 2.3, h: 2.0 };
    c.walkMin = -L / 2 + 1.5; c.dim = true;
  },
};

function loco(b, M, c) {
  const cab0 = -L / 2, cab1 = -L / 2 + 3.2, nose = L / 2;
  b.box(M.iron, 0, -.3, 0, L, .5, 2.7);
  for (const e of [-1, 1]) { const x = e * (L / 2 - 3.4); for (const s of [-1, 1]) { b.box(M.iron, x, -.82, s * .98, 4.2, .26, .14); } b.box(M.iron, x, -.7, 0, 3, .4, 1.6); }
  b.box(M.iron, 0, -.75, 0, 3.6, .6, 2.2);                                                            // fuel tank
  // cab
  b.box(M.floor, (cab0 + cab1) / 2, -.03, 0, 3.2, .06, HW * 2);
  for (const s of [-1, 1]) {
    b.box(M.ext, (cab0 + cab1) / 2, .5, s * HW, 3.2, 1.0, .1); b.box(M.ext, (cab0 + cab1) / 2, 2.2, s * HW, 3.2, .5, .1);
    for (const x of [cab0 + .1, cab1 - .1, (cab0 + cab1) / 2]) b.box(M.ext, x, 1.5, s * HW, .2, 1.0, .1);
    b.plane(M.glass, (cab0 + cab1) / 2, 1.5, s * HW, 3.0, 1.0, 0);
    b.box(M.cream, (cab0 + cab1) / 2, .92, s * (HW + .06), 3.2, .16, .02);
  }
  b.box(M.roof, (cab0 + cab1) / 2, 2.5, 0, 3.4, .12, HW * 2 + .2);
  for (const s of [-1, 1]) b.box(M.tealDark, cab0 + .05, WALL / 2 + .1, s * (HW + .42) / 2, .1, 2.4, HW - .42);
  b.box(M.tealDark, cab0 + .05, 2.25, 0, .1, .4, HW * 2); for (const s of [-1, 1]) b.box(M.brass, cab0 + .07, 1.02, s * .43, .13, 2.05, .045);
  // cab front wall, desk and the hatch into the engine
  b.box(M.tealDark, cab1, .55, 0, .1, 1.1, HW * 2); b.box(M.tealDark, cab1, 2.25, 0, .1, .4, HW * 2);
  for (const z of [-1.4, 1.4, -.52, .52]) b.box(M.tealDark, cab1, 1.6, z, .1, 1.0, .12);
  for (const s of [-1, 1]) b.plane(M.glass, cab1, 1.6, s * .96, .78, .9, Math.PI / 2);
  b.box(M.iron, cab1 - .3, .95, .9, .5, .1, .9); b.box(M.iron, cab1 - .3, .5, .9, .4, .9, .8);
  for (let k = 0; k < 5; k++) b.cyl(k % 2 ? M.lamp : M.red, cab1 - .34 + (k % 2) * .12, 1.02, .58 + k * .15, .025, .025, .03, 8);
  b.cyl(M.brass, cab1 - .45, 1.12, 1.15, .02, .02, .28, 6, .5); b.stand(M.leather, cab1 - 1.0, .5, .9, .44, .1, .44); b.cyl(M.iron, cab1 - 1.0, .25, .9, .04, .16, .5, 8);
  c.portal = { x: cab1 - .07, y: 1.02, z: -.48, ry: -Math.PI / 2, w: .86, h: 1.84, door: true };
  // long hood
  const hx = (cab1 + nose - 1.6) / 2, hl = nose - 1.6 - cab1;
  b.box(M.ext, hx, 1.05, 0, hl, 2.1, 2.2); b.box(M.cream, hx, 1.3, 0, hl + .02, .22, 2.24); b.box(M.roof, hx, 2.16, 0, hl, .12, 2.0);
  for (let k = 0; k < 6; k++) { const x = cab1 + 1 + k * (hl - 2) / 5; for (const s of [-1, 1]) b.box(M.iron, x, 1.75, s * 1.11, 1.0, .5, .02); if (k % 2 === 0) b.cyl(M.iron, x, 2.26, 0, .5, .56, .14, 14); }
  b.cyl(M.iron, cab1 + 1.2, 2.4, .5, .12, .16, .4, 8); c.exhaust = { x: cab1 + 1.2, y: 2.6, z: .5 };
  // walkways and rails
  for (const s of [-1, 1]) { b.box(M.iron, hx, .0, s * 1.27, hl, .05, .34); b.box(M.brass, hx, .95, s * 1.42, hl, .03, .03); for (let k = 0; k <= 6; k++) b.box(M.brass, cab1 + k * hl / 6, .48, s * 1.42, .03, .95, .03); }
  // short nose
  b.box(M.ext, nose - .85, .8, 0, 1.5, 1.6, 2.2); b.box(M.cream, nose - .85, 1.3, 0, 1.52, .22, 2.24); b.box(M.red, nose - .08, .1, 0, .06, .4, 2.6);
  b.cyl(M.lamp, nose - .09, 1.35, 0, .16, .16, .06, 14, 0, Math.PI / 2); for (const s of [-1, 1]) b.cyl(M.lamp, nose - .09, .5, s * .8, .09, .09, .05, 10, 0, Math.PI / 2);
  for (let k = -3; k <= 3; k++) b.box(M.iron, nose + .25, -.62, k * .32, .5, .5, .05, 0, -.5);       // cowcatcher
  c.headlight = { x: nose, y: 1.35, z: 0 };
  c.walkMin = cab0 + .2; c.walkMax = cab1 - .5; c.aisleHalf = .7;
}

export function buildTrain(scene, M) {
  const root = new THREE.Group(); root.name = 'train'; scene.add(root);
  const cars = CARS.map((def, i) => {
    const c = { ...def, i, x: carX(i), seats: [], glows: [], lamps: [], hives: [], props: {}, aisleZ: 0, aisleHalf: .38, walkMin: -L / 2 - GAP / 2, walkMax: L / 2 + GAP / 2 };
    c.group = new THREE.Group(); c.group.position.set(c.x, DIM.FLOOR, 0); root.add(c.group);
    const b = new Batch();
    if (i === 0) loco(b, M, c);
    else {
      shell(b, M, c, i); FIT[c.key](b, M, c);
      const cool = c.cool, n = c.key === 'cinema' ? 2 : 5;
      for (let k = 0; k < n; k++) {
        const x = -L / 2 + (L / n) * (k + .5);
        if (!c.glassRoof) { b.cyl(M.brass, x, ROOF - .07, 0, .13, .16, .05, 12); b.sph(cool ? M.lampCool : M.lamp, x, ROOF - .13, 0, .11, .075, .11); c.glows.push([x, ROOF - .15, 0, 1.3, cool ? 0x9fe6dc : 0xffb65c]); }
        c.lamps.push(x);
      }
    }
    c.meshes = b.build(c.group);
    c.group.updateMatrixWorld(true);
    return c;
  });
  // wheels: one instanced mesh for the whole train
  const wheelGeo = new THREE.CylinderGeometry(.46, .46, .12, 18); wheelGeo.rotateX(Math.PI / 2);
  const hub = new THREE.BoxGeometry(.7, .09, .14);
  const wheelPos = [];
  cars.forEach(c => { const offs = c.i === 0 ? [-1.3, 0, 1.3].flatMap(d => [-(L / 2 - 3.4) + d, L / 2 - 3.4 + d]) : [-L / 2 + 2, -L / 2 + 4, L / 2 - 4, L / 2 - 2]; for (const o of offs) for (const s of [-1, 1]) wheelPos.push([c.x + o, .46, s * .76]); });
  const wheels = new THREE.InstancedMesh(wheelGeo, M.iron, wheelPos.length), spokes = new THREE.InstancedMesh(hub, M.steel, wheelPos.length);
  root.add(wheels, spokes);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zAxis = new THREE.Vector3(0, 0, 1);
  function spin(angle) {
    q.setFromAxisAngle(zAxis, -angle);
    for (let k = 0; k < wheelPos.length; k++) { const w = wheelPos[k]; m.compose(p.set(w[0], w[1], w[2]), q, one); wheels.setMatrixAt(k, m); m.compose(p.set(w[0], w[1], w[2] + Math.sign(w[2]) * .07), q, one); spokes.setMatrixAt(k, m); }
    wheels.instanceMatrix.needsUpdate = spokes.instanceMatrix.needsUpdate = true;
  }
  spin(0);
  // lamp glows: additive sprites, far cheaper than real lights
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glowMats = new Map(), glows = [];
  cars.forEach(c => c.glows.forEach(([x, y, z, s, col = 0xffb65c]) => {
    if (!glowMats.has(col)) glowMats.set(col, new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
    const sp = new THREE.Sprite(glowMats.get(col)); sp.position.set(x, y, z); sp.scale.setScalar(s); c.group.add(sp); glows.push(sp);
  }));
  const tail = cars[cars.length - 1], hl = cars[0];
  return { root, cars, spin, glowMats, glowTex, wheelCount: wheelPos.length, length: DIM.SPAN * DIM.CARS, tailX: tail.x - L / 2, noseX: hl.x + L / 2 };
}

/** Which carriage contains a train-frame x, and the walkable aisle there. */
export function locate(cars, x) {
  const i = THREE.MathUtils.clamp(Math.round(-x / DIM.SPAN), 0, cars.length - 1), c = cars[i], lx = x - c.x;
  const edge = Math.min(lx + L / 2, L / 2 - lx), k = THREE.MathUtils.clamp((edge - .3) / 1.4, 0, 1);
  return { car: c, i, lx, aisleZ: c.aisleZ * k, half: THREE.MathUtils.lerp(.3, c.aisleHalf, k) };
}
export { NW, PITCH, bayX, SILL, HEAD, WW };
