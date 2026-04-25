'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { indexerAPI } from '@/lib/api/indexer';
import { formatTokenAmount, formatDate, formatAddress } from '@/lib/utils/format';
import { ArrowLeft, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Event } from '@/types';

const getString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return fallback;
};

export default function TransactionPage() {
  const params = useParams();
  const router = useRouter();
  const hash = params.hash as string;
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadTransactionDetails = async () => {
      try {
        setIsLoading(true);
        const data = await indexerAPI.getEventsByTransaction(hash);
        setEvents(data);
      } catch (error) {
        console.error('Failed to load transaction details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (hash) {
      loadTransactionDetails();
    }
  }, [hash]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading transaction details...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Transaction not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const mainEvent = events[0];
  const eventTypeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    'Deposited': { label: 'Deposit', variant: 'default' },
    'Withdrawn': { label: 'Withdrawal', variant: 'secondary' },
    'Borrowed': { label: 'Borrow', variant: 'outline' },
    'Repaid': { label: 'Repay', variant: 'destructive' },
  };

  const eventInfo = eventTypeMap[mainEvent.eventType] || { label: mainEvent.eventType, variant: 'outline' as const };
  const userAddress = getString(mainEvent.data.user) || getString(mainEvent.data.borrower) || 'N/A';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Transaction Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    Transaction Details
                    <Badge variant={eventInfo.variant}>{eventInfo.label}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {formatDate(mainEvent.timestamp)}
                  </CardDescription>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
          </Card>

          {/* Transaction Hash */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Hash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-md text-sm break-all">
                  {mainEvent.transactionHash}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(mainEvent.transactionHash)}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a
                    href={`https://etherscan.io/tx/${mainEvent.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-green-600">Confirmed</span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Block Number</span>
                  <span className="font-medium">{mainEvent.blockNumber}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">From</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm">{formatAddress(userAddress)}</code>
                    {userAddress !== 'N/A' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(userAddress)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Contract</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm">{formatAddress(mainEvent.contractAddress)}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(mainEvent.contractAddress)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events in Transaction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Events ({events.length})</CardTitle>
              <CardDescription>All events emitted in this transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event, index) => {
                  const eventUser = getString(event.data.user) || getString(event.data.borrower);
                  const amount = getString(event.data.amount);
                  const shares = getString(event.data.shares);
                  const collateralAmount = getString(event.data.collateralAmount);

                  return (
                    <div key={event.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          <Badge variant={eventTypeMap[event.eventType]?.variant || 'outline'}>
                            {event.eventType}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Log Index: {event.logIndex}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {amount && (
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="ml-2 font-medium">
                              {formatTokenAmount(amount)} USDT
                            </span>
                          </div>
                        )}
                        
                        {shares && (
                          <div>
                            <span className="text-muted-foreground">Shares:</span>
                            <span className="ml-2 font-medium">
                              {formatTokenAmount(shares)}
                            </span>
                          </div>
                        )}
                        
                        {collateralAmount && (
                          <div>
                            <span className="text-muted-foreground">Collateral:</span>
                            <span className="ml-2 font-medium">
                              {formatTokenAmount(collateralAmount)} ETH
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {eventUser && (
                        <div className="text-xs text-muted-foreground">
                          User: <code>{formatAddress(eventUser)}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw Event Data</CardTitle>
              <CardDescription>Complete event data in JSON format</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(mainEvent.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
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
