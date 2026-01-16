import { defineEventHandler } from 'h3'
import { getAuthUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    return { user: null }
  }
  return { user }
})
