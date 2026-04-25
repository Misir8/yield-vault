import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { indexerAPI } from '@/lib/api/indexer';

export function useDeposits() {
  const { address } = useAccount();

  const { data: deposits, isLoading: isLoadingDeposits, refetch: refetchDeposits } = useQuery({
    queryKey: ['deposits', address],
    queryFn: () => address ? indexerAPI.getDepositsByUser(address) : Promise.resolve([]),
    enabled: !!address,
  });

  const { data: withdrawals, isLoading: isLoadingWithdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['withdrawals', address],
    queryFn: () => address ? indexerAPI.getWithdrawalsByUser(address) : Promise.resolve([]),
    enabled: !!address,
  });

  const { data: totalDeposited } = useQuery({
    queryKey: ['totalDeposited', address],
    queryFn: () => address ? indexerAPI.getTotalDeposited(address) : Promise.resolve({ userAddress: '', totalDeposited: '0' }),
    enabled: !!address,
  });

  const { data: totalWithdrawn } = useQuery({
    queryKey: ['totalWithdrawn', address],
    queryFn: () => address ? indexerAPI.getTotalWithdrawn(address) : Promise.resolve({ userAddress: '', totalWithdrawn: '0' }),
    enabled: !!address,
  });

  return {
    deposits: deposits || [],
    withdrawals: withdrawals || [],
    totalDeposited: totalDeposited?.totalDeposited || '0',
    totalWithdrawn: totalWithdrawn?.totalWithdrawn || '0',
    isLoading: isLoadingDeposits || isLoadingWithdrawals,
    refetchDeposits,
    refetchWithdrawals,
  };
}
