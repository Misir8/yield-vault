import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, base } from 'wagmi/chains';
import { defineChain } from 'viem';

const isDevelopment = process.env.NODE_ENV === 'development';

// Custom Hardhat chain configuration
const hardhatLocal = defineChain({
  id: 1337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'],
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'DeFi Yield Vault',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: isDevelopment 
    ? [hardhatLocal, sepolia] // Development: Hardhat + Sepolia testnet
    : [mainnet, base],        // Production: Mainnet + Base L2
  ssr: true,
});
