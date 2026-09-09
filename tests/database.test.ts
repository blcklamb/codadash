import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let db: PGlite;
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  session = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(
    `create schema auth; create role anon; create role authenticated; create role service_role bypassrls; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to authenticated,anon;`,
  );
  await db.exec(readFileSync('supabase/migrations/202609100001_keybit.sql', 'utf8'));
  await db.query('insert into auth.users values ($1),($2)', [a, b]);
  await db.query(
    "insert into public.sessions(id,user_ids,kind,status) values ($1,array[$2::uuid,$3::uuid],'battle','finished')",
    [session, a, b],
  );
  await db.query(
    'insert into public.records(user_id,session_id,result,ended_at) values ($1,$3,\'{"mode":"speed","language":"javascript","difficulty":"beginner","duration":60,"version":"1.0.0","cpm":240,"dailyComplete":true,"date":"2026-09-10"}\',now()),($2,$3,\'{"mode":"speed","language":"javascript","difficulty":"beginner","duration":60,"version":"1.0.0","cpm":200}\',now())',
    [a, b, session],
  );
});
afterAll(async () => {
  await db.close();
});
describe('PostgreSQL migration and RLS', () => {
  it('allows the authenticated user to read only their own record and activity', async () => {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    const records = await db.query<{ user_id: string }>('select user_id from public.records');
    expect(records.rows).toEqual([{ user_id: a }]);
    expect((await db.query('select user_id from public.personal_bests')).rows).toEqual([
      { user_id: a },
    ]);
    const days = await db.query('select day from public.daily_activity');
    expect(days.rows).toEqual([{ day: '2026-09-10' }]);
    await db.exec('reset role');
  });
  it('rejects browser result writes even for the owner', async () => {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await expect(
      db.query('update public.records set result=\'{"cpm":99999}\' where user_id=$1', [a]),
    ).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });
  it('rejects anonymous record reads', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from public.records')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });
  it('enforces one result per participant per session', async () => {
    await expect(
      db.query(
        "insert into public.records(user_id,session_id,result,ended_at) values ($1,$2,'{}',now())",
        [a, session],
      ),
    ).rejects.toThrow(/duplicate key/);
  });
  it('cleans up a deleted account’s records', async () => {
    await db.query('delete from auth.users where id=$1', [a]);
    expect((await db.query('select user_id from public.records')).rows).toEqual([{ user_id: b }]);
  });
});
