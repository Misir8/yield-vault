import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import { lendingPoolConfig } from '@/lib/contracts/lendingPool';
import { stableTokenConfig } from '@/lib/contracts/erc20';

const wethAbi = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const wethAddress = process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}` | undefined;

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

  const { data: userCollateral, refetch: refetchCollateral } = useReadContract({
    ...lendingPoolConfig,
    functionName: 'getUserCollateral',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint | undefined; refetch: () => void };

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

  // Read WETH balance
  const { data: wethBalance, refetch: refetchWethBalance } = useReadContract({
    address: wethAddress,
    abi: wethAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!wethAddress,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  // Read WETH allowance for LendingPool
  const { data: wethAllowance, refetch: refetchWethAllowance } = useReadContract({
    address: wethAddress,
    abi: wethAbi,
    functionName: 'allowance',
    args: address && wethAddress ? [address, lendingPoolConfig.address] : undefined,
    query: {
      enabled: !!address && !!wethAddress,
    },
  }) as { data: bigint | undefined; refetch: () => void };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Wrap ETH to WETH
  const wrapETH = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    if (!wethAddress) throw new Error('WETH address not configured');
    
    const amountBigInt = parseEther(amount);
    
    return writeContract({
      address: wethAddress,
      abi: wethAbi,
      functionName: 'deposit',
      value: amountBigInt,
    });
  };

  // Approve WETH for LendingPool
  const approveWETH = async () => {
    if (!address) throw new Error('Wallet not connected');
    if (!wethAddress) throw new Error('WETH address not configured');
    
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    return writeContract({
      address: wethAddress,
      abi: wethAbi,
      functionName: 'approve',
      args: [lendingPoolConfig.address, maxApproval],
    });
  };

  const approve = async () => {
    if (!address) throw new Error('Wallet not connected');
    
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
    if (!wethAddress) {
      throw new Error('WETH address not configured. Please add NEXT_PUBLIC_WETH_ADDRESS to .env.local');
    }
    
    const amountBigInt = parseUnits(amount, 6); // USDT has 6 decimals
    const collateralBigInt = parseEther(collateralETH);
    
    return writeContract({
      ...lendingPoolConfig,
      functionName: 'borrow',
      args: [amountBigInt, wethAddress, collateralBigInt],
      gas: 5000000n, // Set explicit gas limit
    });
  };

  // Repay
  const repay = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountBigInt = parseUnits(amount, 6); // USDT has 6 decimals
    
    return writeContract({
      ...lendingPoolConfig,
      functionName: 'repay',
      args: [amountBigInt],
      gas: 500000n,
    });
  };

  return {
    // State
    userDebt,
    userCollateral,
    healthFactor,
    tokenBalance,
    allowance,
    wethBalance,
    wethAllowance,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    
    // Actions
    approve,
    approveWETH,
    wrapETH,
    borrow,
    repay,
    refetchDebt,
    refetchCollateral,
    refetchAllowance,
    refetchWethBalance,
    refetchWethAllowance,
  };
}
