// Interface: one thumb moves the traveler, the other aims the lens; the shot ribbon is the camera department.
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export function createUI({ shots }) {
  const ribbon = $('ribbon'), chips = {};
  const groups = { passenger: 'With the traveler', carriage: 'In the carriage', bee: 'With the bee', train: 'On the train', land: 'From the land' };
  let last = null;
  for (const s of shots) {
    if (s.frame !== last) { ribbon.append(el('span', 'grp', groups[s.frame])); last = s.frame; }
    const b = el('button', 'chip', s.label); b.dataset.shot = s.id; b.title = s.lens; ribbon.append(b); chips[s.id] = b;
  }
  let ctxLabel = null, statusT = 0;
  const ui = {
    toast(title, sub) { const s = el('div', 'stub'); s.append(el('b', '', title), el('span', '', sub || '')); $('stubs').prepend(s); requestAnimationFrame(() => s.classList.add('in')); setTimeout(() => { s.classList.remove('in'); setTimeout(() => s.remove(), 600); }, 4200); while ($('stubs').children.length > 3) $('stubs').lastChild.remove(); },
    loading(text) { $('loading').hidden = !text; if (text) $('loadingText').textContent = text; },
    car(c) { $('carName').textContent = c.name; $('carSub').textContent = c.sub; },
    shot(id, take) { for (const k in chips) chips[k].classList.toggle('on', k === id); chips[id]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); $('take').classList.toggle('on', !!take); $('take').firstElementChild.textContent = take ? '■' : '▶'; },
    context(label) { if (label === ctxLabel) return; ctxLabel = label; $('act').hidden = !label; if (label) $('act').textContent = label; },
    status(j, env, shot) { if (performance.now() - statusT < 250) return; statusT = performance.now(); $('status').textContent = `km ${(j.dist / 1000 % 9).toFixed(2)} · ${Math.round(j.speed * 3.6)} km/h · ${shot.lens}${env.segment ? ' · ' + env.segment.name : ''}`; },
    fade(on) { $('fade').classList.toggle('on', on); },
    world(w, id, portal) {
      document.body.classList.toggle('inworld', !!w); if (!w) { $('clip').hidden = true; $('clipVideo').pause(); return; }
      $('worldTitle').textContent = w.title; $('worldSrc').textContent = `${w.kind === 'footage' ? 'frame of footage' : 'generated keyframe'} · ${w.source} · ${portal.index + 1}/${portal.ids.length} in the ${portal.car.name.toLowerCase()}`;
      $('wLive').hidden = $('wClip').hidden = !w.clip; $('wLive').textContent = '▶ Play inside'; $('wLive').classList.remove('on');
    },
    recording(on) { $('rec').classList.toggle('on', on); },
    hud(on) { document.body.classList.toggle('nohud', !on); },
    bind({ api, input, audio, setShot, worldsRef }) {
      ribbon.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setShot(b.dataset.shot); });
      $('take').onclick = () => api.take(); $('rec').onclick = () => api.record(); $('still').onclick = () => api.still(); $('act').onclick = () => api.act();
      $('snd').onclick = () => $('snd').classList.toggle('on', audio.toggle()); $('hud').onclick = () => document.body.classList.toggle('nohud');
      $('wBack').onclick = () => api.exit(); $('wPrev').onclick = () => api.next(-1); $('wNext').onclick = () => api.next(1);
      $('wLive').onclick = () => { const on = api.live(); $('wLive').classList.toggle('on', on); $('wLive').textContent = on ? '❚❚ Still frame' : '▶ Play inside'; };
      $('wClip').onclick = () => { const w = worldsRef().stage.world, v = $('clipVideo'); $('clip').hidden = false; v.src = w.final || worldsRef().preview(w.clip); v.onerror = () => { v.onerror = null; v.src = worldsRef().preview(w.clip); v.play().catch(() => {}); }; v.play().catch(() => {}); };
      $('clipClose').onclick = () => { $('clip').hidden = true; $('clipVideo').pause(); };
      // joystick
      const joy = $('joy'), nub = $('nub'); let jid = null, jr = null;
      const jmove = e => { const x = clamp((e.clientX - jr.left - jr.width / 2) / 46), y = clamp((e.clientY - jr.top - jr.height / 2) / 46); input.jx = x; input.jy = -y; nub.style.transform = `translate(${x * 34}px,${y * 34}px)`; };
      joy.addEventListener('pointerdown', e => { jid = e.pointerId; jr = joy.getBoundingClientRect(); joy.setPointerCapture(jid); jmove(e); });
      joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
      const jend = e => { if (e.pointerId !== jid) return; jid = null; input.jx = input.jy = 0; nub.style.transform = ''; };
      joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
      // drag to aim, pinch or wheel to change focal length
      const cv = $('stage'), pts = new Map(); let pinch = 0;
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); });
      cv.addEventListener('pointermove', e => {
        const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
        if (pts.size === 1) { input.yaw += dx * .0042; input.pitch += dy * .0034; }
        else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoom(pinch / d); pinch = d; }
      });
      const up = e => { pts.delete(e.pointerId); pinch = 0; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      const zoom = f => { const st = api._.rig.st; st.zoom = Math.min(2.2, Math.max(.35, st.zoom * f)); };
      cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.07 : .935); }, { passive: false });
      addEventListener('contextmenu', e => e.target === cv && e.preventDefault());
    },
  };
  return ui;
}
const clamp = v => Math.max(-1, Math.min(1, v));
