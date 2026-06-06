import { projects, work } from '../../content/site';
import { ProjectRow } from './Project';

export function Work() {
  return (
    <section id="work" aria-labelledby="work-title">
      <span className="section-num reveal">{work.num}</span>
      <h2 id="work-title" className="section-title reveal">
        {work.title.plain} <em>{work.title.emphasis}</em>
      </h2>
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} />
      ))}
    </section>
  );
}
