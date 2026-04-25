# Photoreal Mountain Vista — Design Spec

**Branch:** `mountains` (worktree at `/Users/ilanfridman/Maverich-Website-mountains`)
**Date:** 2026-04-25
**Owner:** Ilan + Claude (mountains worktree session)
**Coordination:** parallel session is rebuilding the jet on `main` — do not edit `components/3d/maverich-jet.tsx` and minimize edits to `components/3d/persistent-scene.tsx`.

## Goal

Replace the current stylized warm-sunset canyon with a photoreal "drone over a sea-of-clouds valley" hero vista. The result should read as cinematic drone footage at sunrise: forested ridges flank the camera, a cloud sea fills the valley between them, and the jet flies down the valley above the cloud line. The vista must hold composition for the ~11s cinematic intro and fade out cleanly when the user scrolls past the hero (existing behavior).

## Non-goals

- Photoreal jet — owned by the parallel session.
- Changing the camera path or the jet's keyframed flight choreography. Both live in `persistent-scene.tsx` and are locked.
- Sections 2+ — they continue to use HTML backgrounds; only the hero shows the world.
- Live time-of-day variation, audio, or weather changes.
- "Indistinguishable from real life." Real-time WebGL cannot reach that bar; the achievable ceiling is "high-end real-time cinematic that reads as photoreal at a glance."

## Context (existing scene)

The hero is rendered by a persistent `<Canvas>` mounted at the layout level. The relevant pieces today:

- `components/3d/persistent-scene.tsx` — owns the canvas, animator, post-fx, and a `canyon-environment` group. Holds the intro and per-section keyframes for camera and jet. **Locked file** — minimize edits.
- `components/3d/mountain-landscape.tsx` — exports `RIDGE_PARAMS` and `sampleRidge` (used by tree-forest). Generates two flanking ridges + three layers of cone peaks. Stylized warm-sunset palette.
- `components/3d/sky-atmosphere.tsx` — procedural sky shader and a sun mesh exposed via a `sunRef` callback (consumed by GodRays).
- `components/3d/tree-forest.tsx` — places ~200 trees on the ridges using `sampleRidge`.

The camera barely moves during the intro (Δz ≈ 17, Δy ≈ 1.5). The dramatic motion is the jet approaching the camera. So we are building a **vista**, not a flythrough corridor.

## Approach

Composition C from the brainstorm: tall forested ridges frame the left and right of the shot like a valley, the cloud sea fills the valley between them, and the jet flies down the valley above the cloud line. Reusing the current ridge geometry's xy positioning is intentional — the existing `sampleRidge` keeps trees placeable without changes to `tree-forest.tsx`'s contract.

Three phases, each independently shippable, each ending with a green dev-server visual check.

### Phase A — Terrain reshape + cool palette swap

The fastest visible win. No new files, no new dependencies.

**Changes:**

- `mountain-landscape.tsx`
  - Re-tune ridge noise for taller, sharper PNW silhouettes: bump base height 8→14, octave amplitudes scaled accordingly. Keep `RIDGE_PARAMS` and `sampleRidge` exports stable so tree-forest is unaffected.
  - Material palette swap: ridges go from warm-dark (`#0A0710`) to cool-dark forested (`#0E1A18` / `#1A2A28` / `#2A3F3A` for foreground/mid/far).
  - Horizon layer (4) moves from warm `#5C2820` to cool atmospheric `#3A5060` so it merges with the new sky.
- `persistent-scene.tsx` (small surgical edits, careful of merge surface)
  - Fog color: `#8B3B1F` (warm sunset) → `#7A8C9C` (cool morning haze).
  - Ambient light: `#5C2820` (warm) → `#34404C` (cool).
  - Directional light color: `#FF7B3C` (warm sunset) → `#F4D2A6` (golden hour cream); position kept where it is for now.

**Acceptance:**

- Hero loads with cool blue-green ridges silhouetted against a softer sky.
- Trees still appear correctly on ridges (tree-forest contract held).
- Other session's edits to `persistent-scene.tsx` merge cleanly (verified by inspecting only the line ranges we touched).

### Phase B — Cloud sea + atmospheric scattering + HDRI sky

**New file: `components/3d/cloud-sea.tsx`**

- A horizontal layer at y ≈ 1.5–2.0 (between ridge bases at y=0 and the jet's flight altitude at y≈4).
- Implementation: 2-3 stacked planes with a custom `ShaderMaterial`. Each plane samples a noise texture (procedural Worley + simplex blend) with slow uv drift. Soft alpha falloff so the layers blend into a thick cloud-sea volume without true volumetric raymarching cost.
- Top is rim-lit by sun direction; underside is shaded cool-blue. Edges where ridges pierce through fade alpha based on local depth (smoothstep against ridge mesh depth via the depth buffer).
- Drift speed = 0 when `prefers-reduced-motion: reduce`.

**Evolved: `sky-atmosphere.tsx`**

- Replace the procedural sky shader with an `<Environment files="..." background />` from drei, using a sea-of-clouds sunrise HDRI from PolyHaven (CC0). Candidates: `kloppenheim_06_puresky`, `qwantani_puresky`, `belfast_sunset` — A/B in implementation.
- Keep the `sunRef` mechanism so GodRays still has a valid emitter mesh. Place sun mesh at the HDRI's sun direction so godrays line up with the visible sun in the HDRI.
- Add an atmospheric scattering pass: per-pixel ridge color attenuation by camera distance. Implement as a custom material override on far/horizon ridge layers (or as a fog-tint shader). Distant ridges should desaturate and lift toward the sky color, like real aerial perspective.
- Sun direction A/B: render the four candidates from Q3 (right, left, behind camera, deep-in-frame backlit) in the dev server, screenshot each, pick the strongest read for the cinematic.

**Evolved: `persistent-scene.tsx` (small)**

- Mount `<CloudSea />` inside the existing `canyon-environment` group so it inherits the existing scroll-driven fade.
- Remove or repurpose Environment's `preset="sunset"` — switching to HDRI from sky-atmosphere.

**Acceptance:**

- Cloud sea visibly fills the valley between ridges, jet flies above the cloud line during the intro.
- Distant ridges fade toward sky color (aerial perspective reads).
- Sun position chosen and locked.
- Cloud drift respects `prefers-reduced-motion`.

### Phase C — Photoreal materials + trees + LOD

**Evolved: `mountain-landscape.tsx`**

- Replace solid-color ridge materials with PBR materials (albedo + normal + roughness + AO) sourced from PolyHaven CC0 rocky-cliff or alpine-rock texture sets.
- Add sparse snow caps on the highest ridge points: shader-driven (slope + altitude + facing-up threshold → blend in white albedo + low-roughness snow material). No separate geometry.
- Bake one normal map per layer at appropriate tiling for each LOD distance.

**Evolved: `tree-forest.tsx`**

- Replace cone trees with two systems:
  - **Hero geometry trees** (~30) along the camera-facing ridge edges. Real low-poly conifer GLBs or a high-quality procedural conifer.
  - **Impostor trees** (~770) elsewhere — billboard cards using a real conifer silhouette texture (PolyHaven or rendered from a hero model). Aligned to camera each frame, individually offset for variety.
- Density bump 200 → ~800 total, with explicit LOD bands.

**Performance / device target (Q1=A, desktop-first):**

- Desktop: full PBR, full HDRI (4k), full impostor density, volumetric-ish cloud planes.
- Mobile graceful degradation:
  - HDRI 4k → 2k.
  - Tree count 800 → 200, no impostor billboards (procedural cones acceptable).
  - Cloud sea: single plane instead of 3 stacked.
  - Detection: use the existing `(hover: hover)` media-query check + `window.devicePixelRatio < 2 && window.innerWidth < 900` heuristic.
- Bundle target: ~30 MB total assets; first canvas paint < 2s on broadband desktop.

**Acceptance:**

- Hero reads as "drone footage at sunrise" at first glance.
- 60fps on a recent MacBook Pro / desktop on broadband.
- Mobile delivers a recognizably similar but lower-fidelity scene without dropping frames.

## Module breakdown and contracts

| Module | Role | Public surface (held stable) |
| --- | --- | --- |
| `mountain-landscape.tsx` | Terrain meshes + materials | `RIDGE_PARAMS`, `sampleRidge(side, seed, t)`, `<MountainLandscape />` |
| `cloud-sea.tsx` *(new)* | Cloud layer between ridges and camera | `<CloudSea />` (no props for now) |
| `sky-atmosphere.tsx` | HDRI sky + sun mesh + scattering | `<SkyAtmosphere sunRef={...} />` |
| `tree-forest.tsx` | Trees on ridges via `sampleRidge` | `<TreeForest count={n} />` |
| `persistent-scene.tsx` | Owns the canvas, locks camera/jet, hosts canyon group | `canyonGroupRef`, `canyonOpacityRef` semantics unchanged |

## Asset sources

Q2=C: pick whatever looks best, track sources for later licensing audit.

- HDRIs: PolyHaven (CC0), 4k for desktop / 2k for mobile.
- Rock textures: PolyHaven (CC0).
- Tree models / silhouettes: PolyHaven first (CC0); Sketchfab CC-BY as fallback if needed.
- Track every asset's source + license in `docs/superpowers/specs/asset-sources.md` as it gets pulled in.

## Error handling and fallbacks

- HDRI fetch fails → fall back to a procedural gradient sky (today's behavior).
- Cloud-sea shader compilation fails on old GPUs → fall back to a single textured plane.
- Tree GLB load fails → fall back to procedural cones.
- All asset fetches lazy after canvas first paint so a slow asset never blocks the cinematic.

## Reduced motion

The existing scene already respects `prefers-reduced-motion` for the intro orchestrator. Additional surfaces that need the same handling:

- Cloud sea drift speed → 0.
- Tree wind sway (if added) → 0.
- HDRI environment rotation (if any) → 0.

## Risks

| Risk | Mitigation |
| --- | --- |
| Merge conflicts in `persistent-scene.tsx` with parallel jet session | Touch only the lighting/fog/preset lines and the canyon-group children. Leave keyframes, animator, and post-fx wiring alone. Land Phase A as a small commit early so most of our edits are localized in the new/evolved files. |
| Volumetric cloud cost overruns frame budget | Fall back from 3 stacked planes to 2 or 1; cloud is the single most likely perf hotspot. |
| 4k HDRI bloats first paint | Lazy-fetch HDRI after canvas mount; 2k on mobile. |
| Photoreal foreground vs stylized current jet looks discordant | The parallel session is moving the jet toward photoreal too — we are not the only force pushing fidelity up. If timing splits and we ship phase B before the jet refresh, that's fine: the result is a brief Pixar-style contrast that still reads as intentional. |
| "Doesn't look photoreal" judgment after each phase | Each phase ends with a manual visual review in browser; we tune before merging. The spec assumes one tuning pass per phase. |

## Definition of done (per phase)

- Phase A: cool-palette ridges visible in the dev server, no regressions in trees or the jet's intro animation.
- Phase B: cloud sea visible, sun direction locked, aerial perspective reads, manual A/B'd in browser.
- Phase C: PBR materials in place, trees swapped, LOD verified on desktop and a phone-sized viewport, frame rate holds 60 on desktop.

## What this spec does not decide

- Sun direction (deferred to Phase B browser A/B).
- Specific HDRI file (deferred to Phase B; will pick from PolyHaven candidates).
- Exact tree model / silhouette source (deferred to Phase C).

These are art-direction choices best made in front of the rendered scene, not on paper.
