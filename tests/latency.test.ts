import { beforeAll, afterAll, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { io, type Socket } from 'socket.io-client';
const base = 'http://127.0.0.1:3104';
let processHandle: ChildProcess, proxy: Server, wss: WebSocketServer;
const clients: Socket[] = [];
async function post(path: string, body: unknown, token?: string) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
function next(
  socket: Socket,
  name: string,
  predicate: (data: any) => boolean = () => true,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(name, handler);
      reject(Error(name + ' timeout'));
    }, 12000);
    function handler(data: any) {
      if (predicate(data)) {
        clearTimeout(timeout);
        socket.off(name, handler);
        resolve(data);
      }
    }
    socket.on(name, handler);
  });
}
function emit(s: Socket, name: string, data: any): Promise<any> {
  return new Promise((resolve, reject) =>
    s
      .timeout(5000)
      .emit(name, data, (error: any, response: any) => (error ? reject(error) : resolve(response))),
  );
}
beforeAll(async () => {
  processHandle = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
    env: { ...process.env, PORT: '3104', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/healthz')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  proxy = createServer();
  wss = new WebSocketServer({ noServer: true });
  proxy.on('upgrade', (req, socket, head) =>
    wss.handleUpgrade(req, socket, head, (client) => {
      const upstream = new WebSocket('ws://127.0.0.1:3104' + req.url);
      const buffered: { data: any; binary: boolean }[] = [];
      const forward = (receiver: WebSocket, data: any, binary: boolean) =>
        setTimeout(() => {
          if (receiver.readyState === WebSocket.OPEN) receiver.send(data, { binary });
        }, 50);
      upstream.on('open', () => {
        for (const entry of buffered) forward(upstream, entry.data, entry.binary);
      });
      client.on('message', (data, binary) => {
        if (upstream.readyState === WebSocket.OPEN) forward(upstream, data, binary);
        else buffered.push({ data, binary });
      });
      upstream.on('message', (data, binary) => forward(client, data, binary));
      client.on('close', () => upstream.close());
      upstream.on('close', () => client.close());
      client.on('error', () => upstream.close());
      upstream.on('error', () => client.close());
    }),
  );
  await new Promise<void>((r) => proxy.listen(3105, '127.0.0.1', r));
});
afterAll(() => {
  clients.forEach((c) => c.disconnect());
  wss.clients.forEach((c) => c.terminate());
  wss.close();
  proxy.close();
  processHandle.kill('SIGKILL');
});
it('100ms delayed transport preserves two-player state and matching final results', async () => {
  const a = await post('/v1/guest-sessions', {}),
    b = await post('/v1/guest-sessions', {});
  const sa = io('http://127.0.0.1:3105', { auth: { token: a.token }, transports: ['websocket'] }),
    sb = io('http://127.0.0.1:3105', { auth: { token: b.token }, transports: ['websocket'] });
  clients.push(sa, sb);
  await Promise.all([next(sa, 'connect'), next(sb, 'connect')]);
  const room = await post(
      '/v1/rooms',
      { name: 'Ada', language: 'javascript', difficulty: 'beginner' },
      a.token,
    ),
    join = await post('/v1/rooms/join', { name: 'Lin', code: room.code }, b.token);
  await emit(sa, 'attach', room);
  await emit(sb, 'attach', join);
  const startA = next(sa, 'battle', (d) => d.status === 'playing'),
    startB = next(sb, 'battle', (d) => d.status === 'playing');
  await emit(sa, 'command', { requestId: crypto.randomUUID(), op: 'ready' });
  await emit(sb, 'command', { requestId: crypto.randomUUID(), op: 'ready' });
  const [stateA, stateB] = await Promise.all([startA, startB]);
  expect(stateA.id).toBe(stateB.id);
  expect(stateA.players[0].drops).toEqual(stateB.players[0].drops);
  const target = stateA.players[0].drops[0].snippet.target;
  let seq = 0;
  const began = performance.now();
  for (const char of target) await emit(sa, 'input', [{ seq: ++seq, op: 'insert', char }]);
  expect(performance.now() - began).toBeGreaterThanOrEqual(target.length * 90);
  const resultA = next(sa, 'result'),
    resultB = next(sb, 'result');
  await emit(sa, 'command', { requestId: crypto.randomUUID(), op: 'leave' });
  const [ra, rb] = await Promise.all([resultA, resultB]);
  expect(ra.id).toBe(rb.id);
  expect(ra.outcome).toBe('loss');
  expect(rb.outcome).toBe('win');
  expect(ra.baseChars).toBe(rb.opponentStats.baseChars);
  expect(ra.hp).toBe(rb.opponentStats.hp);
  expect(ra.accuracy).toBe(rb.opponentStats.accuracy);
}, 20000);
