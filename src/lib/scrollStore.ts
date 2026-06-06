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
};
