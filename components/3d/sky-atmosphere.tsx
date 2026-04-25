"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Stars } from "@react-three/drei";

/**
 * SkyAtmosphere — sunrise sky dome, starfield, and volumetric valley haze.
 *
 * The sky is a large inverted sphere rendered with a hand-rolled vertical
 * gradient shader (top → upper-mid → mid → lower-mid → horizon). Stars
 * fade out as they approach the warm horizon haze, so the void only reads
 * in the upper half of the sky. Three semi-transparent amber sheets sit
 * low in the valley to suggest fog clinging to the ground — they fade
 * with the scene fog so distant haze and near haze blend continuously.
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
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;
    vec3 color;
    if (h > 0.55) {
      color = mix(upperMidColor, topColor, smoothstep(0.55, 1.0, h));
    } else if (h > 0.22) {
      color = mix(midColor, upperMidColor, smoothstep(0.22, 0.55, h));
    } else if (h > 0.05) {
      color = mix(lowerMidColor, midColor, smoothstep(0.05, 0.22, h));
    } else if (h > -0.05) {
      color = mix(horizonColor, lowerMidColor, smoothstep(-0.05, 0.05, h));
    } else {
      color = horizonColor;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function SkyAtmosphere() {
  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color("#0A0A0B") },
          upperMidColor: { value: new THREE.Color("#1F1410") },
          midColor: { value: new THREE.Color("#3D2818") },
          lowerMidColor: { value: new THREE.Color("#8A5C2E") },
          horizonColor: { value: new THREE.Color("#B07A38") },
        },
      }),
    []
  );

  return (
    <group>
      {/* Sky dome — inverted sphere at scene scale, painted by gradient shader. */}
      <mesh material={skyMaterial} renderOrder={-1}>
        <sphereGeometry args={[400, 32, 24]} />
      </mesh>

      {/* Starfield — only reads against the dark upper sky; warm haze drowns
          out the lower stars. fade={true} softens halo edges. */}
      <Stars
        radius={300}
        depth={50}
        count={800}
        factor={4}
        saturation={0}
        fade
        speed={0.2}
      />

      {/* Volumetric valley haze — three amber sheets at progressive depth.
          Camera-facing planes; depthWrite off so they layer cleanly with fog
          and don't punch holes in the silhouette. */}
      <mesh position={[0, 1.8, -55]}>
        <planeGeometry args={[140, 6]} />
        <meshBasicMaterial
          color="#8A5C2E"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.4, -120]}>
        <planeGeometry args={[200, 5]} />
        <meshBasicMaterial
          color="#B07A38"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.0, -180]}>
        <planeGeometry args={[260, 6]} />
        <meshBasicMaterial
          color="#B07A38"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
