import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const catId = getRouterParam(event, 'catId')
  const db = useDb()

  const existing = await db.execute({
    sql: 'SELECT id FROM list_categories WHERE id = ? AND list_id = ?',
    args: [catId!, listId!],
  })
  if (existing.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  await db.execute({
    sql: 'DELETE FROM list_categories WHERE id = ? AND list_id = ?',
    args: [catId!, listId!],
  })

  return { success: true }
})
