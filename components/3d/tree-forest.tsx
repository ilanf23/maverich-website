"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import { sampleRidge } from "./mountain-landscape";

/**
 * TreeForest — conifers on the foreground ridges.
 *
 * Two systems:
 *   • Hero geometry trees (~30 per side, closest to camera) — low-poly
 *     procedural conifer cones. Read as 3D in parallax.
 *   • Impostor billboard trees (~370 per side) — alpha-cutout planes
 *     using a procedurally-generated CanvasTexture of a stylized
 *     backlit conifer silhouette.
 *
 * Density bumped from 200/side → 400/side total. The impostor billboards
 * are axis-aligned (not true camera-facing sprites). For our near-static
 * intro and shallow scroll-driven motion, axis-aligned reads fine and
 * costs less per frame.
 *
 * Placement re-uses sampleRidge() — public contract preserved so trees
 * sit on the ridge surface even after C.3 silhouette/material changes.
 */

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

  ctx.clearRect(0, 0, size, size);

  // Trunk
  ctx.fillStyle = "#1A1410";
  ctx.fillRect(size * 0.46, size * 0.78, size * 0.08, size * 0.22);

  // Stack of triangle layers — bottom widest, top narrowest.
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const cy = size * (0.78 - t * 0.7);
    const halfW = size * (0.42 - t * 0.32);
    const h = size * 0.16;
    const grad = ctx.createLinearGradient(
      size * 0.5 - halfW,
      cy,
      size * 0.5 + halfW,
      cy
    );
    grad.addColorStop(0, "#0E1A12");
    grad.addColorStop(0.7, "#0B140E");
    grad.addColorStop(1, "#3C2A14");
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

      {/* Impostor billboards — alpha-cutout planes. */}
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
