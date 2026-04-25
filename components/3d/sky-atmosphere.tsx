"use client";

import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { Stars } from "@react-three/drei";

/**
 * SkyAtmosphere — golden-hour sunset dome + setting sun + warmer valley haze.
 *
 * Six-stop vertical gradient (top → horizon line):
 *   1.00  topColor       deep twilight purple-blue
 *   0.55  upperMidColor  purple-magenta
 *   0.25  midColor       deep orange-brown
 *   0.10  lowerMidColor  vivid orange
 *   0.02  horizonColor   golden glow
 *   0.00  sunlineColor   almost-white reflection at the very horizon
 *
 * The sun mesh is rendered here and exposed via the forwarded ref so the
 * EffectComposer in HeroScene can attach a GodRays post-effect to it. The
 * sun sits BEHIND the horizon mountain range (z=-290) at a low y so it
 * silhouettes through the gap between foreground ridges — that's the
 * setup that makes the volumetric rays read.
 */

const skyVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 upperMidColor;
  uniform vec3 midColor;
  uniform vec3 lowerMidColor;
  uniform vec3 horizonColor;
  uniform vec3 sunlineColor;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;
    vec3 color;
    if (h > 0.55) {
      color = mix(upperMidColor, topColor, smoothstep(0.55, 1.0, h));
    } else if (h > 0.25) {
      color = mix(midColor, upperMidColor, smoothstep(0.25, 0.55, h));
    } else if (h > 0.10) {
      color = mix(lowerMidColor, midColor, smoothstep(0.10, 0.25, h));
    } else if (h > 0.02) {
      color = mix(horizonColor, lowerMidColor, smoothstep(0.02, 0.10, h));
    } else if (h > -0.02) {
      // Tight band right at the horizon line — sun reflection / heat shimmer
      color = mix(sunlineColor, horizonColor, smoothstep(-0.02, 0.02, h) * 0.5 + 0.5);
    } else {
      // Below horizon line — dip back toward warm haze, never to black.
      color = mix(midColor, sunlineColor, smoothstep(-0.4, -0.02, h));
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

type SkyAtmosphereProps = {
  /** Optional ref to the sun mesh — used by GodRays effect in HeroScene. */
  sunRef?: React.Ref<THREE.Mesh>;
};

export const SkyAtmosphere = forwardRef<THREE.Group, SkyAtmosphereProps>(
  function SkyAtmosphere({ sunRef }, groupRef) {
    const skyMaterial = useMemo(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: skyVertexShader,
          fragmentShader: skyFragmentShader,
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          uniforms: {
            topColor: { value: new THREE.Color("#1A0F2E") },
            upperMidColor: { value: new THREE.Color("#3F1E3B") },
            midColor: { value: new THREE.Color("#8B3B1F") },
            lowerMidColor: { value: new THREE.Color("#D4633A") },
            horizonColor: { value: new THREE.Color("#FFA855") },
            sunlineColor: { value: new THREE.Color("#FFE4B5") },
          },
        }),
      []
    );

    return (
      <group ref={groupRef}>
        {/* Sky dome — inverted sphere painted by sunset gradient shader. */}
        <mesh material={skyMaterial} renderOrder={-1}>
          <sphereGeometry args={[400, 32, 24]} />
        </mesh>

        {/* The setting sun. Sits between the far peaks and horizon range
            (z=-290), low in the sky (y=12) so foreground ridges silhouette
            it. toneMapped=false keeps the disc punching past the ACES
            curve so bloom + GodRays have a hot pixel cluster to work
            with. */}
        <mesh ref={sunRef} position={[0, 12, -290]} renderOrder={-1}>
          <sphereGeometry args={[12, 32, 32]} />
          <meshBasicMaterial
            color="#FFE4B5"
            toneMapped={false}
            fog={false}
          />
        </mesh>

        {/* Outer sun bloom halo — softer, larger, slightly warmer. Not used
            as the GodRays emitter (the inner core is) but adds the warm
            "glow around the disc" before the post-pass kicks in. */}
        <mesh position={[0, 12, -291]} renderOrder={-1}>
          <sphereGeometry args={[18, 32, 32]} />
          <meshBasicMaterial
            color="#FFA855"
            transparent
            opacity={0.45}
            toneMapped={false}
            fog={false}
            depthWrite={false}
          />
        </mesh>

        {/* Stars — count cut and pushed up; warm sunset haze drowns the
            lower band. */}
        <Stars
          radius={300}
          depth={50}
          count={350}
          factor={3}
          saturation={0}
          fade
          speed={0.1}
        />

        {/* Volumetric valley haze — three sheets, warmer + more saturated
            than v1 sunrise. Closer sheets = thinner, farther = thicker so
            distance reads as warm haze blanket, not flat fog. */}
        <mesh position={[0, 1.6, -55]}>
          <planeGeometry args={[140, 5]} />
          <meshBasicMaterial
            color="#D4633A"
            transparent
            opacity={0.16}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        <mesh position={[0, 1.2, -120]}>
          <planeGeometry args={[220, 5]} />
          <meshBasicMaterial
            color="#FFA855"
            transparent
            opacity={0.24}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        <mesh position={[0, 0.8, -180]}>
          <planeGeometry args={[300, 6]} />
          <meshBasicMaterial
            color="#FFA855"
            transparent
            opacity={0.32}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>
    );
  }
);
