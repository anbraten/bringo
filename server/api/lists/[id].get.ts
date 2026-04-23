import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const listResult = await db.execute({
    sql: 'SELECT id, name, created_at FROM lists WHERE id = ?',
    args: [id!],
  })

  if (listResult.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'List not found' })
  }

  const itemsResult = await db.execute({
    sql: 'SELECT id, name, category, person, packed FROM items WHERE list_id = ? ORDER BY created_at ASC',
    args: [id!],
  })

  const categoriesResult = await db.execute({
    sql: 'SELECT id, label, emoji FROM list_categories WHERE list_id = ? ORDER BY created_at ASC',
    args: [id!],
  })

  const list = listResult.rows[0]!
  const items = itemsResult.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    person: r.person as string | null,
    packed: r.packed === 1,
  }))
  const categories = categoriesResult.rows.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    emoji: r.emoji as string,
  }))

  return {
    id: list.id as string,
    name: list.name as string,
    items,
    categories,
  }
})
