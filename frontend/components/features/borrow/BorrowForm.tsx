'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLendingPool } from '@/hooks/useLendingPool';
import { formatTokenAmount } from '@/lib/utils/format';
import { Loader2 } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';

export function BorrowForm() {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const { address } = useAccount();
  
  const {
    userDebt,
    userCollateral,
    healthFactor,
    borrow,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    refetchDebt,
    refetchCollateral,
  } = useLendingPool();

  const { data: ethBalance } = useBalance({
    address,
  });

  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        setBorrowAmount('');
        setCollateralAmount('');
        refetchDebt();
        refetchCollateral();
      }, 0);
    }
  }, [isConfirmed, refetchDebt, refetchCollateral]);

  const handleBorrow = async () => {
    try {
      await borrow(borrowAmount, collateralAmount);
    } catch (err) {
      console.error('Borrow failed:', err);
    }
  };

  const isValidBorrowAmount = borrowAmount && parseFloat(borrowAmount) > 0;
  const isValidCollateral = collateralAmount && parseFloat(collateralAmount) > 0;
  const hasEthBalance = ethBalance && ethBalance.value > 0n;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrow</CardTitle>
        <CardDescription>
          Borrow stablecoins against ETH collateral
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Position */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Debt:</span>
            <span className="font-medium">
              {userDebt ? formatTokenAmount(userDebt) : '0'} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Collateral:</span>
            <span className="font-medium">
              {userCollateral ? formatTokenAmount(userCollateral) : '0'} ETH
            </span>
          </div>
          {healthFactor !== undefined && userDebt && userDebt > 0n && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Health Factor:</span>
              <span className={`font-medium ${Number(healthFactor) < 1.5 ? 'text-red-600' : 'text-green-600'}`}>
                {(Number(healthFactor) / 1e18).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Collateral Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Collateral (ETH)</label>
          <Input
            type="number"
            placeholder="0.0"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            disabled={isPending || isConfirming}
          />
          <p className="text-xs text-muted-foreground">
            Available: {ethBalance ? formatTokenAmount(ethBalance.value) : '0'} ETH
          </p>
        </div>

        {/* Borrow Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Borrow Amount (USDT)</label>
          <Input
            type="number"
            placeholder="0.0"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            disabled={isPending || isConfirming}
          />
          <p className="text-xs text-muted-foreground">
            Max borrow depends on collateral value and LTV ratio
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleBorrow}
            disabled={!isValidBorrowAmount || !isValidCollateral || !hasEthBalance || isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Borrowing...'}
              </>
            ) : (
              'Borrow'
            )}
          </Button>

          {isConfirmed && (
            <p className="text-sm text-green-600 text-center">
              ✓ Borrow confirmed!
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
          <p>• Collateral is locked until loan is repaid</p>
          <p>• Maintain health factor above 1.0 to avoid liquidation</p>
          <p>• Interest accrues on borrowed amount</p>
        </div>
      </CardContent>
    </Card>
  );
}
