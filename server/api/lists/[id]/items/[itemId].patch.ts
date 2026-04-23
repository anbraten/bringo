import { useDb } from '~~/server/utils/db'

const VALID_CATEGORIES = ['snacks', 'drinks', 'activities', 'gear', 'other']

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readBody(event)
  const db = useDb()

  const existing = await db.execute({
    sql: 'SELECT id FROM items WHERE id = ? AND list_id = ?',
    args: [itemId!, listId!],
  })
  if (existing.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Item not found' })
  }

  const fields: string[] = []
  const args: unknown[] = []

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, message: 'Name cannot be empty' })
    fields.push('name = ?')
    args.push(name)
  }
  if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) {
    fields.push('category = ?')
    args.push(body.category)
  }
  if (body.person !== undefined) {
    fields.push('person = ?')
    args.push(body.person?.trim() || null)
  }
  if (body.packed !== undefined) {
    fields.push('packed = ?')
    args.push(body.packed ? 1 : 0)
  }

  if (fields.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  args.push(itemId!, listId!)
  await db.execute({
    sql: `UPDATE items SET ${fields.join(', ')} WHERE id = ? AND list_id = ?`,
    args: args as import('@libsql/client').InValue[],
  })

  const updated = await db.execute({
    sql: 'SELECT id, name, category, person, packed FROM items WHERE id = ?',
    args: [itemId!],
  })
  const r = updated.rows[0]!
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    person: r.person as string | null,
    packed: r.packed === 1,
  }
})
