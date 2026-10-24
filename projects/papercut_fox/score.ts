/**
 * Score for the film: one chord progression per scene (two bars of 3 s each = one 6 s scene).
 * Chords are [root MIDI note, intervals]. `pluck` / `bell` are per-scene note densities (0..1).
 * Change a progression and the music changes; the events stay seeded, so playback is always in sync.
 */
import { buildScore, MAJ, MIN, DOM } from "@papercut/music";

export const score = buildScore({
  prog: [
    [[48, MAJ], [55, MAJ]], // 1 dusk meadow: C, G (hopeful)
    [[45, MIN], [53, MAJ]], // 2 night river: Am, F
    [[50, MIN], [45, MIN]], // 3 firefly forest: Dm, Am (sparse, glowing)
    [[53, MAJ], [48, MAJ]], // 4 waterfalls: F, C
    [[45, MIN], [43, MAJ]], // 5 snowy summit: Am, G
    [[50, MIN], [46, MAJ]], // 6 crystal cave: Dm, Bb (mysterious)
    [[45, MIN], [52, DOM]], // 7 storm: Am, E7 (tense)
    [[53, MAJ], [55, MAJ]], // 8 aurora: F, G (wonder)
    [[53, MAJ], [48, MAJ]], // 9 star gate: F, C (grand)
    [[55, MAJ], [48, MAJ]], // 10 sunrise: G, C (resolve)
  ],
  pluck: [0.8, 0.7, 0.45, 0.8, 0.7, 0.55, 0.9, 0.85, 0.9, 0.9],
  bell: [0.3, 0.45, 0.6, 0.35, 0.4, 0.7, 0.2, 0.5, 0.5, 0.35],
  drums: [6], // timpani under the storm
  extras: [
    { t: 36, k: "rain", d: 6.5, v: 0.5 },
    { t: 38.4, k: "thunder", d: 3.5, v: 1 }, // matches the lightning flash in scene 7
  ],
  finale: [54, [72, 76, 79, 84]], // rising C major chimes over the last bars
});
