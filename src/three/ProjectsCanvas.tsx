import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { ProjectView } from './ProjectView';
import { RacingLine } from './objects/RacingLine';
import { StateMachine } from './objects/StateMachine';
import { RetrievalManifold } from './objects/RetrievalManifold';
import { TokenRiver } from './objects/TokenRiver';
import { useProjectViews, type ProjectViewEntry } from './projectViewsStore';

function ObjectFor({ entry }: { entry: ProjectViewEntry }) {
  const { kind, hovered } = entry;
  switch (kind) {
    case 'RacingLine':
      return <RacingLine hovered={hovered} />;
    case 'StateMachine':
      return <StateMachine hovered={hovered} />;
    case 'RetrievalManifold':
      return <RetrievalManifold hovered={hovered} />;
    case 'TokenRiver':
      return <TokenRiver hovered={hovered} />;
    default:
      return null;
  }
}

// One transparent, fixed, full-screen canvas hosting drei <View.Port />.
// Each registered project panel gets its own <View track={panelRef}> that
// renders the matching object — drei scissors it into the panel's screen rect,
// so we keep ONE webgl context across all four objects.
//
// Total contexts on the page: 2 (background Scene + this).
export function ProjectsCanvas() {
  const entries = useProjectViews();
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.setClearAlpha(0);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      {entries.map((entry) => (
        <ProjectView key={entry.id} trackRef={entry.panelRef}>
          <ObjectFor entry={entry} />
        </ProjectView>
      ))}
      <View.Port />
    </Canvas>
  );
}
