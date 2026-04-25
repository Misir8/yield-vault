'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CHAIN_ID } from '@/constants/contracts';

export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  if (!isWrongNetwork) return null;

  const currentChainName = chainId === 1 ? 'Ethereum Mainnet' :
                           chainId === 11155111 ? 'Sepolia' :
                           chainId === 8453 ? 'Base' :
                           `Chain ${chainId}`;

  const networkName = CHAIN_ID === 1337 ? 'Hardhat Local' : 
                      CHAIN_ID === 1 ? 'Ethereum Mainnet' :
                      CHAIN_ID === 8453 ? 'Base' :
                      CHAIN_ID === 11155111 ? 'Sepolia' : 
                      `Chain ${CHAIN_ID}`;

  const handleSwitchNetwork = () => {
    switchChain({ chainId: CHAIN_ID });
  };

  const handleAddNetwork = async () => {
    // Only for local development
    if (CHAIN_ID !== 1337) {
      handleSwitchNetwork();
      return;
    }

    try {
      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: 'Hardhat Local',
          rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'],
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          }
        }]
      });
    } catch (error) {
      console.error('Failed to add network:', error);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>⚠️ Wrong Network Detected</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>You are connected to <strong>{currentChainName}</strong>, but this app requires <strong>{networkName}</strong>.</p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSwitchNetwork}>
            Switch to {networkName}
          </Button>
          {CHAIN_ID === 1337 && (
            <Button size="sm" variant="outline" onClick={handleAddNetwork}>
              Add Hardhat Network
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
