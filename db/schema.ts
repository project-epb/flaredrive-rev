import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordSalt: text('password_salt').notNull(),
    passwordHash: text('password_hash').notNull(),
    authorizationLevel: integer('authorization_level').notNull().default(1),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('idx_users_email').on(t.email)]
)

export const buckets = sqliteTable(
  'buckets',
  {
    id: text('id').primaryKey(),
    ownerUserId: integer('owner_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    cdnBaseUrl: text('cdn_base_url'),
    endpointUrl: text('endpoint_url').notNull(),
    region: text('region').notNull().default('auto'),
    accessKeyId: text('access_key_id').notNull(),
    secretAccessKey: text('secret_access_key').notNull(),
    bucketName: text('bucket_name').notNull(),
    forcePathStyle: integer('force_path_style').notNull().default(0),
    uploadMethod: text('upload_method').notNull().default('presigned'),
    edgeThumbnailUrl: text('edge_thumbnail_url'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_buckets_owner_user_id').on(t.ownerUserId),
    index('idx_buckets_owner_name').on(t.ownerUserId, t.name),
    index('idx_buckets_created_at').on(t.createdAt),
  ]
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    loginXff: text('login_xff'),
    loginUa: text('login_ua'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_sessions_token_hash').on(t.tokenHash),
    index('idx_sessions_user_id').on(t.userId),
    index('idx_sessions_expires_at').on(t.expiresAt),
    index('idx_sessions_user_expires').on(t.userId, t.expiresAt),
  ]
)

export const uploadHistory = sqliteTable(
  'upload_history',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    bucketId: text('bucket_id').notNull(),
    objectKey: text('object_key').notNull(),
    objectSize: integer('object_size').notNull(),
    contentType: text('content_type'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_upload_history_user_created').on(t.userId, t.createdAt),
    index('idx_upload_history_bucket_created').on(t.bucketId, t.createdAt),
    index('idx_upload_history_bucket_object_key').on(t.bucketId, t.objectKey),
  ]
)

export const pathMetadata = sqliteTable(
  'path_metadata',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    bucketId: text('bucket_id').notNull(),
    path: text('path').notNull(),
    isPublic: integer('is_public').notNull().default(0),
    tags: text('tags'),
    passwordHash: text('password_hash'),
    extraMetadata: text('extra_metadata'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_path_metadata_bucket_path').on(t.bucketId, t.path),
    index('idx_path_metadata_bucket_public').on(t.bucketId, t.isPublic),
    index('idx_path_metadata_bucket_updated').on(t.bucketId, t.updatedAt),
  ]
)

export const siteSettings = sqliteTable(
  'site_settings',
  {
    key: text('key').primaryKey(),
    value: text('value'),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('idx_site_settings_updated_at').on(t.updatedAt)]
)
