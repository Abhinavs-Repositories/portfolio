import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollStore';

type Props = { hovered: boolean };

// Knowledge Assistant — a shelf of book spines, with a round amber spotlight
// that hops randomly between books. At each stop, the book "matched" by the
// retriever tilts forward, glows amber, and shows a relevance score + language
// tag (the multilingual signal). A floating query pill rotates through realistic
// banking-advisor questions so the RAG context is unambiguous.
//
// The shelf occupies the upper-right; the bottom-left is reserved for the metric.

const ROWS = 4;
const COLS = 7;
const TOTAL = ROWS * COLS;
const SHELF_LEFT = -0.3;
const SHELF_RIGHT = 1.05;
const SHELF_TOP = 0.5;
const SHELF_BOTTOM = -0.2;
const COL_SPAN = (SHELF_RIGHT - SHELF_LEFT) / COLS;
const ROW_SPAN = (SHELF_TOP - SHELF_BOTTOM) / ROWS;

const QUERIES = [
  'personal loan eligibility',
  'parental leave policy',
  'FX rate · USD/EUR',
  'dispute charge process',
  'mortgage pre-approval',
  'business account fees',
];
const LANGS = ['EN', 'ES', 'DE'];
const SCORES = ['94%', '87%', '76%', '71%', '65%'];
const SELECT_COUNT = 5;

const INK = new THREE.Color('#16140f');
const INK_SOFT = new THREE.Color('#3a3730');
const AMBER = new THREE.Color('#c8862b');
const AMBER_BRIGHT = new THREE.Color('#e8ad4c');
const BONE_DEEP = new THREE.Color('#ece7dc');

function seedRand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function RetrievalManifold({ hovered }: Props) {
  const books = useMemo(() => {
    const arr: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      depth: number;
      color: THREE.Color;
      lang: string;
    }> = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const widthVar = 0.82 + seedRand(i, 1) * 0.16;
        const heightVar = 0.78 + seedRand(i, 2) * 0.2;
        const colorRoll = seedRand(i, 4);
        let color: THREE.Color;
        if (colorRoll < 0.45) color = INK.clone();
        else if (colorRoll < 0.78) color = INK_SOFT.clone();
        else if (colorRoll < 0.9) color = BONE_DEEP.clone().lerp(INK_SOFT, 0.4);
        else color = AMBER.clone().lerp(INK, 0.4);
        arr.push({
          x: SHELF_LEFT + (c + 0.5) * COL_SPAN,
          y: SHELF_BOTTOM + (r + 0.5) * ROW_SPAN,
          width: COL_SPAN * widthVar * 0.88,
          height: ROW_SPAN * heightVar,
          depth: 0.05 + seedRand(i, 3) * 0.02,
          color,
          lang: LANGS[Math.floor(seedRand(i, 5) * LANGS.length)],
        });
      }
    }
    return arr;
  }, []);

  const bookRefs = useRef<(THREE.Group | null)[]>(Array(TOTAL).fill(null));
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>(Array(TOTAL).fill(null));
  const spotlightRef = useRef<THREE.Group>(null);
  const queryTextRef = useRef<unknown>(null);
  const scoreRefs = useRef<(THREE.Group | null)[]>(Array(SELECT_COUNT).fill(null));
  const scoreTextRefs = useRef<(unknown | null)[]>(Array(SELECT_COUNT).fill(null));
  const langTextRefs = useRef<(unknown | null)[]>(Array(SELECT_COUNT).fill(null));

  const queryIdx = useRef(0);
  const selections = useRef<number[]>([]);
  const t = useRef(0);
  const reducedInit = useRef(false);

  function pickSelections(): number[] {
    const set = new Set<number>();
    while (set.size < SELECT_COUNT) {
      set.add(Math.floor(Math.random() * TOTAL));
    }
    return Array.from(set);
  }

  // Initialize selections so first frame has data.
  useMemo(() => { selections.current = pickSelections(); }, []);

  useFrame((state, dt) => {
    const reduced = scrollState.reducedMotion;
    const time = state.clock.elapsedTime;

    if (reduced) {
      if (!reducedInit.current) {
        const presel = [3, 11, 17, 22, 25];
        selections.current = presel;
        for (let s = 0; s < presel.length; s++) {
          const i = presel[s];
          const g = bookRefs.current[i];
          const m = matRefs.current[i];
          if (g) { g.rotation.x = -0.45; g.position.z = 0.15; }
          if (m) { m.color.copy(AMBER); m.emissive.copy(AMBER_BRIGHT); m.emissiveIntensity = 0.6; }
          const sg = scoreRefs.current[s];
          if (sg) {
            sg.scale.setScalar(1);
            sg.position.set(books[i].x, books[i].y + books[i].height / 2 + 0.08, 0.18);
            const st = scoreTextRefs.current[s] as { text?: string; sync?: () => void } | null;
            if (st) { st.text = SCORES[s]; st.sync?.(); }
            const lt = langTextRefs.current[s] as { text?: string; sync?: () => void } | null;
            if (lt) { lt.text = books[i].lang; lt.sync?.(); }
          }
        }
        if (spotlightRef.current) spotlightRef.current.scale.setScalar(0);
        reducedInit.current = true;
      }
      return;
    }

    const cycleTime = hovered ? 5 : 9;
    const prev = t.current;
    t.current = (t.current + dt / cycleTime) % 1;

    // Cycle reset — new query + new random selections.
    if (t.current < prev) {
      queryIdx.current = (queryIdx.current + 1) % QUERIES.length;
      selections.current = pickSelections();
      const qref = queryTextRef.current as { text?: string; sync?: () => void } | null;
      if (qref) { qref.text = QUERIES[queryIdx.current]; qref.sync?.(); }
    }

    // Anim layout: 5 stops + a pause at the end where everything stays lit.
    const PAUSE_FRACT = 0.2;
    const animFract = 1 - PAUSE_FRACT;
    const stopProg = t.current / animFract; // 0..1+ (>1 = pause)
    const inPause = stopProg > 1;
    const currentStop = inPause
      ? SELECT_COUNT - 1
      : Math.min(SELECT_COUNT - 1, Math.floor(stopProg * SELECT_COUNT));
    const localT = inPause
      ? 1
      : stopProg * SELECT_COUNT - currentStop; // 0..1 within current stop

    const targetBookIdx = selections.current[currentStop];
    const targetBook = books[targetBookIdx];

    // Round amber spotlight, lerps smoothly toward each target book.
    if (spotlightRef.current) {
      const cur = spotlightRef.current.position;
      const k = Math.min(1, dt * 5);
      cur.x += (targetBook.x - cur.x) * k;
      cur.y += (targetBook.y - cur.y) * k;
      cur.z = 0.18;
      const dist = Math.hypot(targetBook.x - cur.x, targetBook.y - cur.y);
      const settled = dist < 0.03;
      const pulse = settled ? 1 + 0.18 * Math.sin(time * 4) : 0.85;
      spotlightRef.current.scale.setScalar(pulse);
    }

    // Per-book state — visited (or being-visited-and-settled) = selected.
    for (let i = 0; i < TOTAL; i++) {
      const g = bookRefs.current[i];
      const m = matRefs.current[i];
      if (!g || !m) continue;

      const selectionIdx = selections.current.indexOf(i);
      const isVisited = selectionIdx >= 0 && selectionIdx < currentStop;
      const isCurrent = selectionIdx === currentStop;
      const spDist = spotlightRef.current
        ? Math.hypot(books[i].x - spotlightRef.current.position.x, books[i].y - spotlightRef.current.position.y)
        : 999;
      const inSpotlight = spDist < 0.12;
      const isSelected = inPause
        ? selectionIdx >= 0
        : isVisited || (isCurrent && inSpotlight && localT > 0.2);

      const targetTilt = isSelected ? 1 : 0;
      const curTilt = -g.rotation.x / 0.5;
      const newTilt = curTilt + (targetTilt - curTilt) * Math.min(1, dt * 6);
      g.rotation.x = -0.5 * newTilt;
      g.position.z = 0.2 * newTilt;

      if (isSelected) {
        m.color.lerp(AMBER, Math.min(1, dt * 4));
        m.emissive.copy(AMBER_BRIGHT);
        m.emissiveIntensity = 0.6 * newTilt;
      } else if (spDist < 0.22) {
        m.color.copy(books[i].color).lerp(AMBER, 0.12);
        m.emissive.copy(AMBER);
        m.emissiveIntensity = 0.08;
      } else {
        m.color.copy(books[i].color);
        m.emissive.copy(INK);
        m.emissiveIntensity = 0;
      }
    }

    // Score / lang tags — one per selection slot, anchored above the selected book.
    for (let s = 0; s < SELECT_COUNT; s++) {
      const g = scoreRefs.current[s];
      if (!g) continue;
      const bookIdx = selections.current[s];
      if (bookIdx === undefined) {
        g.scale.setScalar(0);
        continue;
      }
      const book = books[bookIdx];
      const visible = inPause
        ? true
        : s < currentStop || (s === currentStop && localT > 0.35);
      const targetScale = visible ? 1 : 0;
      const cur = g.scale.x;
      const ns = cur + (targetScale - cur) * Math.min(1, dt * 9);
      g.scale.setScalar(ns);
      g.position.set(book.x, book.y + book.height / 2 + 0.08, 0.2);

      const st = scoreTextRefs.current[s] as { text?: string; sync?: () => void } | null;
      if (st && st.text !== SCORES[s]) { st.text = SCORES[s]; st.sync?.(); }
      const lt = langTextRefs.current[s] as { text?: string; sync?: () => void } | null;
      if (lt && lt.text !== book.lang) { lt.text = book.lang; lt.sync?.(); }
    }
  });

  return (
    <group>
      {/* Query pill — top-left, the RAG context cue */}
      <group position={[-0.95, 0.7, 0.1]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.038}
          color={INK_SOFT}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.08}
          fontWeight={600}
        >
          QUERY
        </Text>
        <Text
          position={[0.16, 0, 0]}
          fontSize={0.04}
          color={AMBER}
          anchorX="left"
          anchorY="middle"
        >
          →
        </Text>
        <Text
          ref={queryTextRef as unknown as React.Ref<THREE.Mesh>}
          position={[0.21, 0, 0]}
          fontSize={0.052}
          color={INK}
          anchorX="left"
          anchorY="middle"
        >
          {QUERIES[0]}
        </Text>
        {/* thin amber underline */}
        <mesh position={[0.4, -0.05, 0]}>
          <planeGeometry args={[0.5, 0.003]} />
          <meshBasicMaterial color={AMBER} transparent opacity={0.45} />
        </mesh>
      </group>

      {/* Subtle "TOP K" label below query */}
      <Text
        position={[-0.95, 0.6, 0.1]}
        fontSize={0.028}
        color={INK_SOFT}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.1}
      >
        TOP 5 RESULTS · MULTILINGUAL
      </Text>

      {/* Books — sit on the shelf via their bottom edge, so tilt-forward
          rotates around the bottom (like a book leaning out). */}
      {books.map((b, i) => (
        <group
          key={i}
          ref={(node) => { bookRefs.current[i] = node; }}
          position={[b.x, b.y - b.height / 2, 0]}
        >
          <group position={[0, b.height / 2, 0]}>
            <mesh>
              <boxGeometry args={[b.width, b.height, b.depth]} />
              <meshStandardMaterial
                ref={(m) => { matRefs.current[i] = m; }}
                color={b.color}
                roughness={0.7}
                metalness={0.04}
              />
            </mesh>
            {/* Subtle amber band on the top edge — book trim */}
            <mesh position={[0, b.height / 2 - 0.012, b.depth / 2 + 0.001]}>
              <planeGeometry args={[b.width * 0.85, 0.012]} />
              <meshBasicMaterial color={AMBER} transparent opacity={0.35} />
            </mesh>
            {/* Subtle amber band on the bottom edge */}
            <mesh position={[0, -b.height / 2 + 0.012, b.depth / 2 + 0.001]}>
              <planeGeometry args={[b.width * 0.85, 0.012]} />
              <meshBasicMaterial color={AMBER} transparent opacity={0.25} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Thin amber shelf lines under each row (very subtle) */}
      {Array.from({ length: ROWS }).map((_, r) => {
        const y = SHELF_BOTTOM + r * ROW_SPAN;
        return (
          <mesh key={`shelf-${r}`} position={[(SHELF_LEFT + SHELF_RIGHT) / 2, y, -0.02]}>
            <planeGeometry args={[SHELF_RIGHT - SHELF_LEFT + 0.05, 0.005]} />
            <meshBasicMaterial color={INK_SOFT} transparent opacity={0.35} />
          </mesh>
        );
      })}

      {/* Round amber spotlight — bright core + soft outer aura, grouped so
          they move together. Hops randomly between books each "stop." */}
      <group ref={spotlightRef} position={[0.5, 0.3, 0.18]}>
        <mesh>
          <sphereGeometry args={[0.13, 28, 24]} />
          <meshBasicMaterial
            color={AMBER_BRIGHT}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.22, 24, 20]} />
          <meshBasicMaterial
            color={AMBER}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Relevance score + language tag stacks, one per selection. */}
      {Array.from({ length: SELECT_COUNT }).map((_, s) => (
        <group
          key={`score-${s}`}
          ref={(node) => { scoreRefs.current[s] = node; }}
          position={[0, -2, 0]}
          scale={[0, 0, 0]}
        >
          {/* Score (94% etc.) */}
          <Text
            ref={scoreTextRefs.current[s] as unknown as React.Ref<THREE.Mesh>}
            position={[0, 0.02, 0]}
            fontSize={0.042}
            color={AMBER}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
          >
            {SCORES[s]}
          </Text>
          {/* Language tag below the score */}
          <Text
            ref={langTextRefs.current[s] as unknown as React.Ref<THREE.Mesh>}
            position={[0, -0.025, 0]}
            fontSize={0.026}
            color={INK_SOFT}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
          >
            EN
          </Text>
        </group>
      ))}
    </group>
  );
}
