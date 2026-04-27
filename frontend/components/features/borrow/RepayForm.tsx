'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLendingPool } from '@/hooks/useLendingPool';
import { formatUSDT } from '@/lib/utils/format';
import { parseUnits } from 'viem';
import { Loader2 } from 'lucide-react';

export function RepayForm() {
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [lastAction, setLastAction] = useState<'approve' | 'repay' | null>(null);
  
  const {
    userDebt,
    tokenBalance,
    allowance,
    approve,
    repay,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    refetchAllowance,
    refetchDebt,
  } = useLendingPool();

  useEffect(() => {
    if (amount && allowance !== undefined) {
      try {
        const amountBigInt = parseUnits(amount, 6); // USDT 6 decimals
        setTimeout(() => {
          setNeedsApproval(allowance < amountBigInt);
        }, 0);
      } catch {
        setTimeout(() => {
          setNeedsApproval(false);
        }, 0);
      }
    }
  }, [amount, allowance]);

  useEffect(() => {
    if (isConfirmed && lastAction === 'approve') {
      setTimeout(() => {
        refetchAllowance();
      }, 1000);
    }
    
    if (isConfirmed && lastAction === 'repay') {
      setTimeout(() => {
        setAmount('');
        setLastAction(null);
        refetchAllowance();
        refetchDebt();
      }, 1000);
    }
  }, [isConfirmed, lastAction, refetchAllowance, refetchDebt]);

  const handleApprove = async () => {
    try {
      setLastAction('approve');
      await approve();
    } catch (err) {
      console.error('Approve failed:', err);
      setLastAction(null);
    }
  };

  const handleRepay = async () => {
    try {
      setLastAction('repay');
      await repay(amount);
    } catch (err) {
      console.error('Repay failed:', err);
      setLastAction(null);
    }
  };

  const handleMaxClick = () => {
    if (userDebt && tokenBalance) {
      const maxAmount = userDebt < tokenBalance ? userDebt : tokenBalance;
      setAmount(formatUSDT(maxAmount));
    }
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasDebt = userDebt && userDebt > 0n;
  const hasBalance = tokenBalance && tokenBalance > 0n;

  if (!hasDebt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repay Loan</CardTitle>
          <CardDescription>
            Pay back your borrowed stablecoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You don&apos;t have any active loans</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repay Loan</CardTitle>
        <CardDescription>
          Pay back your borrowed stablecoins and reduce debt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debt Display */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current Debt:</span>
          <span className="font-medium text-red-600">
            {userDebt ? formatUSDT(userDebt) : '0'} USDT
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Available Balance:</span>
          <span className="font-medium">
            {tokenBalance ? formatUSDT(tokenBalance) : '0'} USDT
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending || isConfirming}
              className="text-lg"
            />
            <Button
              variant="outline"
              onClick={handleMaxClick}
              disabled={!hasDebt || !hasBalance || isPending || isConfirming}
            >
              MAX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the amount of USDT you want to repay
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {needsApproval ? (
            <>
              <Button
                className="w-full"
                onClick={handleApprove}
                disabled={!isValidAmount || isPending || isConfirming}
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Approving...'}
                  </>
                ) : (
                  '1. Approve USDT'
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                First, approve the contract to spend your USDT
              </p>
            </>
          ) : (
            <>
              <Button
                className="w-full"
                onClick={handleRepay}
                disabled={!isValidAmount || !hasBalance || isPending || isConfirming}
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Repaying...'}
                  </>
                ) : (
                  '2. Repay Loan'
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Repay your loan and unlock collateral
              </p>
            </>
          )}

          {isConfirmed && lastAction === 'approve' && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Step 1 complete! Click &quot;2. Repay Loan&quot; to continue
            </p>
          )}

          {isConfirmed && lastAction === 'repay' && (
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Loan repaid successfully! Refreshing in a moment...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center">
              Error: {error.message}
            </p>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Repaying reduces your debt and improves health factor</p>
          <p>• You can withdraw collateral after full repayment</p>
          <p>• Partial repayments are allowed</p>
        </div>
      </CardContent>
    </Card>
  );
}
