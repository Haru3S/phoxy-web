import { CryptoValidationError } from './cryptoValidation';
import { Buffer } from 'node:buffer';

export function cryptoJson(body: object, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

// Keep IPN processing below the provider's 3000ms response limit. The deadline
// includes body reading, DB access, provider verification, and the atomic commit.
// Return a retryable failure rather than acknowledge work that was not persisted.
export async function withCryptoDeadline<T>(work: (signal: AbortSignal) => Promise<T>, milliseconds = 2500): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Error('Crypto notification processing deadline exceeded.'));
      reject(controller.signal.reason);
    }, milliseconds);
  });
  try { return await Promise.race([work(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}

export async function readCryptoJson(request: Request, maxBytes: number, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted();
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new CryptoValidationError('Expected application/json.');
  }
  if (!request.body) throw new CryptoValidationError('Missing request body.');
  const reader = request.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new CryptoValidationError('Request body is too large.');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (error instanceof CryptoValidationError) throw error;
    throw new CryptoValidationError('Invalid JSON body.');
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
