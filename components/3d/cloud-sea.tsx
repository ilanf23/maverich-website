"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/components/hooks/use-prefers-reduced-motion";
import { useLowFidelityMode } from "@/components/hooks/use-low-fidelity-mode";

/**
 * CloudSea — three stacked horizontal planes between ridge bases (y=0)
 * and camera level (y≈5). A custom shader samples blended fbm noise to
 * produce a thick "sea of clouds" without true volumetric raymarching.
 *
 * Each plane lives at a slightly different altitude. UV drift is offset
 * per plane so layers parallax against each other as the camera moves,
 * suggesting depth without volume cost. Top of each plane is sun-rim-lit;
 * the underside is cool-blue shaded.
 *
 * Reduced motion: drift speed multiplied by 0 when prefers-reduced-motion.
 *
 * Performance: three planes total. Phase C reduces this to one plane
 * for the mobile-degradation pass.
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
  const reducedMotion = usePrefersReducedMotion();
  const lowFi = useLowFidelityMode();

  const layers = useMemo(() => {
    const all = [
      { y: 1.4, opacity: 0.55, scale: 1.0, topColor: "#F4DAB4", bottomColor: "#5A6878" },
      { y: 1.8, opacity: 0.45, scale: 0.85, topColor: "#F8E0BA", bottomColor: "#6A7888" },
      { y: 2.2, opacity: 0.35, scale: 0.7, topColor: "#FFE6C2", bottomColor: "#7A8898" },
    ];
    return lowFi ? [all[0]] : all;
  }, [lowFi]);

  const materials = useMemo(
    () =>
      layers.map(
        (layer) =>
          new THREE.ShaderMaterial({
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
          })
      ),
    [layers, reducedMotion, sunDir]
  );

  useFrame((_, delta) => {
    if (reducedMotion) return;
    for (const mat of materials) {
      // r3f standard pattern: animate by mutating uniforms. React 19's
      // react-hooks/immutability rule doesn't account for this — refs
      // would normally be the escape hatch, but ref values can't be
      // read during JSX render. Disable inline.
      // eslint-disable-next-line react-hooks/immutability
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
