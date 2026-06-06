import { nav } from '../content/site';
import { Magnetic } from './Magnetic';

export function Nav() {
  return (
    <div className="topbar">
      <Magnetic><div className="logo" aria-label="Abhinav Singh">{nav.logo}</div></Magnetic>
      <nav aria-label="Primary">
        {nav.links.map((l) => (
          <Magnetic key={l.href}>
            <a href={l.href}>{l.label}</a>
          </Magnetic>
        ))}
      </nav>
    </div>
  );
}
