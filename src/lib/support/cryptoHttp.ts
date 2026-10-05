import { CryptoValidationError } from './cryptoValidation';
import { Buffer } from 'node:buffer';

export function cryptoJson(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function readCryptoJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new CryptoValidationError('Expected application/json.');
  }
  if (!request.body) throw new CryptoValidationError('Missing request body.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
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
    if (error instanceof CryptoValidationError) throw error;
    throw new CryptoValidationError('Invalid JSON body.');
  } finally {
    reader.releaseLock();
  }
}
