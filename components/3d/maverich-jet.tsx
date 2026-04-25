"use client";

import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useRef, forwardRef } from "react";
import * as THREE from "three";

/**
 * MaverichJet — procedurally composed swept-wing fighter, F/A-18 silhouette.
 *
 * Orientation: nose points along +Z so the camera at +Z looks straight at
 * the fuselage front. All meshes are children of the forwarded group, so
 * the parent scene can rotate / translate / scale the whole jet.
 *
 * Materials: dark slate body, smoked-glass canopy, near-black intakes,
 * twin emissive afterburners with a breathing pulse driven by useFrame.
 *
 * `glowIntensityRef` lets the parent scroll-driven animator override the
 * baseline emissive intensity per scroll progress (1.5 → 4.5). The pulse
 * is layered on top of whatever the parent sets each frame.
 */
type Props = {
  glowIntensityRef?: React.MutableRefObject<number>;
};

export const MaverichJet = forwardRef<THREE.Group, Props>(function MaverichJet(
  { glowIntensityRef },
  ref
) {
  const burnerLeft = useRef<THREE.MeshStandardMaterial>(null);
  const burnerRight = useRef<THREE.MeshStandardMaterial>(null);
  const burnerLightLeft = useRef<THREE.PointLight>(null);
  const burnerLightRight = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const base = glowIntensityRef?.current ?? 2.5;
    const pulse = Math.sin(t * 3) * 0.3;
    const intensity = base + pulse;
    if (burnerLeft.current) burnerLeft.current.emissiveIntensity = intensity;
    if (burnerRight.current) burnerRight.current.emissiveIntensity = intensity;
    // Point-light intensity tracks the burner glow so the cone of light
    // licking the rear of the airframe sells the heat.
    const lightIntensity = 0.4 + base * 0.35 + pulse * 0.1;
    if (burnerLightLeft.current) burnerLightLeft.current.intensity = lightIntensity;
    if (burnerLightRight.current) burnerLightRight.current.intensity = lightIntensity;
  });

  return (
    <group ref={ref}>
      {/* Fuselage — centered box, length 4 along Z (z: -2 to +2) */}
      <mesh>
        <boxGeometry args={[0.7, 0.6, 4]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Nose cone — tapers forward into +Z */}
      <mesh position={[0, 0, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 1, 16]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Cockpit canopy — top half-sphere, elongated along the fuselage */}
      <mesh position={[0, 0.3, 1.0]} scale={[1, 1, 1.6]}>
        <sphereGeometry
          args={[0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#243A55"
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.1}
        />
      </mesh>

      {/* Pilot silhouette — capsule visible inside the canopy */}
      <mesh position={[0, 0.32, 1.0]}>
        <capsuleGeometry args={[0.11, 0.18, 4, 8]} />
        <meshStandardMaterial color="#0A0A0B" />
      </mesh>

      {/* Main wings — swept ~25° back, 5° anhedral droop on tips */}
      <mesh position={[-1.65, -0.05, -0.2]} rotation={[0, -0.43, 0.09]}>
        <boxGeometry args={[2.6, 0.05, 1.4]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[1.65, -0.05, -0.2]} rotation={[0, 0.43, -0.09]}>
        <boxGeometry args={[2.6, 0.05, 1.4]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Horizontal tail stabilizers — smaller, swept slightly more */}
      <mesh position={[-0.85, -0.05, -1.7]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.6]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0.85, -0.05, -1.7]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.6]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Twin vertical stabilizers — F/A-18 twin tails, canted outward 12° */}
      <mesh position={[-0.3, 0.55, -1.4]} rotation={[0, 0, -0.21]}>
        <boxGeometry args={[0.05, 0.85, 0.7]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.55, -1.4]} rotation={[0, 0, 0.21]}>
        <boxGeometry args={[0.05, 0.85, 0.7]} />
        <meshStandardMaterial color="#1F1F22" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Engine intakes — dark interior, set under the cockpit shoulders */}
      <mesh position={[-0.5, -0.18, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16, 1, true]} />
        <meshBasicMaterial color="#0A0A0B" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.5, -0.18, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16, 1, true]} />
        <meshBasicMaterial color="#0A0A0B" side={THREE.DoubleSide} />
      </mesh>

      {/* Twin afterburners — emissive cones pointing rearward (-Z) */}
      <mesh position={[-0.3, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.5, 16]} />
        <meshStandardMaterial
          ref={burnerLeft}
          color="#1A0A05"
          emissive="#E8B547"
          emissiveIntensity={2.5}
        />
      </mesh>
      <mesh position={[0.3, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.5, 16]} />
        <meshStandardMaterial
          ref={burnerRight}
          color="#1A0A05"
          emissive="#E8B547"
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Hot-glow halos behind the burners — point lights for soft bloom */}
      <pointLight
        ref={burnerLightLeft}
        position={[-0.3, 0, -2.5]}
        color="#F5C97D"
        intensity={1.2}
        distance={6}
      />
      <pointLight
        ref={burnerLightRight}
        position={[0.3, 0, -2.5]}
        color="#F5C97D"
        intensity={1.2}
        distance={6}
      />

      {/* M call-sign — front of fuselage, between the intakes, facing +Z */}
      <Text
        position={[0, -0.05, 2.01]}
        fontSize={0.32}
        color="#F5F2EC"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#E8B547"
        letterSpacing={-0.04}
      >
        M
      </Text>
    </group>
  );
});
