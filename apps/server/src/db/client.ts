import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { env } from "../config/env";
import * as schema from "./schema";

export const pglite = new PGlite(env.pgliteDataDir);
export const db = drizzle(pglite, { schema });

export async function initializeDatabase() {
  await pglite.exec(`
    create table if not exists tasks (
      id text primary key,
      question text not null,
      status text not null,
      final_output jsonb,
      error text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now(),
      started_at timestamp,
      completed_at timestamp
    );

    create table if not exists task_events (
      id text primary key,
      task_id text not null references tasks(id) on delete cascade,
      type text not null,
      payload jsonb not null,
      created_at timestamp not null default now()
    );

    create table if not exists llm_calls (
      id text primary key,
      task_id text references tasks(id) on delete cascade,
      label text not null,
      model text not null,
      input_tokens integer not null default 0,
      output_tokens integer not null default 0,
      reasoning_tokens integer not null default 0,
      cost_usd real not null default 0,
      created_at timestamp not null default now()
    );
  `);
}

export async function checkDatabase() {
  const result = await pglite.query<{ ok: number }>("select 1 as ok");
  return result.rows[0]?.ok === 1;
}
