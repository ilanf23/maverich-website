"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import { sampleRidge } from "./mountain-landscape";

/**
 * TreeForest — instanced conifer trees clinging to the foreground ridges.
 *
 * Rendered as a single InstancedMesh per Drei's <Instances>: one geometry,
 * one material, ~400 instances → 1 draw call. Ungrouped meshes here would
 * tank perf on the canyon scene, so instancing is a hard requirement.
 *
 * Placement strategy: re-uses sampleRidge() from mountain-landscape so each
 * tree sits ON the ridge slope, not floating above an unseen surface. The
 * "altitude fraction" along the slope is randomized per tree, plus small
 * lateral / depth jitter so they don't form a perfect line. All trees use
 * the same dark conifer color — they read as silhouettes against the
 * slightly lighter ridge surface, and against the sunrise sky for the
 * trees that crest the ridge top.
 *
 * Tree count ~400 (200 per ridge) — within the perf budget; <Instances>
 * scales further if needed.
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
};

const LEFT_SEED = 1337; // must match mountain-landscape ridge seed
const RIGHT_SEED = 9001;

function generateTreesForRidge(
  side: "left" | "right",
  ridgeSeed: number,
  count: number
): Tree[] {
  // Use a different seed for placement so trees don't always cluster at
  // the same noise minima as the ridge silhouette.
  const placement = mulberry32(ridgeSeed + 17);
  const trees: Tree[] = [];

  for (let i = 0; i < count; i++) {
    const t = placement();
    const sample = sampleRidge(side, ridgeSeed, t);

    // Altitude on the slope: avoid the bottom 10% (valley floor) and the
    // top 8% (bald peak rocks read better without trees).
    const slopeFrac = 0.1 + placement() * 0.82;
    const treeY = sample.peakY * slopeFrac;

    // X interpolates from inner-base to peakX as we climb the slope.
    const treeX = THREE.MathUtils.lerp(
      sample.xInner,
      sample.peakX,
      slopeFrac
    );

    // Lateral + depth jitter so trees don't form a perfect line.
    const xJitter = (placement() - 0.5) * 1.5;
    const zJitter = (placement() - 0.5) * 2.4;

    const baseScale = 0.85 + placement() * 0.55;
    const heightScale = 0.85 + placement() * 0.5;

    trees.push({
      position: [treeX + xJitter, treeY, sample.z + zJitter],
      scale: [baseScale, baseScale * heightScale, baseScale],
      rotationY: placement() * Math.PI * 2,
    });
  }

  return trees;
}

export function TreeForest({ count = 200 }: { count?: number }) {
  const trees = useMemo(() => {
    const left = generateTreesForRidge("left", LEFT_SEED, count);
    const right = generateTreesForRidge("right", RIGHT_SEED, count);
    return [...left, ...right];
  }, [count]);

  return (
    <Instances limit={trees.length} range={trees.length} castShadow={false}>
      {/* Six-sided cone — cheap geometry that reads as a conifer silhouette. */}
      <coneGeometry args={[0.32, 1.6, 6]} />
      <meshStandardMaterial color="#0A1208" flatShading roughness={0.95} />
      {trees.map((tree, i) => (
        <Instance
          key={i}
          position={tree.position}
          scale={tree.scale}
          rotation={[0, tree.rotationY, 0]}
        />
      ))}
    </Instances>
  );
}
