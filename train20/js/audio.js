// Sound, all synthesised: rail thunder, the double clack of rail joints timed to the real speed, and a wingbeat when the lead bee is close.
export function createAudio() {
  let ctx = null, on = false, rumble, rumbleGain, lp, bee, beeGain, master, clackT = 0, noiseBuf;
  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .0; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = (b + (Math.random() * 2 - 1) * .04) * .985; d[i] = b * 9; }
    rumble = ctx.createBufferSource(); rumble.buffer = noiseBuf; rumble.loop = true; lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
    rumble.connect(lp).connect(rumbleGain).connect(master); rumble.start();
    bee = ctx.createOscillator(); bee.type = 'sawtooth'; bee.frequency.value = 210; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 420; bf.Q.value = 3; beeGain = ctx.createGain(); beeGain.gain.value = 0; bee.connect(bf).connect(beeGain).connect(master); bee.start();
  }
  function clack(when, level) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2; const g = ctx.createGain();
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(level, when + .006); g.gain.exponentialRampToValueAtTime(.001, when + .09); s.connect(f).connect(g).connect(master); s.start(when, Math.random()); s.stop(when + .1);
  }
  return {
    toggle() { if (!ctx) init(); on = !on; ctx.resume(); master.gain.linearRampToValueAtTime(on ? .8 : 0, ctx.currentTime + .4); return on; },
    update(speed, inside, tunnel, beeDist = 9) {
      if (!ctx || !on) return; const t = ctx.currentTime, v = Math.min(1, speed / 26);
      rumbleGain.gain.setTargetAtTime(v * (.5 + tunnel * .5) * (inside < 1 ? 1.2 : .8), t, .2); lp.frequency.setTargetAtTime(140 + v * 260 + tunnel * 300 + (inside < 1 ? 500 : 0), t, .3);
      beeGain.gain.setTargetAtTime(Math.max(0, .12 - beeDist * .05), t, .1); bee.frequency.setTargetAtTime(200 + Math.sin(t * 9) * 14, t, .05);
      if (speed > 1.5 && t > clackT) { const gap = 12.5 / speed; clack(t + .02, .5 * v + .15); clack(t + .02 + 2.4 / speed, .4 * v + .1); clackT = t + gap; }
    },
  };
}
