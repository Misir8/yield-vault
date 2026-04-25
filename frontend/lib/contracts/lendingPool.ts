import LendingPoolABI from './LendingPoolABI.json';
import { CONTRACTS } from '@/constants/contracts';

export const lendingPoolConfig = {
  address: CONTRACTS.LENDING_POOL,
  abi: LendingPoolABI,
} as const;

export { LendingPoolABI };
