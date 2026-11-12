import * as SQLite from "expo-sqlite";

// Offline cache: one row per synced table, holding its rows as JSON.
let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
const db = () => (dbp ??= SQLite.openDatabaseAsync("classpilot.db").then(async (d) => {
  await d.execAsync("create table if not exists cache (key text primary key, json text not null, updated_at text not null)");
  return d;
}));

export const putCache = async (key: string, value: unknown) => {
  const d = await db();
  await d.runAsync("insert or replace into cache (key, json, updated_at) values (?, ?, ?)", key, JSON.stringify(value), new Date().toISOString());
};

export const getCache = async <T>(key: string): Promise<{ value: T; updatedAt: string } | null> => {
  const d = await db();
  const row = await d.getFirstAsync<{ json: string; updated_at: string }>("select json, updated_at from cache where key = ?", key);
  return row ? { value: JSON.parse(row.json) as T, updatedAt: row.updated_at } : null;
};

export const clearCache = async () => { const d = await db(); await d.execAsync("delete from cache"); };
