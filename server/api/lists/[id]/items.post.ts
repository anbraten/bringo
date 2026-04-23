import { v4 as uuidv4 } from 'uuid'
import { useDb } from '~~/server/utils/db'

const VALID_CATEGORIES = ['snacks', 'drinks', 'activities', 'gear', 'other']

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const name = body?.name?.trim()
  const category = VALID_CATEGORIES.includes(body?.category) ? body.category : 'other'
  const person = body?.person?.trim() || null

  if (!name) {
    throw createError({ statusCode: 400, message: 'Item name is required' })
  }

  const db = useDb()

  const listCheck = await db.execute({
    sql: 'SELECT id FROM lists WHERE id = ?',
    args: [listId!],
  })
  if (listCheck.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'List not found' })
  }

  const id = uuidv4()
  await db.execute({
    sql: 'INSERT INTO items (id, list_id, name, category, person, packed) VALUES (?, ?, ?, ?, ?, 0)',
    args: [id, listId!, name, category, person],
  })

  return { id, name, category, person, packed: false }
})
