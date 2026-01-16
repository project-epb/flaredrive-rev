export interface HonoEnv {
  Bindings: {
    DB: D1Database
    KV?: KVNamespace
  }
}
