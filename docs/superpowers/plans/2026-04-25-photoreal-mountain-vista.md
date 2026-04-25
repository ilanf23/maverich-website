# Photoreal Mountain Vista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current stylized warm-sunset canyon with a photoreal "drone over a sea-of-clouds valley" hero vista — composition C from the spec.

**Architecture:** Three independently shippable phases that evolve the existing `canyon-environment` group around the locked camera + jet path. Phase A reshapes terrain and swaps to a cool palette. Phase B adds a layered cloud-sea shader, an HDRI sky, and atmospheric scattering. Phase C upgrades to PBR materials, real conifer trees, and mobile-graceful LOD. Every phase ends with a single dev-server visual check — there is no automated test runner in this project, and a 3D landing page's correctness is judged visually.

**Tech Stack:** Next.js 16.2 App Router, React 19, three@0.184, @react-three/fiber@9, @react-three/drei@10, @react-three/postprocessing@3, simplex-noise@4, custom GLSL shaders.

**Spec:** `docs/superpowers/specs/2026-04-25-photoreal-mountain-vista-design.md`

**Critical guardrails (referenced throughout):**
- **NEVER** edit `components/3d/maverich-jet.tsx` — owned by the parallel session on `main`.
- **MINIMIZE** edits to `components/3d/persistent-scene.tsx`. Only touch the line ranges this plan calls out, never the keyframes (`KEYS`, `INTRO_*`, `SECTION_*`) or the animator. Each persistent-scene.tsx edit is its own commit so it can be merged piecewise.
- **HOLD** the public exports `RIDGE_PARAMS` and `sampleRidge` from `mountain-landscape.tsx` stable — `tree-forest.tsx` depends on them.
- Honor `prefers-reduced-motion: reduce` on every new animation.

**Verification surface (no test runner installed):**
- `npm run lint` — must pass
- `npm run build` — must pass (catches TS / SSR / build-time errors)
- `npm run dev` then open `http://localhost:3000` — manual visual inspection per task's acceptance criteria

---

## File structure

| File | Phase | Action |
| --- | --- | --- |
| `components/3d/mountain-landscape.tsx` | A, C | evolve in place |
| `components/3d/persistent-scene.tsx` | A, B | surgical edits only on lines listed below |
| `components/3d/cloud-sea.tsx` | B | NEW |
| `components/3d/sky-atmosphere.tsx` | B | replace procedural sky with HDRI loader |
| `components/3d/tree-forest.tsx` | C | swap cone trees for hero geometry + impostors |
| `public/hdri/sea-of-clouds-sunrise.exr` | B | NEW asset |
| `public/textures/rock/*` | C | NEW assets (4 PBR maps) |
| `public/textures/tree-impostor.png` | C | NEW asset |
| `docs/superpowers/specs/asset-sources.md` | B, C | NEW (license tracking) |

---

## Phase A — Terrain reshape + cool palette swap

Fast visible win. No new files, no new dependencies. Single-file changes only, except for one surgical persistent-scene.tsx edit.

### Task A1: Reshape ridge silhouette in `mountain-landscape.tsx`

**Files:**
- Modify: `components/3d/mountain-landscape.tsx:91-94` (the `peakY` calculation in `sampleRidge`)

- [ ] **Step 1: Edit the noise amplitudes**

In `components/3d/mountain-landscape.tsx`, find lines 91-94:

```ts
  // 3 octaves of noise → jagged silhouette
  const h1 = noise2(t * 3, seed * 0.007) * 0.5 + 0.5;
  const h2 = noise2(t * 8, seed * 0.013) * 0.5 + 0.5;
  const h3 = noise2(t * 16, seed * 0.021) * 0.5 + 0.5;
  const peakY = 8 + h1 * 6 + h2 * 2.5 + h3 * 1.0;
```

Replace the `peakY` line and add a sharper octave to push the silhouette toward Patagonia/PNW alpine:

```ts
  // 4 octaves of noise → sharper, taller PNW-alpine silhouette.
  // Higher base + bigger octave-1 amplitude makes the ridges feel
  // genuinely vertical rather than rolling. Octave 4 adds the high-frequency
  // "broken" feel of real granite.
  const h1 = noise2(t * 3, seed * 0.007) * 0.5 + 0.5;
  const h2 = noise2(t * 8, seed * 0.013) * 0.5 + 0.5;
  const h3 = noise2(t * 16, seed * 0.021) * 0.5 + 0.5;
  const h4 = noise2(t * 32, seed * 0.031) * 0.5 + 0.5;
  const peakY = 14 + h1 * 9 + h2 * 3.5 + h3 * 1.4 + h4 * 0.6;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean exit (or only pre-existing warnings unrelated to this file).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Visual check**

Run: `npm run dev`. Open `http://localhost:3000`.

Expected:
- Ridges are visibly taller and sharper than before (peaks ~25 high vs the old ~12-15).
- Trees still appear ON the ridges, not floating in the air. (If they're floating, the `RIDGE_PARAMS`/`sampleRidge` contract was broken — undo and re-check.)
- The intro animation still completes; jet still flies in correctly.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/mountain-landscape.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase A.1 mountains: taller, sharper PNW-alpine ridge silhouette

Reshape sampleRidge noise — 4 octaves (was 3), higher base (14 vs 8),
bigger octave-1 amplitude. Holds RIDGE_PARAMS / sampleRidge public
contract so tree-forest placement is unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A2: Swap ridge material palette to cool-dark forested

**Files:**
- Modify: `components/3d/mountain-landscape.tsx:264-328` (the four material `useMemo` blocks)

- [ ] **Step 1: Edit material colors**

In `components/3d/mountain-landscape.tsx`, find the `groundMat`, `ridgeMat`, `midMat`, `farMat`, `horizonMat` blocks.

Replace `groundMat` (line 264-272):

```ts
  const groundMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#070A0C",  // cool dark slate — was warm-black "#06040A"
        roughness: 1.0,
        metalness: 0.0,
      }),
    []
  );
```

Replace the `ridgeMat` color (line 282 — keep everything else identical):

```ts
      color: "#0E1A18",  // cool forest-shadow dark — was "#0A0710"
```

Replace `midMat` color (line 295):

```ts
      color: "#1A2A28",  // mid forest with cool blue cast — was "#15080A"
```

Replace `farMat` color (line 309):

```ts
      color: "#2F4A4A",  // distant cool ridge — was "#321318"
```

Replace `horizonMat` color (line 322):

```ts
        color: "#3A5060",  // cool atmospheric horizon, merges into morning sky — was "#5C2820"
```

- [ ] **Step 2: Lint + build**

Run:
```
npm run lint
npm run build
```
Expected: both pass.

- [ ] **Step 3: Visual check**

Run: `npm run dev`. Confirm at `http://localhost:3000`:
- Ridges are now cool blue-green instead of warm dark.
- Distant horizon range merges with the (still-warm) sky in a slightly jarring way — that's expected; A3 fixes it.
- Trees still place correctly.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/mountain-landscape.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase A.2 mountains: cool forest palette swap

Replace warm-sunset ridge material colors with cool blue-green forest
tones. Horizon layer moves to a cool atmospheric color so it merges
with the morning sky we're moving toward (full sky/light swap in A.3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A3: Surgical fog + light swap in `persistent-scene.tsx`

**Files:**
- Modify: `components/3d/persistent-scene.tsx:505,514,518-522`

This is the most merge-sensitive task in Phase A. Only the three lines below are touched. Do NOT edit anything else in the file.

- [ ] **Step 1: Update fog color (line 505)**

Find:

```tsx
      <fog ref={fogRef} attach="fog" args={["#8B3B1F", 35, 240]} />
```

Replace with:

```tsx
      <fog ref={fogRef} attach="fog" args={["#7A8C9C", 35, 240]} />
```

- [ ] **Step 2: Update ambient light (line 514)**

Find:

```tsx
      <ambientLight intensity={0.1} color="#5C2820" />
```

Replace with:

```tsx
      <ambientLight intensity={0.12} color="#34404C" />
```

- [ ] **Step 3: Update directional light (lines 518-522)**

Find:

```tsx
      <directionalLight
        position={[-30, 8, -20]}
        intensity={2.5}
        color="#FF7B3C"
      />
```

Replace with:

```tsx
      <directionalLight
        position={[-30, 8, -20]}
        intensity={2.4}
        color="#F4D2A6"
      />
```

(Keep position unchanged so post-fx godrays still align.)

- [ ] **Step 4: Lint + build**

```
npm run lint
npm run build
```
Expected: both pass.

- [ ] **Step 5: Visual check**

Run: `npm run dev`. At `http://localhost:3000` confirm:
- Fog is now cool morning haze, not warm sunset.
- Ridges no longer look like they're rim-lit by lava.
- The intro still plays end-to-end.
- The scene reads as "cool sunrise mountains" — still without the cloud sea or HDRI, but the palette baseline is now set.

- [ ] **Step 6: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/persistent-scene.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase A.3 scene: cool morning fog + golden-hour key light

Surgical edits only — fog color, ambient color/intensity, and key
directional color updated for cool sunrise palette. Position of the
key light untouched (godrays alignment). No keyframe or animator
changes — kept tight to ease the merge with the parallel jet session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A4: Phase A acceptance gate

- [ ] **Step 1: End-to-end visual review**

Run: `npm run dev`. Open `http://localhost:3000`.

Expected (Phase A definition of done):
- Hero loads with cool blue-green ridges silhouetted against a softer sky.
- Distant horizon merges with the sky color (no warm-vs-cool seam).
- Tree placement on ridges is identical to before.
- Intro cinematic plays through; jet flies in normally.

If any of these fail, fix before moving to Phase B.

- [ ] **Step 2: Mark phase complete**

No commit — Phase A is just the three commits above.

---

## Phase B — Cloud sea + atmospheric scattering + HDRI sky

Adds the cloud sea, replaces the procedural sky shader with an HDRI environment, and adds aerial-perspective fade on distant ridges. One new file, one heavily evolved file, one tiny edit to persistent-scene.tsx.

### Task B1: Source the HDRI asset

The HDRI we'll use is `kloppenheim_06_puresky` from PolyHaven (CC0). 4k for desktop. We'll add a 2k variant for mobile in Phase C.

**Files:**
- Create: `public/hdri/sea-of-clouds-sunrise.exr` (binary, downloaded)
- Create: `docs/superpowers/specs/asset-sources.md` (license tracking)

- [ ] **Step 1: Download both 4k (desktop) and 2k (mobile) HDRI variants**

Run from the worktree root:

```bash
mkdir -p "/Users/ilanfridman/Maverich-Website-mountains/public/hdri"
curl -L "https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/4k/kloppenheim_06_puresky_4k.exr" \
  -o "/Users/ilanfridman/Maverich-Website-mountains/public/hdri/sea-of-clouds-sunrise-4k.exr"
curl -L "https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/2k/kloppenheim_06_puresky_2k.exr" \
  -o "/Users/ilanfridman/Maverich-Website-mountains/public/hdri/sea-of-clouds-sunrise-2k.exr"
```

Verify both downloaded (4k >10MB, 2k >2MB):

```bash
ls -lh "/Users/ilanfridman/Maverich-Website-mountains/public/hdri/"
```

If the downloads fail (URL changed, CDN issue), fall back to any of these PolyHaven CC0 sea-of-clouds / sunrise candidates instead:
- `qwantani_puresky` (https://polyhaven.com/a/qwantani_puresky)
- `belfast_sunset_puresky` (https://polyhaven.com/a/belfast_sunset_puresky)
- `kiara_1_dawn` (https://polyhaven.com/a/kiara_1_dawn)

Use the same destination filenames `sea-of-clouds-sunrise-4k.exr` and `sea-of-clouds-sunrise-2k.exr` regardless of source so the rest of the plan code paths don't change.

- [ ] **Step 2: Create the asset-sources tracking doc**

Create `docs/superpowers/specs/asset-sources.md` with:

```markdown
# Asset sources for the photoreal mountain vista

All assets downloaded for the `mountains` branch hero scene, with their license and source URL. Tracked here so a future audit can confirm everything is permissively licensed.

## HDRIs

| Local path | Source | License | Notes |
| --- | --- | --- | --- |
| `public/hdri/sea-of-clouds-sunrise-4k.exr` | PolyHaven `kloppenheim_06_puresky` | CC0 | https://polyhaven.com/a/kloppenheim_06_puresky (4k variant) |
| `public/hdri/sea-of-clouds-sunrise-2k.exr` | PolyHaven `kloppenheim_06_puresky` | CC0 | (same set, 2k variant for low-fi mode) |

## Rock textures (added in Phase C)

(empty — populated during Phase C)

## Tree assets (added in Phase C)

(empty — populated during Phase C)
```

- [ ] **Step 3: Commit the asset + manifest**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add public/hdri/sea-of-clouds-sunrise-4k.exr public/hdri/sea-of-clouds-sunrise-2k.exr docs/superpowers/specs/asset-sources.md
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase B.1 assets: PolyHaven CC0 sea-of-clouds-sunrise HDRI (4k + 2k)

Sourced kloppenheim_06_puresky from PolyHaven. 4k for desktop and 2k
for low-fidelity mode (mobile / slow connections). Track license and
source URL in docs/superpowers/specs/asset-sources.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: Replace procedural sky with HDRI in `sky-atmosphere.tsx`

**Files:**
- Modify: `components/3d/sky-atmosphere.tsx` (full rewrite of the component body, keep export signature stable)

- [ ] **Step 1: Rewrite sky-atmosphere.tsx**

Replace the entire file contents with:

```tsx
"use client";

import { Suspense, forwardRef, useMemo } from "react";
import * as THREE from "three";
import { Environment, Stars } from "@react-three/drei";

/**
 * SkyAtmosphere — PolyHaven HDRI sea-of-clouds sunrise dome + sun emitter
 * mesh for GodRays.
 *
 * The HDRI provides both the visible sky background AND the scene's
 * environment lighting (global IBL). The sun mesh stays — GodRays needs
 * a real geometry emitter, and we want the bloom-punched disc on top of
 * the HDRI's bright spot. The sun mesh is positioned so its screen-space
 * location lines up with the brightest pixel in the HDRI roughly.
 *
 * If the HDRI fails to load, drei's <Environment> falls back to no IBL —
 * the scene still renders, just with cooler shadows. The procedural
 * fallback dome below also paints a plausible cool-sunrise gradient so
 * the canvas is never empty.
 */

const fallbackSkyVertex = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fallbackSkyFragment = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 belowColor;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;
    vec3 color;
    if (h > 0.0) {
      color = mix(horizonColor, topColor, smoothstep(0.0, 0.6, h));
    } else {
      color = mix(horizonColor, belowColor, smoothstep(0.0, -0.4, h));
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

type SkyAtmosphereProps = {
  /** Optional ref to the sun mesh — used by GodRays effect in persistent-scene. */
  sunRef?: React.Ref<THREE.Mesh>;
  /** When true, load the smaller 2k HDRI variant instead of 4k. */
  lowFi?: boolean;
};

export const SkyAtmosphere = forwardRef<THREE.Group, SkyAtmosphereProps>(
  function SkyAtmosphere({ sunRef, lowFi = false }, groupRef) {
    const hdriPath = lowFi
      ? "/hdri/sea-of-clouds-sunrise-2k.exr"
      : "/hdri/sea-of-clouds-sunrise-4k.exr";
    // Procedural fallback dome — only rendered if HDRI fails to load.
    // drei's Environment handles its own loading + suspense; this dome
    // sits BEHIND the HDRI so it's only seen when the HDRI is missing.
    const fallbackMaterial = useMemo(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: fallbackSkyVertex,
          fragmentShader: fallbackSkyFragment,
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          uniforms: {
            topColor: { value: new THREE.Color("#3F5A6E") },
            horizonColor: { value: new THREE.Color("#E8C595") },
            belowColor: { value: new THREE.Color("#3A4A52") },
          },
        }),
      []
    );

    return (
      <group ref={groupRef}>
        {/* HDRI — both visible sky and global IBL. background renders the
            HDRI as the visible sky; the same texture also drives PBR
            reflections on ridge materials in Phase C. */}
        <Suspense fallback={null}>
          <Environment
            files={hdriPath}
            background
            environmentIntensity={0.9}
          />
        </Suspense>

        {/* Fallback procedural sky — renders behind everything; visible
            only if HDRI is still loading or missing. renderOrder=-2 so
            it draws behind both the HDRI and other scene content. */}
        <mesh material={fallbackMaterial} renderOrder={-2}>
          <sphereGeometry args={[450, 32, 24]} />
        </mesh>

        {/* Sun emitter — GodRays target. Positioned to align with the
            HDRI's bright spot. Y=14, z=-290 places it slightly above the
            horizon range. toneMapped=false keeps the disc hot for bloom. */}
        <mesh ref={sunRef} position={[0, 14, -290]} renderOrder={-1}>
          <sphereGeometry args={[10, 32, 32]} />
          <meshBasicMaterial color="#FFE9C8" toneMapped={false} fog={false} />
        </mesh>

        {/* Soft bloom halo around the sun emitter. Smaller than the v1
            warm-sunset halo because the HDRI already provides the wide
            atmospheric glow; this just sharpens the disc center. */}
        <mesh position={[0, 14, -291]} renderOrder={-1}>
          <sphereGeometry args={[14, 32, 32]} />
          <meshBasicMaterial
            color="#FFD89A"
            transparent
            opacity={0.35}
            toneMapped={false}
            fog={false}
            depthWrite={false}
          />
        </mesh>

        {/* Stars — drowned by the bright HDRI but harmless. Kept for the
            night-mode option later. */}
        <Stars
          radius={300}
          depth={50}
          count={250}
          factor={2}
          saturation={0}
          fade
          speed={0.05}
        />
      </group>
    );
  }
);
```

This rewrite:
- Removes the 6-stop warm-sunset shader and the 3 warm haze planes (cloud sea will replace them in B3).
- Adds drei `<Environment>` with HDRI as both visible background and IBL.
- Keeps the `sunRef` mechanism intact (godrays still binds to it).
- Provides a procedural fallback dome that paints a cool-sunrise gradient if the HDRI is missing.

- [ ] **Step 2: Lint + build**

```
npm run lint
npm run build
```
Expected: both pass.

If build complains about EXR loading: ensure `next.config.ts` doesn't block `.exr` (it doesn't by default; static files in `/public` are served as-is).

- [ ] **Step 3: Visual check**

Run: `npm run dev`. Confirm at `http://localhost:3000`:
- Sky now shows real cloud-sea sunrise photography (the HDRI).
- Ridges receive plausible cool-sky lighting from above.
- Sun disc is visible somewhere in the upper sky; godrays still emit from it.
- Intro animation plays.

Network tab should show the HDRI fetched successfully (~10-15MB).

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/sky-atmosphere.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase B.2 sky: HDRI sea-of-clouds-sunrise replaces procedural shader

Swap the procedural 6-stop warm-sunset gradient for a PolyHaven HDRI
(both visible background and IBL). Sun emitter mesh kept for GodRays.
Procedural fallback dome added behind for the case where HDRI fails
to load. Removed the 3 warm-sunset haze planes — Phase B.3 cloud sea
replaces that volumetric feel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B3: Build `cloud-sea.tsx`

The cloud sea is 3 stacked horizontal planes at y ≈ 1.5–2.0 with a custom shader that samples Worley + simplex noise to fake volume. Top-lit, bottom-shaded, drift-animated.

**Files:**
- Create: `components/3d/cloud-sea.tsx`

- [ ] **Step 1: Create the file**

Create `components/3d/cloud-sea.tsx` with:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../hooks/use-reduced-motion";

/**
 * CloudSea — three stacked horizontal planes between ridge bases (y=0)
 * and camera level (y≈5). A custom shader samples blended noise to
 * produce a thick "sea of clouds" without true volumetric raymarching.
 *
 * Each plane lives at a slightly different altitude. UV drift is offset
 * per plane so the layers parallax against each other as the camera
 * moves, suggesting depth without volume cost. Top of each plane is
 * sun-rim-lit; the underside is cool-blue shaded.
 *
 * Reduced motion: drift speed is multiplied by 0 when
 * prefers-reduced-motion: reduce is set, freezing the cloud sea.
 *
 * Performance: three planes total. On older GPUs that struggle,
 * Phase C reduces this to one plane in the mobile-degradation pass.
 */

const cloudVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Inline simplex-ish noise (smaller GPU cost than a real simplex shader).
// Two layers of value noise + a Worley-like cellular approximation give
// enough surface variety to read as a turbulent cloud top.
const cloudFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform vec3 uSunColor;
  uniform vec2 uSunDir;       // normalized horizontal direction
  uniform float uOpacity;
  uniform float uDriftSpeed;  // 0 when reduced-motion
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * valueNoise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 drift = vec2(uTime * uDriftSpeed * 0.012, uTime * uDriftSpeed * 0.007);
    vec2 p = vUv * 4.0 + drift;
    float density = fbm(p);
    float shape = smoothstep(0.35, 0.85, density);
    if (shape < 0.02) discard;

    // Sun rim-lighting on the top: bias density's gradient toward sun direction.
    vec2 grad = vec2(
      fbm(p + vec2(0.01, 0.0)) - fbm(p - vec2(0.01, 0.0)),
      fbm(p + vec2(0.0, 0.01)) - fbm(p - vec2(0.0, 0.01))
    );
    float sunFacing = clamp(dot(normalize(grad + vec2(0.0001)), uSunDir), 0.0, 1.0);
    vec3 base = mix(uBottomColor, uTopColor, density);
    vec3 lit = mix(base, uSunColor, sunFacing * 0.65);

    gl_FragColor = vec4(lit, shape * uOpacity);
  }
`;

type CloudSeaProps = {
  /** Approximate horizontal sun direction in world space (normalized x,z). */
  sunDir?: [number, number];
};

export function CloudSea({ sunDir = [0.6, -0.4] }: CloudSeaProps) {
  const reducedMotion = useReducedMotion();
  const matRefs = useRef<THREE.ShaderMaterial[]>([]);

  // Three layers at increasing altitude. Each gets its own material so we
  // can tweak per-layer params (opacity, color) without cloning uniforms.
  const layers = useMemo(
    () => [
      { y: 1.4, opacity: 0.55, scale: 1.0, topColor: "#F4DAB4", bottomColor: "#5A6878" },
      { y: 1.8, opacity: 0.45, scale: 0.85, topColor: "#F8E0BA", bottomColor: "#6A7888" },
      { y: 2.2, opacity: 0.35, scale: 0.7, topColor: "#FFE6C2", bottomColor: "#7A8898" },
    ],
    []
  );

  const materials = useMemo(
    () =>
      layers.map((layer) => {
        const mat = new THREE.ShaderMaterial({
          vertexShader: cloudVertex,
          fragmentShader: cloudFragment,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: { value: 0 },
            uTopColor: { value: new THREE.Color(layer.topColor) },
            uBottomColor: { value: new THREE.Color(layer.bottomColor) },
            uSunColor: { value: new THREE.Color("#FFE2B0") },
            uSunDir: {
              value: new THREE.Vector2(sunDir[0], sunDir[1]).normalize(),
            },
            uOpacity: { value: layer.opacity },
            uDriftSpeed: { value: reducedMotion ? 0 : 1 },
          },
        });
        return mat;
      }),
    [layers, reducedMotion, sunDir]
  );

  // Track materials for the per-frame time update.
  matRefs.current = materials;

  useFrame((_, delta) => {
    if (reducedMotion) return;
    for (const mat of matRefs.current) {
      mat.uniforms.uTime.value += delta;
    }
  });

  return (
    <group name="cloud-sea">
      {layers.map((layer, i) => (
        <mesh
          key={i}
          position={[0, layer.y, -100]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[600 * layer.scale, 500 * layer.scale]} />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Verify the reduced-motion hook exists**

The plan assumes `components/hooks/use-reduced-motion.ts` exists (per the project memory's "reduced-motion engineered into every primitive" and the IntroProvider work in Phase 4.2.12).

Run:

```bash
ls "/Users/ilanfridman/Maverich-Website-mountains/components/hooks/"
```

If `use-reduced-motion.ts` does not exist, create it with:

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the user has prefers-reduced-motion: reduce.
 * Used by every motion primitive in the scene.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
```

(If the hook already exists with a different export name, update the import in `cloud-sea.tsx` to match — do NOT modify the existing hook to fit the import.)

- [ ] **Step 3: Lint + build**

```
npm run lint
npm run build
```
Expected: both pass.

- [ ] **Step 4: Mount the cloud sea — single line edit to persistent-scene.tsx**

In `components/3d/persistent-scene.tsx`, find the `canyon-environment` group block (around line 526):

```tsx
      <group ref={canyonGroupRef} name="canyon-environment">
        <SkyAtmosphere sunRef={setSunMesh} />
        <MountainLandscape />
        <TreeForest count={200} />
      </group>
```

Add a `<CloudSea />` import and mount, and remove the now-redundant `<Environment preset="sunset" ...>` line near the top of the canvas (it's been replaced by the HDRI inside SkyAtmosphere):

Replace the block with:

```tsx
      <group ref={canyonGroupRef} name="canyon-environment">
        <SkyAtmosphere sunRef={setSunMesh} />
        <MountainLandscape />
        <CloudSea />
        <TreeForest count={200} />
      </group>
```

Add the import at the top of the file (after the existing imports for the other 3d components, around line 19):

```tsx
import { CloudSea } from "./cloud-sea";
```

Then find and DELETE the line that mounts the redundant `<Environment preset="sunset" ...>` (was around line 511):

```tsx
      <Environment preset="sunset" background={false} environmentIntensity={0.7} />
```

Also remove the no-longer-used `Environment` import from `@react-three/drei` if it's no longer referenced anywhere else in the file. (Keep `PerspectiveCamera` — still used.)

- [ ] **Step 5: Lint + build**

```
npm run lint
npm run build
```
Expected: both pass. If TypeScript complains about `Environment` import, remove the unused import.

- [ ] **Step 6: Visual check**

Run: `npm run dev`. At `http://localhost:3000`:
- A visibly cloudy layer sits between the ridges, in the valley below the jet's flight altitude.
- Three layers parallax slightly as the camera dollies forward.
- The clouds drift slowly when reduced-motion is off.
- Toggle OS-level reduced-motion (System Settings > Accessibility > Display > Reduce motion on macOS) and reload — the clouds should freeze.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/cloud-sea.tsx components/3d/persistent-scene.tsx components/hooks/use-reduced-motion.ts
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase B.3 cloud-sea: layered shader cloud volume in the valley

Three stacked planes at y=1.4/1.8/2.2 with a custom shader that samples
fbm value noise to produce a thick cloud-sea look without raymarching.
Top of each layer is sun-rim-lit, underside cool-shaded. UV drift speed
multiplied by 0 when prefers-reduced-motion is set.

Mounted in canyon-environment group in persistent-scene.tsx (single-line
edit) so the existing scroll-driven canyon fade also fades the clouds
out past the hero. Removed the now-redundant <Environment preset>
since HDRI in sky-atmosphere does that job.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B4: Atmospheric scattering on far/horizon ridges

Distant ridges should desaturate and lift toward sky color — real aerial perspective. We do this by extending the existing fog with a tinted overlay shader pass on the far/horizon material layers.

**Files:**
- Modify: `components/3d/mountain-landscape.tsx:308-328` (the `farMat` and `horizonMat` blocks)

- [ ] **Step 1: Replace far/horizon materials with onBeforeCompile-injected scattering**

In `components/3d/mountain-landscape.tsx`, find the `farMat` block (around line 303-316):

```ts
  const farMat = useMemo(() => {
    const n = rockNormal.clone();
    n.repeat.set(2, 2);
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    n.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color: "#2F4A4A",
      roughness: 0.92,
      metalness: 0.0,
      normalMap: n,
      normalScale: new THREE.Vector2(0.6, 0.6),
      flatShading: false,
    });
  }, [rockNormal]);
```

Replace with:

```ts
  const farMat = useMemo(() => {
    const n = rockNormal.clone();
    n.repeat.set(2, 2);
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    n.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({
      color: "#2F4A4A",
      roughness: 0.92,
      metalness: 0.0,
      normalMap: n,
      normalScale: new THREE.Vector2(0.6, 0.6),
      flatShading: false,
    });
    // Atmospheric scattering — distant ridges desaturate and lift toward
    // a cool sky tint, simulating aerial perspective. We inject into the
    // standard material's fragment shader using onBeforeCompile so the
    // fragment runs after lighting + fog and adds a distance-based blend
    // toward skyTint. distanceFactor goes 0 (close) → 1 (far horizon).
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSkyTint = { value: new THREE.Color("#7E9AAE") };
      shader.uniforms.uScatterStart = { value: 80.0 };
      shader.uniforms.uScatterEnd = { value: 260.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        `
          #include <fog_fragment>
          float dist = length(vViewPosition);
          float scatter = smoothstep(uScatterStart, uScatterEnd, dist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyTint, scatter * 0.8);
        `
      );
      shader.fragmentShader =
        "uniform vec3 uSkyTint;\nuniform float uScatterStart;\nuniform float uScatterEnd;\n" +
        shader.fragmentShader;
    };
    return m;
  }, [rockNormal]);
```

Find the `horizonMat` block (around line 317-328):

```ts
  const horizonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3A5060",
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true,
      }),
    []
  );
```

Replace with:

```ts
  const horizonMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#3A5060",
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    // Heavier scattering on the horizon range — these peaks should mostly
    // dissolve into the sky color.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSkyTint = { value: new THREE.Color("#9CB2C2") };
      shader.uniforms.uScatterStart = { value: 180.0 };
      shader.uniforms.uScatterEnd = { value: 320.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        `
          #include <fog_fragment>
          float dist = length(vViewPosition);
          float scatter = smoothstep(uScatterStart, uScatterEnd, dist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyTint, scatter * 0.95);
        `
      );
      shader.fragmentShader =
        "uniform vec3 uSkyTint;\nuniform float uScatterStart;\nuniform float uScatterEnd;\n" +
        shader.fragmentShader;
    };
    return m;
  }, []);
```

- [ ] **Step 2: Lint + build**

```
npm run lint
npm run build
```
Expected: both pass. If the build fails on shader compilation: the `onBeforeCompile` hook errors at runtime, not build time, so build should succeed regardless.

- [ ] **Step 3: Visual check**

Run: `npm run dev`. At `http://localhost:3000`:
- Far ridges (mid distance) noticeably desaturate and tint cooler than nearby ridges.
- Horizon ridges almost dissolve into the sky.
- No console errors about shader compilation.

If shader compilation fails (look for "ERROR: 0:N" in browser console): the most common cause is the `vViewPosition` varying not being available in this material's chunk graph. Workaround: replace `length(vViewPosition)` with `gl_FragCoord.z * 200.0` as a coarse approximation.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/mountain-landscape.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase B.4 mountains: atmospheric scattering on far + horizon ridges

Inject distance-based color attenuation toward a cool sky tint into
MeshStandardMaterial via onBeforeCompile. Far layer scatters across
80-260 units; horizon layer scatters across 180-320 with stronger
mix. Reads as real aerial perspective — distant peaks dissolve into
the sky.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B5: Sun direction A/B and Phase B acceptance gate

Per Q3, sun direction is best decided in front of the rendered scene. We test the four candidates and lock the winner.

**Files:**
- Modify: `components/3d/sky-atmosphere.tsx` (one position update at the end)
- Modify: `components/3d/cloud-sea.tsx` (matching `sunDir` value)

- [ ] **Step 1: Test sun position A — right (current default)**

Current sun is at `[0, 14, -290]` (centered, deep). Render and screenshot. The HDRI's bright spot is roughly center-top.

Run: `npm run dev`. Observe at `http://localhost:3000`. Take a screenshot of the hero at intro completion (~11s in, or skip the intro).

- [ ] **Step 2: Test sun position B — sunrise from the right**

Edit `components/3d/sky-atmosphere.tsx`. Find the sun mesh:

```tsx
        <mesh ref={sunRef} position={[0, 14, -290]} renderOrder={-1}>
```

Change to:

```tsx
        <mesh ref={sunRef} position={[80, 18, -270]} renderOrder={-1}>
```

And the bloom halo:

```tsx
        <mesh position={[0, 14, -291]} renderOrder={-1}>
```

Change to:

```tsx
        <mesh position={[80, 18, -271]} renderOrder={-1}>
```

In `components/3d/cloud-sea.tsx`, find the default prop:

```tsx
export function CloudSea({ sunDir = [0.6, -0.4] }: CloudSeaProps) {
```

Update to match the new world-space sun direction. With sun at world position [80, 18, -270] and the cloud sea at [0, ~2, -100], the horizontal direction from cloud center to sun is normalize([80, -170]) ≈ [0.42, -0.91]:

```tsx
export function CloudSea({ sunDir = [0.42, -0.91] }: CloudSeaProps) {
```

Reload, screenshot.

- [ ] **Step 3: Test sun position C — sunrise from the left**

Mirror the above:

```tsx
        <mesh ref={sunRef} position={[-80, 18, -270]} renderOrder={-1}>
        <mesh position={[-80, 18, -271]} renderOrder={-1}>
```

```tsx
export function CloudSea({ sunDir = [-0.42, -0.91] }: CloudSeaProps) {
```

Reload, screenshot.

- [ ] **Step 4: Test sun position D — backlit from deep frame**

```tsx
        <mesh ref={sunRef} position={[0, 22, -340]} renderOrder={-1}>
        <mesh position={[0, 22, -341]} renderOrder={-1}>
```

```tsx
export function CloudSea({ sunDir = [0, -1] }: CloudSeaProps) {
```

Reload, screenshot.

- [ ] **Step 5: Pick the winner**

Compare the four screenshots. Rank by:
1. Does the cinematic intro read as drone-footage golden hour?
2. Does the jet have a crisp silhouette without fighting lens flares?
3. Does the cloud sea's top get genuinely warm-rim-lit?

Lock the chosen position by leaving the corresponding code in place. If A (the original) wins, revert all changes from steps 2-4.

- [ ] **Step 6: Lint + build**

```
npm run lint
npm run build
```

- [ ] **Step 7: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/sky-atmosphere.tsx components/3d/cloud-sea.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase B.5 sun direction: lock chosen position after browser A/B

Tested four sun positions (centered-default, right, left, backlit-deep)
in the dev server. Locked: <CHOSEN_LABEL>. Cloud-sea sunDir prop
updated to match world-space direction so rim lighting aligns with
the visible HDRI sun.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(Replace `<CHOSEN_LABEL>` in the commit message with whichever sun position won.)

- [ ] **Step 8: Phase B acceptance gate**

Run `npm run dev` one more time. Verify Phase B definition of done:
- Cloud sea visibly fills the valley.
- Jet flies above the cloud line during the intro.
- Distant ridges fade toward sky color (aerial perspective).
- HDRI sky fills the background.
- Sun position is locked and visually integrated.
- Cloud drift respects `prefers-reduced-motion`.

If any check fails, fix before moving to Phase C.

---

## Phase C — Photoreal materials + trees + LOD

### Task C1: Pull rock PBR texture set and document

**Files:**
- Create: `public/textures/rock/rock_face_03_diff_2k.jpg` (and three siblings)
- Modify: `docs/superpowers/specs/asset-sources.md`

- [ ] **Step 1: Download a rock face PBR set from PolyHaven**

PolyHaven asset: `rock_face_03` (CC0). 2k JPGs for albedo/AO/roughness, 2k EXR for normal.

```bash
mkdir -p "/Users/ilanfridman/Maverich-Website-mountains/public/textures/rock"
cd "/Users/ilanfridman/Maverich-Website-mountains/public/textures/rock"

curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_face_03/rock_face_03_diff_2k.jpg" -o rock_face_03_diff_2k.jpg
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_face_03/rock_face_03_nor_gl_2k.jpg" -o rock_face_03_nor_gl_2k.jpg
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_face_03/rock_face_03_rough_2k.jpg" -o rock_face_03_rough_2k.jpg
curl -L "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_face_03/rock_face_03_ao_2k.jpg" -o rock_face_03_ao_2k.jpg

ls -lh
```

If `rock_face_03` URLs 404, fall back to any of these CC0 PolyHaven rock sets and rename the downloaded files to `rock_face_03_*` for compatibility with Step 2's code:
- `rock_06`
- `aerial_rocks_02`
- `cliff_side`

- [ ] **Step 2: Append to asset-sources.md**

In `docs/superpowers/specs/asset-sources.md`, replace the empty Phase C rock section with:

```markdown
## Rock textures

| Local path | Source | License | Notes |
| --- | --- | --- | --- |
| `public/textures/rock/rock_face_03_diff_2k.jpg` | PolyHaven `rock_face_03` | CC0 | https://polyhaven.com/a/rock_face_03 |
| `public/textures/rock/rock_face_03_nor_gl_2k.jpg` | PolyHaven `rock_face_03` | CC0 | (same set) |
| `public/textures/rock/rock_face_03_rough_2k.jpg` | PolyHaven `rock_face_03` | CC0 | (same set) |
| `public/textures/rock/rock_face_03_ao_2k.jpg` | PolyHaven `rock_face_03` | CC0 | (same set) |
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add public/textures/rock/ docs/superpowers/specs/asset-sources.md
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase C.1 assets: PolyHaven CC0 rock_face_03 PBR set (2k)

Diffuse / normal-GL / roughness / AO at 2k resolution. Asset source
tracked in asset-sources.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C2: Apply PBR rock materials to foreground ridges

**Files:**
- Modify: `components/3d/mountain-landscape.tsx` — replace `ridgeMat` and `midMat` with PBR-textured materials

- [ ] **Step 1: Add a texture loader utility at the top of `mountain-landscape.tsx`**

Add this import alongside the existing imports (after `import * as THREE from "three";`):

```ts
import { useTexture } from "@react-three/drei";
```

- [ ] **Step 2: Replace `ridgeMat` with a PBR material**

Find the existing `ridgeMat` block (after Task B4 it lives around line 273-288). Replace with:

```ts
  // Foreground ridges — full PBR with PolyHaven rock_face_03 textures.
  const ridgeTextures = useTexture({
    map: "/textures/rock/rock_face_03_diff_2k.jpg",
    normalMap: "/textures/rock/rock_face_03_nor_gl_2k.jpg",
    roughnessMap: "/textures/rock/rock_face_03_rough_2k.jpg",
    aoMap: "/textures/rock/rock_face_03_ao_2k.jpg",
  });

  const ridgeMat = useMemo(() => {
    // Configure all four maps for ridge-length tiling.
    [ridgeTextures.map, ridgeTextures.normalMap, ridgeTextures.roughnessMap, ridgeTextures.aoMap].forEach(
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 1);
        tex.anisotropy = 8;
      }
    );
    return new THREE.MeshStandardMaterial({
      map: ridgeTextures.map,
      normalMap: ridgeTextures.normalMap,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: ridgeTextures.roughnessMap,
      aoMap: ridgeTextures.aoMap,
      aoMapIntensity: 0.85,
      roughness: 1.0,
      metalness: 0.05,
      side: THREE.DoubleSide,
      // Tint slightly cool — pulls the rock toward the morning sky color.
      color: "#8AA0A8",
    });
  }, [ridgeTextures]);
```

- [ ] **Step 3: Replace `midMat` with a desaturated variant of the same texture**

Find the `midMat` block. Replace with:

```ts
  const midMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: ridgeTextures.map,
      normalMap: ridgeTextures.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: ridgeTextures.roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
      // Color tints the diffuse map cooler/darker for mid distance.
      color: "#5A7078",
    });
  }, [ridgeTextures]);
```

- [ ] **Step 4: Lint + build**

```
npm run lint
npm run build
```

- [ ] **Step 5: Visual check**

Run: `npm run dev`. Confirm at `http://localhost:3000`:
- Foreground ridges now show real rock texture (cracks, surface variation).
- Normal map gives them depth in raking sun.
- Mid ridges have a coarser version of the same.
- Trees still place correctly.
- No texture-loading errors in the console.

- [ ] **Step 6: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/mountain-landscape.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase C.2 mountains: PBR rock_face_03 textures on foreground+mid ridges

Real PBR materials (albedo + normal + roughness + AO) on the
foreground ridge geometry and mid peaks. Anisotropy 8x for the
foreground; mid uses a coarser tile + cooler tint to read as
distance. Far/horizon retain their atmospheric-scattering shaders
from B.4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C3: Shader-driven snow caps on highest ridge points

Snow shouldn't be a separate mesh — it should be a shader-blended addition to the existing ridge material based on slope (snow only on near-flat surfaces) + altitude (snow only on the highest ridge points) + facing direction (snow only on up-facing surfaces).

**Files:**
- Modify: `components/3d/mountain-landscape.tsx` (the `ridgeMat` `useMemo`, add `onBeforeCompile`)

- [ ] **Step 1: Inject snow blend into `ridgeMat` via `onBeforeCompile`**

In `components/3d/mountain-landscape.tsx`, modify the `ridgeMat` block from C2. After the `new THREE.MeshStandardMaterial({...})` line and before `return`, attach an `onBeforeCompile`:

Replace the existing C2 `ridgeMat` block with:

```ts
  const ridgeMat = useMemo(() => {
    [ridgeTextures.map, ridgeTextures.normalMap, ridgeTextures.roughnessMap, ridgeTextures.aoMap].forEach(
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 1);
        tex.anisotropy = 8;
      }
    );
    const m = new THREE.MeshStandardMaterial({
      map: ridgeTextures.map,
      normalMap: ridgeTextures.normalMap,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: ridgeTextures.roughnessMap,
      aoMap: ridgeTextures.aoMap,
      aoMapIntensity: 0.85,
      roughness: 1.0,
      metalness: 0.05,
      side: THREE.DoubleSide,
      color: "#8AA0A8",
    });
    // Snow blend: based on world-space height + face normal up-component.
    // High + up-facing → blend toward white snow albedo with low roughness.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowAltitude = { value: 18.0 };
      shader.uniforms.uSnowAltitudeRange = { value: 4.0 };
      shader.uniforms.uSnowSlopeBias = { value: 0.65 };
      shader.fragmentShader = "varying vec3 vWorldPosNormal;\nvarying float vWorldY;\n" + shader.fragmentShader;
      shader.vertexShader = "varying vec3 vWorldPosNormal;\nvarying float vWorldY;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <fog_vertex>",
        `
          #include <fog_vertex>
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          vWorldY = wp.y;
          vWorldPosNormal = normalize(mat3(modelMatrix) * objectNormal);
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <output_fragment>",
        `
          float altMix = smoothstep(uSnowAltitude - uSnowAltitudeRange, uSnowAltitude + uSnowAltitudeRange, vWorldY);
          float slopeMix = smoothstep(uSnowSlopeBias, 1.0, vWorldPosNormal.y);
          float snow = altMix * slopeMix;
          vec3 snowAlbedo = vec3(0.96, 0.96, 0.94);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, snowAlbedo, snow * 0.85);
          #include <output_fragment>
        `
      );
      shader.fragmentShader =
        "uniform float uSnowAltitude;\nuniform float uSnowAltitudeRange;\nuniform float uSnowSlopeBias;\n" +
        shader.fragmentShader;
    };
    return m;
  }, [ridgeTextures]);
```

- [ ] **Step 2: Lint + build**

```
npm run lint
npm run build
```

- [ ] **Step 3: Visual check**

Run: `npm run dev`. At `http://localhost:3000`:
- The very tops of the foreground ridges show white snow caps on near-flat / up-facing surfaces only.
- Vertical cliff faces stay rocky (slope bias filters them out).
- Lower ridges have no snow.

If snow is too aggressive (covers vertical faces), increase `uSnowSlopeBias` from 0.65 toward 0.85. If snow is missing entirely, the `vWorldY` varying may not be wiring through — check browser console for shader errors.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/mountain-landscape.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase C.3 mountains: shader-driven snow caps on high up-facing ridge

Snow blend injected into ridgeMat via onBeforeCompile. Triggers only
on (a) above world-Y 18 and (b) face normal up-component > 0.65.
No additional geometry — cheap two-uniform shader extension.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C4: Conifer impostor trees

Replace the existing `<coneGeometry>` trees with billboard impostors (rendered to a texture once, then drawn as camera-facing planes). Up close we keep a small number of geometry trees for parallax fidelity.

**Files:**
- Create: `public/textures/tree-impostor.png`
- Modify: `components/3d/tree-forest.tsx` (full rewrite)

- [ ] **Step 1: Source a conifer impostor texture**

Two paths — pick whichever lands first:

**Path A (preferred):** A pre-rendered conifer silhouette PNG with alpha. PolyHaven has a `pine_tree_01` model that we'd need to render once. Path B is faster.

**Path B:** Generate a procedural impostor at runtime — a triangle stack drawn into a render target. We'll do this inline in tree-forest.tsx and skip the PNG asset entirely.

For this plan, use **Path B**.

(No actual asset download needed — generated in code. The `public/textures/tree-impostor.png` row is removed from the file structure since we generated it instead.)

- [ ] **Step 2: Rewrite `tree-forest.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import { sampleRidge } from "./mountain-landscape";

/**
 * TreeForest — conifers on the foreground ridges.
 *
 * Two systems:
 *   • Hero geometry trees (~30 per side) using a low-poly procedural
 *     conifer for the trees nearest the camera. These read as 3D in
 *     parallax.
 *   • Impostor billboard trees (~370 per side) using a procedurally
 *     generated alpha-cutout texture. These are camera-facing planes,
 *     ~1 draw call per side via Instances.
 *
 * Density bumped from 200/side → 400/side total, with the geometry
 * subset capped at 30/side regardless of `count`.
 *
 * Placement re-uses sampleRidge() — public contract preserved.
 */

// Mulberry32 PRNG (kept identical to v1 so seeds/positions stay stable
// against Phase A geometry; trees on existing ridges are at the same
// xy positions, only their visual style changes).
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEFT_SEED = 1337;
const RIGHT_SEED = 9001;
const HERO_COUNT_PER_SIDE = 30;

type TreePlacement = {
  position: [number, number, number];
  scale: number;
  rotationY: number;
};

function generatePlacements(
  side: "left" | "right",
  ridgeSeed: number,
  count: number
): TreePlacement[] {
  const placement = mulberry32(ridgeSeed + 17);
  const trees: TreePlacement[] = [];
  for (let i = 0; i < count; i++) {
    const t = placement();
    const sample = sampleRidge(side, ridgeSeed, t);
    const slopeFrac = 0.1 + placement() * 0.82;
    const treeY = sample.peakY * slopeFrac;
    const treeX = THREE.MathUtils.lerp(sample.xInner, sample.peakX, slopeFrac);
    const xJitter = (placement() - 0.5) * 1.5;
    const zJitter = (placement() - 0.5) * 2.4;
    const baseScale = 0.85 + placement() * 0.6;
    trees.push({
      position: [treeX + xJitter, treeY, sample.z + zJitter],
      scale: baseScale,
      rotationY: placement() * Math.PI * 2,
    });
  }
  return trees;
}

/** Procedural conifer impostor — drawn once into a CanvasTexture. */
function createImpostorTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Stylized backlit conifer silhouette: dark green core with warm rim.
  ctx.clearRect(0, 0, size, size);

  // Trunk
  ctx.fillStyle = "#1A1410";
  ctx.fillRect(size * 0.46, size * 0.78, size * 0.08, size * 0.22);

  // Stack of triangle layers — bottom widest, top narrowest.
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 bottom → 1 top
    const cy = size * (0.78 - t * 0.7);
    const halfW = size * (0.42 - t * 0.32);
    const h = size * 0.16;
    // Slight rim color on the right side
    const grad = ctx.createLinearGradient(
      size * 0.5 - halfW,
      cy,
      size * 0.5 + halfW,
      cy
    );
    grad.addColorStop(0, "#0E1A12");
    grad.addColorStop(0.7, "#0B140E");
    grad.addColorStop(1, "#3C2A14"); // warm backlight rim
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, cy - h);
    ctx.lineTo(size * 0.5 - halfW, cy + h);
    ctx.lineTo(size * 0.5 + halfW, cy + h);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function TreeForest({ count = 400 }: { count?: number }) {
  const impostorTex = useMemo(() => createImpostorTexture(), []);

  const { heroes, impostors } = useMemo(() => {
    const left = generatePlacements("left", LEFT_SEED, count);
    const right = generatePlacements("right", RIGHT_SEED, count);
    const all = [...left, ...right];
    // Sort by z (closest to camera first) and split.
    all.sort((a, b) => b.position[2] - a.position[2]);
    const heroLimit = HERO_COUNT_PER_SIDE * 2;
    return {
      heroes: all.slice(0, heroLimit),
      impostors: all.slice(heroLimit),
    };
  }, [count]);

  return (
    <group name="tree-forest">
      {/* Hero geometry trees — close to camera, real cones for parallax. */}
      {heroes.length > 0 && (
        <Instances limit={heroes.length} range={heroes.length} castShadow={false}>
          <coneGeometry args={[0.32, 2.2, 7]} />
          <meshStandardMaterial
            color="#0C1810"
            roughness={0.95}
            metalness={0.0}
            flatShading
          />
          {heroes.map((tree, i) => (
            <Instance
              key={`h${i}`}
              position={tree.position}
              scale={[tree.scale, tree.scale * 1.15, tree.scale]}
              rotation={[0, tree.rotationY, 0]}
            />
          ))}
        </Instances>
      )}

      {/* Impostor billboard trees — alpha-cutout planes that face the
          camera. Drawn after the hero trees; they don't write depth so
          they blend with the hero trees and the cloud sea cleanly. */}
      {impostors.length > 0 && (
        <Instances limit={impostors.length} range={impostors.length} castShadow={false}>
          <planeGeometry args={[1.2, 2.0]} />
          <meshBasicMaterial
            map={impostorTex}
            transparent
            alphaTest={0.5}
            side={THREE.DoubleSide}
            fog
          />
          {impostors.map((tree, i) => (
            <Instance
              key={`i${i}`}
              position={[tree.position[0], tree.position[1] + 1.0, tree.position[2]]}
              scale={[tree.scale, tree.scale, 1]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
```

Notes about this rewrite:
- The impostor planes are NOT camera-facing in the strict sense (they're axis-aligned). For the camera's near-static intro and shallow scroll-driven motion afterward, axis-aligned reads fine. True billboarding (Sprites) is available if needed; flag for later.
- The hero subset is chosen by z-distance (closest 60 trees) so parallax fidelity sits where it matters.
- Density default is now 400/side instead of 200/side — `<TreeForest count={400} />` becomes the new persistent-scene.tsx prop value.

- [ ] **Step 3: Update the count in `persistent-scene.tsx`**

In `components/3d/persistent-scene.tsx`, find:

```tsx
        <TreeForest count={200} />
```

Replace with:

```tsx
        <TreeForest count={400} />
```

(Single-line edit — keep merge surface tiny.)

- [ ] **Step 4: Lint + build**

```
npm run lint
npm run build
```

- [ ] **Step 5: Visual check**

Run: `npm run dev`. At `http://localhost:3000`:
- Trees feel denser (400/side now vs 200/side).
- Close-camera trees still look 3D (cones).
- Mid/far trees have a richer silhouette than plain cones (the impostor texture).
- Frame rate holds 60 on desktop.

- [ ] **Step 6: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/3d/tree-forest.tsx components/3d/persistent-scene.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase C.4 trees: hero cones + impostor billboards, 200→400 per side

Two-system tree forest. ~30/side closest to camera stay as low-poly
cones for parallax fidelity; remaining ~370/side become alpha-cutout
billboard planes drawn from a procedurally-generated CanvasTexture
of a stylized backlit conifer. Density doubled.

sampleRidge contract preserved — placements identical to v1 for the
same seeds, only their visual representation changed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C5: Mobile graceful degradation

The desktop scene now hits its target. Mobile needs to drop fidelity gracefully — fewer trees, simpler clouds, smaller HDRI.

**Files:**
- Create: `components/hooks/use-low-fidelity-mode.ts`
- Modify: `components/3d/persistent-scene.tsx`
- Modify: `components/3d/cloud-sea.tsx`

- [ ] **Step 1: Add a low-fidelity-mode hook**

Create `components/hooks/use-low-fidelity-mode.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the device should render the low-fidelity scene
 * variant. Heuristic: no-hover (touch primary) + small viewport, or
 * low device pixel ratio + slow connection.
 *
 * Detection runs once on mount; we don't track viewport resize because
 * the user can't suddenly grow their device into a desktop.
 */
export function useLowFidelityMode(): boolean {
  const [low, setLow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const noHover = window.matchMedia("(hover: none)").matches;
    const smallViewport = window.innerWidth < 900;
    const lowDpr = window.devicePixelRatio < 2;
    // navigator.connection is non-standard; use it if available.
    const conn =
      "connection" in navigator
        ? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
        : undefined;
    const slowConn =
      conn?.effectiveType === "2g" || conn?.effectiveType === "3g";
    setLow((noHover && smallViewport) || (lowDpr && slowConn));
  }, []);

  return low;
}
```

- [ ] **Step 2: Wire low-fi mode into `persistent-scene.tsx`**

In `components/3d/persistent-scene.tsx`, near the top of the `PersistentScene` component (right after the existing refs), add:

```tsx
import { useLowFidelityMode } from "../hooks/use-low-fidelity-mode";
```

(Add this import near the top of the file with the other hook imports.)

Then in the component body, near other hooks:

```tsx
  const lowFi = useLowFidelityMode();
```

Update the `TreeForest` count and `SkyAtmosphere` lowFi prop to use it:

```tsx
        <SkyAtmosphere sunRef={setSunMesh} lowFi={lowFi} />
```

```tsx
        <TreeForest count={lowFi ? 150 : 400} />
```

(These edits are within the same `canyon-environment` group block — apply both.)

- [ ] **Step 3: Wire low-fi mode into `cloud-sea.tsx`**

In `components/3d/cloud-sea.tsx`, add the import:

```tsx
import { useLowFidelityMode } from "../hooks/use-low-fidelity-mode";
```

In the `CloudSea` component, after the `useReducedMotion` call:

```tsx
  const lowFi = useLowFidelityMode();
```

Reduce the `layers` array based on low-fi:

Replace the existing layers `useMemo`:

```tsx
  const layers = useMemo(
    () => [
      { y: 1.4, opacity: 0.55, scale: 1.0, topColor: "#F4DAB4", bottomColor: "#5A6878" },
      { y: 1.8, opacity: 0.45, scale: 0.85, topColor: "#F8E0BA", bottomColor: "#6A7888" },
      { y: 2.2, opacity: 0.35, scale: 0.7, topColor: "#FFE6C2", bottomColor: "#7A8898" },
    ],
    []
  );
```

With:

```tsx
  const layers = useMemo(() => {
    const all = [
      { y: 1.4, opacity: 0.55, scale: 1.0, topColor: "#F4DAB4", bottomColor: "#5A6878" },
      { y: 1.8, opacity: 0.45, scale: 0.85, topColor: "#F8E0BA", bottomColor: "#6A7888" },
      { y: 2.2, opacity: 0.35, scale: 0.7, topColor: "#FFE6C2", bottomColor: "#7A8898" },
    ];
    return lowFi ? [all[0]] : all;
  }, [lowFi]);
```

- [ ] **Step 4: Lint + build**

```
npm run lint
npm run build
```

- [ ] **Step 5: Visual check (desktop)**

Run: `npm run dev`. At `http://localhost:3000`:
- Desktop scene is unchanged from C4 (full fidelity).

- [ ] **Step 6: Visual check (low-fi)**

Open Chrome DevTools, switch to a phone-sized viewport (e.g. iPhone 14 Pro at 393x852), and reload.

Confirm:
- Trees feel sparser (~150/side vs 400).
- Cloud sea is a single plane rather than three (less complex layering).
- Network tab shows the 2k HDRI fetched (smaller payload than 4k on desktop).
- Frame rate is smooth on the simulated device.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/ilanfridman/Maverich-Website-mountains" add components/hooks/use-low-fidelity-mode.ts components/3d/persistent-scene.tsx components/3d/cloud-sea.tsx
git -C "/Users/ilanfridman/Maverich-Website-mountains" commit -m "$(cat <<'EOF'
Phase C.5 perf: low-fidelity mode for mobile / slow connections

Detect (hover:none) + small viewport, or low DPR + slow effectiveType.
HDRI 4k→2k. Trees 400→150 per side. Cloud sea 3 layers→1 layer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C6: Phase C acceptance gate

- [ ] **Step 1: End-to-end visual review on desktop**

Run: `npm run dev`. At `http://localhost:3000`:
- Hero reads as "drone footage of a sea-of-clouds valley at sunrise."
- Frame rate holds 60.
- Intro animation plays through, jet flies in normally.
- Cloud sea drifts (or freezes if reduced-motion is on).
- Snow caps visible on highest ridge points.
- Trees dense and varied.
- Distant ridges fade toward sky color.

- [ ] **Step 2: End-to-end visual review at phone viewport**

DevTools → iPhone 14 Pro → reload `http://localhost:3000`:
- Recognizably the same scene at lower fidelity.
- Smooth playback.

- [ ] **Step 3: Build check**

Run:

```
npm run lint
npm run build
```
Expected: both pass clean.

- [ ] **Step 4: Phase C complete**

No commit — Phase C is the five commits above (C.1–C.5).

---

## End-of-plan acceptance

The mountains worktree is ready to merge into `main` (once the parallel jet session is done) when:

- [ ] Phase A, B, and C all visually pass.
- [ ] `npm run lint` is clean.
- [ ] `npm run build` succeeds.
- [ ] `git -C "/Users/ilanfridman/Maverich-Website-mountains" log main..mountains --oneline` shows ~13 phase commits + 1 spec commit.
- [ ] `git diff main...mountains --stat` shows changes to: mountain-landscape.tsx, sky-atmosphere.tsx, tree-forest.tsx, cloud-sea.tsx (new), persistent-scene.tsx (small surgical edits), use-low-fidelity-mode.ts (new), use-reduced-motion.ts (new or unchanged), public/hdri/, public/textures/, docs/superpowers/specs/, .gitignore.

The merge with `main` will likely have conflicts in `components/3d/persistent-scene.tsx` because the parallel jet session edits the same file. Resolve by:
- Keep the jet session's keyframe and animator changes (they own the jet).
- Keep our fog/light/canyon-group/Environment-removal changes (we own the world).
- The two regions don't overlap structurally, so most conflicts will be import-block ordering.
