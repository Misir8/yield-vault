'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLendingPool } from '@/hooks/useLendingPool';
import { formatUSDT, formatETH } from '@/lib/utils/format';
import { Loader2 } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { parseEther } from 'viem';

export function BorrowForm() {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const { address } = useAccount();
  
  const {
    userDebt,
    userCollateral,
    healthFactor,
    wethBalance,
    wethAllowance,
    wrapETH,
    approveWETH,
    borrow,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    refetchDebt,
    refetchCollateral,
    refetchWethBalance,
    refetchWethAllowance,
  } = useLendingPool();

  const { data: ethBalance } = useBalance({
    address,
  });

  // Determine current step based on balances
  const step = useMemo<'wrap' | 'approve' | 'borrow'>(() => {
    if (!collateralAmount || parseFloat(collateralAmount) === 0) {
      return 'wrap';
    }

    const collateralBigInt = parseEther(collateralAmount);
    
    // Check if user has enough WETH
    if (!wethBalance || wethBalance < collateralBigInt) {
      return 'wrap';
    }

    // Check if WETH is approved
    if (!wethAllowance || wethAllowance < collateralBigInt) {
      return 'approve';
    }

    return 'borrow';
  }, [collateralAmount, wethBalance, wethAllowance]);

  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        if (step === 'wrap') {
          refetchWethBalance();
        } else if (step === 'approve') {
          refetchWethAllowance();
        } else {
          setBorrowAmount('');
          setCollateralAmount('');
          refetchDebt();
          refetchCollateral();
        }
      }, 1000); // Wait 1 second for blockchain to update
    }
  }, [isConfirmed, step, refetchDebt, refetchCollateral, refetchWethBalance, refetchWethAllowance]);

  const handleWrap = async () => {
    try {
      await wrapETH(collateralAmount);
    } catch (err) {
      console.error('Wrap failed:', err);
    }
  };

  const handleApprove = async () => {
    try {
      await approveWETH();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

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

  const getButtonText = () => {
    if (isPending || isConfirming) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isConfirming ? 'Confirming...' : 
           step === 'wrap' ? 'Wrapping...' :
           step === 'approve' ? 'Approving...' : 'Borrowing...'}
        </>
      );
    }

    if (step === 'wrap') return 'Step 1: Wrap ETH → WETH';
    if (step === 'approve') return 'Step 2: Approve WETH';
    return 'Step 3: Borrow USDT';
  };

  const handleAction = () => {
    if (step === 'wrap') return handleWrap();
    if (step === 'approve') return handleApprove();
    return handleBorrow();
  };

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
              {userDebt ? formatUSDT(userDebt) : '0'} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Collateral:</span>
            <span className="font-medium">
              {userCollateral ? formatETH(userCollateral) : '0'} ETH
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
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available: {ethBalance ? formatETH(ethBalance.value) : '0'} ETH</span>
            <span>WETH: {wethBalance ? formatETH(wethBalance) : '0'}</span>
          </div>
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
            onClick={handleAction}
            disabled={!isValidBorrowAmount || !isValidCollateral || !hasEthBalance || isPending || isConfirming}
          >
            {getButtonText()}
          </Button>

          {isConfirmed && (
            <p className="text-sm text-green-600 text-center">
              ✓ {step === 'wrap' ? 'ETH wrapped!' : 
                 step === 'approve' ? 'WETH approved!' : 'Borrow confirmed!'}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center">
              Error: {error.message}
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        {isValidCollateral && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <div className={`flex items-center gap-1 ${step === 'wrap' ? 'text-blue-600 font-medium' : wethBalance && wethBalance >= parseEther(collateralAmount) ? 'text-green-600' : 'text-muted-foreground'}`}>
              {wethBalance && wethBalance >= parseEther(collateralAmount) ? '✓' : '1'} Wrap
            </div>
            <span className="text-muted-foreground">→</span>
            <div className={`flex items-center gap-1 ${step === 'approve' ? 'text-blue-600 font-medium' : wethAllowance && wethAllowance >= parseEther(collateralAmount) ? 'text-green-600' : 'text-muted-foreground'}`}>
              {wethAllowance && wethAllowance >= parseEther(collateralAmount) ? '✓' : '2'} Approve
            </div>
            <span className="text-muted-foreground">→</span>
            <div className={`flex items-center gap-1 ${step === 'borrow' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
              3 Borrow
            </div>
          </div>
        )}

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
