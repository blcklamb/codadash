import { io, type Socket } from 'socket.io-client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const base = process.env.LOAD_URL || 'http://127.0.0.1:3001',
  minutes = Number(process.env.LOAD_MINUTES || 30),
  roomCount = Number(process.env.LOAD_ROOMS || 20),
  practiceCount = Number(process.env.LOAD_PRACTICES || 10);
const latency: number[] = [],
  errors: string[] = [],
  results = new Map<string, Map<string, any>>();
let completedPractices = 0,
  completedMatches = 0,
  commandCount = 0,
  ending = false;
async function request(path: string, token?: string, body?: unknown) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(path + ': ' + JSON.stringify(data));
  return data;
}
type Client = {
  id: string;
  token: string;
  socket: Socket;
  state: any;
  seq: number;
  busy: boolean;
  kind: 'room' | 'practice';
};
const clients: Client[] = [];
async function client(kind: Client['kind']) {
  const g = await request('/v1/guest-sessions', undefined, {});
  const socket = io(base, { auth: { token: g.token }, transports: ['websocket'] });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  const c: Client = { ...g, socket, state: null, seq: 0, busy: false, kind };
  socket.on('notice', (m) => errors.push(m));
  socket.on('battle', (s) => {
    if (c.state?.id !== s.id) c.seq = 0;
    c.state = s;
    const me = s.players.find((p: any) => p.id === c.id);
    if (me) c.seq = Math.max(c.seq, me.typing.lastSeq);
  });
  socket.on('practice', (s) => {
    if (c.state?.id !== s.id) c.seq = 0;
    c.state = s;
    c.seq = Math.max(c.seq, s.typing.lastSeq);
  });
  socket.on('result', (r) => {
    if (kind === 'room') {
      let entries = results.get(r.id);
      if (!entries) {
        entries = new Map();
        results.set(r.id, entries);
      }
      entries.set(c.id, r);
      if (entries.size === 2) {
        const [a, b] = [...entries.values()];
        if (!(
          (a.outcome === 'draw' && b.outcome === 'draw') ||
          (a.outcome === 'win' && b.outcome === 'loss') ||
          (a.outcome === 'loss' && b.outcome === 'win')
        ))
          errors.push('mismatched outcome ' + r.id);
        completedMatches++;
      }
      if (!ending) command(c, 'rematch');
    } else {
      completedPractices++;
      if (!ending) void startPractice(c).catch((e) => errors.push(String(e)));
    }
  });
  clients.push(c);
  return c;
}
function command(c: Client, op: string) {
  c.socket.emit('command', { requestId: crypto.randomUUID(), op }, (r: any) => {
    if (r.error) errors.push(r.error);
  });
}
async function attach(c: Client, a: any) {
  await new Promise<void>((resolve, reject) =>
    c.socket.emit('attach', a, (r: any) => (r.error ? reject(Error(r.error)) : resolve())),
  );
}
async function startPractice(c: Client) {
  const p = await request('/v1/practice-sessions', c.token, {
    language: 'javascript',
    difficulty: 'beginner',
    duration: 120,
    mode: 'speed',
  });
  await attach(c, { id: p.id });
}
for (let i = 0; i < roomCount; i++) {
  const a = await client('room'),
    b = await client('room');
  const room = await request('/v1/rooms', a.token, {
    language: 'javascript',
    difficulty: 'beginner',
    name: `loadA${i}`,
  });
  const joined = await request('/v1/rooms/join', b.token, { code: room.code, name: `loadB${i}` });
  await attach(a, room);
  await attach(b, joined);
  command(a, 'ready');
  command(b, 'ready');
}
for (let i = 0; i < practiceCount; i++) {
  const c = await client('practice');
  await startPractice(c);
}
console.log(
  JSON.stringify({
    event: 'load_started',
    clients: clients.length,
    rooms: roomCount,
    practices: practiceCount,
    minutes,
  }),
);
const start = performance.now();
const typing = setInterval(() => {
  for (const c of clients) {
    const s = c.state;
    if (!s || s.status !== 'playing' || c.busy) continue;
    const me = c.kind === 'room' ? s.players.find((p: any) => p.id === c.id) : s;
    const target =
      c.kind === 'room'
        ? me.drops.find((d: any) => d.id === me.targetId && d.spawnAt <= Date.now())?.snippet.target
        : s.card?.target;
    if (!target) continue;
    const char = target[me.typing.buffer.length];
    if (!char) continue;
    const a = { seq: ++c.seq, op: 'insert', char };
    const began = performance.now();
    c.busy = true;
    commandCount++;
    c.socket.timeout(5000).emit('input', [a], (error: any, r: any) => {
      c.busy = false;
      latency.push(performance.now() - began);
      if (error || r?.error) errors.push(String(error || r.error));
    });
  }
}, 180);
const heartbeat = setInterval(
  () =>
    console.log(
      JSON.stringify({
        event: 'load_progress',
        seconds: Math.round((performance.now() - start) / 1000),
        completedMatches,
        completedPractices,
        commands: commandCount,
        errors: errors.length,
      }),
    ),
  60000,
);
await new Promise((resolve) => setTimeout(resolve, minutes * 60000));
ending = true;
clearInterval(typing);
clearInterval(heartbeat);
for (const c of clients) command(c, 'leave');
await new Promise((r) => setTimeout(r, 500));
for (const c of clients) c.socket.disconnect();
latency.sort((a, b) => a - b);
const report = {
  durationMinutes: minutes,
  clients: clients.length,
  rooms: roomCount,
  practices: practiceCount,
  completedMatches,
  completedPractices,
  commands: commandCount,
  inputAckP95Ms: latency[Math.floor(latency.length * 0.95)] || 0,
  inputAckMaxMs: latency.at(-1) || 0,
  errors,
};
mkdirSync('output', { recursive: true });
writeFileSync('output/load-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (errors.length || report.inputAckP95Ms > 50) process.exitCode = 1;
