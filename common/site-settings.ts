export type SiteSettingSource = 'db' | 'env' | 'default'

export type SiteSettingResult<T> = {
  value: T
  source: SiteSettingSource
}
