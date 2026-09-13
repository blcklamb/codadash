import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import {
  LANGUAGES,
  VERSION,
  dayKey,
  deck,
  streaks,
  type Language,
  type BattleDifficulty,
  practiceDifficulty,
} from '../../../packages/shared/src/content';
import {
  createPractice,
  tickPractice,
  inputPractice,
  currentCard,
  createBattle,
  tickBattle,
  inputBattle,
  battleResults,
  endBattle,
  type Practice,
  type Battle,
  type Action,
  type Result,
} from '../../../packages/shared/src/engine';
import {
  db,
  bests,
  activityDays,
  verifiedUser,
  saveResult,
  records,
  markStart,
  markEnd,
  recoverSessions,
} from './store';
const app = express();
const server = createServer(app);
const origins = (process.env.WEB_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(
  ',',
);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '8kb' }));
app.use(
  '/v1',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  }),
);
const io = new Server(server, {
  cors: { origin: origins },
  maxHttpBufferSize: 8192,
  pingInterval: 3000,
  pingTimeout: 5000,
  connectionStateRecovery: { maxDisconnectionDuration: 10000, skipMiddlewares: false },
});
type Identity = { id: string; userId: string | null; token: string; expiresAt: number };
type Member = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  disconnectedAt: number | null;
};
type Room = {
  id: string;
  code: string;
  language: Language;
  difficulty: BattleDifficulty;
  members: Member[];
  hostId: string;
  updatedAt: number;
  battle: Battle | null;
  results: Result[] | null;
  rematch: Set<string>;
};
const identities = new Map<string, Identity>(),
  practices = new Map<string, Practice>(),
  rooms = new Map<string, Room>(),
  sockets = new Map<string, string>();
const done = new Set<string>(),
  roomTokens = new Map<string, string>();
const disconnectedPractice = new Map<string, number>();
const pending = new Map<
  string,
  { identity: Identity; result: Result; lastTry: number; saving: boolean }
>();
let draining = false;
const config = z.object({
  language: z.enum(LANGUAGES),
  difficulty: z.enum(['beginner', 'standard']).default('beginner'),
});
const nickname = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[\p{L}\p{N}_ .-]+$/u);
const actionSchema = z.object({
  seq: z.number().int().positive(),
  op: z.enum(['insert', 'backspace', 'clear', 'select']),
  char: z.string().max(1).optional(),
  targetId: z.string().max(80).optional(),
});
function failure(res: express.Response, code: string, status = 400) {
  return res.status(status).json({ error: code });
}
async function identityFor(token: string): Promise<Identity | null> {
  const guest = identities.get(token);
  if (guest) {
    if (guest.expiresAt < Date.now()) {
      identities.delete(token);
      if (!guest.userId) return null;
    } else return guest;
  }
  const userId = await verifiedUser(token);
  if (!userId) return null;
  const id = { id: userId, userId, token, expiresAt: Date.now() + 5 * 60000 };
  identities.set(token, id);
  return id;
}
const auth: express.RequestHandler = async (req, res, next) => {
  try {
    const i = await identityFor(req.headers.authorization?.replace(/^Bearer /, '') || '');
    if (!i) {
      failure(res, 'unauthorized', 401);
      return;
    }
    res.locals.identity = i;
    next();
  } catch {
    failure(res, 'auth_unavailable', 503);
  }
};
function ownerBusy(id: string) {
  return (
    [...practices.values()].some(
      (p) => p.ownerId === id && !['finished', 'aborted'].includes(p.status),
    ) || [...rooms.values()].some((r) => r.members.some((m) => m.id === id))
  );
}
function roomView(r: Room) {
  return {
    id: r.id,
    code: r.code,
    language: r.language,
    difficulty: r.difficulty,
    hostId: r.hostId,
    members: r.members,
    rematch: [...r.rematch],
    battleId: r.battle?.id,
  };
}
function broadcastRoom(r: Room) {
  io.to(r.id).emit('room', roomView(r));
}
function practiceView(p: Practice) {
  return {
    ...p,
    cards: undefined,
    card: p.status === 'countdown' ? null : currentCard(p),
    serverNow: Date.now(),
  };
}
function battleView(b: Battle) {
  return { ...b, cards: undefined, serverNow: Date.now() };
}
function getIdentity(id: string) {
  return [...identities.values()].find((i) => i.id === id);
}
function deliverResult(id: string, result: Result) {
  const i = getIdentity(id);
  if (!i) return;
  io.to(sockets.get(id) || '').emit('result', { ...result, saved: !i.userId });
  if (i.userId)
    pending.set(`${id}:${result.id}`, { identity: i, result, lastTry: 0, saving: false });
  console.info(
    JSON.stringify({
      event: 'session_finished',
      mode: result.mode,
      session: result.id,
      outcome: result.outcome || 'complete',
    }),
  );
}
function removeMember(r: Room, id: string) {
  r.members = r.members.filter((m) => m.id !== id);
  r.rematch.delete(id);
  if (!r.members.length) {
    rooms.delete(r.code);
    return;
  }
  if (r.hostId === id) r.hostId = r.members[0].id;
  r.members.forEach((m) => (m.ready = false));
  r.updatedAt = Date.now();
  broadcastRoom(r);
}
app.get('/healthz', (_req, res) =>
  res.status(draining ? 503 : 200).json({ ok: !draining, version: VERSION, rooms: rooms.size }),
);
app.get('/v1/catalog', (_req, res) =>
  res.json({ languages: LANGUAGES, version: VERSION, durations: [30, 60, 120], authEnabled: !!db }),
);
app.post('/v1/guest-sessions', rateLimit({ windowMs: 60000, limit: 90 }), (_req, res) => {
  const token = randomBytes(32).toString('hex');
  const i: Identity = {
    id: randomUUID(),
    userId: null,
    token,
    expiresAt: Date.now() + 7 * 86400000,
  };
  identities.set(token, i);
  res.json({ token, id: i.id });
});
app.get('/v1/daily-challenges', (req, res) => {
  const parsed = z.enum(LANGUAGES).safeParse(req.query.language || 'javascript');
  if (!parsed.success) {
    failure(res, 'invalid_language');
    return;
  }
  const date = dayKey();
  res.json({
    date,
    language: parsed.data,
    duration: 60,
    difficulty: 'intermediate',
    version: VERSION,
    nextReset: Date.parse(date + 'T15:00:00Z'),
    count: deck(parsed.data, 'intermediate', 'block', `${date}:${parsed.data}:${VERSION}`).length,
  });
});
app.post('/v1/practice-sessions', auth, async (req, res) => {
  const parsed = config
    .extend({
      difficulty: z
        .enum(['beginner', 'standard', 'intermediate', 'advanced'])
        .default('intermediate')
        .transform(practiceDifficulty),
      mode: z.enum(['speed', 'daily']),
      duration: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(60),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    failure(res, 'invalid_settings');
    return;
  }
  const i: Identity = res.locals.identity;
  if (draining) {
    failure(res, 'server_maintenance', 503);
    return;
  }
  if (ownerBusy(i.id)) {
    failure(res, 'already_playing', 409);
    return;
  }
  const c = parsed.data;
  const p = createPractice(
    randomUUID(),
    i.id,
    c.language,
    c.difficulty,
    c.duration,
    c.mode,
    Date.now(),
  );
  practices.set(p.id, p);
  disconnectedPractice.set(p.id, Date.now());
  try {
    await markStart(p.id, i.userId ? [i.userId] : [], p.mode);
  } catch {
    practices.delete(p.id);
    failure(res, 'storage_unavailable', 503);
    return;
  }
  res.json({ id: p.id });
});
app.post('/v1/rooms', auth, async (req, res) => {
  const parsed = config.extend({ name: nickname }).safeParse(req.body);
  if (!parsed.success) {
    failure(res, 'invalid_settings');
    return;
  }
  const i: Identity = res.locals.identity;
  if (draining) {
    failure(res, 'server_maintenance', 503);
    return;
  }
  if (ownerBusy(i.id)) {
    failure(res, 'already_playing', 409);
    return;
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from(randomBytes(6), (n) => alphabet[n % alphabet.length]).join('');
  } while (rooms.has(code));
  const r: Room = {
    id: randomUUID(),
    code,
    ...parsed.data,
    members: [
      { id: i.id, name: parsed.data.name, ready: false, connected: false, disconnectedAt: null },
    ],
    hostId: i.id,
    updatedAt: Date.now(),
    battle: null,
    results: null,
    rematch: new Set(),
  };
  rooms.set(code, r);
  const token = randomBytes(32).toString('hex');
  roomTokens.set(token, `${r.id}:${i.id}`);
  res.json({ ...roomView(r), participantToken: token });
});
app.post('/v1/rooms/join', auth, (req, res) => {
  const parsed = z
    .object({ code: z.string().trim().toUpperCase().length(6), name: nickname })
    .safeParse(req.body);
  if (!parsed.success) {
    failure(res, 'invalid_code');
    return;
  }
  const i: Identity = res.locals.identity,
    r = rooms.get(parsed.data.code);
  if (!r) {
    failure(res, 'room_not_found', 404);
    return;
  }
  if (Date.now() - r.updatedAt >= 900000) {
    rooms.delete(r.code);
    failure(res, 'room_expired', 410);
    return;
  }
  if (r.members.some((m) => m.id === i.id)) {
    failure(res, 'already_joined', 409);
    return;
  }
  if (r.battle && !['finished', 'aborted'].includes(r.battle.status)) {
    failure(res, 'game_in_progress', 409);
    return;
  }
  if (r.members.length >= 2) {
    failure(res, 'room_full', 409);
    return;
  }
  if (ownerBusy(i.id)) {
    failure(res, 'already_playing', 409);
    return;
  }
  r.members.push({
    id: i.id,
    name: parsed.data.name,
    ready: false,
    connected: false,
    disconnectedAt: null,
  });
  r.battle = null;
  r.results = null;
  r.updatedAt = Date.now();
  const token = randomBytes(32).toString('hex');
  roomTokens.set(token, `${r.id}:${i.id}`);
  broadcastRoom(r);
  res.json({ ...roomView(r), participantToken: token });
});
app.get('/v1/me/records', auth, async (_req, res) => {
  const i: Identity = res.locals.identity;
  if (!i.userId) {
    res.json([]);
    return;
  }
  try {
    res.json(await records(i.userId));
  } catch {
    failure(res, 'storage_unavailable', 503);
  }
});
app.get('/v1/me/bests', auth, async (_req, res) => {
  const i: Identity = res.locals.identity;
  try {
    res.json(i.userId ? await bests(i.userId) : []);
  } catch {
    failure(res, 'storage_unavailable', 503);
  }
});
app.get('/v1/me/activity', auth, async (_req, res) => {
  const i: Identity = res.locals.identity;
  try {
    const days = i.userId ? await activityDays(i.userId) : [];
    res.json({ days, ...streaks(days) });
  } catch {
    failure(res, 'storage_unavailable', 503);
  }
});
const asyncStart = async (r: Room) => {
  if (draining) return;
  if (r.battle && !['finished', 'aborted'].includes(r.battle.status)) return;
  r.battle = createBattle(randomUUID(), r.language, r.difficulty, r.members, Date.now());
  r.results = null;
  r.rematch.clear();
  try {
    await markStart(
      r.battle.id,
      r.members.map((m) => getIdentity(m.id)?.userId).filter((s): s is string => !!s),
      'battle',
    );
    io.to(r.id).emit('battle', battleView(r.battle));
    broadcastRoom(r);
  } catch {
    r.battle = null;
    io.to(r.id).emit('notice', 'storage_unavailable');
  }
};
io.use(async (socket, next) => {
  try {
    const i = await identityFor(socket.handshake.auth.token || '');
    if (!i) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.identity = i;
    next();
  } catch {
    next(new Error('auth_unavailable'));
  }
});
io.on('connection', (socket) => {
  const i: Identity = socket.data.identity;
  const prior = sockets.get(i.id);
  if (prior && prior !== socket.id) io.sockets.sockets.get(prior)?.disconnect(true);
  sockets.set(i.id, socket.id);
  let activePractice: string | null = null,
    activeRoom: string | null = null,
    second = 0,
    commands = 0;
  const requests = new Set<string>();
  socket.on('attach', (body, ack) => {
    if (typeof ack !== 'function') return;
    const parsed = z
      .object({ id: z.string().uuid(), participantToken: z.string().optional() })
      .safeParse(body);
    if (!parsed.success) {
      ack({ error: 'invalid_request' });
      return;
    }
    const p = practices.get(parsed.data.id);
    if (p && p.ownerId === i.id) {
      activePractice = p.id;
      disconnectedPractice.delete(p.id);
      socket.emit('practice', practiceView(p));
      if (p.result) deliverResult(i.id, p.result);
      ack({ ok: true, playerId: i.id });
      return;
    }
    const r = [...rooms.values()].find(
      (r) => r.id === parsed.data.id && r.members.some((m) => m.id === i.id),
    );
    if (!r || roomTokens.get(parsed.data.participantToken || '') !== `${r.id}:${i.id}`) {
      ack({ error: 'room_not_found' });
      return;
    }
    activeRoom = r.code;
    socket.join(r.id);
    const m = r.members.find((m) => m.id === i.id)!;
    m.connected = true;
    m.disconnectedAt = null;
    const player = r.battle?.players.find((p) => p.id === i.id);
    if (player) {
      player.connected = true;
      player.disconnectedAt = null;
    }
    broadcastRoom(r);
    if (r.battle) socket.emit('battle', battleView(r.battle));
    if (r.results) {
      const idx = r.battle!.players.findIndex((m) => m.id === i.id);
      if (r.results[idx]) deliverResult(i.id, r.results[idx]);
    }
    ack({ ok: true, playerId: i.id });
  });
  socket.on('input', (body, ack) => {
    const now = Date.now(),
      s = Math.floor(now / 1000);
    if (s !== second) {
      second = s;
      commands = 0;
    }
    const parsed = z.array(actionSchema).max(20).safeParse(body);
    if (!parsed.success || (commands += parsed.data.length) > 150) {
      ack?.({ error: 'rate_limited' });
      return;
    }
    if (activePractice) {
      const p = practices.get(activePractice);
      if (p) for (const a of parsed.data) inputPractice(p, a, now);
      if (p) ack?.({ seq: p.typing.lastSeq });
    } else if (activeRoom) {
      const r = rooms.get(activeRoom);
      if (r?.battle) for (const a of parsed.data) inputBattle(r.battle, i.id, a, now);
      ack?.({ seq: r?.battle?.players.find((p) => p.id === i.id)?.typing.lastSeq || 0 });
    }
  });
  socket.on('command', async (body, ack) => {
    const parsed = z
      .object({
        requestId: z.string().uuid(),
        op: z.enum(['ready', 'settings', 'leave', 'rematch', 'sync']),
        language: z.enum(LANGUAGES).optional(),
        difficulty: z.enum(['beginner', 'standard']).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      ack?.({ error: 'invalid_request' });
      return;
    }
    const a = parsed.data;
    if (requests.has(a.requestId)) {
      ack?.({ ok: true });
      return;
    }
    requests.add(a.requestId);
    if (requests.size > 200) requests.delete(requests.values().next().value!);
    if (activePractice) {
      const p = practices.get(activePractice);
      if (p && a.op === 'leave' && !['finished', 'aborted'].includes(p.status)) {
        p.status = 'aborted';
        void markEnd(p.id, 'aborted').catch(() => {});
        socket.emit('practice', practiceView(p));
      }
      if (p && a.op === 'sync') socket.emit('practice', practiceView(p));
      ack?.({ ok: true });
      return;
    }
    const r = activeRoom ? rooms.get(activeRoom) : null;
    if (!r) {
      ack?.({ error: 'room_not_found' });
      return;
    }
    r.updatedAt = Date.now();
    const playing = r.battle && !['finished', 'aborted'].includes(r.battle.status);
    if (a.op === 'ready' && !playing) {
      const m = r.members.find((m) => m.id === i.id)!;
      m.ready = !m.ready;
      broadcastRoom(r);
      if (r.members.length === 2 && r.members.every((m) => m.ready && m.connected))
        await asyncStart(r);
    }
    if (a.op === 'settings' && !playing && r.hostId === i.id) {
      if (a.language) r.language = a.language;
      if (a.difficulty) r.difficulty = a.difficulty;
      r.members.forEach((m) => (m.ready = false));
      broadcastRoom(r);
    }
    if (a.op === 'rematch' && !playing && r.battle) {
      r.rematch.add(i.id);
      broadcastRoom(r);
      if (r.members.length === 2 && r.members.every((m) => m.connected && r.rematch.has(m.id)))
        await asyncStart(r);
    }
    if (a.op === 'leave') {
      if (playing)
        endBattle(r.battle!, r.members.find((m) => m.id !== i.id)?.id || null, 'forfeit');
      if (r.battle && !done.has(r.battle.id)) finishRoom(r, Date.now());
      socket.leave(r.id);
      removeMember(r, i.id);
      activeRoom = null;
    }
    if (a.op === 'sync') {
      socket.emit('room', roomView(r));
      if (r.battle) socket.emit('battle', battleView(r.battle));
    }
    ack?.({ ok: true });
  });
  socket.on('disconnect', () => {
    if (sockets.get(i.id) !== socket.id) return;
    sockets.delete(i.id);
    if (activePractice) disconnectedPractice.set(activePractice, Date.now());
    if (activeRoom) {
      const r = rooms.get(activeRoom);
      const m = r?.members.find((m) => m.id === i.id);
      if (m) {
        m.connected = false;
        m.disconnectedAt = Date.now();
        m.ready = false;
      }
      const p = r?.battle?.players.find((p) => p.id === i.id);
      if (p) {
        p.connected = false;
        p.disconnectedAt = Date.now();
      }
      if (r) broadcastRoom(r);
    }
  });
});
function finishRoom(r: Room, now: number) {
  const b = r.battle;
  if (!b || done.has(b.id)) return;
  done.add(b.id);
  r.results = battleResults(b, now);
  b.players.forEach((p, index) => deliverResult(p.id, r.results![index]));
  r.members.forEach((m) => (m.ready = false));
  void markEnd(b.id, b.status).catch(() => {});
}
let ticks = 0;
const timer = setInterval(() => {
  const now = Date.now();
  ticks++;
  if (ticks % 1200 === 0) {
    for (const [token, i] of identities)
      if (i.expiresAt < now && !sockets.has(i.id)) identities.delete(token);
    for (const [token, seat] of roomTokens)
      if (![...rooms.values()].some((r) => seat.startsWith(r.id + ':'))) roomTokens.delete(token);
    const retained = new Set([
      ...practices.keys(),
      ...[...rooms.values()].map((r) => r.battle?.id).filter(Boolean),
    ]);
    for (const id of done) if (!retained.has(id)) done.delete(id);
  }
  for (const p of practices.values()) {
    if (!['finished', 'aborted'].includes(p.status)) {
      const dc = disconnectedPractice.get(p.id);
      if (dc && now - dc >= 10000) {
        p.status = 'aborted';
        void markEnd(p.id, 'aborted').catch(() => {});
      } else tickPractice(p, now);
    }
    if (p.result && !done.has(p.id)) {
      done.add(p.id);
      deliverResult(p.ownerId, p.result);
      void markEnd(p.id, 'finished').catch(() => {});
    }
    if (ticks % 2 === 0) io.to(sockets.get(p.ownerId) || '').emit('practice', practiceView(p));
    if (now - p.endAt > 600000) {
      practices.delete(p.id);
      done.delete(p.id);
      disconnectedPractice.delete(p.id);
    }
  }
  for (const r of rooms.values()) {
    if (r.battle) {
      tickBattle(r.battle, now);
      if (['finished', 'aborted'].includes(r.battle.status)) finishRoom(r, now);
      if (ticks % 2 === 0) io.to(r.id).emit('battle', battleView(r.battle));
    }
    const active = r.battle && !['finished', 'aborted'].includes(r.battle.status);
    if (!active) {
      for (const m of [...r.members])
        if (m.disconnectedAt && now - m.disconnectedAt > 10000) removeMember(r, m.id);
      if (now - r.updatedAt > 900000) {
        io.to(r.id).emit('notice', 'room_expired');
        rooms.delete(r.code);
      }
    }
  }
  for (const [key, item] of pending) {
    if (!item.saving && now - item.lastTry > 5000) {
      item.saving = true;
      item.lastTry = now;
      void saveResult(item.identity.userId!, item.result)
        .then(() => {
          pending.delete(key);
          io.to(sockets.get(item.identity.id) || '').emit('saved', { id: item.result.id });
        })
        .catch(() => {
          item.saving = false;
        });
    }
  }
}, 50);
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('request_failed', err instanceof Error ? err.message : 'unknown');
    failure(res, 'server_error', 500);
  },
);
await recoverSessions();
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
  console.log(`codadash server http://127.0.0.1:${process.env.PORT || 3001}`),
);
process.on('SIGTERM', () => {
  draining = true;
  io.emit('notice', 'server_maintenance');
  const check = setInterval(() => {
    const active =
      [...practices.values()].some((p) => !['finished', 'aborted'].includes(p.status)) ||
      [...rooms.values()].some(
        (r) => r.battle && !['finished', 'aborted'].includes(r.battle.status),
      );
    if (!active && !pending.size) {
      clearInterval(check);
      clearInterval(timer);
      io.close();
      server.close(() => process.exit(0));
    }
  }, 1000);
  setTimeout(() => process.exit(0), 180000).unref();
});
