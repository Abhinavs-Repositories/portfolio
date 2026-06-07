import { Suspense, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollStore';

// Real F1 car sprite — loads /pitwall/f1-car.png as a texture on a flat plane.
// The plane sits flat in the XY scene plane at z=0.022 (above the track tube
// top at z=0.012). Its default +Y axis is the image's "up" (the car's nose),
// which we then rotate via the carRef group's quaternion to face the curve
// tangent — so the car always nose-forward along its lap.
//
// IMPORTANT: the source PNG must have a transparent background. Use
// https://remove.bg or a similar tool to cut out the car. Save the cutout to
// `public/pitwall/f1-car.png` and refresh.
function F1CarSprite() {
  const texture = useLoader(THREE.TextureLoader, '/pitwall/f1-car.png');
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
  }, [texture]);

  // The Ferrari source image has the NOSE pointing LEFT, so the long axis is
  // along X and the nose is at plane -X. The carDefaultFwd vector below
  // matches this so setFromUnitVectors aligns the nose with the curve tangent.
  return (
    <mesh position={[0, 0, 0.022]}>
      <planeGeometry args={[0.42, 0.16]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

type Props = { hovered: boolean };

// Stylized Monaco GP circuit, viewed top-down.
// Points trace the layout (clockwise from start/finish): pit straight → Sainte-
// Devote → Beau Rivage climb → Massenet → Casino → Mirabeau Haute → Loews
// Hairpin → Mirabeau Bas → Portier → Tunnel → Nouvelle Chicane → Tabac →
// Swimming Pool S-curves → La Rascasse → Anthony Noghes → back to start.
//
// The View camera at the default (0,0,2.4) looking at origin is never mutated.
// "Camera follows car" feel comes from translating the scene group each frame
// so the car ends up at world (0,0).
const TRACK_XY: [number, number][] = [
  // Start/finish line + pit straight (bottom, going LEFT)
  [1.1, -0.92],
  [0.7, -1.02],
  [0.2, -1.06],
  [-0.3, -1.04],
  [-0.7, -0.95],
  // Sainte-Devote (T1, sharp right)
  [-0.98, -0.78],
  [-1.12, -0.58],
  // Beau Rivage climb (long left-sweeper going up the hill)
  [-1.18, -0.28],
  [-1.18, 0.05],
  [-1.1, 0.32],
  // Massenet (sharp left at the top of the climb)
  [-0.95, 0.55],
  [-0.78, 0.7],
  // Casino Square (open sweeping right)
  [-0.5, 0.78],
  [-0.18, 0.8],
  // Mirabeau Haute (right)
  [0.1, 0.7],
  [0.22, 0.55],
  // Loews / Grand Hôtel Hairpin — the famous U-turn, slowest corner in F1
  [0.3, 0.38],
  [0.22, 0.22],
  [0.05, 0.16],
  // Mirabeau Bas + Portier (descending right)
  [-0.05, 0.04],
  [0.02, -0.12],
  // Tunnel (long curved straight under the hotel)
  [0.2, -0.22],
  [0.45, -0.28],
  [0.62, -0.24],
  // Nouvelle Chicane (sharp left-right after tunnel exit)
  [0.75, -0.36],
  [0.85, -0.26],
  // Tabac (left)
  [0.98, -0.36],
  // Swimming Pool entry (left-right chicane)
  [1.08, -0.54],
  [0.96, -0.66],
  // Swimming Pool exit (right-left chicane)
  [1.06, -0.78],
  // La Rascasse (slow right) → Anthony Noghes (final right onto pit straight)
  [1.18, -0.88],
];

function pointsAt(scale: number): THREE.Vector3[] {
  return TRACK_XY.map(([x, y]) => new THREE.Vector3(x * scale, y * scale, 0));
}

const TRAIL_LEN = 60;
const PUFF_COUNT = 40;

export function RacingLine({ hovered }: Props) {
  const trackCurve = useMemo(
    () => new THREE.CatmullRomCurve3(pointsAt(1.0), true, 'catmullrom', 0.5),
    [],
  );
  const raceCurve = useMemo(
    () => new THREE.CatmullRomCurve3(pointsAt(0.94), true, 'catmullrom', 0.5),
    [],
  );
  const ghostA = useMemo(
    () => new THREE.CatmullRomCurve3(pointsAt(1.08), true, 'catmullrom', 0.5),
    [],
  );
  const ghostB = useMemo(
    () => new THREE.CatmullRomCurve3(pointsAt(0.82), true, 'catmullrom', 0.5),
    [],
  );

  // Thin everything. Track tube top must sit BELOW the car or the car renders
  // inside the tube and looks like a stack of pebbles in a river.
  const trackGeom = useMemo(() => new THREE.TubeGeometry(trackCurve, 280, 0.012, 8, true), [trackCurve]);
  const raceGeom = useMemo(() => new THREE.TubeGeometry(raceCurve, 280, 0.004, 6, true), [raceCurve]);
  const ghostAGeom = useMemo(() => new THREE.TubeGeometry(ghostA, 200, 0.0025, 4, true), [ghostA]);
  const ghostBGeom = useMemo(() => new THREE.TubeGeometry(ghostB, 200, 0.0025, 4, true), [ghostB]);

  const sceneRef = useRef<THREE.Group>(null);
  const carRef = useRef<THREE.Group>(null);
  const ghostMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([null, null]);

  const trailPositions = useMemo(() => new Float32Array(TRAIL_LEN * 3), []);
  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    return g;
  }, [trailPositions]);

  const puffPositions = useMemo(() => new Float32Array(PUFF_COUNT * 3), []);
  const puffVel = useMemo(() => new Float32Array(PUFF_COUNT * 3), []);
  const puffLife = useMemo(() => new Float32Array(PUFF_COUNT), []);
  const puffGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(puffPositions, 3));
    return g;
  }, [puffPositions]);
  const puffCursor = useRef(0);
  useMemo(() => {
    // Park unused puffs far off-screen at init.
    for (let i = 0; i < PUFF_COUNT; i++) {
      puffPositions[i * 3] = 9999;
      puffPositions[i * 3 + 1] = 9999;
    }
  }, [puffPositions]);

  const t = useRef(0);
  const reducedInit = useRef(false);

  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const tmpC = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const tangent2 = useMemo(() => new THREE.Vector3(), []);
  const scenePos = useMemo(() => new THREE.Vector3(), []);

  // Car is built with its NOSE at local +Y, REAR at local -Y. We align this
  // local +Y axis with the curve's tangent so the car always faces forward.
  // The Ferrari source PNG has the car's nose at the LEFT edge of the image,
  // which (after planeGeometry's UV mapping) corresponds to the plane's -X
  // direction. So the car's "default forward" in local space is -X.
  const carDefaultFwd = useMemo(() => new THREE.Vector3(-1, 0, 0), []);
  const carQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, dt) => {
    const time = state.clock.elapsedTime;

    if (scrollState.reducedMotion) {
      if (!reducedInit.current) {
        const tPark = 0.18;
        raceCurve.getPointAt(tPark, tmpA);
        raceCurve.getPointAt((tPark + 0.005) % 1, tmpB);
        tangent.copy(tmpB).sub(tmpA).normalize();
        if (carRef.current) {
          carRef.current.position.copy(tmpA);
          carQ.setFromUnitVectors(carDefaultFwd, tangent);
          carRef.current.quaternion.copy(carQ);
        }
        if (sceneRef.current) {
          sceneRef.current.position.set(-tmpA.x, -tmpA.y, 0);
          sceneRef.current.scale.setScalar(1.15);
        }
        reducedInit.current = true;
      }
      return;
    }

    const lapTime = hovered ? 4.5 : 8.0;
    const safeDt = Math.min(dt, 0.05);
    t.current = (t.current + safeDt / lapTime + 1) % 1;

    raceCurve.getPointAt(t.current, tmpA);
    raceCurve.getPointAt((t.current + 0.005) % 1, tmpB);
    raceCurve.getPointAt((t.current + 0.025) % 1, tmpC);
    tangent.copy(tmpB).sub(tmpA).normalize();
    tangent2.copy(tmpC).sub(tmpB).normalize();
    const curvature = Math.max(0, 1 - tangent.dot(tangent2));

    if (carRef.current) {
      carRef.current.position.copy(tmpA);
      carQ.setFromUnitVectors(carDefaultFwd, tangent);
      carRef.current.quaternion.copy(carQ);
    }

    if (sceneRef.current) {
      // Translate scene so the car ends up at world (0,0). Smoothed lerp gives
      // a subtle "follow camera" feel without any actual camera mutation.
      scenePos.set(-tmpA.x, -tmpA.y, 0);
      sceneRef.current.position.lerp(scenePos, 0.18);
      const targetScale = hovered ? 1.5 : 1.15;
      const s = sceneRef.current.scale.x;
      sceneRef.current.scale.setScalar(s + (targetScale - s) * 0.08);
    }

    // Speed-streak trail (stored in world track-space; scene translation moves
    // it past the car naturally).
    for (let i = TRAIL_LEN - 1; i > 0; i--) {
      trailPositions[i * 3] = trailPositions[(i - 1) * 3];
      trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
      trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
    }
    trailPositions[0] = tmpA.x - tangent.x * 0.1;
    trailPositions[1] = tmpA.y - tangent.y * 0.1;
    trailPositions[2] = 0.005;
    trailGeom.attributes.position.needsUpdate = true;

    // Tire puffs on cornering — small spawn rate per frame when curvature spikes.
    if (curvature > 0.12) {
      const spawn = Math.min(2, Math.floor(curvature * 14));
      // perpendicular to tangent (left/right of car) in XY plane
      const perpX = -tangent.y;
      const perpY = tangent.x;
      for (let n = 0; n < spawn; n++) {
        const idx = puffCursor.current;
        puffCursor.current = (puffCursor.current + 1) % PUFF_COUNT;
        const side = n % 2 === 0 ? -1 : 1;
        puffPositions[idx * 3] = tmpA.x + perpX * 0.04 * side - tangent.x * 0.07;
        puffPositions[idx * 3 + 1] = tmpA.y + perpY * 0.04 * side - tangent.y * 0.07;
        puffPositions[idx * 3 + 2] = 0.012;
        puffVel[idx * 3] = -tangent.x * 0.2 + (Math.random() - 0.5) * 0.15;
        puffVel[idx * 3 + 1] = -tangent.y * 0.2 + (Math.random() - 0.5) * 0.15;
        puffVel[idx * 3 + 2] = 0.05 + Math.random() * 0.05;
        puffLife[idx] = 1.0;
      }
    }
    for (let i = 0; i < PUFF_COUNT; i++) {
      if (puffLife[i] <= 0) continue;
      puffPositions[i * 3] += puffVel[i * 3] * dt;
      puffPositions[i * 3 + 1] += puffVel[i * 3 + 1] * dt;
      puffPositions[i * 3 + 2] += puffVel[i * 3 + 2] * dt;
      puffLife[i] -= dt * 1.2;
      if (puffLife[i] <= 0) {
        puffPositions[i * 3] = 9999;
      }
    }
    puffGeom.attributes.position.needsUpdate = true;

    // Ghost line opacity oscillation.
    const g0 = ghostMatRefs.current[0];
    const g1 = ghostMatRefs.current[1];
    if (g0) g0.opacity = 0.06 + 0.12 * (0.5 + 0.5 * Math.sin(time * 0.6));
    if (g1) g1.opacity = 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(time * 0.55 + 1.7));
  });

  return (
    <group ref={sceneRef}>
      {/* Track (thin dark tube) */}
      <mesh geometry={trackGeom}>
        <meshStandardMaterial color={'#16140f'} roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Racing line (amber on top of track) */}
      <mesh geometry={raceGeom} position={[0, 0, 0.006]}>
        <meshBasicMaterial color={'#c8862b'} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Two ghost strategies — rejected paths, oscillating */}
      <mesh geometry={ghostAGeom} position={[0, 0, 0.003]}>
        <meshBasicMaterial
          ref={(m) => { ghostMatRefs.current[0] = m; }}
          color={'#c8862b'}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={ghostBGeom} position={[0, 0, 0.003]}>
        <meshBasicMaterial
          ref={(m) => { ghostMatRefs.current[1] = m; }}
          color={'#c8862b'}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Speed trail (additive amber points behind the car) */}
      <points geometry={trailGeom}>
        <pointsMaterial
          color={'#e8ad4c'}
          size={0.05}
          sizeAttenuation
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Tire puffs (small bone particles at corner apexes) */}
      <points geometry={puffGeom}>
        <pointsMaterial
          color={'#f4f1ea'}
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </points>

      {/* F1 car — textured plane loading /pitwall/f1-car.png.
          The carRef group's quaternion (set each frame in useFrame) rotates the
          plane so the image's nose (image top) faces the curve tangent. */}
      <group ref={carRef}>
        <Suspense fallback={null}>
          <F1CarSprite />
        </Suspense>
      </group>
    </group>
  );
}
