import { useEffect, useState } from 'react';
import type { Attempt } from '../lib/types';
import { EXAM_SETS } from '../lib/exams';
import { loadAttempts } from '../lib/storage';
import { url } from '../lib/url';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

export default function HomeApp() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setAttempts(loadAttempts());
  }, []);

  return (
    <div>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          ISTQB® Certified Tester <span className="text-indigo-700">Foundation Level</span> Practice
        </h1>
        <p className="mt-2 text-slate-500">
          Preparation for the CTFL v4.0 certification — the ISTQB entry-level exam (not Advanced,
          Expert, or specialist tracks). Four official sample exams plus a bonus set: take a timed
          simulation under real exam conditions, or practice question by question with full
          explanations.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Where to take the real exam and official details:{' '}
          <a
            href="https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:underline"
          >
            official CTFL v4.0 page at istqb.org
          </a>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {EXAM_SETS.map((set) => {
          const setAttempts = attempts.filter((a) => a.examId === set.id);
          const best = setAttempts.length ? Math.max(...setAttempts.map((a) => a.score)) : null;
          const last = setAttempts[0] ?? null;
          return (
            <a key={set.id} href={url(`/exam/${set.id}/`)} className="group">
              <Card className="flex h-full flex-col p-6 transition-all group-hover:border-indigo-400 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                    {set.label}
                  </h2>
                  {!set.official && <Badge tone="amber">Bonus</Badge>}
                </div>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{set.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
                  {best !== null ? (
                    <>
                      <Badge tone={best >= set.passingScore ? 'green' : 'red'}>
                        Best {best}/{set.totalPoints}
                      </Badge>
                      {last && (
                        <span className="text-xs text-slate-400">
                          {setAttempts.length} attempt{setAttempts.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">No attempts yet</span>
                  )}
                  <span className="ml-auto font-medium text-indigo-600">Open →</span>
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
