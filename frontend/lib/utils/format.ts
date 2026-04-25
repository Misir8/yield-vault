import { formatUnits } from 'viem';

/**
 * Format token amount from wei to human readable
 */
export function formatTokenAmount(amount: bigint | string, decimals: number = 18): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  return formatUnits(amountBigInt, decimals);
}

/**
 * Format token amount with symbol
 */
export function formatTokenWithSymbol(amount: bigint | string, symbol: string = 'USDT', decimals: number = 18): string {
  const formatted = formatTokenAmount(amount, decimals);
  return `${parseFloat(formatted).toLocaleString()} ${symbol}`;
}

/**
 * Format address to short version
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
