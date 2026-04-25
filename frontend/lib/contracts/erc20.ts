import ERC20ABI from './ERC20ABI.json';
import { CONTRACTS } from '@/constants/contracts';

export const stableTokenConfig = {
  address: CONTRACTS.STABLE_TOKEN,
  abi: ERC20ABI,
} as const;

export { ERC20ABI };
