# Video Pre-render Review Checklist (all full-video channels)

Run before `voiceover`, after scenes and narration are edited. Two parts: a script for hard checks and a
reviewer pass (Claude) for claims and tone. Channel-specific copy and data rules live in each
`docs/<channel>_video_style_guide.md` (section "Copy and data rules"); this file is only the common part.

```powershell
$env:PYTHONUTF8 = "1"
.venv\Scripts\python.exe scripts\review_video.py <project> --brief
```

## 1. Hard checks (script, blocks on ERROR)

- Channel set in `config.json` and resolution is 1080x1920.
- Every scene title has a registry key (title slug) in `scenes/index.ts`; components end in `Scene`.
- No placeholder text left (SAMPLE, lorem ipsum, TODO, sample domains) in scenes or narration.
- Channel-required phrases present (Markets: "not financial advice").
- Warnings: spoken words per scene outside the channel range; registry keys with no scene.

## 2. Reviewer pass (Claude, advisory)

Use the `--brief` bundle. This pass judges plausibility and tone only; it cannot verify data. Real data
and its source stay the maker's job (skill step "Gather real data").

For each problem report: **scene, original text, suggested replacement, reason**. Check:

1. **Unsupported claims**: any number, ticker, percentage, customer, feature or result that is not in the
   gathered source data. Flag it; do not "fix" it by guessing another number.
2. **Fabricated proof**: invented testimonials, users, quotes or case studies with no source.
3. **Narration vs screen**: narration states a figure that the scene shows differently, or the scene
   shows data the narration never supports.
4. **Style**: wording that breaks the channel style guide (tone, person, jargon, banned claims).
5. **Stale references**: dates, "today", "this week" or product names that will be wrong when published.
6. **Overclaims**: superlatives and guarantees ("best", "guaranteed", "never fails") with no basis.

## 3. Decision

- Any script ERROR or any unsupported/fabricated claim: fix before voiceover.
- Everything else is advice; apply or note why not. There is no score or threshold.
