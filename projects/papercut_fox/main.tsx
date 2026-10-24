import { mountPlayer } from "@papercut/player";
import { SCENES } from "./scenes";
import { score } from "./score";

mountPlayer({
  title: "Paper-cut film",
  scenes: SCENES,
  events: score,
  sceneNames: [
    "Dusk meadow", "Night river", "Firefly forest", "Waterfalls", "Snowy summit",
    "Crystal cave", "Storm at sea", "Aurora ridge", "The star gate", "Sunrise",
  ],
});
