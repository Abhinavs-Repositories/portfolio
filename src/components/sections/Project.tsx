import type { Project, DataArtKey } from '../../content/site';
import { RetrievalField } from '../dataart/RetrievalField';
import { AgentOrchestration } from '../dataart/AgentOrchestration';
import { MessageTraffic } from '../dataart/MessageTraffic';
import { CircuitTelemetry } from '../dataart/CircuitTelemetry';

const ART_MAP: Record<DataArtKey, () => JSX.Element> = {
  RetrievalField,
  AgentOrchestration,
  MessageTraffic,
  CircuitTelemetry,
};

export function ProjectRow({ project }: { project: Project }) {
  const Art = ART_MAP[project.dataArt];
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
        className="visual"
        role="img"
        aria-label={`${project.title} — interactive visual: ${project.metric.value} ${project.metric.label}`}
      >
        <Art />
        <div className="metric" aria-hidden="true">
          {project.metric.value}
          <small>{project.metric.label}</small>
        </div>
      </div>
    </div>
  );
}
