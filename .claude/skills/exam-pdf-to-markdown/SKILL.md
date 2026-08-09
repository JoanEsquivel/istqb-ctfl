---
name: exam-pdf-to-markdown
description: Use when converting ISTQB exam PDF pairs (Questions + Answers) from Assets/ into consumable Markdown and JSON files, when new sample exam PDFs are added, or when the user asks to process, map, or extract exam questions and answers for the quiz frontend.
---

# Exam PDF to Markdown/JSON

## Overview

Convert each ISTQB sample-exam PDF pair (`*-Questions_*.pdf` + `*-Answers_*.pdf`) in `Assets/` into two files in `converted_assets/`: a human-readable `exam-X.md` and a frontend-consumable `exam-X.json`. The JSON is the source of truth for the quiz frontend (options, correct answers, per-option explanations, LO, K-Level, points, passing score).

**Core principle:** the PDFs are the ground truth; extraction is lossy. Every question must pass validation AND semantic cross-checks before the output is written. Never guess a mapping — verify against the PDF page visually if in doubt.

## Workflow (per exam pair)

### 1. Discover pairs

```bash
ls Assets/ISTQB_CTFL_*Sample-Exam-*-Questions_*.pdf
```

Pair each Questions PDF with the Answers PDF of the same exam letter. Versions may differ per exam (e.g. A v1.7, C v1.6) — pair by letter, not version. Report any letter missing one side of the pair, and skip non-exam PDFs (Syllabus, Exam-Structures).

### 2. Extract text

```bash
.claude/skills/exam-pdf-to-markdown/scripts/extract_pdf.sh <pdf> <scratchpad>/exam-X-questions.txt
```

Uses `pdftotext -layout` (poppler), which preserves reading order and table columns. Write extracted text to the scratchpad, never into the repo. If the script warns it fell back to PDFKit (poppler missing), the text WILL be scrambled — options detached from their letters — so either install poppler (`brew install poppler`) or verify every question against the rendered PDF page.

### 3. Build JSON + Markdown

```bash
python3 .claude/skills/exam-pdf-to-markdown/scripts/build_exam.py \
    <scratchpad>/exam-X-questions.txt <scratchpad>/exam-X-answers.txt \
    X "ISTQB CTFL v4.0 Sample Exam X v<version>" converted_assets \
    Assets/<questions.pdf>
```

The deterministic parser handles: main questions (`#1`–`#40`) plus the optional `Appendix: Additional Questions` (`#A1`…, tagged `section: "additional"`); options `a)`–`e)` with wrapped lines; `Select ONE/TWO` → `selectCount`; the two-side-by-side Answer Key tables (`number → correct letter(s), LO, K-Level, points`); per-option explanations plus shared `rationale` blocks (roman-numeral analysis, `Thus:` verdicts); embedded lists and character-position-aligned tables (rows joined with `|`, empty cells preserved); and figure questions — when the questions PDF is passed as the last argument, stems referencing a diagram get a diagram-only crop written to `converted_assets/images/exam-X-qID.png` and an `image` field. The crop (requires `pymupdf`) unions the vector drawings and embedded raster images between that question's heading and the next one; without pymupdf, or when nothing qualifies, it falls back to a full-page `pdftoppm` render — visually check any fallback.

**Every `WARNING:` line on stderr must be resolved** by inspecting the extracted text or the PDF page — never by inventing content. Typical causes: a detail row whose explanation column starts empty (figure question), a layout the parser hasn't seen. If the parser needs a fix, fix the script, re-run, and re-verify ALL exams — a parser change can regress the others.

### 4. Validate

```bash
python3 .claude/skills/exam-pdf-to-markdown/scripts/validate_exam.py converted_assets/exam-X.json
```

Output is not done until it prints `VALID`. It checks: counts and gapless numbering (main + additional), correct letters ⊆ options, `selectCount` == number of correct options, `FL-x.y.z` LOs, `K1|K2|K3`, non-empty texts/explanations, no leaked PDF boilerplate, `passingScore` = ceil(65% of totalPoints).

### 5. Semantic spot-check (catches shifted mappings the validator can't)

For ~5 questions per exam — always including a multi-answer question, a question with an embedded list or table, and every `hasFigure` question — confirm each option's explanation actually talks about that option's text, comparing against the PDF rendered visually (Read tool with `pages` parameter). If an explanation doesn't match its option, the option order was scrambled: fix from the PDF page.

### 6. Report

One summary table for all exams processed: exam letter, main/additional question counts, validator result, and any questions that needed visual verification.

## Quick Reference

| Step | Command |
|---|---|
| Extract | `scripts/extract_pdf.sh <pdf> <out.txt>` |
| Build | `python3 scripts/build_exam.py <q.txt> <a.txt> <letter> <label> converted_assets [q.pdf]` |
| Validate | `python3 scripts/validate_exam.py converted_assets/exam-X.json` |
| Visual check | Read tool on the PDF with `pages` parameter |
| JSON shape | `templates/exam-schema.json` |
| MD shape | `templates/exam-template.md` |

## Common Mistakes

- **Trusting linear text order without `-layout`**: PDFKit/naive extraction detaches `a) b) c) d)` from their texts and interleaves table columns. Only trust `pdftotext -layout` output, and still spot-check.
- **Including page furniture**: every page repeats `Certified Tester, Foundation Level`, `Sample Exam(s) set X`, `Version …`, `© International Software Testing Qualifications Board`, `Page N of M`, `Release …`. Strip all of it — the validator rejects output containing these markers.
- **Assuming 4 options / 1 correct answer**: `Select TWO options.` questions have 5 options (`a`–`e`) and 2 correct letters (`a, e` in the key table).
- **Misreading the two-column Answer Key**: one physical row = two logical entries (e.g. question 1 AND question 21).
- **Treating roman-numeral stem lists as options**: `i.`–`v.` items belong to the question stem; the real options `a)`–`d)` reference them (e.g. "i, iii, iv have significant influence").
- **Forgetting the appendix**: most exams carry `Question #A1…` additional questions with their own answer-key table. Not all exams have them — handle absence gracefully.
- **Skipping the validator**: `python3 -m json.tool` proves syntax, not correctness. Always run `validate_exam.py`.
- **Losing figures**: some questions (state transition diagrams, dependency graphs) are unanswerable without their figure. Always pass the questions PDF to `build_exam.py` so those pages are rendered to `converted_assets/images/` and linked via the `image` field.
- **Fixing one exam, breaking another**: after any change to `build_exam.py`, rebuild and re-validate ALL exams, not just the one that failed.
