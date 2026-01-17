import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const DRIZZLE_STUDIO_MODE = process.env.DRIZZLE_STUDIO_MODE || 'local'
const IS_LOCAL_MODE = DRIZZLE_STUDIO_MODE === 'local'

function getLocalD1Path() {
  const LOCAL_DB_DIR = resolve(__dirname, '.wrangler/state/v3/d1')

  try {
    mkdirSync(LOCAL_DB_DIR, { recursive: true })
  } catch (e) {}

  const dbDirFiles = readdirSync(LOCAL_DB_DIR, {
    recursive: true,
    withFileTypes: true,
  })

  const dbFile = dbDirFiles.find((path) => path.isFile() && /\.db|sqlite3?$/.test(path.name))

  if (!dbFile) {
    console.error('No database file found')
    return ''
  }

  const realPath = resolve(dbFile.parentPath, dbFile.name)
  console.log(`Local D1 path: ${realPath}`)
  return realPath
}

export default defineConfig({
  out: './drizzle',
  schema: './db/schema.ts',
  dialect: 'sqlite',
  driver: IS_LOCAL_MODE ? undefined : 'd1-http',
  dbCredentials: IS_LOCAL_MODE
    ? { url: getLocalD1Path() }
    : {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        token: process.env.CLOUDFLARE_API_TOKEN!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
      },
  casing: 'snake_case',
})
