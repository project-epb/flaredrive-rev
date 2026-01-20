import { eq, inArray } from 'drizzle-orm'
import { parseBoolean } from '../../common/app-env.js'
import { siteSettings } from '../../db/schema.js'
import { cacheDelete, cacheGetJson, cachePutJson } from './cache.js'
import { getDb } from './db.js'
import { readEnvVars } from './readCtxEnv.js'

export type SiteSettingSource = 'db' | 'env' | 'default'

export type SiteSettingResult<T> = { value: T; source: SiteSettingSource }

type SiteSettingResults<TDefs extends Record<string, SiteSettingDefinition<any>>> = {
  [K in keyof TDefs]: TDefs[K] extends SiteSettingDefinition<infer V> ? SiteSettingResult<V> : never
}

type SiteSettingDefinition<T> = {
  dbKey: string
  envKey: string
  defaultValue: T
  parse: (raw: unknown, defaultValue: T) => T
  serialize: (value: T) => string
}

const stringSetting = (dbKey: string, envKey: string, defaultValue: string): SiteSettingDefinition<string> => ({
  dbKey,
  envKey,
  defaultValue,
  parse: (raw, def) => {
    if (typeof raw === 'undefined' || raw === null) return def
    const v = String(raw).trim()
    return v ? v : def
  },
  serialize: (value) => String(value),
})

const booleanSetting = (dbKey: string, envKey: string, defaultValue: boolean): SiteSettingDefinition<boolean> => ({
  dbKey,
  envKey,
  defaultValue,
  parse: (raw, def) => parseBoolean(raw, def),
  serialize: (value) => (value ? 'true' : 'false'),
})

export const SITE_SETTINGS = {
  siteName: stringSetting('site.name', 'SITE_NAME', 'FlareDrive'),
  allowRegister: booleanSetting('site.allowRegister', 'ALLOW_REGISTER', true),
} as const

export type SiteSettingKey = keyof typeof SITE_SETTINGS

export const getSiteSettingsBatch = async <TDefs extends Record<string, SiteSettingDefinition<any>>>(
  ctx: any,
  defs: TDefs
): Promise<SiteSettingResults<TDefs>> => {
  const db = getDb(ctx)
  const entries = Object.entries(defs) as Array<[keyof TDefs, SiteSettingDefinition<any>]>
  const dbKeys = entries.map(([, def]) => def.dbKey)

  const rows = dbKeys.length
    ? await db
        .select({ key: siteSettings.key, value: siteSettings.value })
        .from(siteSettings)
        .where(inArray(siteSettings.key, dbKeys))
        .all()
    : []

  const rowMap = new Map<string, string | null>()
  for (const row of rows) rowMap.set(row.key, row.value ?? null)

  const result: Record<string, SiteSettingResult<any>> = {}
  for (const [name, def] of entries) {
    const dbValue = rowMap.get(def.dbKey)
    if (dbValue !== undefined && dbValue !== null) {
      result[String(name)] = { value: def.parse(dbValue, def.defaultValue), source: 'db' }
      continue
    }

    const envRaw = readEnvVars(ctx, def.envKey)
    if (typeof envRaw !== 'undefined') {
      result[String(name)] = { value: def.parse(envRaw, def.defaultValue), source: 'env' }
      continue
    }

    result[String(name)] = { value: def.defaultValue, source: 'default' }
  }

  return result as SiteSettingResults<TDefs>
}

export const getSiteSetting = async <T>(ctx: any, def: SiteSettingDefinition<T>): Promise<SiteSettingResult<T>> => {
  const { one } = await getSiteSettingsBatch(ctx, { one: def })
  return one
}

export const setSiteSettingsBatch = async (
  ctx: any,
  entries: Array<{ def: SiteSettingDefinition<any>; value: any | null }>
) => {
  if (!entries.length) return

  const db = getDb(ctx)
  const now = Date.now()

  const statements = entries.map(({ def, value }) => {
    if (value === null) {
      return db.delete(siteSettings).where(eq(siteSettings.key, def.dbKey))
    }

    const serialized = def.serialize(value)
    return db
      .insert(siteSettings)
      .values({
        key: def.dbKey,
        value: serialized,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: serialized, updatedAt: now },
      })
  })

  const maybeBatch = (db as any).batch
  if (typeof maybeBatch === 'function') {
    await maybeBatch.call(db, statements)
    return
  }

  for (const stmt of statements) {
    await (stmt as any).run()
  }
}

export const setSiteSetting = async <T>(ctx: any, def: SiteSettingDefinition<T>, value: T) => {
  await setSiteSettingsBatch(ctx, [{ def, value }])
}

export const unsetSiteSetting = async (ctx: any, def: SiteSettingDefinition<any>) => {
  await setSiteSettingsBatch(ctx, [{ def, value: null }])
}

export const getPublicSiteSettings = async (ctx: any) => {
  return getSiteSettingsBatch(ctx, {
    siteName: SITE_SETTINGS.siteName,
    allowRegister: SITE_SETTINGS.allowRegister,
  })
}

export const getResolvedPublicSiteSettings = async (ctx: any) => {
  const cached = await cacheGetJson<{ siteName: string; allowRegister: boolean }>(
    ctx,
    RESOLVED_PUBLIC_SETTINGS_CACHE_KEY
  )
  if (cached && typeof cached.siteName === 'string' && typeof cached.allowRegister === 'boolean') {
    return cached
  }

  const resolved = await getPublicSiteSettings(ctx)
  const computed = {
    siteName: resolved.siteName.value,
    allowRegister: resolved.allowRegister.value,
  }

  await cachePutJson(ctx, RESOLVED_PUBLIC_SETTINGS_CACHE_KEY, computed, {
    ttlSeconds: RESOLVED_PUBLIC_SETTINGS_TTL_SECONDS,
  })

  return computed
}

export const RESOLVED_PUBLIC_SETTINGS_CACHE_KEY = 'v1:site:public-settings'
export const RESOLVED_PUBLIC_SETTINGS_TTL_SECONDS = 60

export const invalidateResolvedPublicSiteSettingsCache = async (ctx: any) => {
  await cacheDelete(ctx, RESOLVED_PUBLIC_SETTINGS_CACHE_KEY)
}
