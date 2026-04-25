export interface Deposit {
  id: string;
  user: string;
  amount: string;
  shares: string;
  blockNumber: string;
  transactionHash: string;
  timestamp: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  user: string;
  amount: string;
  shares: string;
  interest: string;
  blockNumber: string;
  transactionHash: string;
  timestamp: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  user: string;
  amount: string;
  collateral: string;
  blockNumber: string;
  transactionHash: string;
  timestamp: string;
  repaidAt: string | null;
  liquidatedAt: string | null;
  status: 'active' | 'repaid' | 'liquidated';
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  eventType: string;
  contractAddress: string;
  data: Record<string, unknown>;
  timestamp: string;
  createdAt: string;
}
