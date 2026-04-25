"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import { sampleRidge } from "./mountain-landscape";

/**
 * TreeForest — instanced conifers clinging to the foreground ridges.
 *
 * v2: two tree archetypes for silhouette variety —
 *   • Type A: tall narrow spires (thinner, taller cone)
 *   • Type B: shorter rounded conifers (slightly stouter, less tall)
 * Each archetype gets its own <Instances> group so a single InstancedMesh
 * is drawn per type — two draw calls total instead of one, but the
 * silhouette payoff is large.
 *
 * Placement re-uses sampleRidge() from mountain-landscape so each tree
 * sits ON the ridge slope, not floating above an unseen surface.
 *
 * Sunset rim-light is supplied by the supplemental directional + HDRI
 * environment in HeroScene — no per-tree lighting tricks here.
 */

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tree = {
  position: [number, number, number];
  scale: [number, number, number];
  rotationY: number;
  type: "spire" | "round";
};

const LEFT_SEED = 1337;
const RIGHT_SEED = 9001;

function generateTreesForRidge(
  side: "left" | "right",
  ridgeSeed: number,
  count: number
): Tree[] {
  const placement = mulberry32(ridgeSeed + 17);
  const trees: Tree[] = [];

  for (let i = 0; i < count; i++) {
    const t = placement();
    const sample = sampleRidge(side, ridgeSeed, t);

    const slopeFrac = 0.1 + placement() * 0.82;
    const treeY = sample.peakY * slopeFrac;

    const treeX = THREE.MathUtils.lerp(
      sample.xInner,
      sample.peakX,
      slopeFrac
    );

    const xJitter = (placement() - 0.5) * 1.5;
    const zJitter = (placement() - 0.5) * 2.4;

    const baseScale = 0.85 + placement() * 0.55;
    const heightScale = 0.85 + placement() * 0.5;

    // ~65% spires, ~35% round — spires give the dominant pointed
    // silhouette, round trees break up the uniformity.
    const type: Tree["type"] = placement() < 0.65 ? "spire" : "round";

    trees.push({
      position: [treeX + xJitter, treeY, sample.z + zJitter],
      scale: [baseScale, baseScale * heightScale, baseScale],
      rotationY: placement() * Math.PI * 2,
      type,
    });
  }

  return trees;
}

export function TreeForest({ count = 200 }: { count?: number }) {
  const { spires, rounds } = useMemo(() => {
    const left = generateTreesForRidge("left", LEFT_SEED, count);
    const right = generateTreesForRidge("right", RIGHT_SEED, count);
    const all = [...left, ...right];
    return {
      spires: all.filter((t) => t.type === "spire"),
      rounds: all.filter((t) => t.type === "round"),
    };
  }, [count]);

  return (
    <group name="tree-forest">
      {/* Spires — tall narrow conifer silhouette. */}
      {spires.length > 0 && (
        <Instances limit={spires.length} range={spires.length} castShadow={false}>
          <coneGeometry args={[0.28, 1.9, 6]} />
          <meshStandardMaterial
            color="#0A1208"
            roughness={0.95}
            metalness={0.0}
            flatShading
          />
          {spires.map((tree, i) => (
            <Instance
              key={`s${i}`}
              position={tree.position}
              scale={tree.scale}
              rotation={[0, tree.rotationY, 0]}
            />
          ))}
        </Instances>
      )}

      {/* Rounds — shorter, stouter, slightly warmer-tinted dark green so
          backlight catches the round volume distinctly from the spires. */}
      {rounds.length > 0 && (
        <Instances limit={rounds.length} range={rounds.length} castShadow={false}>
          <coneGeometry args={[0.42, 1.2, 8]} />
          <meshStandardMaterial
            color="#0E140A"
            roughness={0.93}
            metalness={0.0}
            flatShading
          />
          {rounds.map((tree, i) => (
            <Instance
              key={`r${i}`}
              position={tree.position}
              scale={tree.scale}
              rotation={[0, tree.rotationY, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
