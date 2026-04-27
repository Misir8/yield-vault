import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { vaultConfig } from '@/lib/contracts/vault';
import { stableTokenConfig } from '@/lib/contracts/erc20';

export function useVault() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Read user balance
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    ...vaultConfig,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  // Read total assets
  const { data: totalAssets } = useReadContract({
    ...vaultConfig,
    functionName: 'totalAssets',
  }) as { data: bigint | undefined };

  // Read user's token balance
  const { data: tokenBalance } = useReadContract({
    ...stableTokenConfig,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined };

  // Read token allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...stableTokenConfig,
    functionName: 'allowance',
    args: address ? [address, vaultConfig.address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async () => {
    if (!address) throw new Error('Wallet not connected');
    
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    return writeContract({
      ...stableTokenConfig,
      functionName: 'approve',
      args: [vaultConfig.address, maxApproval],
      gas: 100000n,
    });
  };

  const deposit = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountBigInt = parseUnits(amount, 6); // USDT has 6 decimals
    
    return writeContract({
      ...vaultConfig,
      functionName: 'deposit',
      args: [amountBigInt],
      gas: 500000n,
    });
  };

  const withdraw = async (shares: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const sharesBigInt = parseUnits(shares, 6); // USDT has 6 decimals
    
    return writeContract({
      ...vaultConfig,
      functionName: 'withdraw',
      args: [sharesBigInt],
      gas: 500000n,
    });
  };

  return {
    // State
    userBalance,
    totalAssets,
    tokenBalance,
    allowance,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    
    // Actions
    approve,
    deposit,
    withdraw,
    refetchBalance,
    refetchAllowance,
  };
}
