---
name: papercut_make_video
description: Produce a landscape (1280x720) paper-cut film for the Papercut style bundle, drawn entirely in code with a generated music score and delivered as one self-contained HTML file. Use when asked to make or restyle a Papercut style bundle film, or an HTML film with music and no assets.
---

# Papercut: make a film

Read `docs/papercut_video_style_guide.md` first (look, kit, music, and the worked `papercut_fox` example).

1. Scaffold: `python scripts/papercut_new_video.py <p>` (copies `templates/papercut_video/`; the template is the fox film).
2. Plan the shots: one 6 s scene per beat of the story, with a recurring character and motif. Offer look, mood and music
   options to the user; they decide.
3. Edit `projects/<p>/scenes.tsx`: compose each scene from the kit back to front (`@papercut/paper`, `@papercut/world`,
   `@papercut/fox`). Animate only from `t` / `p`. Import only the papercut kit.
   Optional: `Callouts` to name what a scene shows, `IsoBox` / `IsoGate` for block dioramas, and a `useUi().xray` fade for a
   Look inside view. Stars, the fox and flowers are already clickable.
4. Edit `projects/<p>/score.ts`: a progression per scene (`buildScore`), densities, extras (rain, thunder, drums), finale.
5. Build: `python scripts/papercut_build_html.py <p>` writes `projects/<p>/film.html`.
   Give `mountPlayer` a `sceneNames` list (announced to screen readers).
6. Check: screenshot frames (`film.html#f=<frame>`, mid-beat and end-of-beat for each scene), fix what looks wrong, and
   confirm the music (starts after a click, the Sound button toggles, it fades out at the end).

This bundle has no narration, voiceover or MP4 render: the HTML file is the deliverable. It does not use `video_make_core`.
