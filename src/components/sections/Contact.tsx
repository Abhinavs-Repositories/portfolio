import { contact } from '../../content/site';
import { Magnetic } from '../Magnetic';

export function Contact() {
  const lines = contact.headline.plain.split('\n');
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <span className="section-num reveal">{contact.num}</span>
      <h2 id="contact-title" className="reveal">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}{' '}
        <em>{contact.headline.emphasis}</em>
      </h2>
      <div className="links">
        {contact.links.map((l) => (
          <Magnetic key={l.label}>
            <a
              href={l.href}
              className="reveal"
              {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {l.label}
            </a>
          </Magnetic>
        ))}
      </div>
    </section>
  );
}
