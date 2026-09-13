import { describe, it, expect } from 'vitest';
import {
  SNIPPETS,
  LANGUAGES,
  deck,
  targetOf,
  dayKey,
  streaks,
} from '../packages/shared/src/content';
import {
  freshTyping,
  applyTyping,
  stats,
  createPractice,
  currentCard,
  inputPractice,
  tickPractice,
  createBattle,
  tickBattle,
  inputBattle,
  battleResults,
} from '../packages/shared/src/engine';
describe('input and metrics', () => {
  it('requires correction and never counts deleted characters twice', () => {
    const t = freshTyping();
    applyTyping(t, 'abc', { seq: 1, op: 'insert', char: 'a' });
    applyTyping(t, 'abc', { seq: 2, op: 'insert', char: 'x' });
    expect(stats(t, 'abc', 60).chars).toBe(1);
    applyTyping(t, 'abc', { seq: 3, op: 'backspace' });
    applyTyping(t, 'abc', { seq: 4, op: 'insert', char: 'b' });
    applyTyping(t, 'abc', { seq: 5, op: 'backspace' });
    applyTyping(t, 'abc', { seq: 6, op: 'insert', char: 'b' });
    expect(stats(t, 'abc', 60).chars).toBe(2);
    applyTyping(t, 'abc', { seq: 7, op: 'insert', char: 'c' });
    expect(stats(t, 'abc', 60)).toEqual({ chars: 3, cpm: 3, accuracy: 80, completed: 1 });
  });
  it('rejects duplicate/out-of-order commands and bulk insertion', () => {
    const t = freshTyping();
    applyTyping(t, 'abc', { seq: 2, op: 'insert', char: 'a' });
    expect(t.buffer).toBe('');
    applyTyping(t, 'abc', { seq: 1, op: 'insert', char: 'a' });
    applyTyping(t, 'abc', { seq: 1, op: 'insert', char: 'a' });
    applyTyping(t, 'abc', { seq: 2, op: 'insert', char: 'bc' });
    expect(t.buffer).toBe('a');
    expect(t.attempts).toBe(1);
  });
  it('reports undefined accuracy when nothing was typed', () =>
    expect(stats(freshTyping(), 'abc', 60)).toEqual({
      chars: 0,
      cpm: 0,
      accuracy: null,
      completed: 0,
    }));
  it('automatically removes only indentation, preserves internal space and newline', () =>
    expect(targetOf('if ready:\n    print("hello world")')).toBe(
      'if ready:\nprint("hello world")',
    ));
  it('uses valid partial prefix, exact time boundary, and no countdown typing', () => {
    const p = createPractice('id', 'owner', 'javascript', 'beginner', 30, 'speed', 0);
    inputPractice(p, { seq: 1, op: 'insert', char: currentCard(p).target[0] }, 1000);
    expect(p.typing.attempts).toBe(0);
    inputPractice(p, { seq: 1, op: 'insert', char: currentCard(p).target[0] }, 3000);
    expect(p.typing.attempts).toBe(1);
    inputPractice(p, { seq: 2, op: 'insert', char: currentCard(p).target[1] }, 33000);
    expect(p.status).toBe('finished');
    expect(p.result?.chars).toBe(1);
    expect(p.result?.cpm).toBe(2);
  });
});
describe('daily practice', () => {
  it('pins date at creation and shares the same deck for everyone', () => {
    const now = Date.parse('2026-09-09T14:59:59Z');
    const a = createPractice('a', 'one', 'python', 'standard', 30, 'daily', now),
      b = createPractice('b', 'two', 'python', 'beginner', 120, 'daily', now);
    expect(a.cards).toEqual(b.cards);
    expect(a.duration).toBe(60);
    expect(a.difficulty).toBe('intermediate');
    tickPractice(a, now + 65000);
    expect(a.date).toBe('2026-09-09');
    expect(dayKey(now + 65000)).toBe('2026-09-10');
    expect(a.result?.dailyComplete).toBe(false);
  });
  it('counts unique consecutive days and preserves yesterday streak until today ends', () => {
    expect(streaks(['2026-09-07', '2026-09-08', '2026-09-08', '2026-09-09'], '2026-09-10')).toEqual(
      { current: 3, longest: 3 },
    );
    expect(streaks(['2026-09-07', '2026-09-08'], '2026-09-10')).toEqual({ current: 0, longest: 2 });
  });
});
describe('content', () => {
  it('ships 550 unique original fragments', () => {
    expect(SNIPPETS).toHaveLength(550);
    expect(new Set(SNIPPETS.map((s) => s.id)).size).toBe(550);
    for (const l of LANGUAGES) {
      expect(SNIPPETS.filter((s) => s.language === l && s.kind === 'block')).toHaveLength(20);
      expect(SNIPPETS.filter((s) => s.language === l && s.kind === 'rain')).toHaveLength(30);
    }
  });
  it('meets ASCII, length, and line constraints', () => {
    for (const s of SNIPPETS) {
      expect(s.target, s.id).toMatch(/^[\x20-\x7e\n]+$/);
      const size = s.target.length;
      if (s.kind === 'rain') {
        expect(size, s.id + ': ' + s.source).toBeGreaterThanOrEqual(
          s.difficulty === 'beginner' ? 8 : 12,
        );
        expect(size, s.id + ': ' + s.source).toBeLessThanOrEqual(
          s.difficulty === 'beginner' ? 18 : 28,
        );
        expect(s.target).not.toContain('\n');
      } else {
        expect(s.target).toBe(targetOf(s.source));
        expect(s.source).not.toContain('checkpoint');
        const lines = s.source.split('\n').length;
        expect(lines, s.id).toBeGreaterThanOrEqual(s.difficulty === 'intermediate' ? 6 : 8);
        expect(lines, s.id).toBeLessThanOrEqual(s.difficulty === 'intermediate' ? 10 : 14);
      }
    }
  });
  it('has no repeated text in a deck and deterministic seeds', () => {
    for (const l of LANGUAGES)
      for (const d of ['beginner', 'standard'] as const) {
        const a = deck(l, d, 'rain', 'seed');
        expect(new Set(a.map((s) => s.source)).size).toBe(a.length);
        expect(a).toEqual(deck(l, d, 'rain', 'seed'));
      }
  });
});
function battle() {
  return createBattle(
    'battle',
    'javascript',
    'beginner',
    [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Lin' },
    ],
    0,
  );
}
function clear(b: ReturnType<typeof battle>, id: string, now: number, attack = false) {
  const p = b.players.find((p) => p.id === id)!;
  const d = p.drops.find((d) => d.attack === attack && d.spawnAt <= now)!;
  p.targetId = d.id;
  for (const char of d.snippet.target)
    inputBattle(b, id, { seq: p.typing.lastSeq + 1, op: 'insert', char }, now);
}
describe('battle rules', () => {
  it('gives both players identical base rain', () => {
    const b = battle();
    tickBattle(b, 12000);
    expect(b.players[0].drops).toEqual(b.players[1].drops);
  });
  it('sends one attack after three clean clears, warning is one second', () => {
    const b = battle();
    for (const time of [3000, 7500, 12000]) {
      tickBattle(b, time);
      clear(b, 'a', time);
    }
    expect(b.players[0].sent).toBe(1);
    const attack = b.players[1].drops.find((d) => d.attack)!;
    expect(attack.spawnAt).toBe(13000);
    expect(b.players[0].combo).toBe(0);
  });
  it('does not count a corrected block toward clean combo', () => {
    const b = battle();
    tickBattle(b, 3000);
    const p = b.players[0];
    inputBattle(b, 'a', { seq: 1, op: 'insert', char: '!' }, 3001);
    inputBattle(b, 'a', { seq: 2, op: 'backspace' }, 3002);
    clear(b, 'a', 3003);
    expect(p.combo).toBe(0);
  });
  it('does not charge attacks from attack code clears', () => {
    const b = battle();
    for (const time of [3000, 7500, 12000]) {
      tickBattle(b, time);
      clear(b, 'a', time);
    }
    clear(b, 'b', 13000, true);
    expect(b.players[1].combo).toBe(0);
    expect(b.players[1].baseChars).toBe(0);
  });
  it('resolves simultaneous deaths as a draw', () => {
    const b = battle();
    tickBattle(b, 3000);
    for (const p of b.players) p.hp = 1;
    tickBattle(b, 19000);
    expect(b.status).toBe('finished');
    expect(b.winner).toBe(null);
    expect(b.reason).toBe('simultaneous');
  });
  it('breaks a time tie by base characters, then accuracy', () => {
    const b = battle();
    tickBattle(b, 3000);
    b.players.forEach((p) => (p.drops = []));
    b.players[0].baseChars = 80;
    b.players[1].baseChars = 70;
    tickBattle(b, b.endAt);
    expect(b.winner).toBe('a');
    expect(b.reason).toBe('characters');
  });
  it('resumes before 10 seconds, forfeits after 10, voids both disconnected', () => {
    const b = battle();
    b.players[0].connected = false;
    b.players[0].disconnectedAt = 3000;
    tickBattle(b, 12999);
    expect(b.status).toBe('playing');
    tickBattle(b, 13000);
    expect(b.winner).toBe('b');
    expect(b.reason).toBe('forfeit');
    const c = battle();
    c.players.forEach((p) => {
      p.connected = false;
      p.disconnectedAt = 3000;
    });
    tickBattle(c, 13000);
    expect(c.status).toBe('aborted');
    expect(battleResults(c, 13000)[0].outcome).toBe('void');
  });
  it('cannot change a finished result after a later disconnect', () => {
    const b = battle();
    tickBattle(b, 3000);
    b.players[0].hp = 0;
    tickBattle(b, 3100);
    b.players.forEach((p) => {
      p.connected = false;
      p.disconnectedAt = 3200;
    });
    tickBattle(b, 20000);
    expect(b.winner).toBe('b');
  });
});

it('migrates legacy practice levels and keeps battle decks separate', () => {
  for (const [old, current] of [
    ['beginner', 'intermediate'],
    ['standard', 'advanced'],
  ] as const) {
    const p = createPractice('legacy', 'owner', 'javascript', old, 60, 'speed', 0);
    expect(p.difficulty).toBe(current);
    expect(p.cards).toHaveLength(10);
    expect(p.cards.every((card) => card.difficulty === current && card.kind === 'block')).toBe(
      true,
    );
  }
  for (const language of LANGUAGES) {
    for (const difficulty of ['intermediate', 'advanced'] as const) {
      const cards = deck(language, difficulty, 'block', 'seed');
      expect(cards).toHaveLength(10);
      expect(new Set(cards.map((card) => card.source)).size).toBe(10);
      expect(deck(language, difficulty, 'block', 'seed')).toEqual(cards);
    }
  }
});
