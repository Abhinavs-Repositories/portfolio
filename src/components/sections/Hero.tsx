import { hero } from '../../content/site';

type LinePart = string | { italic: true; text: string };

function renderPart(part: LinePart, i: number) {
  if (typeof part === 'string') return <span key={i}>{part}</span>;
  return <em key={i}>{part.text}</em>;
}

export function Hero() {
  return (
    <header className="hero">
      <span className="eyebrow" id="heroEyebrow">{hero.eyebrow}</span>
      <h1>
        {hero.lines.map((line, idx) => (
          <span className="line" key={idx}>
            <span>{(line as LinePart[]).map(renderPart)}</span>
          </span>
        ))}
      </h1>
      <p className="sub" id="heroSub">{hero.sub}</p>
      <div className="scroll-hint" id="scrollHint">
        <span className="bar" /> Scroll
      </div>
    </header>
  );
}
