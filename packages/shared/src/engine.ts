import { deck, dayKey, VERSION, type Language, type Difficulty, type Snippet } from './content';
export type Mode = 'speed' | 'daily' | 'battle';
export type Status = 'countdown' | 'playing' | 'finished' | 'aborted';
export type Action = {
  seq: number;
  op: 'insert' | 'backspace' | 'clear' | 'select';
  char?: string;
  targetId?: string;
};
export type Typing = {
  buffer: string;
  attempts: number;
  correct: number;
  completed: number;
  committed: number;
  mistakes: Record<string, number>;
  lastSeq: number;
};
export type Drop = {
  id: string;
  snippet: Snippet;
  spawnAt: number;
  expiresAt: number;
  attack: boolean;
  lane: number;
  dirty?: boolean;
};
export type Player = {
  id: string;
  name: string;
  typing: Typing;
  hp: number;
  combo: number;
  lastAttack: number;
  targetId: string | null;
  drops: Drop[];
  baseChars: number;
  sent: number;
  received: number;
  connected: boolean;
  disconnectedAt: number | null;
};
export type Result = {
  id: string;
  mode: Mode;
  language: Language;
  difficulty: Difficulty;
  duration: number;
  version: string;
  date: string;
  endedAt: number;
  cpm: number;
  accuracy: number | null;
  completed: number;
  chars: number;
  mistakes: Record<string, number>;
  samples: number[];
  dailyComplete: boolean;
  outcome?: 'win' | 'loss' | 'draw' | 'void';
  reason?: string;
  hp?: number;
  baseChars?: number;
  sent?: number;
  opponent?: string;
  opponentStats?: { hp: number; baseChars: number; accuracy: number | null; sent: number };
};
export type Practice = {
  id: string;
  ownerId: string;
  language: Language;
  difficulty: Difficulty;
  duration: number;
  mode: 'speed' | 'daily';
  status: Status;
  startAt: number;
  endAt: number;
  date: string;
  cards: Snippet[];
  index: number;
  typing: Typing;
  samples: number[];
  lastSample: number;
  lastSampleChars: number;
  result?: Result;
};
export type Battle = {
  id: string;
  language: Language;
  difficulty: Difficulty;
  status: Status;
  startAt: number;
  endAt: number;
  players: Player[];
  cards: Snippet[];
  nextSpawn: number;
  spawnIndex: number;
  attackIndex: number;
  winner: string | null;
  reason: string;
  version: string;
  date: string;
};
export const freshTyping = (): Typing => ({
  buffer: '',
  attempts: 0,
  correct: 0,
  completed: 0,
  committed: 0,
  mistakes: {},
  lastSeq: 0,
});
export function prefix(buffer: string, target: string) {
  let i = 0;
  while (i < buffer.length && buffer[i] === target[i]) i++;
  return i;
}
export function stats(t: Typing, target: string, seconds: number) {
  const chars = t.committed + prefix(t.buffer, target);
  return {
    chars,
    cpm: seconds > 0 ? Math.round((chars * 60) / seconds) : 0,
    accuracy: t.attempts ? Math.round((t.correct / t.attempts) * 1000) / 10 : null,
    completed: t.completed,
  };
}
export function applyTyping(
  t: Typing,
  target: string,
  a: Action,
): { complete: boolean; mistake: boolean; accepted: boolean } {
  if (a.seq !== t.lastSeq + 1) return { complete: false, mistake: false, accepted: false };
  t.lastSeq = a.seq;
  if (a.op === 'backspace') {
    t.buffer = t.buffer.slice(0, -1);
    return { complete: false, mistake: false, accepted: true };
  }
  if (a.op === 'clear') {
    t.buffer = '';
    return { complete: false, mistake: false, accepted: true };
  }
  if (
    a.op !== 'insert' ||
    !a.char ||
    a.char.length !== 1 ||
    !/[\x20-\x7e\n]/.test(a.char) ||
    t.buffer.length >= target.length + 64
  )
    return { complete: false, mistake: false, accepted: true };
  t.attempts++;
  const match = a.char === target[t.buffer.length];
  if (match) t.correct++;
  else t.mistakes[a.char] = (t.mistakes[a.char] || 0) + 1;
  t.buffer += a.char;
  const complete = t.buffer === target;
  if (complete) {
    t.committed += target.length;
    t.completed++;
    t.buffer = '';
  }
  return { complete, mistake: !match, accepted: true };
}
export function createPractice(
  id: string,
  ownerId: string,
  language: Language,
  difficulty: Difficulty,
  duration: number,
  mode: 'speed' | 'daily',
  now: number,
): Practice {
  if (mode === 'daily') {
    difficulty = 'beginner';
    duration = 60;
  }
  const date = dayKey(now),
    seed = mode === 'daily' ? `${date}:${language}:${VERSION}` : id;
  return {
    id,
    ownerId,
    language,
    difficulty,
    duration,
    mode,
    status: 'countdown',
    startAt: now + 3000,
    endAt: now + 3000 + duration * 1000,
    date,
    cards: deck(language, difficulty, 'block', seed),
    index: 0,
    typing: freshTyping(),
    samples: [],
    lastSample: 0,
    lastSampleChars: 0,
  };
}
export const currentCard = (p: Practice) => p.cards[p.index % p.cards.length];
export function tickPractice(p: Practice, now: number) {
  if (p.status === 'finished' || p.status === 'aborted') return;
  if (now >= p.startAt) p.status = 'playing';
  const elapsed = Math.max(0, Math.min(p.duration, (now - p.startAt) / 1000));
  const sample = Math.floor(elapsed / 5);
  if (sample > p.lastSample) {
    const chars = stats(p.typing, currentCard(p).target, elapsed).chars;
    p.samples.push(Math.max(0, Math.round((chars - p.lastSampleChars) * 12)));
    p.lastSampleChars = chars;
    p.lastSample = sample;
  }
  if (now >= p.endAt) {
    p.status = 'finished';
    const s = stats(p.typing, currentCard(p).target, p.duration);
    p.result = {
      id: p.id,
      mode: p.mode,
      language: p.language,
      difficulty: p.difficulty,
      duration: p.duration,
      version: VERSION,
      date: p.date,
      endedAt: p.endAt,
      ...s,
      mistakes: p.typing.mistakes,
      samples: p.samples,
      dailyComplete: p.mode === 'daily' && s.completed > 0,
    };
  }
}
export function inputPractice(p: Practice, a: Action, now: number) {
  tickPractice(p, now);
  if (p.status !== 'playing') return;
  if (a.op === 'clear' || a.op === 'select') {
    if (a.seq === p.typing.lastSeq + 1) p.typing.lastSeq = a.seq;
    return;
  }
  const r = applyTyping(p.typing, currentCard(p).target, a);
  if (r.complete) p.index++;
}
export function createBattle(
  id: string,
  language: Language,
  difficulty: Difficulty,
  players: { id: string; name: string }[],
  now: number,
): Battle {
  return {
    id,
    language,
    difficulty,
    status: 'countdown',
    startAt: now + 3000,
    endAt: now + 123000,
    players: players.map((p) => ({
      ...p,
      typing: freshTyping(),
      hp: 5,
      combo: 0,
      lastAttack: -Infinity,
      targetId: null,
      drops: [],
      baseChars: 0,
      sent: 0,
      received: 0,
      connected: true,
      disconnectedAt: null,
    })),
    cards: deck(language, difficulty, 'rain', id),
    nextSpawn: now + 3000,
    spawnIndex: 0,
    attackIndex: 0,
    winner: null,
    reason: '',
    version: VERSION,
    date: dayKey(now),
  };
}
export function timings(b: Battle, now: number) {
  const phase = Math.min(2, Math.max(0, Math.floor((now - b.startAt) / 40000)));
  return b.difficulty === 'beginner'
    ? { interval: [4500, 4000, 3500][phase], fall: [16000, 15000, 14000][phase] }
    : { interval: [4000, 3500, 3000][phase], fall: [12000, 11000, 10000][phase] };
}
export function chooseTarget(p: Player, now: number) {
  if (p.drops.some((d) => d.id === p.targetId && d.spawnAt <= now)) return;
  p.targetId =
    p.drops
      .filter((d) => d.spawnAt <= now)
      .sort((a, b) => a.expiresAt - b.expiresAt || a.id.localeCompare(b.id))[0]?.id || null;
}
export function endBattle(b: Battle, winner: string | null, reason: string) {
  b.status = reason === 'server_restart' || reason === 'both_disconnected' ? 'aborted' : 'finished';
  b.winner = winner;
  b.reason = reason;
}
export function tickBattle(b: Battle, now: number) {
  if (b.status === 'finished' || b.status === 'aborted') return;
  const disconnected = b.players.filter((p) => !p.connected);
  if (
    disconnected.length === 2 &&
    disconnected.some((p) => now - (p.disconnectedAt ?? now) >= 10000)
  ) {
    endBattle(b, null, 'both_disconnected');
    return;
  }
  if (disconnected.length === 1 && now - (disconnected[0].disconnectedAt ?? now) >= 10000) {
    endBattle(b, b.players.find((p) => p.connected)!.id, 'forfeit');
    return;
  }
  if (now < b.startAt) return;
  b.status = 'playing';
  // Resolve all expirations together, so simultaneous eliminations are a draw.
  for (const p of b.players) {
    const fallen = p.drops.filter((d) => d.expiresAt <= Math.min(now, b.endAt));
    if (fallen.length) {
      p.hp = Math.max(0, p.hp - fallen.length);
      p.combo = 0;
      if (fallen.some((d) => d.id === p.targetId)) {
        p.typing.buffer = '';
        p.targetId = null;
      }
      p.drops = p.drops.filter((d) => d.expiresAt > Math.min(now, b.endAt));
    }
    chooseTarget(p, now);
  }
  const dead = b.players.filter((p) => p.hp === 0);
  if (dead.length) {
    endBattle(
      b,
      dead.length === 2 ? null : b.players.find((p) => p.hp > 0)!.id,
      dead.length === 2 ? 'simultaneous' : 'health',
    );
    return;
  }
  if (now >= b.endAt) {
    const [a, c] = b.players;
    const score =
      a.hp - c.hp ||
      a.baseChars - c.baseChars ||
      (stats(a.typing, '', 120).accuracy ?? 0) - (stats(c.typing, '', 120).accuracy ?? 0);
    endBattle(
      b,
      score === 0 ? null : score > 0 ? a.id : c.id,
      a.hp !== c.hp
        ? 'health'
        : a.baseChars !== c.baseChars
          ? 'characters'
          : score
            ? 'accuracy'
            : 'tie',
    );
    return;
  }
  while (b.nextSpawn <= now) {
    const timing = timings(b, b.nextSpawn);
    const snippet = b.cards[b.spawnIndex % b.cards.length];
    for (const p of b.players) {
      const occupied = new Set(p.drops.map((d) => d.lane));
      let lane = 0;
      while (occupied.has(lane)) lane++;
      p.drops.push({
        id: `base-${b.spawnIndex}`,
        snippet,
        spawnAt: b.nextSpawn,
        expiresAt: b.nextSpawn + timing.fall,
        attack: false,
        lane,
      });
    }
    b.spawnIndex++;
    b.nextSpawn += timing.interval;
  }
  for (const p of b.players) chooseTarget(p, now);
}
export function inputBattle(b: Battle, playerId: string, a: Action, now: number) {
  tickBattle(b, now);
  if (b.status !== 'playing') return;
  const p = b.players.find((p) => p.id === playerId);
  if (!p || !p.connected) return;
  if (a.seq !== p.typing.lastSeq + 1) return;
  if (a.op === 'select') {
    p.typing.lastSeq = a.seq;
    if (!p.typing.buffer && p.drops.some((d) => d.id === a.targetId && d.spawnAt <= now))
      p.targetId = a.targetId!;
    return;
  }
  chooseTarget(p, now);
  const target = p.drops.find((d) => d.id === p.targetId);
  if (!target || target.spawnAt > now) {
    p.typing.lastSeq = a.seq;
    return;
  }
  const r = applyTyping(p.typing, target.snippet.target, a);
  if (r.mistake) {
    p.combo = 0;
    target.dirty = true;
  }
  if (r.complete) {
    p.drops = p.drops.filter((d) => d.id !== target.id);
    p.targetId = null;
    if (!target.attack) {
      p.baseChars += target.snippet.target.length;
      if (!target.dirty) p.combo++;
      else p.combo = 0;
      if (p.combo >= 3) {
        p.combo = 0;
        const enemy = b.players.find((other) => other.id !== p.id)!;
        if (now - p.lastAttack >= 8000 && enemy.drops.filter((d) => d.attack).length < 2) {
          let lane = 0;
          while (enemy.drops.some((d) => d.lane === lane)) lane++;
          const spawnAt = now + 1000;
          enemy.drops.push({
            id: `attack-${b.attackIndex++}`,
            snippet: b.cards[(b.attackIndex + 7) % b.cards.length],
            spawnAt,
            expiresAt: spawnAt + timings(b, spawnAt).fall,
            attack: true,
            lane,
          });
          p.lastAttack = now;
          p.sent++;
          enemy.received++;
        }
      }
    }
    chooseTarget(p, now);
  }
}
export function battleResults(b: Battle, now: number): Result[] {
  return b.players.map((p) => ({
    id: b.id,
    mode: 'battle',
    language: b.language,
    difficulty: b.difficulty,
    duration: 120,
    version: b.version,
    date: b.date,
    endedAt: now,
    ...stats(p.typing, '', Math.max(1, Math.min(120, (now - b.startAt) / 1000))),
    mistakes: p.typing.mistakes,
    samples: [],
    dailyComplete: false,
    outcome:
      b.status === 'aborted'
        ? 'void'
        : b.winner === null
          ? 'draw'
          : b.winner === p.id
            ? 'win'
            : 'loss',
    reason: b.reason,
    hp: p.hp,
    baseChars: p.baseChars,
    sent: p.sent,
    opponent: b.players.find((o) => o.id !== p.id)?.name,
    opponentStats: (() => {
      const o = b.players.find((o) => o.id !== p.id)!;
      return {
        hp: o.hp,
        baseChars: o.baseChars,
        accuracy: stats(o.typing, '', 120).accuracy,
        sent: o.sent,
      };
    })(),
  }));
}
