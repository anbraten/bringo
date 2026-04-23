import { v4 as uuidv4 } from 'uuid'
import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = body?.name?.trim()

  if (!name) {
    throw createError({ statusCode: 400, message: 'List name is required' })
  }

  const db = useDb()
  const id = uuidv4()

  await db.execute({
    sql: 'INSERT INTO lists (id, name) VALUES (?, ?)',
    args: [id, name],
  })

  return { id, name }
})
