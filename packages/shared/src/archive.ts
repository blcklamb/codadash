import type { Result } from './engine';
export type Archive = { recent: Result[]; bests: Record<string, Result>; days: string[] };
export const emptyArchive = (): Archive => ({ recent: [], bests: {}, days: [] });
export function recordArchive(archive: Archive, result: Result, limit = 1000): Archive {
  const recent = [result, ...archive.recent.filter((r) => r.id !== result.id)].slice(0, limit);
  const bests = Object.fromEntries(
    Object.entries(archive.bests).filter(([, r]) => r.mode !== 'daily' || r.date === result.date),
  );
  if (result.mode !== 'battle') {
    const key = [
      result.mode,
      result.language,
      result.difficulty,
      result.duration,
      result.version,
      result.mode === 'daily' ? result.date : '',
    ].join(':');
    const prior = bests[key];
    if (
      !prior ||
      result.cpm > prior.cpm ||
      (result.cpm === prior.cpm && (result.accuracy ?? 0) > (prior.accuracy ?? 0))
    )
      bests[key] = result;
  }
  const days = [
    ...new Set([...archive.days, ...(result.dailyComplete ? [result.date] : [])]),
  ].sort();
  return { recent, bests, days };
}
