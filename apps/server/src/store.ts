import { createClient } from '@supabase/supabase-js';
import type { Result } from '../../../packages/shared/src/engine';
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const db =
  process.env.SUPABASE_URL && secretKey
    ? createClient(process.env.SUPABASE_URL, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
export async function verifiedUser(token: string): Promise<string | null> {
  if (!db) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
export async function saveResult(userId: string, result: Result) {
  if (!db) throw new Error('storage_unavailable');
  const { error } = await db.from('records').upsert(
    {
      user_id: userId,
      session_id: result.id,
      result,
      ended_at: new Date(result.endedAt).toISOString(),
    },
    { onConflict: 'user_id,session_id' },
  );
  if (error) throw error;
}
export async function records(userId: string) {
  if (!db) return [];
  const { data, error } = await db
    .from('records')
    .select('result')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data.map((row) => row.result as Result);
}
export async function markStart(id: string, userIds: string[], kind: string) {
  if (!db) return;
  const { error } = await db
    .from('sessions')
    .insert({ id, user_ids: userIds, kind, status: 'active' });
  if (error) throw error;
}
export async function markEnd(id: string, status: string) {
  if (!db) return;
  const { error } = await db.from('sessions').update({ status }).eq('id', id);
  if (error) throw error;
}
export async function recoverSessions() {
  if (!db) return;
  const { error } = await db.from('sessions').update({ status: 'aborted' }).eq('status', 'active');
  if (error) throw error;
}

export async function bests(userId: string): Promise<Result[]> {
  if (!db) return [];
  const { data, error } = await db.from('personal_bests').select('result').eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.result as Result);
}
export async function activityDays(userId: string): Promise<string[]> {
  if (!db) return [];
  const days: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from('daily_activity')
      .select('day')
      .eq('user_id', userId)
      .order('day')
      .range(offset, offset + 499);
    if (error) throw error;
    days.push(...data.map((row) => row.day as string));
    if (data.length < 500) return days;
  }
}
