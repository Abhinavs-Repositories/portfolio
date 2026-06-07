// Custom shader for the Retrieval Manifold point cloud.
// Each point has:
//   - aSelected (0/1) — flips color toward amber and brightens
//   - aTarget   (vec3) — cluster destination; we lerp position toward it by uPull
//   - aSeed     (float) — per-point random for size jitter

export const manifoldVertex = /* glsl */ `
  uniform float uPull;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  attribute float aSelected;
  attribute vec3 aTarget;
  attribute float aSeed;
  varying float vSelected;
  varying float vDim;

  void main() {
    vSelected = aSelected;
    // Unselected points dim during a query (so the selected cluster reads).
    vDim = (1.0 - aSelected) * uPull;
    vec3 base = position;
    vec3 cluster = aTarget;
    float k = aSelected * uPull;
    vec3 p = mix(base, cluster, k);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depthAttn = 1.0 / max(-mv.z, 0.1);
    float size = uSize * (0.7 + aSeed * 0.6);
    // Selected points grow slightly so they read as a cluster.
    size *= 1.0 + aSelected * 0.6;
    gl_PointSize = size * depthAttn * uPixelRatio * 5.0;
  }
`;

export const manifoldFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uInk;
  uniform vec3 uAmber;
  uniform float uOpacity;
  varying float vSelected;
  varying float vDim;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.2, d);
    vec3 col = mix(uInk, uAmber, vSelected);
    float alpha = uOpacity * soft;
    // Dim unselected points during a query.
    alpha *= 1.0 - vDim * 0.65;
    // Selected points punch through with extra brightness.
    alpha = clamp(alpha + vSelected * 0.25 * soft, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;
