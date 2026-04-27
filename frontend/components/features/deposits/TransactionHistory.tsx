'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDeposits } from '@/hooks/useDeposits';
import { useLoans } from '@/hooks/useLoans';
import { formatUSDT, formatDate, formatAddress } from '@/lib/utils/format';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function TransactionHistory() {
  const { deposits, withdrawals, isLoading: isLoadingDeposits } = useDeposits();
  const { loans, repayments, isLoading: isLoadingLoans } = useLoans();

  const allTransactions = [
    ...deposits.map(d => ({ ...d, type: 'Deposit' as const })),
    ...withdrawals.map(w => ({ ...w, type: 'Withdrawal' as const })),
    ...loans.map(l => ({ ...l, type: 'Borrow' as const })),
    ...repayments.map(r => ({ ...r, type: 'Repay' as const })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const isLoading = isLoadingDeposits || isLoadingLoans;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allTransactions.map((tx) => (
            <Link
              key={tx.transactionHash}
              href={`/transaction/${tx.transactionHash}`}
              className="block"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      tx.type === 'Deposit' ? 'default' :
                      tx.type === 'Withdrawal' ? 'secondary' :
                      tx.type === 'Repay' ? 'destructive' :
                      'outline'
                    }>
                      {tx.type}
                    </Badge>
                    <span className="font-medium">
                      {formatUSDT(tx.amount)} USDT
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(tx.timestamp)}</span>
                    <span>•</span>
                    <span>{formatAddress(tx.transactionHash)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
