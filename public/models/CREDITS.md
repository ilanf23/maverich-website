# Model attribution

`maverich-jet.glb` — F/A-18 Hornet, sourced from CGTrader and licensed
under CGTrader's [Royalty-Free Standard License][1] (commercial use
permitted). The OBJ + texture set was repackaged into a single
Draco-compressed GLB with full PBR materials (BaseColor, Normal,
MetallicRoughness, AmbientOcclusion combined into ORM where appropriate).

Two materials in the GLB:

- `F18` — airframe, full PBR
- `F18_Glass` — cockpit canopy, alpha BLEND

Runtime material adjustments (envMapIntensity, smoked canopy color,
faint amber emissive on glass) are applied in
`components/3d/maverich-jet.tsx` against a clone of the loaded scene.

[1]: https://www.cgtrader.com/pages/terms-and-conditions#general-terms-of-use-of-3d-content
