import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// scrypt with a random salt per password. Stored as scrypt$<salt>$<hash>.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const got = scryptSync(password, salt, 64);
  const want = Buffer.from(hash, 'hex');
  return want.length === got.length && timingSafeEqual(got, want);
}
