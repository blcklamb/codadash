import { emptyArchive, recordArchive, type Archive } from '../../../packages/shared/src/archive';
import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Result } from '../../../packages/shared/src/engine';
export const apiRoot = import.meta.env.VITE_API_URL || '';
export function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase =
  import.meta.env.VITE_SUPABASE_URL && publishableKey
    ? createClient(import.meta.env.VITE_SUPABASE_URL, publishableKey)
    : null;
let guestMemory: { token: string; id: string } | null = null;
let guestPromise: Promise<{ token: string; id: string }> | null = null;
export async function identity() {
  const auth = await supabase?.auth.getSession();
  if (auth?.data.session)
    return { token: auth.data.session.access_token, id: auth.data.session.user.id, account: true };
  let guest = guestMemory || read<{ token: string; id: string } | null>('keybit.guest', null);
  if (!guest) {
    guestPromise ??= fetch(apiRoot + '/v1/guest-sessions', { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) throw new Error('server_unavailable');
        const body = await r.json();
        write('keybit.guest', body);
        return body;
      })
      .finally(() => {
        guestPromise = null;
      });
    guest = await guestPromise;
  }
  guestMemory = guest;
  return { ...guest, account: false };
}
export async function api<T>(path: string, body?: unknown, retry = true): Promise<T> {
  const i = await identity();
  const r = await fetch(apiRoot + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${i.token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && !i.account && retry) {
    guestMemory = null;
    write('keybit.guest', null);
    return api(path, body, false);
  }
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'server_unavailable');
  return data;
}
export const socket = io(apiRoot || window.location.origin, {
  autoConnect: false,
  transports: ['websocket'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
});
function localArchive(): Archive {
  const stored = read<Archive | null>('keybit.history', null);
  if (stored) return stored;
  return read<Result[]>('keybit.records', [])
    .slice()
    .reverse()
    .reduce((archive, result) => recordArchive(archive, result), emptyArchive());
}
export function localRecords(): Result[] {
  return localArchive().recent;
}
export function localBests(): Result[] {
  return Object.values(localArchive().bests);
}
export function localDays(): string[] {
  return localArchive().days;
}
export function saveLocal(result: Result) {
  return write('keybit.history', recordArchive(localArchive(), result));
}
export type Settings = {
  sound: boolean;
  effects: 'off' | 'normal';
  shake: boolean;
  reduceMotion: boolean;
};
export const settingsDefault: Settings = {
  sound: false,
  effects: 'normal',
  shake: false,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
export const initialLocale =
  read<string>('keybit.locale', '') || (navigator.language.startsWith('ko') ? 'ko' : 'en');
void i18next.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    ko: {
      translation: {
        speed: '속도 측정',
        daily: '일일 연습',
        battle: '1대1 대전',
        records: '내 기록',
        settings: '설정',
        beginner: '입문',
        standard: '일반',
        start: '연습 시작',
        again: '다시 도전',
        login: 'GitHub 로그인',
        logout: '로그아웃',
        guest: '게스트',
        language: '프로그래밍 언어',
        difficulty: '난이도',
        duration: '제한 시간',
        completed: '완료 블록',
        accuracy: '정확도',
        characters: '유효 문자',
        leave: '나가기',
        ready: '준비 완료',
        waiting: '상대방을 기다리는 중',
        create: '방 만들기',
        join: '참여하기',
        nickname: '닉네임',
        code: '초대 코드',
        copy: '복사',
        copied: '복사했어요',
        cancel: '취소',
        rematch: '한 번 더 실행',
        sound: '효과음',
        effects: '시각 효과',
        shake: '화면 흔들림',
        reduceMotion: '모션 감소',
        saved: '기록 저장 완료',
        saving: '기록 저장 중',
        mobile: '타자 연습과 대전은 PC 또는 노트북에서 이용해 주세요.',
        connected: '연결됨',
        reconnecting: '연결 복구 중 · 경기 시간은 계속 흐릅니다',
        noRecords: '아직 기록이 없습니다',
        resetIn: '다음 도전까지',
        streak: '연속 연습',
        longest: '최장 기록',
        day: '일',
        wins: '승리',
        loss: '패배',
        draw: '무승부',
        void: '무효 경기',
        homeHeading: '손끝을 깨울 시간.',
        homeSub: '자동완성은 잠깐 끄고, 손맛은 켜세요.',
        speedDesc: '60초, 코드와 당신만의 레이스.',
        dailyDesc: '매일 새로운 코드. 작은 연습이 쌓이는 곳.',
        battleDesc: '코드 비를 지우고, 친구에게 한 방.',
        correctHint: '들여쓰기는 자동으로 · 오타는 Backspace로 수정',
        preview: '시작하면 새로운 코드가 나타납니다',
        noPause: '경기 중에는 시간이 멈추지 않습니다.',
        emptyHint: '첫 60초가 당신의 기준이 됩니다.',
        best: '개인 최고',
        recent: '최근 기록',
        dailyComplete: '오늘의 도전 완료',
        dailyIncomplete: '한 블록 이상 완성하면 오늘의 연습이 기록됩니다.',
        readyLabel: '준비되셨나요?',
        back: '돌아가기',
        next: '다음',
        resultHeading: '손이 기억해냈습니다.',
        finishHeading: '좋은 워밍업이었습니다.',
        newBest: '새로운 개인 최고 기록',
        dailyTitle: '하루에 한 번, 손끝에 커밋.',
        dailyNote: '같은 날, 같은 언어, 같은 코드. 매일 한국 시간 00시에 바뀝니다.',
        battleTitle: '친구와 한 판. 손으로 승부.',
        battleNote:
          '떨어지는 코드를 입력해 지우세요. 세 번의 깔끔한 성공은 상대에게 코드 비가 됩니다.',
        room: '대기실',
        host: '방장',
        opponent: '상대',
        you: '나',
        attack: '추가 코드',
        health: '체력',
        attackCombo: '공격 콤보',
        mistakes: '자주 틀린 문자',
        pace: '5초 구간별 속도',
        accountRecords: '계정 기록',
        deviceRecords: '이 기기의 비회원 기록',
        recordNote: '최고 기록은 언어·난이도·시간이 같은 조건끼리 비교합니다.',
        saveFailure: '이 브라우저에 기록을 저장하지 못했습니다.',
        loginUnavailable: '현재 로그인을 사용할 수 없습니다.',
        loading: '불러오는 중',
        all: '전체',
        seconds: '초',
        share: '초대 링크',
        readyCancel: '준비 취소',
        replayWaiting: '상대의 재대결 응답을 기다립니다.',
        warmup: '오늘의 워밍업',
        online: 'REAL KEYS. REAL SKILLS.',
        soundNote: '정확한 입력과 완성의 짧은 사운드',
        effectsNote: '코드를 가리지 않는 작은 도트 효과',
        shakeNote: '체력 감소 시 보드를 가볍게 흔들기',
        motionNote: '움직임을 줄이고 정적인 강조로 표시',
        loginNote:
          '로그인 후 기록을 여러 기기에서 이어가세요. 이전 비회원 기록은 이 기기에 남습니다.',
        exitTitle: '이번 플레이를 나가시겠어요?',
        exitNote: '개인 연습은 중단 처리되고, 진행 중 대전은 기권패가 됩니다.',
        ime: '영문 입력으로 전환해 주세요.',
        focus: '입력 영역을 클릭하면 계속할 수 있습니다.',
        instructions: '정확히 입력해 코드를 완성하세요.',
        selectHint: '빈 입력창에서 ↑ ↓ 대상 선택 · Esc 입력 비우기',
        reason_health: '남은 체력으로 승부가 결정됐습니다.',
        reason_characters: '기본 코드 제거 문자 수로 결정됐습니다.',
        reason_accuracy: '정확도로 승부가 결정됐습니다.',
        reason_forfeit: '상대 이탈로 경기가 종료됐습니다.',
        reason_simultaneous: '두 플레이어가 동시에 탈락했습니다.',
        reason_tie: '모든 판정 기준이 같습니다.',
        reason_both_disconnected: '양쪽 연결이 끊겨 승패를 기록하지 않습니다.',
        reason_server_restart: '서버 문제로 경기가 무효 처리됐습니다.',
        server_unavailable: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        room_not_found: '방을 찾을 수 없습니다. 초대 코드를 확인해 주세요.',
        room_expired: '대기 시간이 지나 방이 만료됐습니다.',
        room_full: '이미 두 사람이 입장한 방입니다.',
        invalid_code: '6자리 초대 코드를 입력해 주세요.',
        invalid_settings: '닉네임과 게임 설정을 확인해 주세요.',
        already_playing: '진행 중인 플레이로 돌아가거나 먼저 종료해 주세요.',
        already_joined: '이미 참여한 방입니다.',
        game_in_progress: '이미 경기가 진행 중입니다.',
        rate_limited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        server_maintenance: '서버 점검 중입니다. 현재 경기는 계속할 수 있습니다.',
        storage_unavailable: '기록 저장소에 연결하지 못했습니다.',
        unauthorized: '세션이 만료됐습니다. 다시 로그인해 주세요.',
        auth_unavailable: '로그인 상태를 확인하지 못했습니다.',
        roomReady: '두 명 모두 준비하면 3초 후 시작합니다.',
        aborted: '연습이 중단됐습니다. 완료 기록에 포함되지 않습니다.',
        resuming: '이전 플레이로 돌아가기',
      },
    },
    en: {
      translation: {
        speed: 'Speed test',
        daily: 'Daily practice',
        battle: '1v1 battle',
        records: 'My records',
        settings: 'Settings',
        beginner: 'Beginner',
        standard: 'Standard',
        start: 'Start typing',
        again: 'Try again',
        login: 'Sign in with GitHub',
        logout: 'Sign out',
        guest: 'Guest',
        language: 'Programming language',
        difficulty: 'Difficulty',
        duration: 'Duration',
        completed: 'Blocks cleared',
        accuracy: 'Accuracy',
        characters: 'Valid characters',
        leave: 'Leave',
        ready: 'Ready up',
        waiting: 'Waiting for an opponent',
        create: 'Create room',
        join: 'Join room',
        nickname: 'Nickname',
        code: 'Invite code',
        copy: 'Copy',
        copied: 'Copied',
        cancel: 'Cancel',
        rematch: 'Run it back',
        sound: 'Sound effects',
        effects: 'Visual effects',
        shake: 'Screen shake',
        reduceMotion: 'Reduce motion',
        saved: 'Record saved',
        saving: 'Saving record',
        mobile: 'Use a PC or laptop keyboard to practice and battle.',
        connected: 'Connected',
        reconnecting: 'Reconnecting · the clock is still running',
        noRecords: 'No records yet',
        resetIn: 'Next challenge in',
        streak: 'Current streak',
        longest: 'Longest streak',
        day: 'days',
        wins: 'Victory',
        loss: 'Defeat',
        draw: 'Draw',
        void: 'Void match',
        homeHeading: 'Time to wake your fingers.',
        homeSub: 'Less autocomplete. More fingerwork.',
        speedDesc: '60 seconds. Just you and the code.',
        dailyDesc: 'Fresh code, every day. Build a little momentum.',
        battleDesc: 'Clear the code rain. Send some back.',
        correctHint: 'Auto-indent on · Backspace to fix mistakes',
        preview: 'Fresh code appears when you start',
        noPause: 'The clock does not pause during a game.',
        emptyHint: 'Your first 60 seconds set the benchmark.',
        best: 'Personal best',
        recent: 'Recent runs',
        dailyComplete: 'Daily challenge complete',
        dailyIncomplete: 'Clear at least one block to complete today’s practice.',
        readyLabel: 'Ready when you are.',
        back: 'Back',
        next: 'Next',
        resultHeading: 'Your fingers remembered.',
        finishHeading: 'A little more warmed up.',
        newBest: 'New personal best',
        dailyTitle: 'A daily commit for your fingers.',
        dailyNote: 'Same day. Same language. Same code. Resets at 00:00 Korea time.',
        battleTitle: 'A friendly duel. A real challenge.',
        battleNote:
          'Type falling code to clear it. Three clean clears send a little rain to your opponent.',
        room: 'Lobby',
        host: 'Host',
        opponent: 'Opponent',
        you: 'You',
        attack: 'Incoming code',
        health: 'Health',
        attackCombo: 'Attack combo',
        mistakes: 'Frequent mistakes',
        pace: 'Pace every 5 seconds',
        accountRecords: 'Account records',
        deviceRecords: 'Guest records on this device',
        recordNote: 'Personal bests compare the same language, difficulty and duration.',
        saveFailure: 'Your browser could not save this record.',
        loginUnavailable: 'Sign-in is currently unavailable.',
        loading: 'Loading',
        all: 'All',
        seconds: 'sec',
        share: 'Invite link',
        readyCancel: 'Not ready',
        replayWaiting: 'Waiting for the other player to run it back.',
        warmup: 'Your daily warm-up',
        online: 'REAL KEYS. REAL SKILLS.',
        soundNote: 'Short sounds for typing and clearing code',
        effectsNote: 'Small pixel effects that keep your code visible',
        shakeNote: 'A subtle board shake when you lose health',
        motionNote: 'Replace movement with static highlights',
        loginNote:
          'Sign in to keep new records across devices. Earlier guest records stay on this device.',
        exitTitle: 'Leave this game?',
        exitNote: 'Practice will be aborted. Leaving a live battle counts as a forfeit.',
        ime: 'Switch to English input to continue.',
        focus: 'Click the input area to continue.',
        instructions: 'Type the code exactly to clear it.',
        selectHint: 'Empty input: ↑ ↓ to select · Esc to clear',
        reason_health: 'The player with more health wins.',
        reason_characters: 'Decided by characters cleared from base code.',
        reason_accuracy: 'Decided by typing accuracy.',
        reason_forfeit: 'The game ended because a player left.',
        reason_simultaneous: 'Both players were eliminated together.',
        reason_tie: 'All tiebreakers are equal.',
        reason_both_disconnected: 'Both players disconnected. No win or loss recorded.',
        reason_server_restart: 'A server interruption voided this match.',
        server_unavailable: 'Could not reach the server. Please try again.',
        room_not_found: 'Room not found. Check your invite code.',
        room_expired: 'This lobby has expired.',
        room_full: 'This room already has two players.',
        invalid_code: 'Enter a 6-character invite code.',
        invalid_settings: 'Check your nickname and game settings.',
        already_playing: 'Return to your active game or leave it first.',
        already_joined: 'You have already joined this room.',
        game_in_progress: 'This game has already started.',
        rate_limited: 'Too many requests. Please try again shortly.',
        server_maintenance: 'Server maintenance. Your current game can continue.',
        storage_unavailable: 'Could not reach record storage.',
        unauthorized: 'Your session expired. Please sign in again.',
        auth_unavailable: 'Could not verify your sign-in.',
        roomReady: 'The game starts in 3 seconds when both players are ready.',
        aborted: 'Practice was aborted and does not count as a completed run.',
        resuming: 'Return to your active game',
      },
    },
  },
});
export { i18next };
