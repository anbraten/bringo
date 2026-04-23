import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const catId = getRouterParam(event, 'catId')
  const body = await readBody(event)
  const db = useDb()

  const existing = await db.execute({
    sql: 'SELECT id FROM list_categories WHERE id = ? AND list_id = ?',
    args: [catId!, listId!],
  })
  if (existing.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  const fields: string[] = []
  const args: unknown[] = []

  if (body.label !== undefined) {
    const label = body.label.trim()
    if (!label) throw createError({ statusCode: 400, message: 'Label cannot be empty' })
    fields.push('label = ?')
    args.push(label)
  }
  if (body.emoji !== undefined) {
    fields.push('emoji = ?')
    args.push(body.emoji.trim() || '🏷️')
  }

  if (fields.length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  args.push(catId!, listId!)
  await db.execute({
    sql: `UPDATE list_categories SET ${fields.join(', ')} WHERE id = ? AND list_id = ?`,
    args: args as import('@libsql/client').InValue[],
  })

  const updated = await db.execute({
    sql: 'SELECT id, label, emoji FROM list_categories WHERE id = ?',
    args: [catId!],
  })
  const r = updated.rows[0]!
  return { id: r.id as string, label: r.label as string, emoji: r.emoji as string }
})
