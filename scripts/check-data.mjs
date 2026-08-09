#!/usr/bin/env node
// Data integrity gate for converted_assets/exam-*.json — run via `npm run check:data`.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'converted_assets');

const EXPECTED = { A: { main: 40, additional: 26 }, B: { main: 40, additional: 0 }, C: { main: 40, additional: 0 }, D: { main: 40, additional: 0 } };

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };

for (const [letter, expected] of Object.entries(EXPECTED)) {
  console.log(`exam-${letter}.json`);
  let exam;
  try {
    exam = JSON.parse(readFileSync(join(assetsDir, `exam-${letter}.json`), 'utf8'));
  } catch (err) {
    fail(`cannot parse: ${err.message}`);
    continue;
  }

  const main = exam.questions.filter((q) => q.section === 'main');
  const additional = exam.questions.filter((q) => q.section === 'additional');
  if (main.length !== expected.main) fail(`expected ${expected.main} main questions, got ${main.length}`);
  if (additional.length !== expected.additional) fail(`expected ${expected.additional} additional questions, got ${additional.length}`);
  if (exam.totalQuestions !== 40) fail(`totalQuestions should be 40, got ${exam.totalQuestions}`);
  if (exam.totalPoints !== 40) fail(`totalPoints should be 40, got ${exam.totalPoints}`);
  if (exam.passingScore !== 26) fail(`passingScore should be 26, got ${exam.passingScore}`);

  for (const q of exam.questions) {
    const correct = q.options.filter((o) => o.isCorrect);
    if (correct.length !== q.selectCount) {
      fail(`q${q.id}: selectCount ${q.selectCount} but ${correct.length} correct options`);
    }
    if (q.selectCount === 2 && q.options.length !== 5) {
      fail(`q${q.id}: select-TWO question should have 5 options, has ${q.options.length}`);
    }
    if (q.options.some((o) => !o.explanation)) fail(`q${q.id}: option missing explanation`);
    if (q.points !== 1) fail(`q${q.id}: points should be 1, got ${q.points}`);
    if (q.image && !existsSync(join(assetsDir, q.image))) fail(`q${q.id}: image file missing: ${q.image}`);
  }
  console.log(`  ✓ ${exam.questions.length} questions checked`);
}

if (failures > 0) {
  console.error(`\nFAILED: ${failures} problem(s) found`);
  process.exit(1);
}
console.log('\nAll exam data VALID');
