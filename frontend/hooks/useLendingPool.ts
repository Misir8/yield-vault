import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import { lendingPoolConfig } from '@/lib/contracts/lendingPool';
import { stableTokenConfig } from '@/lib/contracts/erc20';

export function useLendingPool() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Read user's debt
  const { data: userDebt, refetch: refetchDebt } = useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserDebt',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  // Read user's collateral
  const { data: userCollateral, refetch: refetchCollateral } = useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserCollateral',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  // Read health factor
  const { data: healthFactor } = useReadContract({
    ...lendingPoolConfig,
    functionName: 'getHealthFactor',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined };

  // Read user's USDT balance
  const { data: tokenBalance } = useReadContract({
    ...stableTokenConfig,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined };

  // Read USDT allowance for LendingPool
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...stableTokenConfig,
    functionName: 'allowance',
    args: address ? [address, lendingPoolConfig.address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Approve USDT for LendingPool
  const approve = async () => {
    if (!address) throw new Error('Wallet not connected');
    
    // Approve max uint256 for convenience (infinite approval)
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    return writeContract({
      ...stableTokenConfig,
      functionName: 'approve',
      args: [lendingPoolConfig.address, maxApproval],
    });
  };

  // Borrow
  const borrow = async (amount: string, collateralETH: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountBigInt = parseUnits(amount, 18);
    const collateralBigInt = parseEther(collateralETH);
    
    return writeContract({
      ...lendingPoolConfig,
      functionName: 'borrow',
      args: [amountBigInt],
      value: collateralBigInt,
    });
  };

  // Repay
  const repay = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountBigInt = parseUnits(amount, 18);
    
    return writeContract({
      ...lendingPoolConfig,
      functionName: 'repay',
      args: [amountBigInt],
    });
  };

  return {
    // State
    userDebt,
    userCollateral,
    healthFactor,
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
    borrow,
    repay,
    refetchDebt,
    refetchCollateral,
    refetchAllowance,
  };
}
