import { createClient } from '@libsql/client'

let _client: ReturnType<typeof createClient> | null = null

export function useDb() {
  if (_client) return _client

  const config = useRuntimeConfig()

  _client = createClient({
    url: config.tursoUrl || 'file:./local.db',
    authToken: config.tursoAuthToken || undefined,
  })

  return _client
}

export async function initDb() {
  const db = useDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      person TEXT,
      packed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS list_categories (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🏷️',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)
}
