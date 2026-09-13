import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { io, type Socket } from 'socket.io-client';
const url = 'http://127.0.0.1:3102';
let child: ChildProcess;
const sockets: Socket[] = [];
async function api(path: string, token?: string, body?: unknown) {
  const response = await fetch(url + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
async function guest() {
  return (await api('/v1/guest-sessions', undefined, {})).data as { id: string; token: string };
}
async function connect(g: { token: string }) {
  const socket = io(url, { auth: { token: g.token }, transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}
function emit(s: Socket, name: string, data: unknown): Promise<any> {
  return new Promise((resolve, reject) =>
    s
      .timeout(3000)
      .emit(name, data, (err: any, value: any) => (err ? reject(err) : resolve(value))),
  );
}
function event<T = any>(
  s: Socket,
  name: string,
  predicate: (v: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      s.off(name, handler);
      reject(new Error('Timed out: ' + name));
    }, 10000);
    function handler(v: T) {
      if (predicate(v)) {
        clearTimeout(timeout);
        s.off(name, handler);
        resolve(v);
      }
    }
    s.on(name, handler);
  });
}
beforeAll(async () => {
  child = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
    env: { ...process.env, PORT: '3102', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: 'pipe',
  });
  let output = '';
  child.stdout?.on('data', (d) => (output += d));
  child.stderr?.on('data', (d) => (output += d));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url + '/healthz')).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(output);
});
afterAll(() => {
  sockets.forEach((s) => s.disconnect());
  child?.kill('SIGKILL');
});
describe('real server ownership and idempotence', () => {
  it('requires authentication, validates settings, and prevents a second active session', async () => {
    expect((await api('/v1/me/records')).status).toBe(401);
    const g = await guest();
    expect(
      (
        await api('/v1/practice-sessions', g.token, {
          language: 'ruby',
          mode: 'speed',
          duration: 60,
        })
      ).status,
    ).toBe(400);
    const a = await api('/v1/practice-sessions', g.token, {
      language: 'python',
      difficulty: 'beginner',
      mode: 'speed',
      duration: 30,
    });
    expect(a.status).toBe(200);
    expect(
      (
        await api('/v1/practice-sessions', g.token, {
          language: 'python',
          difficulty: 'beginner',
          mode: 'speed',
          duration: 30,
        })
      ).status,
    ).toBe(409);
    const attacker = await connect(await guest());
    expect((await emit(attacker, 'attach', { id: a.data.id })).error).toBe('room_not_found');
  });
  it('serializes simultaneous joins, rejects third player, prevents stolen participant token', async () => {
    const a = await guest(),
      b = await guest(),
      c = await guest();
    const created = (
      await api('/v1/rooms', a.token, {
        language: 'javascript',
        difficulty: 'beginner',
        name: 'Ada',
      })
    ).data;
    const responses = await Promise.all([
      api('/v1/rooms/join', b.token, { code: created.code, name: 'Lin' }),
      api('/v1/rooms/join', c.token, { code: created.code, name: 'Ken' }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const wrong = await connect(await guest());
    expect(
      (await emit(wrong, 'attach', { id: created.id, participantToken: created.participantToken }))
        .error,
    ).toBe('room_not_found');
    const host = await connect(a);
    await emit(host, 'attach', created);
    const id = crypto.randomUUID();
    await emit(host, 'command', { requestId: id, op: 'ready' });
    const state = event(host, 'room');
    await emit(host, 'command', { requestId: id, op: 'ready' });
    await emit(host, 'command', { requestId: crypto.randomUUID(), op: 'sync' });
    expect((await state).members.find((m: any) => m.id === a.id).ready).toBe(true);
    await emit(host, 'command', { requestId: crypto.randomUUID(), op: 'leave' });
  });
  it('replays the correct remaining player result after host leaves and remaining player reconnects', async () => {
    const a = await guest(),
      b = await guest(),
      sa = await connect(a),
      sb = await connect(b);
    const room = (
      await api('/v1/rooms', a.token, {
        language: 'javascript',
        difficulty: 'beginner',
        name: 'Ada',
      })
    ).data;
    const join = (await api('/v1/rooms/join', b.token, { code: room.code, name: 'Lin' })).data;
    await emit(sa, 'attach', room);
    await emit(sb, 'attach', join);
    const playing = event(sa, 'battle', (s: any) => s.status === 'playing');
    await emit(sa, 'command', { requestId: crypto.randomUUID(), op: 'ready' });
    await emit(sb, 'command', { requestId: crypto.randomUUID(), op: 'ready' });
    await playing;
    const result = event(sb, 'result');
    await emit(sa, 'command', { requestId: crypto.randomUUID(), op: 'leave' });
    expect((await result).outcome).toBe('win');
    sb.disconnect();
    const restored = await connect(b),
      replayed = event(restored, 'result');
    await emit(restored, 'attach', join);
    expect((await replayed).outcome).toBe('win');
    await emit(restored, 'command', { requestId: crypto.randomUUID(), op: 'leave' });
  });
  it('duplicate input at simulated 100ms roundtrip is applied exactly once', async () => {
    const g = await guest(),
      s = await connect(g);
    const p = (
      await api('/v1/practice-sessions', g.token, {
        language: 'javascript',
        difficulty: 'beginner',
        mode: 'speed',
        duration: 30,
      })
    ).data;
    await emit(s, 'attach', p);
    const state = await event(s, 'practice', (p: any) => p.status === 'playing');
    const first = { seq: 1, op: 'insert', char: state.card.target[0] };
    await new Promise((r) => setTimeout(r, 50));
    await emit(s, 'input', [first]);
    await new Promise((r) => setTimeout(r, 50));
    await emit(s, 'input', [first]);
    const next = await event(s, 'practice', (p: any) => p.typing.lastSeq === 1);
    expect(next.typing.attempts).toBe(1);
    expect(next.typing.buffer).toHaveLength(1);
    await emit(s, 'command', { requestId: crypto.randomUUID(), op: 'leave' });
  });
});

it('normalizes legacy API levels and serves an intermediate daily deck', async () => {
  for (const [difficulty, expected] of [
    ['beginner', 'intermediate'],
    ['standard', 'advanced'],
    ['intermediate', 'intermediate'],
    ['advanced', 'advanced'],
  ] as const) {
    const g = await guest();
    const created = await api('/v1/practice-sessions', g.token, {
      language: 'javascript',
      mode: 'speed',
      difficulty,
    });
    expect(created.status).toBe(200);
    const socket = await connect(g);
    const state = event(socket, 'practice', (p) => p.status === 'playing');
    await emit(socket, 'attach', { kind: 'practice', id: created.data.id });
    const practice = await state;
    expect(practice.difficulty).toBe(expected);
    expect(practice.card.difficulty).toBe(expected);
    await emit(socket, 'command', { op: 'leave', requestId: crypto.randomUUID() });
  }
  const daily = (await api('/v1/daily-challenges?language=python')).data;
  expect(daily).toMatchObject({
    difficulty: 'intermediate',
    duration: 60,
    count: 10,
    version: '2.0.0',
  });
  const g = await guest();
  expect(
    (
      await api('/v1/rooms', g.token, {
        language: 'javascript',
        name: 'Ada',
        difficulty: 'advanced',
      })
    ).status,
  ).toBe(400);
});
