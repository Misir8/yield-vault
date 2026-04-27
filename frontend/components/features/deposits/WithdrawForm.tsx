'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVault } from '@/hooks/useVault';
import { formatUSDT } from '@/lib/utils/format';
import { Loader2 } from 'lucide-react';

export function WithdrawForm() {
  const [shares, setShares] = useState('');
  
  const {
    userBalance,
    withdraw,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    refetchBalance,
  } = useVault();

  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        setShares('');
        refetchBalance();
      }, 0);
    }
  }, [isConfirmed, refetchBalance]);

  const handleWithdraw = async () => {
    try {
      await withdraw(shares);
    } catch (err) {
      console.error('Withdraw failed:', err);
    }
  };

  const handleMaxClick = () => {
    if (userBalance) {
      setShares(formatUSDT(userBalance));
    }
  };

  const isValidAmount = shares && parseFloat(shares) > 0;
  const hasShares = userBalance && userBalance > 0n;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw</CardTitle>
        <CardDescription>
          Withdraw your deposits with accumulated interest
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Shares:</span>
          <span className="font-medium">
            {userBalance ? formatUSDT(userBalance) : '0'} shares
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              disabled={isPending || isConfirming}
              className="text-lg"
            />
            <Button
              variant="outline"
              onClick={handleMaxClick}
              disabled={!hasShares || isPending || isConfirming}
            >
              MAX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the amount of shares you want to withdraw
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleWithdraw}
            disabled={!isValidAmount || !hasShares || isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Withdrawing...'}
              </>
            ) : (
              'Withdraw'
            )}
          </Button>

          {isConfirmed && (
            <p className="text-sm text-green-600 text-center">
              ✓ Withdrawal confirmed!
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
          <p>• Shares are converted back to USDT</p>
          <p>• You receive your deposit + accumulated interest</p>
          <p>• No withdrawal fees</p>
        </div>
      </CardContent>
    </Card>
  );
}
