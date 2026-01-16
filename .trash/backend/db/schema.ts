import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  authorizationLevel: integer('authorization_level').notNull().default(1),
  createdAt: integer('created_at').notNull(),
})

export const buckets = sqliteTable('buckets', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  cdnBaseUrl: text('cdn_base_url'),
  endpointUrl: text('endpoint_url').notNull(),
  region: text('region').notNull().default('auto'),
  accessKeyId: text('access_key_id').notNull(),
  secretAccessKey: text('secret_access_key').notNull(),
  bucketName: text('bucket_name').notNull(),
  forcePathStyle: integer('force_path_style').notNull().default(0),
  createdAt: integer('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  loginXff: text('login_xff'),
  loginUa: text('login_ua'),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
})
