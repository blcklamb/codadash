import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Terminal,
  ArrowUpRight,
  Timer,
  CalendarDays,
  Swords,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
  Command,
  Keyboard,
  ArrowRight,
  Copy,
  Check,
  User,
  Globe,
  Code2 as Github,
  Trophy,
  Flame,
  ArrowLeft,
  LogOut,
  RefreshCw,
  AlertCircle,
} from './pixel-icons';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-sans-kr/700.css';
import {
  api,
  identity,
  read,
  write,
  localRecords,
  localBests,
  localDays,
  supabase,
  i18next,
  settingsDefault,
  type Settings,
} from './lib';
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  EXTENSIONS,
  deck,
  dayKey,
  dayBefore,
  streaks,
  VERSION,
  type Language,
  type PracticeDifficulty,
  type BattleDifficulty,
  practiceDifficulty,
  battleDifficulty,
} from '../../../packages/shared/src/content';
import type { Result } from '../../../packages/shared/src/engine';
import {
  useGame,
  PracticeGame,
  BattleGame,
  Code,
  StatsRow,
  type Active,
  type RoomView,
} from './game';
import './style.css';
const queryClient = new QueryClient();
type Screen = 'speed' | 'daily' | 'battle' | 'records' | 'settings';
const screens: Screen[] = ['speed', 'daily', 'battle', 'records', 'settings'];
function rememberedActive(): Active | null {
  try {
    return JSON.parse(sessionStorage.getItem('keybit.active') || 'null');
  } catch {
    return null;
  }
}
function App() {
  const { t } = useTranslation(),
    navigate = useNavigate(),
    location = useLocation();
  const path = location.pathname.split('/')[1],
    mode: Screen = screens.includes(path as Screen) ? (path as Screen) : 'speed';
  const [language, setLanguageState] = useState<Language>(read('keybit.language', 'javascript')),
    [difficulty, setDifficulty] = useState<PracticeDifficulty>(() =>
      practiceDifficulty(
        read('keybit.practiceDifficulty', read('keybit.difficulty', 'intermediate')),
      ),
    ),
    [battleLevel, setBattleLevel] = useState<BattleDifficulty>(() =>
      battleDifficulty(read('keybit.battleDifficulty', read('keybit.difficulty', 'beginner'))),
    ),
    [duration, setDuration] = useState<30 | 60 | 120>(read('keybit.duration', 60));
  const [active, setActive] = useState<Active | null>(rememberedActive),
    [result, setResult] = useState<(Result & { saved: boolean }) | null>(null),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [userId, setUserId] = useState<string | null>(null),
    [settings, setSettings] = useState<Settings>(read('keybit.settings', settingsDefault)),
    [recordsVersion, setRecordsVersion] = useState(0),
    [exitTarget, setExitTarget] = useState<Screen | null>(null);
  const [name, setName] = useState(
      read('keybit.name', 'dev_' + Math.random().toString(36).slice(2, 6)),
    ),
    [joinCode, setJoinCode] = useState(new URLSearchParams(location.search).get('code') || ''),
    [copied, setCopied] = useState(''),
    [historySource, setHistorySource] = useState<'account' | 'device'>('device');
  const dialog = useRef<HTMLDialogElement>(null);
  const game = useGame(
    active,
    (r) => {
      setResult(r);
      setRecordsVersion((v) => v + 1);
      if (r.saved) void queryClient.invalidateQueries({ queryKey: ['records'] });
    },
    (message) => {
      setNotice(message);
      if (['room_expired', 'room_not_found', 'unauthorized'].includes(message)) {
        setActive(null);
        setResult(null);
      }
    },
  );
  const history = useQuery({
    queryKey: ['records', userId, recordsVersion],
    queryFn: () => (userId ? api<Result[]>('/v1/me/records') : Promise.resolve(localRecords())),
    retry: 1,
  });
  const bests = useQuery({
    queryKey: ['records', 'bests', userId, recordsVersion],
    queryFn: () => (userId ? api<Result[]>('/v1/me/bests') : Promise.resolve(localBests())),
  });
  const activity = useQuery({
    queryKey: ['records', 'activity', userId, recordsVersion],
    queryFn: () =>
      userId ? api<{ days: string[] }>('/v1/me/activity') : Promise.resolve({ days: localDays() }),
  });
  const comparisonRecords = useMemo(
    () => [...(history.data || []), ...(bests.data || [])],
    [history.data, bests.data],
  );
  const allRecords = history.data || [],
    deviceRecords = useMemo(() => localRecords(), [recordsVersion]),
    currentRecords = userId && historySource === 'device' ? deviceRecords : allRecords;
  const [filterMode, setFilterMode] = useState('all'),
    [filterLang, setFilterLang] = useState('all');
  useEffect(() => {
    void supabase?.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null);
      if (data.session) setHistorySource('account');
    });
    const listener = supabase?.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
      if (session) setHistorySource('account');
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    try {
      if (active) sessionStorage.setItem('keybit.active', JSON.stringify(active));
      else sessionStorage.removeItem('keybit.active');
    } catch {}
  }, [active]);
  useEffect(() => {
    document.documentElement.lang = i18next.language;
  }, [i18next.language]);
  useEffect(() => {
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal';
    document.documentElement.dataset.effects = settings.effects;
    document.documentElement.dataset.shake = settings.shake ? 'on' : 'off';
    write('keybit.settings', settings);
  }, [settings]);
  useEffect(() => {
    if (game.battle && result && game.battle.id !== result.id) setResult(null);
  }, [game.battle?.id]);
  useEffect(() => {
    const handler = (e: Event) => {
      setResult((r) => (r && r.id === (e as CustomEvent).detail ? { ...r, saved: true } : r));
      void queryClient.invalidateQueries({ queryKey: ['records'] });
    };
    window.addEventListener('keybit:saved', handler);
    return () => window.removeEventListener('keybit:saved', handler);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 8000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (location.pathname === '/auth/callback' && !location.hash)
      navigate('/settings', { replace: true });
  }, [location.pathname]);
  function setLanguage(l: Language) {
    setLanguageState(l);
    write('keybit.language', l);
  }
  function go(next: Screen) {
    if (active && !result) {
      setExitTarget(next);
      dialog.current?.showModal();
    } else {
      if (active?.kind === 'room') game.command('leave');
      setActive(null);
      setResult(null);
      navigate('/' + next);
    }
  }
  function leave() {
    setExitTarget(mode);
    dialog.current?.showModal();
  }
  function confirmLeave() {
    game.command('leave');
    setActive(null);
    setResult(null);
    dialog.current?.close();
    if (exitTarget) navigate('/' + exitTarget);
    setExitTarget(null);
  }
  async function start() {
    setBusy(true);
    setNotice('');
    try {
      const p = await api<{ id: string }>('/v1/practice-sessions', {
        language,
        difficulty,
        duration,
        mode: mode === 'daily' ? 'daily' : 'speed',
      });
      setResult(null);
      setActive({ id: p.id, kind: 'practice' });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function roomRequest(join: boolean) {
    setBusy(true);
    setNotice('');
    write('keybit.name', name);
    try {
      const r = await api<RoomView & { participantToken: string }>(
        join ? '/v1/rooms/join' : '/v1/rooms',
        join
          ? { code: joinCode.trim().toUpperCase(), name }
          : { language, difficulty: battleLevel, name },
      );
      setResult(null);
      setActive({ id: r.id, kind: 'room', participantToken: r.participantToken });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    if (!supabase) {
      setNotice('loginUnavailable');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/auth/callback', scopes: 'read:user' },
    });
    if (error) setNotice('loginUnavailable');
  }
  async function logout() {
    await supabase?.auth.signOut();
    setUserId(null);
    setHistorySource('device');
    void queryClient.invalidateQueries({ queryKey: ['records'] });
  }
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setNotice(
        i18next.language === 'ko'
          ? '복사하지 못했습니다. 코드를 직접 선택해 주세요.'
          : 'Could not copy. Please select the code manually.',
      );
    }
  }
  const days = activity.data?.days || [
      ...new Set(allRecords.filter((r) => r.dailyComplete).map((r) => r.date)),
    ],
    streak = streaks(days),
    today = dayKey();
  const relevantBest = comparisonRecords
    .filter(
      (r) =>
        r.mode === 'speed' &&
        r.language === language &&
        r.difficulty === difficulty &&
        r.duration === duration &&
        r.version === VERSION,
    )
    .sort((a, b) => b.cpm - a.cpm || (b.accuracy || 0) - (a.accuracy || 0))[0];
  const navItems = [
    [Timer, 'speed'],
    [CalendarDays, 'daily'],
    [Swords, 'battle'],
    [BarChart3, 'records'],
    [SettingsIcon, 'settings'],
  ] as const;
  const showResult = !!result,
    playing = active && !showResult && (game.practice || game.battle),
    lobby = active?.kind === 'room' && !game.battle;
  return (
    <div className="app">
      <aside className="sidebar">
        <Link
          to="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go('speed');
          }}
        >
          <span className="brand-icon">
            k<span>▪</span>
          </span>
          keybit<span className="beta">BETA</span>
        </Link>
        <div className="side-label">PLAYGROUND</div>
        <nav>
          {navItems.map(([Icon, key]) => (
            <button
              className={mode === key ? 'nav-item selected' : 'nav-item'}
              key={key}
              onClick={() => go(key)}
            >
              <Icon size={18} />
              {t(key)}
              {mode === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="pixel-grid">
            {Array.from({ length: 25 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <span>
            LESS AUTOCOMPLETE.
            <br />
            MORE FINGERWORK.
          </span>
          <small>CONTENT {VERSION} / KEYBOARD ONLY</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            playground <ChevronRight size={14} />
            <b>{t(mode)}</b>
          </span>
          <div className="header-actions">
            <button
              className="locale-switch"
              aria-label="Change language"
              disabled={!!active && !result}
              onClick={() => {
                const lng = i18next.language === 'ko' ? 'en' : 'ko';
                void i18next.changeLanguage(lng);
                write('keybit.locale', lng);
              }}
            >
              <Globe size={14} />
              {i18next.language === 'ko' ? 'KO' : 'EN'}
            </button>
            <button
              className="login-button"
              disabled={!!active && !result}
              onClick={userId ? () => go('settings') : login}
            >
              {userId ? <User size={14} /> : <Github size={14} />}
              <span>{userId ? t('accountRecords') : t('login')}</span>
            </button>
          </div>
        </header>
        <main>
          {notice && (
            <div role="alert" className="toast">
              <AlertCircle size={17} />
              <span>{t(notice, { defaultValue: notice })}</span>
              <button aria-label="Dismiss" onClick={() => setNotice('')}>
                ×
              </button>
            </div>
          )}
          <div className="mobile-notice">
            <Keyboard size={20} />
            {t('mobile')}
          </div>
          {showResult && result ? (
            <ResultScreen
              result={result}
              records={comparisonRecords}
              room={game.room}
              myId={game.playerId}
              onAgain={() => {
                if (result.mode === 'battle') game.command('rematch');
                else {
                  setActive(null);
                  void start();
                }
              }}
              onBack={() => {
                if (active?.kind === 'room') game.command('leave');
                setActive(null);
                setResult(null);
              }}
            />
          ) : playing ? (
            active?.kind === 'practice' ? (
              <PracticeGame game={game} onLeave={leave} />
            ) : (
              <BattleGame game={game} onLeave={leave} />
            )
          ) : lobby ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PRIVATE MATCH / 1 VS 1</div>
                  <h1>{t('room')}</h1>
                  <p>{t('roomReady')}</p>
                </div>
                <button className="text-button" onClick={leave}>
                  <ArrowLeft size={16} />
                  {t('leave')}
                </button>
              </div>
              {game.room ? (
                <section className="lobby-panel">
                  <div className="room-code">
                    <span>{t('code')}</span>
                    <strong>{game.room.code}</strong>
                    <button className="secondary" onClick={() => copy(game.room!.code, 'code')}>
                      {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}{' '}
                      {t(copied === 'code' ? 'copied' : 'copy')}
                    </button>
                  </div>
                  <button
                    className="text-button copy-link"
                    onClick={() =>
                      copy(window.location.origin + '/battle?code=' + game.room!.code, 'link')
                    }
                  >
                    <Copy size={14} />
                    {t(copied === 'link' ? 'copied' : 'share')}
                  </button>
                  <div className="lobby-players">
                    {[0, 1].map((index) => {
                      const m = game.room!.members[index];
                      return (
                        <div className={'player-card ' + (m?.ready ? 'is-ready' : '')} key={index}>
                          <div className="avatar">
                            <User size={24} />
                          </div>
                          <h3>{m?.name || t('waiting')}</h3>
                          <p>
                            {m?.id === game.room!.hostId ? t('host') : m ? t('opponent') : '···'}
                          </p>
                          {m && (
                            <span className="badge">
                              {m.ready
                                ? t('ready')
                                : m.connected
                                  ? t('connected')
                                  : t('reconnecting')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="room-settings">
                    <label>
                      {t('language')}
                      <select
                        aria-label={t('language')}
                        value={game.room.language}
                        disabled={game.room.hostId !== game.playerId}
                        onChange={(e) => game.command('settings', { language: e.target.value })}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {LANGUAGE_NAMES[l]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('difficulty')}
                      <select
                        aria-label={t('difficulty')}
                        value={game.room.difficulty}
                        disabled={game.room.hostId !== game.playerId}
                        onChange={(e) => game.command('settings', { difficulty: e.target.value })}
                      >
                        <option value="beginner">{t('beginner')}</option>
                        <option value="standard">{t('standard')}</option>
                      </select>
                    </label>
                  </div>
                  <button
                    className="primary full-width"
                    disabled={!game.connected}
                    onClick={() => game.command('ready')}
                  >
                    {t(
                      game.room.members.find((m) => m.id === game.playerId)?.ready
                        ? 'readyCancel'
                        : 'ready',
                    )}
                    <Check size={18} />
                  </button>
                </section>
              ) : (
                <div className="empty">{t('loading')}…</div>
              )}
            </>
          ) : mode === 'settings' ? (
            <>
              <PageHeading title={t('settings')} subtitle="MAKE IT YOURS" />
              <section className="settings-panel">
                <div className="setting-row">
                  <div>
                    <h3>{t('language')} / UI</h3>
                    <p>한국어 · English</p>
                  </div>
                  <select
                    aria-label="UI language"
                    value={i18next.language}
                    onChange={(e) => {
                      void i18next.changeLanguage(e.target.value);
                      write('keybit.locale', e.target.value);
                    }}
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                </div>
                {(['sound', 'effects', 'shake', 'reduceMotion'] as const).map((key) => (
                  <div className="setting-row" key={key}>
                    <div>
                      <h3>{t(key)}</h3>
                      <p>{t(key === 'reduceMotion' ? 'motionNote' : key + 'Note')}</p>
                    </div>
                    <button
                      className={
                        'toggle ' +
                        ((key === 'effects' ? settings.effects !== 'off' : settings[key])
                          ? 'on'
                          : '')
                      }
                      role="switch"
                      aria-checked={key === 'effects' ? settings.effects !== 'off' : settings[key]}
                      aria-label={t(key)}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          [key]:
                            key === 'effects' ? (s.effects === 'off' ? 'normal' : 'off') : !s[key],
                        }))
                      }
                    >
                      <i />
                    </button>
                  </div>
                ))}
              </section>
              <section className="account-panel">
                <Github size={24} />
                <div>
                  <h3>{userId ? t('accountRecords') : t('login')}</h3>
                  <p>{t('loginNote')}</p>
                </div>
                <button className="secondary" onClick={userId ? logout : login}>
                  {userId ? <LogOut size={16} /> : <Github size={16} />}{' '}
                  {t(userId ? 'logout' : 'login')}
                </button>
              </section>
            </>
          ) : mode === 'records' ? (
            <>
              <PageHeading
                title={t('records')}
                subtitle="SMALL RUNS. REAL PROGRESS."
                description={t('recordNote')}
              />
              {userId && (
                <div className="segmented">
                  <button
                    className={historySource === 'account' ? 'on' : ''}
                    onClick={() => setHistorySource('account')}
                  >
                    {t('accountRecords')}
                  </button>
                  <button
                    className={historySource === 'device' ? 'on' : ''}
                    onClick={() => setHistorySource('device')}
                  >
                    {t('deviceRecords')}
                  </button>
                </div>
              )}
              <StatsRow
                values={[
                  {
                    label: t('completed'),
                    value: currentRecords.reduce((sum, r) => sum + r.completed, 0),
                  },
                  {
                    label: t('best') + ' CPM',
                    value:
                      currentRecords
                        .filter((r) => r.mode !== 'battle')
                        .reduce((best, r) => Math.max(best, r.cpm), 0) || '—',
                  },
                  {
                    label: t('wins'),
                    value: currentRecords.filter((r) => r.outcome === 'win').length,
                  },
                  {
                    label: t('streak'),
                    value: streaks(currentRecords.filter((r) => r.dailyComplete).map((r) => r.date))
                      .current,
                    unit: t('day'),
                  },
                ]}
              />
              <div className="history-filters">
                <select
                  aria-label="Filter mode"
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                >
                  <option value="all">{t('all')}</option>
                  {['speed', 'daily', 'battle'].map((m) => (
                    <option key={m} value={m}>
                      {t(m)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter language"
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                >
                  <option value="all">{t('all')}</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {LANGUAGE_NAMES[l]}
                    </option>
                  ))}
                </select>
              </div>
              {history.isLoading ? (
                <div className="empty">{t('loading')}</div>
              ) : history.isError ? (
                <div className="empty">
                  <p>{t('storage_unavailable')}</p>
                  <button className="secondary" onClick={() => void history.refetch()}>
                    <RefreshCw size={16} />
                    {t('again')}
                  </button>
                </div>
              ) : (
                <History
                  records={currentRecords.filter(
                    (r) =>
                      (filterMode === 'all' || r.mode === filterMode) &&
                      (filterLang === 'all' || r.language === filterLang),
                  )}
                  onStart={() => go('speed')}
                />
              )}
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {mode === 'speed'
                      ? t('online')
                      : mode === 'daily'
                        ? 'ONE DAY. ONE COMMIT.'
                        : 'PRIVATE MATCH / 1 VS 1'}
                  </div>
                  <h1>
                    {t(
                      mode === 'speed'
                        ? 'homeHeading'
                        : mode === 'daily'
                          ? 'dailyTitle'
                          : 'battleTitle',
                    )}
                  </h1>
                  <p>
                    {t(
                      mode === 'speed' ? 'homeSub' : mode === 'daily' ? 'dailyNote' : 'battleNote',
                    )}
                  </p>
                </div>
                {mode === 'speed' && (
                  <div className="keyboard-badge">
                    <Keyboard size={30} />
                    <span>
                      LET’S
                      <br />
                      TYPE.
                    </span>
                  </div>
                )}
              </div>
              <div className="mode-grid">
                {[
                  [Timer, 'speed', '01'],
                  [CalendarDays, 'daily', '02'],
                  [Swords, 'battle', '03'],
                ].map(([Icon, key, n]) => {
                  const K = Icon as typeof Timer;
                  return (
                    <button
                      key={key as string}
                      onClick={() => go(key as Screen)}
                      className={'mode-card ' + (mode === key ? 'active' : '')}
                    >
                      <div>
                        <K size={21} />
                        <span>{n as string}</span>
                      </div>
                      <h3>
                        {t(key as string)}
                        <ArrowUpRight size={18} />
                      </h3>
                      <p>{t(key + 'Desc')}</p>
                    </button>
                  );
                })}
              </div>
              {mode === 'daily' && (
                <div className="daily-summary">
                  <div>
                    <Flame size={20} />
                    <span>
                      {t('streak')} <strong>{streak.current}</strong> {t('day')}
                    </span>
                  </div>
                  <span>
                    {t('longest')} {streak.longest} {t('day')}
                  </span>
                  <span className="daily-date">{today} · KST</span>
                </div>
              )}
              <section className="setup">
                <div className="section-heading">
                  <span>
                    <span className="tiny-dot" />
                    {t('language')}
                  </span>
                  <small>11 LANGUAGES / ONE KEYBOARD</small>
                </div>
                <div className="languages">
                  {LANGUAGES.map((l) => (
                    <button
                      className={language === l ? 'chosen' : ''}
                      onClick={() => setLanguage(l)}
                      key={l}
                    >
                      {LANGUAGE_NAMES[l]}
                    </button>
                  ))}
                </div>
              </section>
              {mode === 'battle' ? (
                <div className="battle-setup">
                  <section className="form-panel">
                    <div className="section-heading">
                      <span>
                        <User size={16} />
                        {t('nickname')}
                      </span>
                    </div>
                    <input
                      aria-label={t('nickname')}
                      value={name}
                      maxLength={16}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <label>
                      {t('difficulty')}
                      <select
                        value={battleLevel}
                        onChange={(e) => {
                          setBattleLevel(battleDifficulty(e.target.value));
                          write('keybit.battleDifficulty', e.target.value);
                        }}
                      >
                        <option value="beginner">{t('beginner')}</option>
                        <option value="standard">{t('standard')}</option>
                      </select>
                    </label>
                    <button
                      className="primary full-width desktop-play"
                      disabled={busy}
                      onClick={() => void roomRequest(false)}
                    >
                      <Swords size={18} />
                      {t('create')}
                    </button>
                  </section>
                  <section className="form-panel">
                    <div className="section-heading">
                      <span>
                        <Command size={16} />
                        {t('code')}
                      </span>
                    </div>
                    <input
                      className="code-field"
                      aria-label={t('code')}
                      placeholder="ABC234"
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      }
                      maxLength={6}
                    />
                    <p className="small-note">{t('battleDesc')}</p>
                    <button
                      className="secondary full-width desktop-play"
                      disabled={busy || joinCode.length !== 6}
                      onClick={() => void roomRequest(true)}
                    >
                      {t('join')}
                      <ArrowRight size={18} />
                    </button>
                  </section>
                </div>
              ) : (
                <>
                  <section className="editor">
                    <div className="editor-toolbar">
                      <span>
                        <Terminal size={16} />
                        {mode === 'daily' ? 'daily' : 'warmup'}.{EXTENSIONS[language]}
                      </span>
                      <span className="editor-tag">AUTO-INDENT ON</span>
                    </div>
                    <div className="code-preview">
                      <Code
                        snippet={
                          deck(
                            language,
                            mode === 'daily' ? 'intermediate' : difficulty,
                            'block',
                            'preview',
                          )[0]
                        }
                      />
                      <div className="preview-caption">
                        <Command size={15} />
                        {t('preview')}
                      </div>
                    </div>
                    <div className="editor-footer">
                      <span>{t('correctHint')}</span>
                      <span>UTF-8</span>
                    </div>
                  </section>
                  <div className="start-row">
                    <div className="segmented" aria-label={t('duration')}>
                      {(mode === 'daily' ? [60] : [30, 60, 120]).map((seconds) => (
                        <button
                          className={mode === 'daily' || duration === seconds ? 'on' : ''}
                          key={seconds}
                          onClick={() => {
                            setDuration(seconds as 30 | 60 | 120);
                            write('keybit.duration', seconds);
                          }}
                        >
                          {seconds} {t('seconds')}
                        </button>
                      ))}
                    </div>
                    {mode === 'speed' && (
                      <select
                        aria-label={t('difficulty')}
                        value={difficulty}
                        onChange={(e) => {
                          setDifficulty(e.target.value as PracticeDifficulty);
                          write('keybit.practiceDifficulty', e.target.value);
                        }}
                      >
                        <option value="intermediate">{t('intermediate')}</option>
                        <option value="advanced">{t('advanced')}</option>
                      </select>
                    )}
                    <button
                      className="primary desktop-play"
                      disabled={busy}
                      onClick={() => void start()}
                    >
                      {t(busy ? 'loading' : 'start')}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  {mode === 'speed' ? (
                    <div className="best-strip">
                      <Trophy size={15} />
                      <span>{t('best')}</span>
                      <b>{relevantBest ? `${relevantBest.cpm} CPM` : '—'}</b>
                      <small>{relevantBest ? `${relevantBest.accuracy}%` : t('emptyHint')}</small>
                    </div>
                  ) : (
                    <>
                      <div className="best-strip">
                        <Trophy size={15} />
                        <span>
                          {t('best')} · {today}
                        </span>
                        <b>
                          {comparisonRecords
                            .filter(
                              (r) =>
                                r.mode === 'daily' && r.date === today && r.language === language,
                            )
                            .reduce((max, r) => Math.max(max, r.cpm), 0) || '—'}{' '}
                          CPM
                        </b>
                      </div>
                      <div className="daily-status">
                        {comparisonRecords.some(
                          (r) => r.dailyComplete && r.date === today && r.language === language,
                        ) ? (
                          <>
                            <Check size={17} />
                            {t('dailyComplete')}
                          </>
                        ) : (
                          <span>{t('dailyIncomplete')}</span>
                        )}
                        <ResetClock />
                      </div>
                      <Calendar days={days} />
                    </>
                  )}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <span className="tiny-dot" /> YOUR NEXT PERSONAL BEST STARTS HERE.
            </span>
            <span>keybit / 2026</span>
          </footer>
        </main>
      </div>
      <dialog ref={dialog} onCancel={() => setExitTarget(null)}>
        <h2>{t('exitTitle')}</h2>
        <p>{t('exitNote')}</p>
        <div className="dialog-actions">
          <button
            className="secondary"
            onClick={() => {
              dialog.current?.close();
              setExitTarget(null);
            }}
          >
            {t('cancel')}
          </button>
          <button className="primary danger" onClick={confirmLeave}>
            {t('leave')}
          </button>
        </div>
      </dialog>
    </div>
  );
}
function PageHeading({
  title,
  subtitle,
  description,
}: {
  title: string;
  subtitle: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{subtitle}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
function ResetClock() {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.parse(dayKey(now) + 'T15:00:00Z') - now) / 1000));
  return (
    <span className="reset-clock">
      {t('resetIn')}{' '}
      <b>
        {[Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
          .map((n) => String(n).padStart(2, '0'))
          .join(':')}
      </b>
    </span>
  );
}
function Calendar({ days }: { days: string[] }) {
  const { t } = useTranslation();
  let date = dayKey();
  const dates = [];
  for (let i = 0; i < 30; i++) {
    dates.unshift(date);
    date = dayBefore(date);
  }
  return (
    <section className="calendar-panel">
      <div className="section-heading">
        <span>{t('warmup')}</span>
        <small>LAST 30 DAYS</small>
      </div>
      <div className="calendar-grid">
        {dates.map((d) => (
          <div
            className={
              'calendar-cell ' + (days.includes(d) ? 'done' : '') + (d === dayKey() ? ' today' : '')
            }
            key={d}
            title={d}
            aria-label={`${d}${days.includes(d) ? ': ' + t('dailyComplete') : ''}`}
          >
            {Number(d.slice(-2))}
          </div>
        ))}
      </div>
    </section>
  );
}
function History({ records, onStart }: { records: Result[]; onStart: () => void }) {
  const { t } = useTranslation();
  if (!records.length)
    return (
      <div className="empty">
        <BarChart3 size={36} />
        <h2>{t('noRecords')}</h2>
        <p>{t('emptyHint')}</p>
        <button className="primary" onClick={onStart}>
          {t('start')}
          <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('recent')}</th>
            <th>{t('language')}</th>
            <th>CPM</th>
            <th>{t('accuracy')}</th>
            <th>{t('completed')}</th>
          </tr>
        </thead>
        <tbody>
          {records.slice(0, 100).map((r) => (
            <tr key={r.id}>
              <td>
                <strong>
                  {t(r.mode)}
                  {r.outcome && (
                    <span className="badge">{t(r.outcome === 'win' ? 'wins' : r.outcome)}</span>
                  )}
                </strong>
                <small>
                  {new Date(r.endedAt).toLocaleString(i18next.language)} · {r.duration}s ·{' '}
                  {t(r.difficulty)}
                </small>
              </td>
              <td>{LANGUAGE_NAMES[r.language]}</td>
              <td className="mono mint">{r.cpm}</td>
              <td className="mono">{r.accuracy === null ? '—' : r.accuracy + '%'}</td>
              <td className="mono">{r.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ResultScreen({
  result: r,
  records,
  room,
  myId,
  onAgain,
  onBack,
}: {
  result: Result & { saved: boolean };
  records: Result[];
  room: RoomView | null;
  myId: string;
  onAgain: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const previous = records
      .filter(
        (x) =>
          x.id !== r.id &&
          x.mode === r.mode &&
          x.language === r.language &&
          x.difficulty === r.difficulty &&
          x.duration === r.duration &&
          x.version === r.version,
      )
      .sort((a, b) => b.cpm - a.cpm || (b.accuracy || 0) - (a.accuracy || 0))[0],
    newBest =
      r.mode !== 'battle' &&
      r.cpm > 0 &&
      (!previous ||
        r.cpm > previous.cpm ||
        (r.cpm === previous.cpm && (r.accuracy || 0) > (previous.accuracy || 0))),
    max = Math.max(1, ...r.samples),
    mistakes = Object.entries(r.mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  return (
    <div className="results">
      <div className="result-heading">
        <div className={'result-icon ' + (r.outcome === 'loss' ? 'lost' : '')}>
          <Trophy size={32} />
        </div>
        <div className="eyebrow">{r.mode === 'battle' ? 'MATCH COMPLETE' : 'SESSION COMPLETE'}</div>
        <h1>
          {r.mode === 'battle'
            ? t(r.outcome === 'win' ? 'wins' : r.outcome || 'draw')
            : t(newBest ? 'resultHeading' : 'finishHeading')}
        </h1>
        <p>
          {r.reason
            ? t('reason_' + r.reason)
            : `${LANGUAGE_NAMES[r.language]} · ${t(r.difficulty)} · ${r.duration}s`}
        </p>
        {newBest && (
          <span className="new-best">
            <Trophy size={14} />
            {t('newBest')}
          </span>
        )}
      </div>
      <StatsRow
        values={[
          {
            label: r.mode === 'battle' ? t('health') : t('completed'),
            value: r.mode === 'battle' ? (r.hp ?? 0) : r.completed,
          },
          { label: 'CPM', value: r.cpm },
          { label: t('accuracy'), value: r.accuracy ?? '—', unit: r.accuracy === null ? '' : '%' },
          { label: t('characters'), value: r.mode === 'battle' ? (r.baseChars ?? 0) : r.chars },
        ]}
      />
      {r.mode === 'daily' && (
        <div className="daily-status">
          <Check size={16} />
          {t(r.dailyComplete ? 'dailyComplete' : 'dailyIncomplete')}
        </div>
      )}
      {r.mode === 'battle' ? (
        <div className="battle-recap">
          <span>
            {t('opponent')}: {r.opponent}
          </span>
          <span>
            {t('attack')}: {r.sent}
          </span>
          {r.opponentStats && (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('health')}</th>
                  <th>{t('characters')}</th>
                  <th>{t('accuracy')}</th>
                  <th>{t('attack')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('you')}</td>
                  <td>{r.hp}</td>
                  <td>{r.baseChars}</td>
                  <td>{r.accuracy ?? '—'}%</td>
                  <td>{r.sent}</td>
                </tr>
                <tr>
                  <td>{r.opponent}</td>
                  <td>{r.opponentStats.hp}</td>
                  <td>{r.opponentStats.baseChars}</td>
                  <td>{r.opponentStats.accuracy ?? '—'}%</td>
                  <td>{r.opponentStats.sent}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="result-details">
          <section>
            <div className="section-heading">
              <span>{t('pace')}</span>
              <small>CPM / 5 SEC</small>
            </div>
            <div className="pace-bars" role="img" aria-label={r.samples.join(', ')}>
              {r.samples.map((v, i) => (
                <div className="pace-column" key={i}>
                  <i
                    style={{ height: Math.max(2, (v / max) * 90) }}
                    title={`${(i + 1) * 5}s: ${v} CPM`}
                  />
                  <small>{(i + 1) * 5}</small>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="section-heading">
              <span>{t('mistakes')}</span>
            </div>
            <div className="mistake-keys">
              {mistakes.length ? (
                mistakes.map(([c, n]) => (
                  <div key={c}>
                    <kbd>{c === ' ' ? 'Space' : c === '\n' ? 'Enter' : c}</kbd>
                    <small>× {n}</small>
                  </div>
                ))
              ) : (
                <span className="mint">0 errors. Clean code.</span>
              )}
            </div>
          </section>
        </div>
      )}
      {previous && r.mode !== 'battle' && !newBest && (
        <p className="best-comparison">
          {t('best')} {previous.cpm} CPM · {r.cpm - previous.cpm} CPM
        </p>
      )}
      {r.mode !== 'battle' && <p className="wpm-note">{(r.cpm / 5).toFixed(1)} WPM</p>}
      <div className="result-actions">
        <button className="secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          {t('back')}
        </button>
        <button
          className="primary"
          disabled={
            r.mode === 'battle' && (!room || room.members.length < 2 || room.rematch.includes(myId))
          }
          onClick={onAgain}
        >
          <RefreshCw size={16} />
          {t(r.mode === 'battle' ? 'rematch' : 'again')}
        </button>
      </div>
      {r.mode === 'battle' && room?.rematch.includes(myId) && (
        <p className="small-note">{t('replayWaiting')}</p>
      )}
      <span className={'save-status ' + (!r.saved ? 'pending' : '')}>
        <Check size={12} />
        {t(
          (r as Result & { saveError?: boolean }).saveError
            ? 'saveFailure'
            : r.saved
              ? 'saved'
              : 'saving',
        )}
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>,
);
