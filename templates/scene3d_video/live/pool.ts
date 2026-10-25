// Live page with the pool: node scripts/three_core_build_html.mjs <p> --entry live/pool.ts --out pool.html --title "Bubble pool"
import { startBubbleToy } from "@remotion-components/scene3d/live";
import { TOY, WAND, WATER } from "../scenes/sim.spec";

startBubbleToy(document.getElementById("root")!, {
  spec: { ...TOY, bounds: { min: [-2.6, WATER.level, -1.8], max: [2.6, 3.4, 1.8] } }, // bubbles pop when they touch the water
  wand: WAND,
  water: WATER,
  look: "studio",
  title: "Bubble pool",
  view: { target: [0, 0.4, 0], yaw: 0, pitch: 0.55, dist: 3.4 },
});
