"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * MountainBackdrop — single textured plane behind the jet.
 *
 * After Phase C of the procedural world wasn't credibly photoreal, we
 * abandoned the procedural 3D mountain stack (HDRI sky + cloud-sea
 * shader + ridge geometry + impostor trees) in favor of this: one big
 * plane, far behind the jet, textured with a real CC0 cloud-forest
 * photograph from Pexels.
 *
 * Photoreal because it IS a photograph. The jet flies in 3D in front
 * of it. The camera barely moves during the intro (~17 units in z) so
 * a fixed backdrop composes cleanly.
 *
 * Position: z=-300, deep behind the jet's flight path (z=-150 → z=4).
 * Material: unlit (MeshBasicMaterial), no fog, no depth write — we don't
 * want scene lighting tinting the photo or fog dimming it.
 *
 * Fade: this component is mounted INSIDE the canyon-environment group
 * in persistent-scene.tsx, so the existing scroll-driven canyon fade
 * also fades the backdrop out as the user scrolls past the hero.
 */

export function MountainBackdrop() {
  // useTexture's onLoad callback runs once when the texture is ready —
  // right place to configure colorSpace / filters / anisotropy without
  // tripping React 19's react-hooks/immutability rule.
  const tex = useTexture("/textures/mountain-backdrop.jpg", (loaded) => {
    const t = loaded as THREE.Texture;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    t.needsUpdate = true;
  });

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        toneMapped: false,
        fog: false,
        depthWrite: false,
      }),
    [tex]
  );

  return (
    <mesh position={[0, 4, -300]} renderOrder={-3} material={material}>
      <planeGeometry args={[600, 340]} />
    </mesh>
  );
}
