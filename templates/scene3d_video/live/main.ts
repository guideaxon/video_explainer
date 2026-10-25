// Live page entry: built into projects/<p>/scene.html by scripts/three_core_build_html.mjs <p>.
import { startBubbleToy } from "@remotion-components/scene3d/live";
import { TOY, WAND } from "../scenes/sim.spec";

startBubbleToy(document.getElementById("root")!, { spec: TOY, wand: WAND, look: "studio", title: "Bubble toy" });
