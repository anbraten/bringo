import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const db = useDb()

  const existing = await db.execute({
    sql: 'SELECT id FROM items WHERE id = ? AND list_id = ?',
    args: [itemId!, listId!],
  })
  if (existing.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Item not found' })
  }

  await db.execute({
    sql: 'DELETE FROM items WHERE id = ? AND list_id = ?',
    args: [itemId!, listId!],
  })

  return { success: true }
})
