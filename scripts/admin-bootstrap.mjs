import { emitKeypressEvents } from 'node:readline';
import { createInterface as createPromiseInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Pool } from 'pg';
import {
  bootstrapAdmin,
  BootstrapAlreadyCompletedError,
  hasAdminAccount,
  normalizeEmail,
  validatePassword,
} from '../src/server/security.mjs';

function readHiddenPassword(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run admin:bootstrap from an interactive terminal.');
  }
  emitKeypressEvents(stdin);
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.off('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      error ? reject(error) : resolve(value);
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        finish(new Error('Bootstrap cancelled.'));
      } else if (key.name === 'return' || character === '\r' || character === '\n') {
        finish();
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (
        character &&
        !key.ctrl &&
        !key.meta &&
        Buffer.byteLength(value + character) <= 1024
      ) {
        value += character;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', onKeypress);
    stdout.write(prompt);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. No credentials were requested or changed.');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('SELECT 1');
    if (await hasAdminAccount(pool)) {
      console.error('Administrator bootstrap is already complete; no account was changed.');
      process.exitCode = 1;
      return;
    }

    let confirmation;
    let email;
    const prompt = createPromiseInterface({ input: stdin, output: stdout });
    try {
      confirmation = await prompt.question(
        'This creates the single administrator in the configured PostgreSQL database. Type CREATE to continue: ',
      );
      if (confirmation !== 'CREATE') {
        console.log('Bootstrap cancelled.');
        return;
      }
      email = normalizeEmail(await prompt.question('Administrator email: '));
    } finally {
      prompt.close();
    }
    if (!email) {
      console.error('A valid email address is required. No account was created.');
      process.exitCode = 1;
      return;
    }

    const password = await readHiddenPassword('Password (minimum 12 characters; input hidden): ');
    if (!validatePassword(password)) {
      console.error('Password must be between 12 and 1024 characters. No account was created.');
      process.exitCode = 1;
      return;
    }
    await bootstrapAdmin(pool, { email, password });
    console.log(
      'Administrator created. The plaintext password was not written to environment variables, logs, or disk.',
    );
  } catch (error) {
    if (error instanceof BootstrapAlreadyCompletedError) {
      console.error('Administrator bootstrap is already complete; repeat runs are rejected.');
    } else {
      console.error(
        'Admin bootstrap failed. Check that migrations are applied and PostgreSQL is reachable.',
      );
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
