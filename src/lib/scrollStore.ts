// Plain mutable refs shared between the Lenis loop and the R3F useFrame loops.
// Avoids React state thrash on every scroll/mouse tick.
export const scrollState = {
  progress: 0,
  lastProgress: 0,
  // smoothed |dprogress/dt|, fed to chromatic-aberration in Phase 3
  velocity: 0,
  // normalized 0..1, y already flipped so 0 = bottom (matches the shader's expectation)
  mouseX: 0.5,
  mouseY: 0.5,
  reducedMotion: false,
  // Optional override that, when active, replaces the actual mouse for the
  // ShaderField warp/glow (used by the hero word-perturbation tween).
  // `until` is a performance.now() deadline; once exceeded the override clears.
  mouseOverride: { active: false, x: 0.5, y: 0.5, until: 0 },
  // Boost added on top of the velocity-driven CA at section boundaries.
  aberrationBoost: 0,
  // 0..1 inversion drive shared by the shader uniform and the body.inverted class.
  invert: 0,
  // Which section the viewer is in: 'hero' | 'about' | 'work-<index>' | 'contact'.
  activeSection: 'hero' as 'hero' | 'about' | 'work-0' | 'work-1' | 'work-2' | 'work-3' | 'contact',
};

// Tiny tween helper for transient boosts (e.g. section-boundary aberration).
export function pulseAberration(amount = 0.8, ms = 200) {
  const start = performance.now();
  const end = start + ms;
  const decayFrom = scrollState.aberrationBoost;
  const peak = Math.max(decayFrom, amount);
  scrollState.aberrationBoost = peak;
  const tick = () => {
    const now = performance.now();
    if (now >= end) {
      scrollState.aberrationBoost = 0;
      return;
    }
    const k = 1 - (now - start) / ms;
    scrollState.aberrationBoost = peak * k * k;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function setMouseOverride(x: number, y: number, ms = 400) {
  const o = scrollState.mouseOverride;
  o.active = true;
  o.x = x;
  o.y = y;
  o.until = performance.now() + ms;
}

// Returns the effective mouse, honoring any active override (auto-expires).
export function effectiveMouse(): { x: number; y: number } {
  const o = scrollState.mouseOverride;
  if (o.active) {
    if (performance.now() < o.until) return { x: o.x, y: o.y };
    o.active = false;
  }
  return { x: scrollState.mouseX, y: scrollState.mouseY };
}
