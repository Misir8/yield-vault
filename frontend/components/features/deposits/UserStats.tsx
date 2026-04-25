'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVault } from '@/hooks/useVault';
import { useLendingPool } from '@/hooks/useLendingPool';
import { useDeposits } from '@/hooks/useDeposits';
import { useLoans } from '@/hooks/useLoans';
import { formatTokenAmount } from '@/lib/utils/format';
import { TrendingUp, Wallet, CreditCard } from 'lucide-react';

export function UserStats() {
  const { userBalance, totalAssets } = useVault();
  const { userDebt, userCollateral } = useLendingPool();
  const { totalDeposited, totalWithdrawn } = useDeposits();
  const { totalBorrowed } = useLoans();

  const netDeposit = BigInt(totalDeposited || '0') - BigInt(totalWithdrawn || '0');

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Deposits</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {userBalance ? formatTokenAmount(userBalance) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            Vault shares
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {userDebt ? formatTokenAmount(userDebt) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            USDT debt
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Position</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatTokenAmount(netDeposit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Deposits - Withdrawals
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
