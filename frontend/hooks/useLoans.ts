import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { indexerAPI } from '@/lib/api/indexer';

export function useLoans() {
  const { address } = useAccount();

  const { data: loans, isLoading: isLoadingLoans, refetch: refetchLoans } = useQuery({
    queryKey: ['loans', address],
    queryFn: () => address ? indexerAPI.getLoansByUser(address) : Promise.resolve([]),
    enabled: !!address,
  });

  const { data: activeLoans, isLoading: isLoadingActiveLoans, refetch: refetchActiveLoans } = useQuery({
    queryKey: ['activeLoans', address],
    queryFn: () => address ? indexerAPI.getActiveLoansByUser(address) : Promise.resolve([]),
    enabled: !!address,
  });

  const { data: repayments, isLoading: isLoadingRepayments, refetch: refetchRepayments } = useQuery({
    queryKey: ['repayments', address],
    queryFn: () => address ? indexerAPI.getRepaymentsByUser(address) : Promise.resolve([]),
    enabled: !!address,
  });

  const { data: totalBorrowed } = useQuery({
    queryKey: ['totalBorrowed', address],
    queryFn: () => address ? indexerAPI.getTotalBorrowed(address) : Promise.resolve({ userAddress: '', totalBorrowed: '0' }),
    enabled: !!address,
  });

  return {
    loans: loans || [],
    activeLoans: activeLoans || [],
    repayments: repayments || [],
    totalBorrowed: totalBorrowed?.totalBorrowed || '0',
    isLoading: isLoadingLoans || isLoadingActiveLoans || isLoadingRepayments,
    refetchLoans,
    refetchActiveLoans,
    refetchRepayments,
  };
}
