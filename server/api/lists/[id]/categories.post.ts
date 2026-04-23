import { v4 as uuidv4 } from 'uuid'
import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const label = body?.label?.trim()
  const emoji = body?.emoji?.trim() || '🏷️'

  if (!label) {
    throw createError({ statusCode: 400, message: 'Category label is required' })
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
    sql: 'INSERT INTO list_categories (id, list_id, label, emoji) VALUES (?, ?, ?, ?)',
    args: [id, listId!, label, emoji],
  })

  return { id, label, emoji }
})
