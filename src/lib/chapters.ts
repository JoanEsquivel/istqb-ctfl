export const CHAPTERS: Record<number, string> = {
  1: 'Fundamentals of Testing',
  2: 'Testing Throughout the SDLC',
  3: 'Static Testing',
  4: 'Test Analysis and Design',
  5: 'Managing the Test Activities',
  6: 'Test Tools',
};

// learningObjective format is "FL-x.y.z" (validated by the data pipeline)
export function chapterOf(learningObjective: string): number {
  const match = /^FL-(\d)/.exec(learningObjective);
  return match ? Number(match[1]) : 0;
}

export function chapterLabel(chapter: number): string {
  return CHAPTERS[chapter] ? `Ch ${chapter} · ${CHAPTERS[chapter]}` : `Chapter ${chapter}`;
}
