import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const SCRYPT_COST = 32_768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const HASH_BYTES = 64;
const MAX_PASSWORD_LENGTH = 1024;

export class BootstrapAlreadyCompletedError extends Error {
  constructor() {
    super('The one-time administrator bootstrap has already been completed.');
    this.name = 'BootstrapAlreadyCompletedError';
  }
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function validatePassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= 12 &&
    value.length <= MAX_PASSWORD_LENGTH &&
    Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_LENGTH
  );
}

export async function hashPassword(password) {
  if (!validatePassword(password)) {
    throw new TypeError('Password must be between 12 and 1024 characters.');
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, HASH_BYTES, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== 'string' || typeof encodedHash !== 'string') return false;
  const [algorithm, cost, blockSize, parallelization, saltText, hashText, extra] =
    encodedHash.split('$');
  if (
    extra !== undefined ||
    algorithm !== 'scrypt' ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length !== 16 || expected.length !== HASH_BYTES) return false;
    const actual = Buffer.from(
      await scrypt(password, salt, HASH_BYTES, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      }),
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHashPromise;
async function consumePasswordWork(password) {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString('base64url'));
  await verifyPassword(password, await dummyHashPromise);
}

export async function hasAdminAccount(pool) {
  const result = await pool.query('SELECT EXISTS (SELECT 1 FROM admin_users) AS exists');
  return result.rows[0].exists;
}

export async function bootstrapAdmin(pool, { email: suppliedEmail, password }) {
  const email = normalizeEmail(suppliedEmail);
  if (!email) throw new TypeError('Enter a valid email address.');
  if (!validatePassword(password)) {
    throw new TypeError('Password must be between 12 and 1024 characters.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(74130213, 1)');
    const result = await client.query('SELECT EXISTS (SELECT 1 FROM admin_users) AS exists');
    if (result.rows[0].exists) throw new BootstrapAlreadyCompletedError();

    const passwordHash = await hashPassword(password);
    const id = randomUUID();
    await client.query('INSERT INTO admin_users (id, email, password_hash) VALUES ($1, $2, $3)', [
      id,
      email,
      passwordHash,
    ]);
    await client.query('COMMIT');
    return { id, email };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticateAdmin(pool, suppliedEmail, password) {
  const email = normalizeEmail(suppliedEmail);
  if (!email || typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
    if (typeof password === 'string' && password.length <= MAX_PASSWORD_LENGTH) {
      await consumePasswordWork(password);
    }
    return null;
  }
  const result = await pool.query(
    'SELECT id, email, password_hash FROM admin_users WHERE lower(email) = $1 LIMIT 1',
    [email],
  );
  const admin = result.rows[0];
  if (!admin) {
    await consumePasswordWork(password);
    return null;
  }
  return (await verifyPassword(password, admin.password_hash))
    ? { id: admin.id, email: admin.email }
    : null;
}
