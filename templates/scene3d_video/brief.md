# Brief

Fill this in before changing the scenes (docs/scene3d_design.md section 9; docs/scene3d_video_style_guide.md).

1. **Premise:** one sentence.
2. **Must be true:** one visible acceptance test, for example "a still frame reads as a photograph of soap bubbles".
3. **Sources:** techniques used (thin-film colour, Fresnel, buoyant bodies, spring wobble, closed-form droplets,
   order-independent transparency, deterministic picking); external assets and their licences: none.
4. **Primary action (live page):** hold Blow; hint "Hold Blow · tap a bubble to pop · drag to look".
5. **Look:** `studio` | `garden` | `dusk`; key light direction; shots per scene.
6. **Shots:** scene, shot preset or from/to pose, length.
7. **Budgets:** frame time at 1080p, live bodies (cap), droplets (cap), HTML size.
8. **Determinism tier** (from `qc/determinism.json`): 1 or 2, with the measured max and mean difference.
