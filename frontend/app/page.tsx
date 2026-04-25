'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkSwitcher } from '@/components/shared/NetworkSwitcher';
import { SetupGuide } from '@/components/shared/SetupGuide';
import { DepositForm } from '@/components/features/deposits/DepositForm';
import { WithdrawForm } from '@/components/features/deposits/WithdrawForm';
import { BorrowForm } from '@/components/features/borrow/BorrowForm';
import { RepayForm } from '@/components/features/borrow/RepayForm';
import { TransactionHistory } from '@/components/features/deposits/TransactionHistory';
import { UserStats } from '@/components/features/deposits/UserStats';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">🏦 DeFi Yield Vault</h1>
          </div>
          <div className="flex items-center gap-4">
            <SetupGuide />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <NetworkSwitcher />
        
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h2 className="text-4xl font-bold mb-4">Welcome to DeFi Yield Vault</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Earn dynamic interest on your stablecoins with our secure, transparent DeFi protocol
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Stats */}
            <UserStats />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Action Forms with Tabs */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="deposit" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="borrow">Borrow</TabsTrigger>
                    <TabsTrigger value="repay">Repay</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="deposit" className="mt-6">
                    <DepositForm />
                  </TabsContent>
                  
                  <TabsContent value="withdraw" className="mt-6">
                    <WithdrawForm />
                  </TabsContent>
                  
                  <TabsContent value="borrow" className="mt-6">
                    <BorrowForm />
                  </TabsContent>
                  
                  <TabsContent value="repay" className="mt-6">
                    <RepayForm />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right: Transaction History */}
              <div className="lg:col-span-1">
                <TransactionHistory />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Ethereum • Chainlink • Next.js</p>
        </div>
      </footer>
    </div>
  );
}
