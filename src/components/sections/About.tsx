import { about } from '../../content/site';

export function About() {
  return (
    <section id="about" aria-labelledby="about-title">
      <span className="section-num reveal">{about.num}</span>
      <h2 id="about-title" className="section-title reveal">
        {about.title.plain}<br /><em>{about.title.emphasis}</em>
      </h2>
      <div className="about-grid">
        <div>
          {about.paragraphs.map((p, i) => (
            <p key={i} className="reveal">{p}</p>
          ))}
        </div>
        <div className="stats">
          {about.stats.map((s) => (
            <div key={s.label} className="stat reveal">
              <span className="big">{s.value}</span>
              <span className="lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
