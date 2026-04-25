import VaultABI from './VaultABI.json';
import { CONTRACTS } from '@/constants/contracts';

export const vaultConfig = {
  address: CONTRACTS.VAULT,
  abi: VaultABI,
} as const;

export { VaultABI };
