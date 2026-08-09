# ISTQB CTFL Exam Practice Platform — Design Spec

Validated with the user on 2026-08-08 (brainstorming: one screen at a time with ASCII previews).
Full implementation plan: `~/.claude/plans/necesito-crear-una-plataforma-piped-eich.md`.

## Goal
A polished local web platform (style reference: claudecertificationguide.com/mock-exam) to take the 4 ISTQB CTFL v4.0 sample exams from `converted_assets/exam-{A,B,C,D}.json`, in two modes: timed real-exam simulation and question-by-question practice with explanations.

## Decisions
- Astro + React islands, static output, Tailwind v4, English UI, localStorage persistence, local dev only.
- 5 sets: A–D official (40 questions, `section === "main"`, 60 min, pass 26/40 = 65%) + "Bonus practice set" from exam A's 26 additional questions (unofficial threshold 17/26).
- Timer: 60 min standard, +25% toggle (75 min, non-native extension), persisted preference.
- Practice feedback: after every answer (right or wrong), show explanations for ALL options plus rationale when present.

## UI/UX flow
- **Home → detail → mode**: home cards (A–D + Bonus) with best/last score chips → exam start screen (rules card, two large mode cards Exam/Practice, extended-time toggle, previous attempts, Resume/Discard when an in-progress attempt exists).
- **Exam mode**: centered question card (K-level/LO badges, options as rows, Flag, Prev/Next) + fixed sidebar navigator grid of all questions (answered/unanswered/flagged/current) + Submit; header with pill timer (amber ≤10 min, red pulse ≤5 min) and answered count. Navigator stacks below on <1024px. Submit warns about unanswered questions; timeout auto-submits.
- **Practice mode**: linear 1→N, no timer; select → "Check answer" → options lock, all explanations shown → "Next question"; running ✓-correct chip; ends in the shared results screen.
- **Results/review**: pass/fail banner, big score + progress ring, chapter & K-level breakdown bars, clickable green/red per-question grid, full question list with filters All/Incorrect/Flagged showing chosen vs correct + explanations. Reused by `/review/?attempt=<id>` for history.

## Architecture summary
Repo-root Astro app; direct JSON imports from `converted_assets/` (source of truth, untouched); images via `import.meta.glob`. Pure reducer state machine + `endsAt`-based timer (refresh-safe resume); pure grading (all-or-nothing, selectCount-aware); versioned localStorage keys (`istqb.attempts.v1`, `istqb.inprogress.v1:<examId>`, `istqb.settings.v1`).
