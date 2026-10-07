import { Pool } from 'pg';
import { runMigrations } from '../src/server/db.mjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required; no migration was run.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await runMigrations(pool);
  console.log('Database migrations are up to date.');
} catch {
  console.error('Database migration failed. Check the PostgreSQL connection and migration files.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
