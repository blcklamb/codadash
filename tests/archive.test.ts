import { describe, it, expect } from 'vitest';
import { emptyArchive, recordArchive } from '../packages/shared/src/archive';
import type { Result } from '../packages/shared/src/engine';
const result = (id: string, cpm = 100, date = '2026-09-10'): Result => ({
  id,
  cpm,
  date,
  mode: 'speed',
  language: 'javascript',
  difficulty: 'beginner',
  duration: 60,
  version: '1.0.0',
  endedAt: 1,
  accuracy: 100,
  completed: 1,
  chars: cpm,
  mistakes: {},
  samples: [],
  dailyComplete: false,
});
describe('bounded local archive', () => {
  it('keeps a lifetime best after recent results are trimmed', () => {
    let a = recordArchive(emptyArchive(), result('best', 300), 2);
    a = recordArchive(a, result('second', 200), 2);
    a = recordArchive(a, result('third', 100), 2);
    expect(a.recent).toHaveLength(2);
    expect(Object.values(a.bests)[0].id).toBe('best');
  });
  it('keeps completed dates independent of history size and deduplicates retries', () => {
    const r = {
      ...result('daily', 100, '2026-09-09'),
      mode: 'daily' as const,
      dailyComplete: true,
    };
    let a = recordArchive(emptyArchive(), r, 1);
    a = recordArchive(a, r, 1);
    a = recordArchive(a, result('new'), 1);
    expect(a.days).toEqual(['2026-09-09']);
    expect(a.recent).toHaveLength(1);
  });
  it('compares accuracy for tied CPM, without combining settings', () => {
    let a = recordArchive(emptyArchive(), { ...result('one', 200), accuracy: 90 });
    a = recordArchive(a, result('two', 200));
    a = recordArchive(a, { ...result('other', 300), duration: 30 });
    expect(Object.values(a.bests).map((r) => r.id)).toEqual(['two', 'other']);
  });
});
