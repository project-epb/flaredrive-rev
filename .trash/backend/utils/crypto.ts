const textEncoder = new TextEncoder()

export const createId = () => crypto.randomUUID()

export const randomHex = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const hashSha256Hex = async (value: string) => {
  const buffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(value))
  return bufferToHex(buffer)
}

export const hashPasswordPbkdf2 = async (password: string, saltHex: string, iterations = 120000) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBuffer(saltHex),
      iterations,
    },
    key,
    256,
  )

  return bufferToHex(derivedBits)
}

export const timingSafeEqualHex = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

const bufferToHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const hexToBuffer = (hex: string) => {
  const length = hex.length / 2
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
