export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStats {
  totalDeposited: string;
  totalWithdrawn: string;
  totalBorrowed: string;
  activeLoans: number;
  netBalance: string;
}

export interface GlobalStats {
  tvl: string;
  totalDeposits: string;
  totalBorrowed: string;
  utilizationRate: number;
  currentAPY: number;
}
