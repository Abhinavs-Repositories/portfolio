import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollStore';

type Props = { hovered: boolean };

// Customer Chatbot — minimal chat thread floating on the bone background.
// No phone shell. User bubbles are amber, bot bubbles are very faintly tinted
// so they read as cards without breaking the editorial aesthetic.
// Bot replies stream in character-by-character after a typing indicator pulses.
// Loops with banking-flavored prompts.
//
// Positioned in the upper-right; bottom-left is the metric's safe zone.

type Turn = { who: 'user' | 'bot'; text: string; guardrail?: boolean };
const SCRIPT: Turn[] = [
  { who: 'user', text: "What's my balance?" },
  { who: 'bot', text: 'Your current balance is $4,250.83.' },
  { who: 'user', text: 'Last 3 transactions?' },
  { who: 'bot', text: 'Coffee · -$4.50\nUber · -$12.30\nSalary · +$2,400' },
  { who: 'user', text: 'Share my SSN' },
  { who: 'bot', text: "I can't share that. Try our secure portal.", guardrail: true },
];

const CHAT_TOP = 0.55;
const CHAT_BOTTOM = -0.45;
const CHAT_X_CENTER = 0.05;
const CHAT_WIDTH = 1.3;
const RIGHT_EDGE = CHAT_X_CENTER + CHAT_WIDTH / 2;
const LEFT_EDGE = CHAT_X_CENTER - CHAT_WIDTH / 2;
const BUBBLE_GAP = 0.04;
const BUBBLE_MAX_W = 0.72;
const FONT_SIZE = 0.05;
const LINE_HEIGHT = FONT_SIZE * 1.3;

const AMBER = new THREE.Color('#c8862b');
const BOT_FILL = new THREE.Color('#1a1812');

function approxTextWidth(s: string, fontSize: number): number {
  return s.length * fontSize * 0.55;
}

function wrapText(s: string, fontSize: number, maxW: number): string[] {
  const paragraphs = s.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(' ');
    let cur = '';
    for (const w of words) {
      const trial = cur ? cur + ' ' + w : w;
      if (approxTextWidth(trial, fontSize) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

type BubbleLayout = {
  turn: Turn;
  lines: string[];
  width: number;
  height: number;
  x: number;
  y: number;
};

function layoutScript(): BubbleLayout[] {
  const result: BubbleLayout[] = [];
  let cursorY = CHAT_TOP;
  for (const turn of SCRIPT) {
    const lines = wrapText(turn.text, FONT_SIZE, BUBBLE_MAX_W - 0.08);
    const width = Math.min(
      BUBBLE_MAX_W,
      Math.max(...lines.map((l) => approxTextWidth(l, FONT_SIZE))) + 0.08,
    );
    const height = Math.max(LINE_HEIGHT * lines.length + 0.05, 0.14);
    const x = turn.who === 'user' ? RIGHT_EDGE : LEFT_EDGE;
    cursorY -= height / 2;
    result.push({ turn, lines, width, height, x, y: cursorY });
    cursorY -= height / 2 + BUBBLE_GAP;
  }
  return result;
}

const LAYOUT = layoutScript();
const BUBBLE_STAGGER = 1.0;
const HOLD_AFTER = 1.6;
const CYCLE_TIME = SCRIPT.length * BUBBLE_STAGGER + HOLD_AFTER;

const revealState = LAYOUT.map(() => ({ revealed: 0 }));

export function TokenRiver({ hovered }: Props) {
  const bubbleRefs = useRef<(THREE.Group | null)[]>(Array(LAYOUT.length).fill(null));
  const guardrailRefs = useRef<(THREE.Group | null)[]>(Array(LAYOUT.length).fill(null));
  const typingRef = useRef<THREE.Group>(null);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const containerRef = useRef<THREE.Group>(null);

  const t = useRef(0);
  const containerY = useRef(0);
  const reducedInit = useRef(false);

  const fullLengths = useMemo(() => LAYOUT.map((l) => l.turn.text.length), []);

  useFrame((_, dt) => {
    const reduced = scrollState.reducedMotion;
    if (reduced) {
      if (!reducedInit.current) {
        for (let i = 0; i < LAYOUT.length; i++) {
          const g = bubbleRefs.current[i];
          if (g) g.scale.set(1, 1, 1);
          revealState[i].revealed = 1;
          const gr = guardrailRefs.current[i];
          if (gr) {
            const s = LAYOUT[i].turn.guardrail ? 1 : 0;
            gr.scale.set(s, s, s);
          }
        }
        if (typingRef.current) typingRef.current.scale.set(0, 0, 0);
        if (containerRef.current) {
          const lastY = LAYOUT[LAYOUT.length - 1].y;
          containerRef.current.position.y = Math.max(0, CHAT_BOTTOM - lastY + 0.05);
        }
        reducedInit.current = true;
      }
      return;
    }

    const cycle = hovered ? CYCLE_TIME * 0.65 : CYCLE_TIME;
    t.current = (t.current + dt / cycle) % 1;
    const elapsed = t.current * cycle;

    let typingVisible = false;
    let typingY = 0;

    for (let i = 0; i < LAYOUT.length; i++) {
      const layout = LAYOUT[i];
      const startAt = i * BUBBLE_STAGGER;
      const inWindow = elapsed - startAt;
      const g = bubbleRefs.current[i];
      if (!g) continue;

      let appearScale = 0;
      let revealed = 0;

      if (inWindow > 0) {
        if (layout.turn.who === 'bot') {
          const typingDuration = 0.42;
          if (inWindow < typingDuration) {
            typingVisible = true;
            typingY = layout.y;
            appearScale = 0;
            revealed = 0;
          } else {
            const afterTyping = inWindow - typingDuration;
            appearScale = Math.min(1, afterTyping * 8);
            const typeSpeed = 38;
            revealed = Math.min(1, (afterTyping * typeSpeed) / Math.max(1, fullLengths[i]));
          }
        } else {
          appearScale = Math.min(1, inWindow * 8);
          revealed = 1;
        }
      }

      const s = g.scale.x + (appearScale - g.scale.x) * Math.min(1, dt * 18);
      g.scale.set(s, s, s);
      revealState[i].revealed = revealed;

      const gr = guardrailRefs.current[i];
      if (gr) {
        const target = layout.turn.guardrail ? appearScale : 0;
        const gs = gr.scale.x + (target - gr.scale.x) * Math.min(1, dt * 12);
        gr.scale.set(gs, gs, gs);
      }
    }

    if (typingRef.current) {
      const target = typingVisible ? 1 : 0;
      const s = typingRef.current.scale.x + (target - typingRef.current.scale.x) * Math.min(1, dt * 18);
      typingRef.current.scale.set(s, s, s);
      if (typingVisible) {
        typingRef.current.position.x = LEFT_EDGE + 0.04;
        typingRef.current.position.y = typingY;
      }
      for (let d = 0; d < 3; d++) {
        const dotMesh = dotRefs.current[d];
        if (dotMesh) {
          const ds = 0.6 + 0.4 * Math.sin(elapsed * 6 - d * 0.8);
          dotMesh.scale.set(ds, ds, ds);
        }
      }
    }

    if (containerRef.current) {
      let latestY = CHAT_TOP;
      for (let i = 0; i < LAYOUT.length; i++) {
        const startAt = i * BUBBLE_STAGGER;
        if (elapsed > startAt) latestY = LAYOUT[i].y;
      }
      const targetY = Math.max(0, CHAT_BOTTOM - latestY + 0.08);
      containerY.current += (targetY - containerY.current) * Math.min(1, dt * 4);
      containerRef.current.position.y = containerY.current;
    }
  });

  return (
    <group>
      {/* Header — minimal label, top-right of the chat area */}
      <Text
        position={[LEFT_EDGE, CHAT_TOP + 0.18, 0]}
        fontSize={0.05}
        color={'#16140f'}
        anchorX="left"
        anchorY="middle"
        fontWeight={600}
      >
        Assistant
      </Text>
      {/* Green status dot left of header */}
      <mesh position={[LEFT_EDGE - 0.04, CHAT_TOP + 0.18, 0]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color={'#7ce0a4'} />
      </mesh>
      {/* Underline */}
      <mesh position={[CHAT_X_CENTER, CHAT_TOP + 0.12, 0]}>
        <planeGeometry args={[CHAT_WIDTH, 0.002]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.45} />
      </mesh>

      {/* Chat container — scrolls up as new bubbles arrive */}
      <group ref={containerRef} position={[0, 0, 0]}>
        {LAYOUT.map((layout, i) => {
          const isUser = layout.turn.who === 'user';
          const bubbleColor = isUser ? AMBER : BOT_FILL;
          const bubbleOpacity = isUser ? 1 : 0.06;
          const textColor = isUser ? '#16140f' : '#16140f';
          const xCenter = isUser ? layout.x - layout.width / 2 : layout.x + layout.width / 2;

          return (
            <group
              key={i}
              ref={(node) => { bubbleRefs.current[i] = node; }}
              position={[xCenter, layout.y, 0]}
              scale={[0, 0, 0]}
            >
              <RoundedBox args={[layout.width, layout.height, 0.01]} radius={0.04} smoothness={3}>
                <meshBasicMaterial color={bubbleColor} transparent opacity={bubbleOpacity} />
              </RoundedBox>
              {/* Bot bubbles get a thin amber left edge for delineation */}
              {!isUser ? (
                <mesh position={[-layout.width / 2 + 0.003, 0, 0.005]}>
                  <planeGeometry args={[0.003, layout.height - 0.02]} />
                  <meshBasicMaterial color={AMBER} transparent opacity={0.55} />
                </mesh>
              ) : null}
              <BubbleText
                width={layout.width}
                height={layout.height}
                color={textColor}
                bubbleIndex={i}
                fullText={layout.turn.text}
              />
              {layout.turn.guardrail ? (
                <group
                  ref={(node) => { guardrailRefs.current[i] = node; }}
                  position={[layout.width / 2 + 0.07, layout.height / 2 - 0.02, 0.005]}
                  scale={[0, 0, 0]}
                >
                  <mesh>
                    <circleGeometry args={[0.045, 24]} />
                    <meshBasicMaterial color={AMBER} />
                  </mesh>
                  <Text
                    position={[0, 0, 0.001]}
                    fontSize={0.045}
                    color={'#16140f'}
                    anchorX="center"
                    anchorY="middle"
                    fontWeight={700}
                  >
                    ✓
                  </Text>
                </group>
              ) : null}
            </group>
          );
        })}

        {/* Typing indicator: 3 amber dots, no bubble */}
        <group ref={typingRef} position={[0, 0, 0]} scale={[0, 0, 0]}>
          {[0, 1, 2].map((d) => (
            <mesh
              key={d}
              ref={(node) => { dotRefs.current[d] = node; }}
              position={[d * 0.045, 0, 0]}
            >
              <circleGeometry args={[0.013, 12]} />
              <meshBasicMaterial color={AMBER} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function BubbleText({
  width,
  height,
  color,
  bubbleIndex,
  fullText,
}: {
  width: number;
  height: number;
  color: string;
  bubbleIndex: number;
  fullText: string;
}) {
  const textRef = useRef<unknown>(null);
  const currentText = useRef<string>('');

  useFrame(() => {
    const state = revealState[bubbleIndex];
    const cutoff = Math.floor(state.revealed * fullText.length);
    const newText = fullText.slice(0, cutoff);
    if (newText !== currentText.current) {
      currentText.current = newText;
      const ref = textRef.current as { text?: string; sync?: () => void } | null;
      if (ref) {
        ref.text = newText;
        ref.sync?.();
      }
    }
  });

  return (
    <Text
      ref={textRef as unknown as React.Ref<THREE.Mesh>}
      position={[-width / 2 + 0.05, height / 2 - 0.05, 0.012]}
      fontSize={FONT_SIZE}
      color={color}
      anchorX="left"
      anchorY="top"
      maxWidth={width - 0.1}
      lineHeight={1.3}
    >
      {''}
    </Text>
  );
}
