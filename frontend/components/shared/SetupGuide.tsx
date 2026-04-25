'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const TEST_ACCOUNTS = [
  {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
];

export function SetupGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Hide in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!showGuide) {
    return (
      <Button variant="outline" onClick={() => setShowGuide(true)}>
        📚 Setup Guide
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>🚀 Local Development Setup</CardTitle>
        <CardDescription>
          Follow these steps to connect MetaMask to your local Hardhat network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Step 1: Add Hardhat Network to MetaMask</h3>
          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <p><strong>Network Name:</strong> Hardhat Local</p>
            <p><strong>RPC URL:</strong> http://localhost:8545</p>
            <p><strong>Chain ID:</strong> 1337</p>
            <p><strong>Currency Symbol:</strong> ETH</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Step 2: Import Test Account</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use one of these pre-funded test accounts (10,000 ETH each):
          </p>
          {TEST_ACCOUNTS.map((account, index) => (
            <div key={index} className="bg-muted p-3 rounded-md text-sm space-y-2 mb-2">
              <div>
                <p className="font-medium">Account #{index}</p>
                <p className="text-xs break-all">{account.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                  {account.privateKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(account.privateKey, index)}
                >
                  {copiedIndex === index ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Never use these private keys on mainnet or with real funds!
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Step 3: Switch Network</h3>
          <p className="text-sm text-muted-foreground">
            Make sure MetaMask is connected to &quot;Hardhat Local&quot; network before making transactions.
          </p>
        </div>

        <Button variant="outline" onClick={() => setShowGuide(false)}>
          Close Guide
        </Button>
      </CardContent>
    </Card>
  );
}
