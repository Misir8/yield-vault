import { APIClient } from './client';
import { Deposit, Withdrawal, Loan, Repayment, Event } from '@/types';

class IndexerAPIClient extends APIClient {
  constructor() {
    // Use API Gateway instead of direct Indexer access
    super(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1');
  }

  // Deposits
  async getDepositsByUser(address: string, limit: number = 100): Promise<Deposit[]> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get<Deposit[]>(`/deposits/user/${normalizedAddress}?limit=${limit}`);
    } catch (error) {
      console.warn('Failed to fetch deposits:', error);
      return [];
    }
  }

  async getWithdrawalsByUser(address: string, limit: number = 100): Promise<Withdrawal[]> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get<Withdrawal[]>(`/deposits/user/${normalizedAddress}/withdrawals?limit=${limit}`);
    } catch (error) {
      console.warn('Failed to fetch withdrawals:', error);
      return [];
    }
  }

  async getTotalDeposited(address: string): Promise<{ userAddress: string; totalDeposited: string }> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get(`/deposits/user/${normalizedAddress}/total-deposited`);
    } catch (error) {
      console.warn('Failed to fetch total deposited:', error);
      return { userAddress: address, totalDeposited: '0' };
    }
  }

  async getTotalWithdrawn(address: string): Promise<{ userAddress: string; totalWithdrawn: string }> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get(`/deposits/user/${normalizedAddress}/total-withdrawn`);
    } catch (error) {
      console.warn('Failed to fetch total withdrawn:', error);
      return { userAddress: address, totalWithdrawn: '0' };
    }
  }

  // Loans
  async getLoansByUser(address: string, limit: number = 100): Promise<Loan[]> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get<Loan[]>(`/loans/user/${normalizedAddress}?limit=${limit}`);
    } catch (error) {
      console.warn('Failed to fetch loans:', error);
      return [];
    }
  }

  async getActiveLoansByUser(address: string): Promise<Loan[]> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get<Loan[]>(`/loans/user/${normalizedAddress}/active`);
    } catch (error) {
      console.warn('Failed to fetch active loans:', error);
      return [];
    }
  }

  async getRepaymentsByUser(address: string, limit: number = 100): Promise<Repayment[]> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get<Repayment[]>(`/loans/user/${normalizedAddress}/repayments?limit=${limit}`);
    } catch (error) {
      console.warn('Failed to fetch repayments:', error);
      return [];
    }
  }

  async getTotalBorrowed(address: string): Promise<{ userAddress: string; totalBorrowed: string }> {
    try {
      const normalizedAddress = address.toLowerCase();
      return await this.get(`/loans/user/${normalizedAddress}/total-borrowed`);
    } catch (error) {
      console.warn('Failed to fetch total borrowed:', error);
      return { userAddress: address, totalBorrowed: '0' };
    }
  }

  // Events
  async getRecentEvents(limit: number = 100): Promise<Event[]> {
    return this.get<Event[]>(`/events?limit=${limit}`);
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<Event[]> {
    return this.get<Event[]>(`/events/type/${eventType}?limit=${limit}`);
  }

  async getEventsByTransaction(txHash: string): Promise<Event[]> {
    const normalizedTxHash = txHash.toLowerCase();
    return this.get<Event[]>(`/events/transaction/${normalizedTxHash}`);
  }
}

export const indexerAPI = new IndexerAPIClient();
