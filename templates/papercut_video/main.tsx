import { mountPlayer } from "@papercut/player";
import { SCENES } from "./scenes";
import { score } from "./score";

mountPlayer({ title: "Paper-cut film", scenes: SCENES, events: score });
