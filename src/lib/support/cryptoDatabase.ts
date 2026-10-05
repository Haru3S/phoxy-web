import { neon } from '@neondatabase/serverless';
import { getSecret } from 'astro:env/server';
import { getDatabase } from './database';
import { getNowPaymentsEnvironment, NowPaymentsError } from './nowPayments';

let sandboxDatabase: ReturnType<typeof neon> | null = null;
let sandboxDatabaseUrl: string | null = null;

export function getCryptoDatabase(): ReturnType<typeof neon> {
  if (getNowPaymentsEnvironment() === 'production') return getDatabase();
  const url = getSecret('NOWPAYMENTS_SANDBOX_DATABASE_URL');
  if (!url) throw new NowPaymentsError('NOWPAYMENTS_SANDBOX_DATABASE_URL is not configured.');
  const selected = new URL(url);
  const productionUrl = getSecret('PHXFDB_DATABASE_URL');
  if (productionUrl) {
    const production = new URL(productionUrl);
    // Detect the same Neon endpoint even if one URL uses the pooler hostname.
    if (selected.hostname.replace('-pooler.', '.') === production.hostname.replace('-pooler.', '.') &&
      selected.pathname === production.pathname) {
      throw new NowPaymentsError('Sandbox must use a separate database.');
    }
  }
  if (!sandboxDatabase || sandboxDatabaseUrl !== url) {
    sandboxDatabase = neon(url);
    sandboxDatabaseUrl = url;
  }
  return sandboxDatabase;
}
