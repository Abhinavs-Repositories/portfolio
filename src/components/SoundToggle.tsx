import { useEffect, useState } from 'react';
import { getAudioEngine } from '../lib/audio';

export function SoundToggle() {
  const [on, setOn] = useState(false);

  // hover ticks on nav + contact links (fine pointers only)
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    const engine = getAudioEngine();
    const handler = () => engine.tick(660);
    const els = document.querySelectorAll('.topbar nav a, .contact .links a');
    els.forEach((el) => el.addEventListener('mouseenter', handler));
    return () => els.forEach((el) => el.removeEventListener('mouseenter', handler));
  }, []);

  const click = () => {
    const engine = getAudioEngine();
    setOn(engine.toggle());
  };

  return (
    <button
      id="sound"
      className={on ? 'on' : undefined}
      aria-label={on ? 'Mute ambient sound' : 'Play ambient sound'}
      aria-pressed={on}
      onClick={click}
    >
      <span className="bar b1" />
      <span className="bar b2" />
      <span className="bar b3" />
    </button>
  );
}
