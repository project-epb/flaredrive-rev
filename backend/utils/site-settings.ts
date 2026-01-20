import { eq } from 'drizzle-orm'
import { parseBoolean } from '../../common/app-env.js'
import { siteSettings } from '../../db/schema.js'
import { getDb } from './db.js'
import { readEnvVars } from './readCtxEnv.js'

export type SiteSettingSource = 'db' | 'env' | 'default'

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

export const getSiteSetting = async <T>(
  ctx: any,
  def: SiteSettingDefinition<T>
): Promise<{ value: T; source: SiteSettingSource }> => {
  const db = getDb(ctx)

  const row = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, def.dbKey)).get()
  if (row && row.value !== null && typeof row.value !== 'undefined') {
    return { value: def.parse(row.value, def.defaultValue), source: 'db' }
  }

  const envRaw = readEnvVars(ctx, def.envKey)
  if (typeof envRaw !== 'undefined') {
    return { value: def.parse(envRaw, def.defaultValue), source: 'env' }
  }

  return { value: def.defaultValue, source: 'default' }
}

export const setSiteSetting = async <T>(ctx: any, def: SiteSettingDefinition<T>, value: T) => {
  const db = getDb(ctx)
  const now = Date.now()
  const serialized = def.serialize(value)

  // drizzle sqlite: use upsert via onConflictDoUpdate
  await db
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
    .run()
}

export const unsetSiteSetting = async (ctx: any, def: SiteSettingDefinition<any>) => {
  const db = getDb(ctx)
  await db.delete(siteSettings).where(eq(siteSettings.key, def.dbKey)).run()
}

export const getPublicSiteSettings = async (ctx: any) => {
  const siteName = await getSiteSetting(ctx, SITE_SETTINGS.siteName)
  const allowRegister = await getSiteSetting(ctx, SITE_SETTINGS.allowRegister)

  return {
    siteName,
    allowRegister,
  }
}

export const getResolvedPublicSiteSettings = async (ctx: any) => {
  const resolved = await getPublicSiteSettings(ctx)
  return {
    siteName: resolved.siteName.value,
    allowRegister: resolved.allowRegister.value,
  }
}
