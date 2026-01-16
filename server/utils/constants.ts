import process from 'node:process'

export const IS_PROD = process.env.NODE_ENV === 'production'
export const IS_DEV = process.env.NODE_ENV === 'development'

export const SESSION_COOKIE = 'flaredrive:session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
