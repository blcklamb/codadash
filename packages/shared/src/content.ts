import { BLOCKS } from './blocks';
import { RAIN } from './rain';
export const LANGUAGES = [
  'javascript',
  'typescript',
  'java',
  'rust',
  'go',
  'python',
  'c',
  'cpp',
  'csharp',
  'swift',
  'bash',
] as const;
export type Language = (typeof LANGUAGES)[number];
export type PracticeDifficulty = 'intermediate' | 'advanced';
export type BattleDifficulty = 'beginner' | 'standard';
// Historical results retain the difficulty they were played at.
export type Difficulty = PracticeDifficulty | BattleDifficulty;
export const practiceDifficulty = (value: unknown): PracticeDifficulty =>
  value === 'advanced' || value === 'standard' ? 'advanced' : 'intermediate';
export const battleDifficulty = (value: unknown): BattleDifficulty =>
  value === 'standard' ? 'standard' : 'beginner';
export const LANGUAGE_NAMES: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  swift: 'Swift',
  bash: 'Bash',
};
export const EXTENSIONS: Record<Language, string> = {
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  rust: 'rs',
  go: 'go',
  python: 'py',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  swift: 'swift',
  bash: 'sh',
};
export type Snippet = {
  id: string;
  language: Language;
  difficulty: Difficulty;
  kind: 'block' | 'rain';
  source: string;
  target: string;
  version: string;
};
export const VERSION = '2.0.0';
export const BATTLE_VERSION = '3.0.0';
export const targetOf = (source: string) =>
  source
    .split('\n')
    .map((line) => line.replace(/^ +/, ''))
    .join('\n');
export const SNIPPETS: Snippet[] = LANGUAGES.flatMap((language) => [
  ...(['intermediate', 'advanced'] as const).flatMap((difficulty) =>
    BLOCKS[language][difficulty].map((source, i) => ({
      id: `${language}-${difficulty}-block-${i}`,
      language,
      difficulty,
      kind: 'block' as const,
      source,
      target: targetOf(source),
      version: VERSION,
    })),
  ),
  ...(['beginner', 'standard'] as const).flatMap((difficulty) =>
    RAIN[language][difficulty].map((source, i) => ({
      id: `${language}-${difficulty}-rain-${i}`,
      language,
      difficulty,
      kind: 'rain' as const,
      source,
      target: targetOf(source),
      version: BATTLE_VERSION,
    })),
  ),
]);
export function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function shuffled<T>(items: T[], seed: string): T[] {
  let h = hash(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function deck(lang: Language, difficulty: Difficulty, kind: 'block' | 'rain', seed: string) {
  return shuffled(
    SNIPPETS.filter((s) => s.language === lang && s.difficulty === difficulty && s.kind === kind),
    seed,
  );
}
export function dayKey(now = Date.now()) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 10);
}
export function dayBefore(day: string) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}
export function streaks(days: string[], today = dayKey()) {
  const unique = [...new Set(days)].sort();
  let longest = 0,
    run = 0,
    last = '';
  for (const d of unique) {
    run = last === dayBefore(d) ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = d;
  }
  let current = 0;
  let d = unique.includes(today) ? today : dayBefore(today);
  while (unique.includes(d)) {
    current++;
    d = dayBefore(d);
  }
  return { current, longest };
}
