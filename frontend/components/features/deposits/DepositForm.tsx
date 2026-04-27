'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVault } from '@/hooks/useVault';
import { formatUSDT } from '@/lib/utils/format';
import { parseUnits } from 'viem';
import { Loader2 } from 'lucide-react';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [lastAction, setLastAction] = useState<'approve' | 'deposit' | null>(null);
  
  const {
    tokenBalance,
    allowance,
    approve,
    deposit,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    refetchAllowance,
    refetchBalance,
  } = useVault();

  useEffect(() => {
    if (amount && allowance !== undefined) {
      try {
        const amountBigInt = parseUnits(amount, 18);
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
    
    if (isConfirmed && lastAction === 'deposit') {
      setTimeout(() => {
        setAmount('');
        setLastAction(null);
        refetchAllowance();
        refetchBalance();
      }, 1000);
    }
  }, [isConfirmed, lastAction, refetchAllowance, refetchBalance]);

  const handleApprove = async () => {
    try {
      setLastAction('approve');
      await approve();
    } catch (err) {
      console.error('Approve failed:', err);
      setLastAction(null);
    }
  };

  const handleDeposit = async () => {
    try {
      setLastAction('deposit');
      await deposit(amount);
    } catch (err) {
      console.error('Deposit failed:', err);
      setLastAction(null);
    }
  };

  const handleMaxClick = () => {
    if (tokenBalance) {
      setAmount(formatUSDT(tokenBalance));
    }
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasBalance = tokenBalance && tokenBalance > 0n;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit</CardTitle>
        <CardDescription>
          Deposit stablecoins to earn yield
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
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
              disabled={!hasBalance || isPending || isConfirming}
            >
              MAX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the amount of USDT you want to deposit
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {needsApproval ? (
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
                'Approve USDT'
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleDeposit}
              disabled={!isValidAmount || !hasBalance || isPending || isConfirming}
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConfirming ? 'Confirming...' : 'Depositing...'}
                </>
              ) : (
                'Deposit'
              )}
            </Button>
          )}

          {isConfirmed && lastAction === 'approve' && (
            <p className="text-sm text-green-600 text-center">
              ✓ Approval confirmed! Now click Deposit.
            </p>
          )}

          {isConfirmed && lastAction === 'deposit' && (
            <p className="text-sm text-green-600 text-center">
              ✓ Deposit confirmed!
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
          <p>• You will receive vault shares representing your deposit</p>
          <p>• Interest accrues automatically</p>
          <p>• Withdraw anytime with accumulated interest</p>
        </div>
      </CardContent>
    </Card>
  );
}
