type Args = Record<string, string>

const parseArgs = (argv: string[]): Args => {
  const args: Args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    if (!current.startsWith('--')) continue
    const key = current.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = 'true'
    } else {
      args[key] = next
      i += 1
    }
  }
  return args
}

const showHelp = () => {
  console.log(
    `\nUsage:\n  bun run user:create -- --url <baseUrl> --email <email> --password <password> --token <adminToken> [--authorization-level 1|2|3]\n\nExamples:\n  bun run user:create -- --url http://localhost:5880 --email admin@example.com --password "StrongPass123" --token "<ADMIN_CREATE_TOKEN>"\n  bun run user:create -- --url https://your.domain --email user@example.com --password "StrongPass123" --token "<ADMIN_CREATE_TOKEN>" --authorization-level 2\n\nEnvironment variables:\n  FLAREDRIVE_API_URL  Default base URL when --url is not provided.\n`
  )
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    showHelp()
    process.exit(0)
  }

  const baseUrl = args.url || process.env.FLAREDRIVE_API_URL || 'http://localhost:5880'
  const email = args.email
  const password = args.password
  const token = args.token || args['admin-token']
  const authorizationLevel = args['authorization-level']

  if (!email || !password || !token) {
    showHelp()
    process.exit(1)
  }

  const endpoint = new URL('/api/auth/admin-create', baseUrl).toString()
  const payload = {
    email,
    password,
    authorizationLevel: authorizationLevel ? Number(authorizationLevel) : undefined,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}))
    console.error('Failed:', res.status, body?.error || body)
    process.exit(1)
  }

  const data = await res.json().catch(() => ({}))
  console.log('Created:', data)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
