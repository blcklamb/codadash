import { useEffect, useRef, useState } from 'react';
import { useTypingInput } from './typing-input';
import { useTranslation } from 'react-i18next';
import { socket, identity, saveLocal, read, settingsDefault, type Settings } from './lib';
import {
  applyTyping,
  stats,
  prefix,
  type Practice,
  type Battle,
  type Result,
  type Action,
  type Typing,
  type Player,
} from '../../../packages/shared/src/engine';
import { EXTENSIONS, type Snippet } from '../../../packages/shared/src/content';
import { Terminal, Heart, WifiOff, ArrowLeft, Volume2, VolumeX } from './pixel-icons';
export type PracticeView = Omit<Practice, 'cards'> & { card: Snippet | null; serverNow: number };
export type BattleView = Omit<Battle, 'cards'> & { serverNow: number };
export type RoomView = {
  id: string;
  code: string;
  language: string;
  difficulty: string;
  hostId: string;
  members: { id: string; name: string; ready: boolean; connected: boolean }[];
  rematch: string[];
  battleId?: string;
};
export type Active = { id: string; kind: 'practice' | 'room'; participantToken?: string };
let audioContext: AudioContext | null = null;
export function tone(kind: 'key' | 'complete' | 'damage') {
  const s = read<Settings>('keybit.settings', settingsDefault);
  if (!s.sound) return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(
      kind === 'complete' ? 880 : kind === 'damage' ? 110 : 440,
      audioContext.currentTime,
    );
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.045);
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
  } catch {}
}
export function useGame(
  active: Active | null,
  onResult: (r: Result & { saved: boolean }) => void,
  onNotice: (message: string) => void,
) {
  const [practice, setPractice] = useState<PracticeView | null>(null),
    [battle, setBattle] = useState<BattleView | null>(null),
    [room, setRoom] = useState<RoomView | null>(null),
    [connected, setConnected] = useState(false),
    [playerId, setPlayerId] = useState(''),
    [now, setNow] = useState(Date.now());
  const offset = useRef(0),
    pending = useRef<Action[]>([]),
    seq = useRef(0),
    pRef = useRef<PracticeView | null>(null),
    bRef = useRef<BattleView | null>(null),
    playerRef = useRef(''),
    resultRef = useRef(onResult),
    noticeRef = useRef(onNotice),
    lastCount = useRef(0),
    lastHp = useRef(5),
    gameId = useRef(''),
    connectedRef = useRef(false),
    activeRef = useRef(active);
  resultRef.current = onResult;
  noticeRef.current = onNotice;
  activeRef.current = active;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), active ? 50 : 1000);
    return () => clearInterval(timer);
  }, [active?.id]);
  useEffect(() => {
    setPractice(null);
    setBattle(null);
    setRoom(null);
    pRef.current = null;
    bRef.current = null;
    pending.current = [];
    seq.current = 0;
    lastCount.current = 0;
    lastHp.current = 5;
    gameId.current = '';
    setConnected(false);
    connectedRef.current = false;
    if (!active) {
      socket.disconnect();
      return;
    }
    let disposed = false;
    function receivePractice(incoming: PracticeView) {
      if (incoming.id !== active?.id) return;
      offset.current = incoming.serverNow - Date.now();
      pending.current = pending.current.filter((a) => a.seq > incoming.typing.lastSeq);
      seq.current = Math.max(seq.current, incoming.typing.lastSeq);
      const view = structuredClone(incoming);
      if (view.card && view.status === 'playing')
        for (const a of pending.current) {
          const r = applyTyping(view.typing, view.card.target, a);
          if (r.complete) break;
        }
      pRef.current = view;
      setPractice(view);
      if (incoming.typing.completed > lastCount.current) {
        tone('complete');
        lastCount.current = incoming.typing.completed;
      }
    }
    function receiveBattle(incoming: BattleView) {
      offset.current = incoming.serverNow - Date.now();
      if (gameId.current !== incoming.id) {
        gameId.current = incoming.id;
        pending.current = [];
        seq.current = 0;
        lastCount.current = 0;
        lastHp.current = 5;
      }
      const player = incoming.players.find((p) => p.id === playerRef.current);
      if (player) {
        pending.current = pending.current.filter((a) => a.seq > player.typing.lastSeq);
        seq.current = Math.max(seq.current, player.typing.lastSeq);
        if (player.typing.completed > lastCount.current) {
          tone('complete');
          lastCount.current = player.typing.completed;
        }
        if (player.hp < lastHp.current) {
          tone('damage');
          lastHp.current = player.hp;
        }
      }
      const view = structuredClone(incoming),
        mine = view.players.find((p) => p.id === playerRef.current);
      if (mine && view.status === 'playing') {
        for (const a of pending.current) {
          if (a.op === 'select') {
            mine.typing.lastSeq = a.seq;
            if (!mine.typing.buffer) mine.targetId = a.targetId || null;
            continue;
          }
          const drop = mine.drops.find((d) => d.id === mine.targetId);
          if (drop) {
            const r = applyTyping(mine.typing, drop.snippet.target, a);
            if (r.complete) break;
          }
        }
      }
      bRef.current = view;
      setBattle(view);
    }
    const onConnect = () => {
      pending.current = [];
      socket.emit('attach', active, (response: { error?: string; playerId?: string }) => {
        if (disposed) return;
        if (response.error) {
          noticeRef.current(response.error);
          return;
        }
        playerRef.current = response.playerId || '';
        setPlayerId(playerRef.current);
        connectedRef.current = true;
        setConnected(true);
      });
    };
    const onDisconnect = () => {
      connectedRef.current = false;
      setConnected(false);
      pending.current = [];
    };
    const onError = (err: Error) => {
      connectedRef.current = false;
      setConnected(false);
      noticeRef.current(err.message === 'unauthorized' ? 'unauthorized' : 'server_unavailable');
    };
    const onRoom = (r: RoomView) => setRoom(r);
    const onResultEvent = async (r: Result & { saved: boolean }) => {
      const who = await identity();
      if (!who.account && !saveLocal(r)) {
        noticeRef.current('saveFailure');
        r.saved = false;
        (r as Result & { saved: boolean; saveError?: boolean }).saveError = true;
      }
      resultRef.current(r);
    };
    const onSaved = ({ id }: { id: string }) =>
      window.dispatchEvent(new CustomEvent('keybit:saved', { detail: id }));
    socket
      .on('connect', onConnect)
      .on('disconnect', onDisconnect)
      .on('connect_error', onError)
      .on('practice', receivePractice)
      .on('battle', receiveBattle)
      .on('room', onRoom)
      .on('result', onResultEvent)
      .on('saved', onSaved)
      .on('notice', noticeRef.current);
    void identity()
      .then((i) => {
        if (disposed) return;
        playerRef.current = i.id;
        setPlayerId(i.id);
        socket.auth = (done: (value: { token: string }) => void) => {
          void identity()
            .then((current) => done({ token: current.token }))
            .catch(() => noticeRef.current('server_unavailable'));
        };
        socket.connect();
      })
      .catch(() => noticeRef.current('server_unavailable'));
    const resend = setInterval(() => {
      if (pending.current.length && connectedRef.current)
        socket.emit('input', pending.current.slice(0, 20));
    }, 150);
    return () => {
      disposed = true;
      clearInterval(resend);
      socket
        .off('connect', onConnect)
        .off('disconnect', onDisconnect)
        .off('connect_error', onError)
        .off('practice', receivePractice)
        .off('battle', receiveBattle)
        .off('room', onRoom)
        .off('result', onResultEvent)
        .off('saved', onSaved);
      socket.off('notice');
      socket.disconnect();
    };
  }, [active?.id]);
  function send(op: Action['op'], char?: string, targetId?: string) {
    if (!connectedRef.current) return;
    const p = pRef.current,
      b = bRef.current;
    const typing = p?.typing || b?.players.find((p) => p.id === playerRef.current)?.typing;
    if (!typing) return;
    if ((p?.status || b?.status) !== 'playing') return;
    const target =
      p?.card?.target ||
      b?.players
        .find((p) => p.id === playerRef.current)
        ?.drops.find((d) => d.id === b.players.find((p) => p.id === playerRef.current)?.targetId)
        ?.snippet.target;
    if (!target) return;
    // Wait for the next server card after completing a block; never replay keys against stale code.
    if (typing.completed > lastCount.current) return;
    const a: Action = { seq: ++seq.current, op, char, targetId };
    pending.current.push(a);
    socket.emit('input', [a]);
    if (p && p.card) {
      const next = structuredClone(p);
      applyTyping(next.typing, next.card!.target, a);
      pRef.current = next;
      setPractice(next);
    } else if (b) {
      const next = structuredClone(b),
        mine = next.players.find((p) => p.id === playerRef.current)!;
      if (op === 'select') {
        mine.targetId = targetId || mine.targetId;
        mine.typing.lastSeq = a.seq;
      } else {
        const d = mine.drops.find((d) => d.id === mine.targetId);
        if (d) applyTyping(mine.typing, d.snippet.target, a);
      }
      bRef.current = next;
      setBattle(next);
    }
    if (op === 'insert') tone('key');
  }
  function command(op: string, extra: Record<string, string> = {}) {
    socket.emit(
      'command',
      { requestId: crypto.randomUUID(), op, ...extra },
      (r: { error?: string }) => {
        if (r.error) noticeRef.current(r.error);
      },
    );
  }
  return { practice, battle, room, connected, playerId, now, send, command };
}
export type Game = ReturnType<typeof useGame>;
const visibleChar = (char: string) => (char === ' ' ? '·' : char === '\n' ? '↵' : char);
export function TypedChar({
  expected,
  actual,
  caret,
  syntax = '',
}: {
  expected: string;
  actual?: string;
  caret?: boolean;
  syntax?: string;
}) {
  const error = actual !== undefined && actual !== expected;
  return (
    <span
      className={
        actual !== undefined
          ? error
            ? 'typed-error'
            : 'typed-correct'
          : caret
            ? 'caret-char'
            : syntax
      }
      data-expected={expected}
      data-actual={actual}
    >
      {error
        ? visibleChar(actual!)
        : expected === '\n'
          ? '↵'
          : expected === ' ' && caret
            ? '·'
            : expected}
    </span>
  );
}
export function Overflow({ buffer, length }: { buffer: string; length: number }) {
  return (
    <>
      {Array.from(buffer.slice(length)).map((char, i) => (
        <span className="typed-error overflow-char" key={i} data-actual={char}>
          {visibleChar(char)}
        </span>
      ))}
      {buffer.length >= length && <span className="caret-char overflow-caret">&nbsp;</span>}
    </>
  );
}
export function Code({ snippet, typing }: { snippet: Snippet; typing?: Typing }) {
  let position = 0;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typing) return;
    const viewport = root.current?.closest('.typing-surface');
    const caret = root.current?.querySelector('.caret-char');
    if (!viewport || !caret) return;
    const bounds = viewport.getBoundingClientRect(),
      cursor = caret.getBoundingClientRect();
    if (cursor.bottom > bounds.bottom - 24)
      viewport.scrollTop += cursor.bottom - bounds.bottom + 48;
    if (cursor.top < bounds.top + 24) viewport.scrollTop -= bounds.top + 24 - cursor.top;
    if (cursor.right > bounds.right - 24) viewport.scrollLeft += cursor.right - bounds.right + 48;
    if (cursor.left < bounds.left + 48) viewport.scrollLeft -= bounds.left + 48 - cursor.left;
  }, [typing?.buffer, snippet.id]);
  return (
    <div className="code-lines" ref={root}>
      {snippet.source.split('\n').map((line, i, lines) => {
        const indent = line.match(/^ */)![0].length;
        const colors: Record<number, string> = {};
        for (const match of line.matchAll(
          /("[^"]*"|'[^']*')|\b(const|let|var|int|boolean|bool|char|String|string|if|else|for|return|fn|func|def|true|false|True|False|auto|await|new|struct|while|async|try|catch|throw|match|pub|mut|import|class|static|public)\b|\b\d+\b/g,
        )) {
          const kind = match[1] ? 'syntax-string' : match[2] ? 'syntax-keyword' : 'syntax-number';
          for (let k = match.index!; k < match.index! + match[0].length; k++) colors[k] = kind;
        }
        return (
          <div className="code-line" key={i}>
            <span className="line-number">{i + 1}</span>
            <code>
              {Array.from(line).map((ch, j) => {
                if (j < indent)
                  return (
                    <span className="indent" key={j}>
                      {ch}
                    </span>
                  );
                const index = position++;
                return (
                  <TypedChar
                    key={j}
                    expected={ch}
                    actual={typing?.buffer[index]}
                    caret={typing?.buffer.length === index}
                    syntax={typing ? '' : colors[j]}
                  />
                );
              })}
              {i < lines.length - 1 &&
                (() => {
                  const index = position++;
                  return (
                    <TypedChar
                      expected={'\n'}
                      actual={typing?.buffer[index]}
                      caret={typing?.buffer.length === index}
                    />
                  );
                })()}
              {i === lines.length - 1 && typing && (
                <Overflow buffer={typing.buffer} length={snippet.target.length} />
              )}
            </code>
          </div>
        );
      })}
    </div>
  );
}
export function StatsRow({
  values,
}: {
  values: { label: string; value: string | number; unit?: string }[];
}) {
  return (
    <div className="stats-row">
      {values.map(({ label, value, unit }) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <strong>
            {value}
            <small>{unit}</small>
          </strong>
        </div>
      ))}
    </div>
  );
}
export function PracticeGame({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const { t } = useTranslation();
  const p = game.practice;
  const capture = useTypingInput({
    session: p?.id,
    enabled: p?.status === 'playing' && game.connected,
    multiline: true,
    send: game.send,
  });
  const { input, ime, focused } = capture;
  if (!p) return <div className="empty">{t('loading')}…</div>;
  if (p.status === 'aborted')
    return (
      <div className="empty">
        <h2>{t('aborted')}</h2>
        <button className="primary" onClick={onLeave}>
          {t('back')}
        </button>
      </div>
    );
  const elapsed = Math.max(0, Math.min(p.duration, (game.now - p.startAt) / 1000));
  const s = stats(p.typing, p.card?.target || '', elapsed);
  const countdown = Math.max(1, Math.ceil((p.startAt - game.now) / 1000));
  return (
    <>
      <div className="play-top">
        <button className="text-button" onClick={onLeave}>
          <ArrowLeft size={16} />
          {t('leave')}
        </button>
        <span className="session-label">
          {t(p.mode)} / {t(p.difficulty)}
        </span>
      </div>
      <StatsRow
        values={[
          { label: t('duration'), value: Math.max(0, Math.ceil(p.duration - elapsed)), unit: 's' },
          { label: t('completed'), value: s.completed },
          { label: 'CPM', value: s.cpm },
          { label: t('accuracy'), value: s.accuracy ?? '—', unit: s.accuracy === null ? '' : '%' },
        ]}
      />
      <div className="time-track">
        <i style={{ width: `${Math.max(0, 100 - (elapsed / p.duration) * 100)}%` }} />
      </div>
      {!game.connected && (
        <div className="notice warning">
          <WifiOff size={16} />
          {t('reconnecting')}
        </div>
      )}
      <section className={'editor play-editor ' + (p.typing.completed ? 'has-progress' : '')}>
        <div className="editor-toolbar">
          <span>
            <Terminal size={16} />
            warmup.{EXTENSIONS[p.language]}
          </span>
          <div className="editor-status">
            {p.typing.completed > 0 && (
              <span key={p.typing.completed} className="clear-burst" aria-hidden="true">
                {[0, 1, 2, 3].map((n) => (
                  <i key={n} />
                ))}
              </span>
            )}
            <span className="editor-tag">AUTO-INDENT ON</span>
          </div>
        </div>
        <div className="typing-surface" onClick={() => input.current?.focus()}>
          {p.card && <Code snippet={p.card} typing={p.typing} />}
          <textarea {...capture.props} aria-label="Code input" className="capture-input" />
          {p.status === 'countdown' && (
            <div className="countdown">
              <strong>{countdown}</strong>
              <span>{t('readyLabel')}</span>
            </div>
          )}
          {p.status === 'playing' && !focused && <div className="focus-cover">{t('focus')}</div>}
        </div>
        <div className="editor-footer">
          <span>{ime ? t('ime') : t('correctHint')}</span>
          <span>UTF-8</span>
        </div>
      </section>
      <p className="small-note">{t('noPause')}</p>
    </>
  );
}
function Board({
  player,
  now,
  own,
  onSelect,
}: {
  player: Player;
  now: number;
  own: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [hit, setHit] = useState(false);
  const previousHp = useRef(player.hp);
  useEffect(() => {
    if (player.hp < previousHp.current) setHit(true);
    previousHp.current = player.hp;
    const timer = setTimeout(() => setHit(false), 280);
    return () => clearTimeout(timer);
  }, [player.hp]);
  const positions: Record<string, number> = {};
  for (let col = 0; col < 2; col++) {
    const drops = player.drops
      .filter((d) => d.lane % 2 === col)
      .sort(
        (a, b) =>
          (now - a.spawnAt) / (a.expiresAt - a.spawnAt) -
          (now - b.spawnAt) / (b.expiresAt - b.spawnAt),
      );
    let prior = -40;
    drops.forEach((d, index) => {
      const wanted = Math.max(0, Math.min(1, (now - d.spawnAt) / (d.expiresAt - d.spawnAt))) * 300;
      const y = Math.min(Math.max(wanted, prior + 40), 300 - (drops.length - index - 1) * 40);
      positions[d.id] = y;
      prior = y;
    });
  }
  return (
    <section className={'rain-board ' + (own ? 'own' : 'enemy') + (hit ? ' damaged' : '')}>
      <div className="board-head">
        <span>{own ? t('you') : player.name}</span>
        <div className="hearts" aria-label={`${t('health')}: ${player.hp}`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Heart
              key={i}
              size={16}
              fill={i < player.hp ? 'currentColor' : 'none'}
              className={i < player.hp ? 'alive' : 'dead'}
            />
          ))}
        </div>
      </div>
      <div className="rain-field">
        {player.drops.map((d) => {
          const progress = Math.max(0, Math.min(1, (now - d.spawnAt) / (d.expiresAt - d.spawnAt)));
          const incoming = now < d.spawnAt;
          return (
            <button
              tabIndex={-1}
              key={d.id}
              className={
                'drop ' +
                (d.id === player.targetId && own ? 'target ' : '') +
                (d.attack ? 'attack ' : '') +
                (incoming ? 'incoming' : '')
              }
              style={{
                top: `${(positions[d.id] / 340) * 100}%`,
                left: `${2 + (d.lane % 2) * 50}%`,
                zIndex: d.id === player.targetId ? 2 : 1,
              }}
              onClick={() => onSelect(d.id)}
              disabled={!own || !!player.typing.buffer}
            >
              {incoming ? (
                <>
                  <span>↘</span> {t('attack')}
                </>
              ) : (
                <>
                  {Array.from(d.snippet.target).map((ch, i) => (
                    <TypedChar
                      key={i}
                      expected={ch}
                      actual={own && d.id === player.targetId ? player.typing.buffer[i] : undefined}
                    />
                  ))}
                  {own && d.id === player.targetId && (
                    <Overflow buffer={player.typing.buffer} length={d.snippet.target.length} />
                  )}
                </>
              )}
            </button>
          );
        })}
        <div className="rain-water" />
      </div>
      <div className="board-bottom">
        <span>{t('attackCombo')}</span>
        <div className="combo-bits">
          {[0, 1, 2].map((n) => (
            <i className={n < player.combo ? 'lit' : ''} key={n} />
          ))}
        </div>
        <span>{player.baseChars} chars</span>
      </div>
    </section>
  );
}
export function BattleGame({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const { t } = useTranslation();
  const b = game.battle;
  const capture = useTypingInput({
    session: b?.id,
    enabled: b?.status === 'playing' && game.connected,
    multiline: false,
    send: game.send,
    select: (direction) => {
      const mine = b?.players.find((p) => p.id === game.playerId);
      if (!mine || mine.typing.buffer) return;
      const drops = mine.drops
        .filter((d) => d.spawnAt <= game.now)
        .sort((a, b) => a.expiresAt - b.expiresAt);
      const index = drops.findIndex((d) => d.id === mine.targetId);
      const next = (index + direction + drops.length) % drops.length;
      if (drops[next]) game.send('select', undefined, drops[next].id);
    },
  });
  const { input, ime, focused } = capture;
  if (!b) return <div className="empty">{t('loading')}…</div>;
  const mine = b.players.find((p) => p.id === game.playerId),
    enemy = b.players.find((p) => p.id !== game.playerId);
  if (!mine || !enemy) return null;
  const target = mine.drops.find((d) => d.id === mine.targetId),
    countdown = Math.ceil((b.startAt - game.now) / 1000);
  return (
    <>
      <div className="play-top">
        <button className="text-button" onClick={onLeave}>
          <ArrowLeft size={16} />
          {t('leave')}
        </button>
        <span className="battle-clock">
          {Math.max(0, Math.ceil((b.endAt - Math.max(game.now, b.startAt)) / 1000))}
          <small> SEC</small>
        </span>
        <span className="session-label">{t(b.difficulty)}</span>
      </div>
      {!game.connected && (
        <div className="notice warning">
          <WifiOff size={16} />
          {t('reconnecting')}
        </div>
      )}
      <div className="battle-layout">
        <Board
          player={mine}
          now={game.now}
          own
          onSelect={(id) => {
            game.send('select', undefined, id);
            input.current?.focus();
          }}
        />
        <div className="versus">VS</div>
        <Board player={enemy} now={game.now} own={false} onSelect={() => {}} />
        {b.status === 'countdown' && (
          <div className="countdown">
            <strong>{Math.max(1, countdown)}</strong>
            <span>{t('readyLabel')}</span>
          </div>
        )}
      </div>
      <div className="battle-input-wrap" onClick={() => input.current?.focus()}>
        <Terminal size={20} />
        <code>
          {mine.typing.buffer ? (
            Array.from(mine.typing.buffer).map((ch, i) => (
              <TypedChar key={i} expected={target?.snippet.target[i] || ''} actual={ch} />
            ))
          ) : (
            <span className="placeholder">{target?.snippet.target || t('instructions')}</span>
          )}
        </code>
        <span className="input-caret" />
        <textarea {...capture.props} aria-label="Battle input" className="capture-input" />
      </div>
      <p className="small-note">{ime ? t('ime') : !focused ? t('focus') : t('selectHint')}</p>
    </>
  );
}
