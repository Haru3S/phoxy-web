import {
  neon,
} from '@neondatabase/serverless';

import {
  getSecret,
} from 'astro:env/server';

let database:
  ReturnType<typeof neon> |
  null =
  null;

export function getDatabase():
  ReturnType<typeof neon> {
  if (database) {
    return database;
  }

  const databaseUrl =
    getSecret(
      'PHXFDB_DATABASE_URL'
    );

  if (!databaseUrl) {
    throw new Error(
      'PHXFDB_DATABASE_URL is not configured.'
    );
  }

  database =
    neon(
      databaseUrl
    );

  return database;
}