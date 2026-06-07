import { WireframeField } from './objects/WireframeField';
import { Impostors } from './objects/impostors/Impostors';

// Two layers:
//   - WireframeField: the dense "tunnel through space" feel — abstract
//     icosahedra / octahedra / tetrahedra that fly past as the camera moves.
//   - Impostors: dormant ghost versions of the four project objects; the one
//     matching the active section brightens amber (Step 5 semantic).
export function DepthCorridor() {
  return (
    <>
      <WireframeField />
      <Impostors />
    </>
  );
}
