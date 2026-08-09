#!/usr/bin/env python3
"""Build exam-X.json and exam-X.md from pdftotext -layout extractions.

Usage:
  build_exam.py <questions.txt> <answers.txt> <exam-letter> <source-label> <out-dir> [questions.pdf]

Example:
  build_exam.py exam-A-questions.txt exam-A-answers.txt A \\
      "ISTQB CTFL v4.0 Sample Exam A v1.7" converted_assets/ \\
      Assets/ISTQB_CTFL_v4.0_Sample-Exam-A-Questions_v1.7.pdf

If the questions PDF is given, questions whose stem references a figure
(state transition diagrams etc.) get their PDF page rendered to
<out-dir>/images/exam-X-qID.png (requires pdftoppm) and an "image" field.

Deterministic parser for the ISTQB CTFL v4.0 sample-exam layout. Anything it
cannot resolve is printed as "WARNING:" on stderr — the caller (Claude) must
review every warning against the source PDF before trusting the output.
Pure stdlib — no dependencies.
"""
import json
import math
import re
import sys

FURNITURE = [
    re.compile(r"^\s*Certified Tester, Foundation Level\s*$"),
    re.compile(r"^\s*Sample Exams? set [A-Z]\s*$"),
    re.compile(r"^\s*Sample Exam [–-] (Questions|Answers)\s*$"),
    re.compile(r"^\s*Version \d+\.\d+.*$"),
    re.compile(r"^\s*©.*Qualifications Board\s*$"),
    re.compile(r".*Page \d+ of \d+.*"),
    re.compile(r"^\s*Release \w+ \d+, \d+\s*$"),
]
DOTTED_TOC = re.compile(r"\.{4,}")
Q_HEAD = re.compile(r"^\s*Question #(A?)(\d+) \((\d+) Points?\)\s*$")
OPTION = re.compile(r"^\s{0,15}([a-e])\)\s+(\S.*)$")
SELECT = re.compile(r"^\s*Select (ONE|TWO) options?\.?\s*$", re.I)
ROMAN = re.compile(r"^\s*((?:i|ii|iii|iv|v|vi|vii|viii))\.\s+(\S.*)$")
KEY_ROW = re.compile(r"(A?)(\d+)\s+([a-e](?:\s*,\s*[a-e])*)\s+(FL-\d+\.\d+\.\d+)\s+(K[1-3])\s+(\d+)")
TABLE_HEADER = re.compile(r"Explanation\s*/\s*Rationale|Number Answer|^\s*\(#\)|Correct Answer|^\s*Question\s+Correct|Learning\s*$|Objective|^\s*\(LO\)\s*$|K-Level")
DETAIL_ROW = re.compile(r"^\s{0,12}(A?)(\d+)\s+([a-e](?:\s*,\s*[a-e])*)(?:\s+(\S.*))?\s*$")
TRAILING_META = re.compile(r"\s+FL-\d+\.\d+\.\d+(\s+K[1-3])?(\s+\d+)?\s*$|\s+K[1-3]\s+\d+\s*$")
EXPL_MARK = re.compile(r"^\s*(?:([a-e])\)|((?:i|ii|iii|iv|v|vi|vii|viii))\.)\s+(\S.*)$")
THUS = re.compile(r"^\s*Thus:?\s*$")
FIGURE = re.compile(
    r"diagram shown below|following (state transition )?diagram|diagram below"
    r"|following figure|figure below|figure includes|in the picture|shown below|as shown",
    re.I)


def warn(msg):
    print(f"WARNING: {msg}", file=sys.stderr)


def clean_lines(path):
    lines = []
    for raw in open(path, encoding="utf-8").read().split("\n"):
        line = raw.replace("\f", "")
        if any(p.match(line) for p in FURNITURE):
            continue
        if DOTTED_TOC.search(line):
            continue
        lines.append(line.rstrip())
    return lines


def parse_questions(path):
    """Return {id: {...}} preserving stem line breaks for roman lists."""
    lines = clean_lines(path)
    # Body starts at the first real Question #1 heading (TOC lines were dropped
    # with the dotted leaders).
    questions = {}
    cur = None       # current question dict
    cur_opt = None   # letter of option being accumulated
    for line in lines:
        m = Q_HEAD.match(line)
        if m:
            prefix, num, points = m.group(1), int(m.group(2)), int(m.group(3))
            qid = f"{prefix}{num}"
            cur = {
                "id": qid, "number": num,
                "section": "additional" if prefix else "main",
                "points": points, "selectCount": None,
                "stem": [], "options": {}, "order": []
            }
            if qid in questions:
                warn(f"duplicate question heading #{qid}")
            questions[qid] = cur
            cur_opt = None
            continue
        if cur is None:
            continue
        if SELECT.match(line):
            cur["selectCount"] = 1 if SELECT.match(line).group(1).upper() == "ONE" else 2
            cur_opt = None
            continue
        m = OPTION.match(line)
        if m and not cur["options"].get(m.group(1)):
            letter, text = m.group(1), m.group(2)
            # options must arrive in order a, b, c... otherwise it's stem text
            expected = chr(ord("a") + len(cur["order"]))
            if letter == expected:
                cur["options"][letter] = [text.strip()]
                cur["order"].append(letter)
                cur_opt = letter
                continue
        if not line.strip():
            cur_opt = None
            continue
        if cur_opt:
            cur["options"][cur_opt].append(line.strip())
        else:
            cur["stem"].append(line)
    return questions


LIST_ITEM = re.compile(
    r"^\s*("
    r"(?:i|ii|iii|iv|v|vi|vii|viii)\."   # roman lists
    r"|\d+\."                             # numbered lists (1. 2. ...)
    r"|[A-Z]\.(?=\s)"                     # lettered lists (A. B. ...)
    r"|[•\-–•]"                 # bullets
    r")\s*(\S.*)$")


def table_cells(line):
    """[(start_offset, text), ...] — cells are runs separated by 2+ spaces."""
    return [(m.start(), m.group()) for m in re.finditer(r"\S+(?: \S+)*", line)]


def align_table_row(cells, columns):
    """Place each cell into the nearest header column so sparse rows (e.g. an
    'X' under R4 only) keep their column position. Returns '|'-joined row."""
    row = [""] * len(columns)
    for start, text in cells:
        center = start + len(text) / 2
        idx = min(range(len(columns)), key=lambda i: abs(columns[i] - center))
        row[idx] = f"{row[idx]} {text}".strip()
    return " | ".join(row).rstrip()


def normalize_stem(stem_lines):
    """Join wrapped lines but keep list items (i./1./A./•) on their own lines.
    pdftotext -layout may pack several list items on one physical line — split
    them back apart so the frontend can render the list."""
    out = []
    columns = None  # header column centers of the table currently being read
    for line in stem_lines:
        # Tabular row (2+ multi-space column gaps): keep as its own line with
        # "|" separators so the frontend can reconstruct the table. The first
        # tabular line is the header and defines the column positions.
        if not LIST_ITEM.match(line) and len(re.findall(r"\s{3,}", line.strip())) >= 2:
            cells = table_cells(line)
            if columns is None:
                columns = [start + len(text) / 2 for start, text in cells]
                out.append(" | ".join(text for _, text in cells))
            else:
                out.append(align_table_row(cells, columns))
            continue
        m = LIST_ITEM.match(line)
        if m:
            # split multiple items packed on one line: "1. xxx 2. yyy"
            parts = re.split(r"\s{2,}(?=(?:\d+\.|[A-Z]\.|(?:i|ii|iii|iv|v|vi|vii|viii)\.)\s)", line.strip())
            for part in parts:
                pm = LIST_ITEM.match(part)
                if pm:
                    out.append(f"{pm.group(1).rstrip()} {pm.group(2).strip()}".strip())
                elif out:
                    out[-1] = f"{out[-1]} {part.strip()}"
        elif out and out[-1] and not out[-1].endswith((".", ":", "?")) and " | " not in out[-1]:
            out[-1] = f"{out[-1]} {line.strip()}"
        else:
            out.append(line.strip())
    return "\n".join(x for x in out if x).strip()


def parse_answer_key(lines):
    """Answer Key tables → {id: (letters, lo, klevel, points)}. Handles the
    two-side-by-side-tables layout: one physical row, up to two entries."""
    key = {}
    in_key = False
    for line in lines:
        if re.match(r"^\s*(Appendix: )?Answer Key", line):
            in_key = True
            continue
        if in_key and re.match(r"^\s*(Answers|Appendix: Answers)", line):
            in_key = False
            continue
        if not in_key:
            continue
        for m in KEY_ROW.finditer(line):
            qid = f"{m.group(1)}{int(m.group(2))}"
            letters = [x.strip() for x in m.group(3).split(",")]
            if qid in key:
                warn(f"duplicate answer-key row for #{qid}")
            key[qid] = (letters, m.group(4), m.group(5), int(m.group(6)))
    return key


def parse_answer_details(lines):
    """Answers detail sections → {id: (correct_letters, blob_lines)}.

    Detail rows arrive strictly in order (1..N, then A1..AM), so a line only
    starts a new row when its leading number is the NEXT expected id — this
    keeps continuation lines that happen to start with a digit from being
    misread as rows."""
    details = {}
    cur = None
    in_detail = False
    prefix, expected = "", 1
    for line in lines:
        if re.match(r"^\s*Appendix: Answers to Additional Sample Questions\s*$", line):
            in_detail, cur, prefix, expected = True, None, "A", 1
            continue
        if re.match(r"^\s*Answers\s*$", line):
            in_detail, cur, prefix, expected = True, None, "", 1
            continue
        if re.match(r"^\s*(Appendix: )?Answer Key", line):
            in_detail = False
            cur = None
            continue
        if not in_detail:
            continue
        if TABLE_HEADER.search(line):
            continue
        stripped = TRAILING_META.sub("", line)
        m = DETAIL_ROW.match(stripped)
        if m and m.group(1) == prefix and int(m.group(2)) == expected:
            qid = f"{prefix}{expected}"
            letters = [x.strip() for x in m.group(3).split(",")]
            cur = [m.group(4)] if m.group(4) else []
            details[qid] = (letters, cur)
            expected += 1
            continue
        if cur is not None and stripped.strip():
            cur.append(stripped.strip())
    return details


def split_explanations(blob_lines, qid):
    """Split a detail blob into per-letter explanations and a shared rationale
    (roman-numeral analysis / 'Thus:' blocks)."""
    per_letter = {}
    rationale = []
    target = None       # ("letter", "a") | ("rationale", None)
    for line in blob_lines:
        if THUS.match(line):
            target = ("rationale", None)
            rationale.append("Thus:")
            continue
        m = EXPL_MARK.match(line)
        if m:
            if m.group(1):  # a) ... letter marker
                letter = m.group(1)
                if letter in per_letter:
                    per_letter[letter].append(m.group(3).strip())
                else:
                    per_letter[letter] = [m.group(3).strip()]
                target = ("letter", letter)
            else:            # i. ... roman marker → shared rationale
                rationale.append(f"{m.group(2)}. {m.group(3).strip()}")
                target = ("rationale", None)
            continue
        if target and target[0] == "letter":
            per_letter[target[1]].append(line.strip())
        else:
            rationale.append(line.strip())
    if not per_letter and not rationale:
        warn(f"#{qid}: empty explanation blob")
    return (
        {k: " ".join(v).strip() for k, v in per_letter.items()},
        "\n".join(x for x in rationale if x).strip(),
    )


def find_page(q_txt_path, qid):
    """1-based PDF page containing the question heading (TOC pages excluded
    by requiring the heading at the start of a line without dotted leaders)."""
    pages = open(q_txt_path, encoding="utf-8").read().split("\f")
    head = re.compile(rf"^Question #{qid} \(\d+ Points?\)\s*$", re.M)
    for i, page in enumerate(pages):
        if head.search(page):
            return i + 1
    return None


def diagram_bbox(pdf_path, page_no, qid):
    """Bounding box (PDF points) of the diagram belonging to question `qid`
    on a 1-based page: the union of vector drawings AND embedded raster
    images (some exams embed the diagram as a bitmap) that sit BETWEEN this
    question's heading and the next one — a page can also carry the tail of
    the previous question (e.g. its decision table). Header/footer bands and
    full-width separator rules are ignored. Returns None when nothing
    qualifies (caller falls back to a full-page render). Requires pymupdf."""
    import fitz
    doc = fitz.open(pdf_path)
    try:
        page = doc[page_no - 1]
        w, h = page.rect.width, page.rect.height

        # Vertical span owned by this question on the page.
        y_min, y_max = 0.0, h
        headings = page.search_for("Question #")
        own = [r for r in headings if page.get_textbox(
            fitz.Rect(r.x0, r.y0, w, r.y1)).startswith(f"Question #{qid} ")]
        if own:
            y_min = own[0].y1
            below = [r.y0 for r in headings if r.y0 > own[0].y1]
            if below:
                y_max = min(below)

        candidates = [d["rect"] for d in page.get_drawings()]
        candidates += [fitz.Rect(i["bbox"]) for i in page.get_image_info()]
        rects = []
        for r in candidates:
            if r.y0 < y_min or r.y1 > y_max:             # other question's content
                continue
            if r.y1 < h * 0.12 or r.y0 > h * 0.92:       # header / footer band
                continue
            if r.height < 3 and r.width > w * 0.7:       # separator rule
                continue
            if r.is_empty or r.width <= 0 or r.height <= 0:
                continue
            rects.append(r)
        if not rects:
            return None
        box = rects[0]
        for r in rects[1:]:
            box |= r
        box += (-10, -4, 10, 4)                          # breathing room
        return box & page.rect
    finally:
        doc.close()


def attach_figures(exam, letter, out_dir, q_txt_path, q_pdf_path):
    import os
    import subprocess
    img_dir = f"{out_dir.rstrip('/')}/images"
    for q in exam["questions"]:
        if not FIGURE.search(q["question"]):
            continue
        q["hasFigure"] = True
        page = find_page(q_txt_path, q["id"])
        if not page:
            warn(f"#{q['id']}: references a figure but its PDF page was not found")
            continue
        os.makedirs(img_dir, exist_ok=True)
        final = f"exam-{letter}-q{q['id']}.png"

        # Preferred path: crop to the diagram itself (needs pymupdf).
        try:
            import fitz
            box = diagram_bbox(q_pdf_path, page, q["id"])
            if box is not None:
                doc = fitz.open(q_pdf_path)
                try:
                    pix = doc[page - 1].get_pixmap(
                        matrix=fitz.Matrix(150 / 72, 150 / 72), clip=box)
                    pix.save(f"{img_dir}/{final}")
                finally:
                    doc.close()
                q["image"] = f"images/{final}"
                continue
            warn(f"#{q['id']}: no diagram drawings found on page {page}; "
                 "falling back to full-page render")
        except ImportError:
            warn(f"#{q['id']}: pymupdf not installed; rendering full page "
                 "(install pymupdf for diagram-only crops)")

        # Fallback: full-page render via pdftoppm.
        target = f"{img_dir}/exam-{letter}-q{q['id']}"
        try:
            subprocess.run(
                ["pdftoppm", "-f", str(page), "-l", str(page), "-png",
                 "-r", "150", q_pdf_path, target],
                check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            warn(f"#{q['id']}: pdftoppm failed to render page {page}: {e}")
            continue
        # pdftoppm appends the page number: exam-A-q23-09.png → normalize
        produced = [f for f in os.listdir(img_dir)
                    if f.startswith(f"exam-{letter}-q{q['id']}-")]
        if produced:
            os.replace(f"{img_dir}/{produced[0]}", f"{img_dir}/{final}")
            q["image"] = f"images/{final}"


def main():
    if len(sys.argv) not in (6, 7):
        print(__doc__)
        sys.exit(1)
    q_path, a_path, letter, source, out_dir = sys.argv[1:6]
    q_pdf = sys.argv[6] if len(sys.argv) == 7 else None

    questions = parse_questions(q_path)
    a_lines = clean_lines(a_path)
    key = parse_answer_key(a_lines)
    details = parse_answer_details(a_lines)

    q_ids = set(questions)
    for qid in sorted(q_ids - set(key), key=str):
        warn(f"#{qid}: present in questions file but missing from answer key")
    for qid in sorted(set(key) - q_ids, key=str):
        warn(f"#{qid}: in answer key but not found in questions file")

    out_questions = []
    for qid, q in questions.items():
        k = key.get(qid)
        if not k:
            continue
        letters, lo, klevel, points = k
        det = details.get(qid)
        expl, rationale = ({}, "")
        if det:
            det_letters, blob = det
            if sorted(det_letters) != sorted(letters):
                warn(f"#{qid}: key says correct={letters} but detail row says {det_letters}")
            expl, rationale = split_explanations(blob, qid)
        else:
            warn(f"#{qid}: no detail explanations found")
        if points != q["points"]:
            warn(f"#{qid}: points mismatch key={points} questions-file={q['points']}")

        options = []
        for opt_letter in q["order"]:
            text = " ".join(q["options"][opt_letter]).strip()
            explanation = expl.get(opt_letter, "")
            if not explanation:
                warn(f"#{qid}: option {opt_letter} has no explanation")
            options.append({
                "letter": opt_letter,
                "text": text,
                "isCorrect": opt_letter in letters,
                "explanation": explanation,
            })
        missing = [l for l in letters if l not in q["order"]]
        if missing:
            warn(f"#{qid}: correct letters {missing} not among options {q['order']}")
        if q["selectCount"] is None:
            warn(f"#{qid}: no 'Select ONE/TWO option' line found; defaulting to len(correct)")
            q["selectCount"] = len(letters)

        entry = {
            "id": qid,
            "number": q["number"],
            "section": q["section"],
            "points": points,
            "learningObjective": lo,
            "kLevel": klevel,
            "selectCount": q["selectCount"],
            "question": normalize_stem(q["stem"]),
            "options": options,
        }
        if rationale:
            entry["rationale"] = rationale
        out_questions.append(entry)

    out_questions.sort(key=lambda q: (q["section"] == "additional", q["number"]))
    main_qs = [q for q in out_questions if q["section"] == "main"]
    total_points = sum(q["points"] for q in main_qs)
    exam = {
        "exam": letter,
        "source": source,
        "totalQuestions": len(main_qs),
        "totalPoints": total_points,
        "passingScore": math.ceil(total_points * 0.65),
        "questions": out_questions,
    }

    if q_pdf:
        attach_figures(exam, letter, out_dir, q_path, q_pdf)

    json_path = f"{out_dir.rstrip('/')}/exam-{letter}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(exam, f, indent=2, ensure_ascii=False)
    md_path = f"{out_dir.rstrip('/')}/exam-{letter}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown(exam))
    print(f"wrote {json_path} and {md_path} "
          f"({len(main_qs)} main + {len(out_questions) - len(main_qs)} additional questions)")


def render_markdown(exam):
    out = [
        "---",
        f"exam: {exam['exam']}",
        f"source: {exam['source']}",
        f"totalQuestions: {exam['totalQuestions']}",
        f"totalPoints: {exam['totalPoints']}",
        f"passingScore: {exam['passingScore']}",
        "---",
        "",
        f"# {exam['source']}",
    ]
    section = "main"
    for q in exam["questions"]:
        if q["section"] == "additional" and section == "main":
            section = "additional"
            out += ["", "# Appendix: Additional Questions"]
        out += [
            "",
            f"## Question {q['id']}",
            "",
            f"- **Points:** {q['points']} | **LO:** {q['learningObjective']} | "
            f"**K-Level:** {q['kLevel']} | **Select:** {q['selectCount']}",
            "",
            q["question"],
            "",
        ]
        if q.get("image"):
            out += [f"![Figure for question {q['id']}]({q['image']})", ""]
        out += ["**Options:**", ""]
        for o in q["options"]:
            out.append(f"- **{o['letter']})** {o['text']}")
        correct = ", ".join(o["letter"] for o in q["options"] if o["isCorrect"])
        out += ["", f"**Correct answer:** {correct}", ""]
        if q.get("rationale"):
            out += ["**Rationale:**", "", q["rationale"], ""]
        out += ["**Explanations:**", ""]
        for o in q["options"]:
            if o["explanation"]:
                out.append(f"- **{o['letter']})** {o['explanation']}")
        out += ["", "---"]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    main()
