// Explicit asset/network pairs matching the existing Crypto Support presentation.
// LTC preference belongs to the UI, not payment eligibility.
export const CRYPTO_ASSETS = {
  ltc: { payCurrency: 'ltc', network: 'litecoin' },
  btc: { payCurrency: 'btc', network: 'bitcoin' },
  eth: { payCurrency: 'eth', network: 'ethereum' },
  sol: { payCurrency: 'sol', network: 'solana' },
  doge: { payCurrency: 'doge', network: 'dogecoin' },
  usdc: { payCurrency: 'usdcsol', network: 'solana' },
  usdt: { payCurrency: 'usdtsol', network: 'solana' },
} as const;

export type CryptoAsset = keyof typeof CRYPTO_ASSETS;

export function isCryptoAsset(value: unknown): value is CryptoAsset {
  return typeof value === 'string' && Object.hasOwn(CRYPTO_ASSETS, value);
}
