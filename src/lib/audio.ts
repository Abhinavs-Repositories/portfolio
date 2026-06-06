// Ambient pad: 3 detuned oscillators → lowpass with slow LFO. Tick: short sine blip.
// AudioContext is constructed lazily on first toggle (browsers block before user gesture).

type AudioEngine = {
  toggle(): boolean; // returns new on/off state
  tick(freq?: number): void;
  isOn(): boolean;
};

let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (engine) return engine;

  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let on = false;
  let started = false;

  const build = () => {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    lp.Q.value = 0.6;
    lp.connect(master);

    const pad = ac.createGain();
    pad.gain.value = 0.6;
    pad.connect(lp);

    [110, 164.81, 220].forEach((f, i) => {
      const o = ac!.createOscillator();
      o.type = i === 1 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ac!.createGain();
      g.gain.value = 0.12 / (i + 1);
      o.connect(g);
      g.connect(pad);
      o.start();
    });

    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ac.createGain();
    lg.gain.value = 170;
    lfo.connect(lg);
    lg.connect(lp.frequency);
    lfo.start();

    started = true;
  };

  const tick = (freq = 520) => {
    if (!on || !ac || !master) return;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.2);
  };

  const toggle = () => {
    if (!started) build();
    if (ac && ac.state === 'suspended') ac.resume();
    on = !on;
    if (ac && master) {
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(on ? 0.35 : 0.0001, t + 0.6);
    }
    if (on) tick(620);
    return on;
  };

  engine = { toggle, tick, isOn: () => on };
  return engine;
}
