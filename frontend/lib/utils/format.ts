import { formatUnits } from 'viem';

/**
 * Format token amount from raw to human readable
 * @param decimals - token decimals (default 18 for ETH/ERC20, use 6 for USDT/USDC)
 */
export function formatTokenAmount(amount: bigint | string, decimals: number = 18): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const formatted = formatUnits(amountBigInt, decimals);
  // Remove trailing zeros after decimal point
  return parseFloat(formatted).toString();
}

/**
 * Format USDT amount (6 decimals)
 */
export function formatUSDT(amount: bigint | string): string {
  return formatTokenAmount(amount, 6);
}

/**
 * Format ETH/WETH amount (18 decimals)
 */
export function formatETH(amount: bigint | string): string {
  return formatTokenAmount(amount, 18);
}

/**
 * Format token amount with symbol
 */
export function formatTokenWithSymbol(amount: bigint | string, symbol: string = 'USDT', decimals: number = 6): string {
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
