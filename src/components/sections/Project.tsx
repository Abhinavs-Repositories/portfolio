import { useEffect, useRef } from 'react';
import type { Project, DataArtKey } from '../../content/site';
import { registerProjectView, setProjectHover, type ProjectViewEntry } from '../../three/projectViewsStore';

// Each project's dataArt key maps to a 3D object kind in the projects canvas.
const KIND_BY_DATAART: Record<DataArtKey, ProjectViewEntry['kind']> = {
  RetrievalField: 'RetrievalManifold',
  AgentOrchestration: 'StateMachine',
  MessageTraffic: 'TokenRiver',
  CircuitTelemetry: 'RacingLine',
};

export function ProjectRow({ project }: { project: Project }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unregister = registerProjectView({
      id: project.id,
      panelRef,
      kind: KIND_BY_DATAART[project.dataArt],
    });
    return unregister;
  }, [project.id, project.dataArt]);

  const onEnter = () => setProjectHover(project.id, true);
  const onLeave = () => setProjectHover(project.id, false);

  return (
    <div className="project">
      <div className="project-body">
        <div className="role reveal">{project.role}</div>
        <h3 className="reveal">{project.title}</h3>
        <p className="summary reveal">{project.summary}</p>
        <ul className="highlights reveal">
          {project.highlights.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
        <div className="stack reveal" role="list" aria-label="Tech stack">
          {project.stack.map((t) => <span key={t} role="listitem">{t}</span>)}
        </div>
      </div>
      <div
        ref={panelRef}
        className="visual"
        role="img"
        aria-label={`${project.title} — interactive visual: ${project.metric.value} ${project.metric.label}`}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <div className="metric" aria-hidden="true">
          {project.metric.value}
          <small>{project.metric.label}</small>
        </div>
      </div>
    </div>
  );
}
