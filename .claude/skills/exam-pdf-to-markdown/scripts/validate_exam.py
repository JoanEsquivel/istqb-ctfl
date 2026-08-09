#!/usr/bin/env python3
"""Validate a converted exam JSON file against the ISTQB exam rules.

Usage: validate_exam.py <exam.json>
Exit code 0 = valid; 1 = one or more violations (printed to stdout).
Pure stdlib — no dependencies.
"""
import json
import re
import sys


def validate(path):
    errors = []
    with open(path) as f:
        exam = json.load(f)

    for field in ("exam", "source", "totalQuestions", "totalPoints", "passingScore", "questions"):
        if field not in exam:
            errors.append(f"missing top-level field: {field}")
    if errors:
        return errors

    questions = exam["questions"]
    main = [q for q in questions if q.get("section") == "main"]
    additional = [q for q in questions if q.get("section") == "additional"]

    if len(main) != exam["totalQuestions"]:
        errors.append(f"totalQuestions={exam['totalQuestions']} but {len(main)} main questions found")
    main_points = sum(q.get("points", 0) for q in main)
    if main_points != exam["totalPoints"]:
        errors.append(f"totalPoints={exam['totalPoints']} but main questions sum to {main_points}")
    expected_pass = -(-exam["totalPoints"] * 65 // 100)  # ceil(65%)
    if exam["passingScore"] != expected_pass:
        errors.append(f"passingScore={exam['passingScore']}, expected {expected_pass} (65% of {exam['totalPoints']})")

    nums = [q["number"] for q in main]
    if nums != list(range(1, len(main) + 1)):
        errors.append(f"main question numbers are not 1..{len(main)} without gaps")
    anums = [q["number"] for q in additional]
    if anums != list(range(1, len(additional) + 1)):
        errors.append(f"additional question numbers are not 1..{len(additional)} without gaps")

    for q in questions:
        qid = q.get("id", "?")
        letters = [o.get("letter") for o in q.get("options", [])]
        correct = [o["letter"] for o in q.get("options", []) if o.get("isCorrect")]

        if len(q.get("options", [])) < 4:
            errors.append(f"Q{qid}: fewer than 4 options")
        if letters != sorted(letters) or len(set(letters)) != len(letters):
            errors.append(f"Q{qid}: option letters not unique/ordered: {letters}")
        if len(correct) != q.get("selectCount"):
            errors.append(f"Q{qid}: selectCount={q.get('selectCount')} but {len(correct)} correct options: {correct}")
        if not re.match(r"^FL-\d+\.\d+\.\d+$", q.get("learningObjective", "")):
            errors.append(f"Q{qid}: bad learningObjective: {q.get('learningObjective')!r}")
        if q.get("kLevel") not in ("K1", "K2", "K3"):
            errors.append(f"Q{qid}: bad kLevel: {q.get('kLevel')!r}")
        if not q.get("question", "").strip():
            errors.append(f"Q{qid}: empty question stem")
        for o in q.get("options", []):
            if not o.get("text", "").strip():
                errors.append(f"Q{qid}: option {o.get('letter')} has empty text")
            if not o.get("explanation", "").strip():
                errors.append(f"Q{qid}: option {o.get('letter')} has empty explanation")
        # Leaked boilerplate from PDF headers/footers
        blob = q.get("question", "") + " ".join(o.get("text", "") for o in q.get("options", []))
        for marker in ("Qualifications Board", "Sample Exam", "Release April", "Page "):
            if marker in blob:
                errors.append(f"Q{qid}: PDF boilerplate leaked into text: {marker!r}")

    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    errs = validate(sys.argv[1])
    if errs:
        print(f"INVALID: {len(errs)} problem(s)")
        for e in errs:
            print(f"  - {e}")
        sys.exit(1)
    exam = json.load(open(sys.argv[1]))
    n_main = sum(1 for q in exam["questions"] if q["section"] == "main")
    n_add = len(exam["questions"]) - n_main
    print(f"VALID: exam {exam['exam']} — {n_main} main + {n_add} additional questions")
