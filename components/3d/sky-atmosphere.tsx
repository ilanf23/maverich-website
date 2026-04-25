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
 * the HDRI's bright spot.
 *
 * If the HDRI fails to load, drei's <Environment> falls back to no IBL
 * and the procedural fallback dome below paints a plausible cool-sunrise
 * gradient so the canvas is never empty.
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
};

export const SkyAtmosphere = forwardRef<THREE.Group, SkyAtmosphereProps>(
  function SkyAtmosphere({ sunRef }, groupRef) {
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
        {/* HDRI — both visible sky and global IBL. */}
        <Suspense fallback={null}>
          <Environment
            files="/hdri/sea-of-clouds-sunrise.exr"
            background
            environmentIntensity={0.9}
          />
        </Suspense>

        {/* Fallback procedural sky — only seen if HDRI missing/loading. */}
        <mesh material={fallbackMaterial} renderOrder={-2}>
          <sphereGeometry args={[450, 32, 24]} />
        </mesh>

        {/* Sun emitter — GodRays target. */}
        <mesh ref={sunRef} position={[0, 14, -290]} renderOrder={-1}>
          <sphereGeometry args={[10, 32, 32]} />
          <meshBasicMaterial color="#FFE9C8" toneMapped={false} fog={false} />
        </mesh>

        {/* Soft bloom halo around the sun emitter. */}
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
