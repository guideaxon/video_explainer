# Storybook canon experiment (2026-10-24)

Question: do the identity rules from https://claudia.gallery/wiki/ (a "canon" identity text, camera-first prompt order,
explicit age, never-list, a candidate pool per shot) improve character consistency with our local SD1.5 stills?

## Method

- Four cast shots (script, voice, review, render), 4 candidates each, same seeds in both arms, 32 images.
- **A (baseline):** style line + shot prompt (key object weighted 1.3 to 1.4) + one cast line.
- **B (canon):** framing, long identity text ("one nine year old girl, short brown bob with straight bangs, round
  tortoiseshell glasses, red wool scarf, brown flat cap, teal denim overalls over a cream sweater"; short form for wide
  shots), wardrobe, action, style line, "no text, no letters, no logos", plus a never-list in the negative prompt.
- Shuffled, numbered contact sheets with arms hidden; scored by one reviewer (Claude) before the key was opened.
  Pass = exactly one girl with glasses and cap or scarf. Files: `projects/storybook_demo/art/exp/` (gitignored).

## Result

| Shot | A pass | B pass |
|---|---|---|
| script | 0/4 | 4/4 |
| voice | 1/4 | 4/4 |
| review | 1/4 | 2/4 |
| render (wide) | 0/4 | 0/4 |
| **Total** | **2/16** | **10/16** |

Best-of-4 gave an on-model still for 2 of 4 shots in A and 3 of 4 in B. Strictly on-model plus the key object: A 1/16, B 2/16.

## Reading

- Identity improves a lot, but part of the gap is that A weighted objects so heavily it often dropped the girl entirely.
- B trades object fidelity for identity: no typewriter, stamp or conveyor appeared next to the girl in B.
- Wide shots fail in both arms (SD1.5 cannot hold a small figure's identity).
- B is more consistent (brown bob, round glasses) but cap colour, outfit and face still vary between shots.
- One reviewer, 16 images per arm, several prompt changes at once: a strong hint, not a proof.

## Decision

Keep the canon structure (`canon` block in art plan, supported by `scripts/storybook_stills_comfy.py`) and the candidate pool
(`--variants N`). Not enough on its own for delivery-quality continuity.
