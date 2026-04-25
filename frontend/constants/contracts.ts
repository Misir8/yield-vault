export const CONTRACTS = {
  VAULT: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`,
  LENDING_POOL: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS as `0x${string}`,
  STABLE_TOKEN: process.env.NEXT_PUBLIC_STABLE_TOKEN_ADDRESS as `0x${string}`,
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 1337;
