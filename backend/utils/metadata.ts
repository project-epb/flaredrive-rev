import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { pathMetadata } from '../../db/schema.js'
import { getDb } from './db.js'

export const getPathMetadata = async (ctx: any, bucketId: string, path: string) => {
  const db = getDb(ctx)
  const meta = await db
    .select({
      id: pathMetadata.id,
      isPublic: pathMetadata.isPublic,
      passwordHash: pathMetadata.passwordHash,
      extraMetadata: pathMetadata.extraMetadata,
      updatedAt: pathMetadata.updatedAt,
    })
    .from(pathMetadata)
    .where(and(eq(pathMetadata.bucketId, bucketId), eq(pathMetadata.path, path)))
    .get()
  return meta
}

export const setPathMetadata = async (
  ctx: any,
  userId: number,
  bucketId: string,
  path: string,
  update: { isPublic?: boolean; password?: string; extra?: any }
) => {
  const db = getDb(ctx)
  const now = Date.now()

  const existing = await getPathMetadata(ctx, bucketId, path)

  const values: any = {
    updatedAt: now,
  }

  if (typeof update.isPublic !== 'undefined') {
    values.isPublic = update.isPublic ? 1 : 0
  }

  // Clean password/extra handling could be added here, for now keep simple
  if (typeof update.extra !== 'undefined') {
    values.extraMetadata = JSON.stringify(update.extra)
  }

  if (existing) {
    await db.update(pathMetadata).set(values).where(eq(pathMetadata.id, existing.id)).run()
    return existing.id
  } else {
    const id = nanoid()
    await db
      .insert(pathMetadata)
      .values({
        id,
        userId,
        bucketId,
        path,
        isPublic: values.isPublic || 0,
        createdAt: now,
        updatedAt: now,
        extraMetadata: values.extraMetadata || null,
      })
      .run()
    return id
  }
}
