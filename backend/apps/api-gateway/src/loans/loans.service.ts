import { Injectable } from "@nestjs/common";

import {
  LoanDTO,
  LiquidationDTO,
  RepaymentDTO,
  TotalBorrowedDTO,
} from "@libs/indexer-types";
import { LoansProviderService } from "@libs/indexer-provider";

@Injectable()
export class LoansService {
  constructor(private readonly loansProvider: LoansProviderService) {}

  async getUserLoans(userAddress: string, limit?: number): Promise<LoanDTO[]> {
    return this.loansProvider.getLoansByUser({ userAddress, limit });
  }

  async getActiveUserLoans(userAddress: string): Promise<LoanDTO[]> {
    return this.loansProvider.getActiveLoansByUser(userAddress);
  }

  async getTotalBorrowed(userAddress: string): Promise<TotalBorrowedDTO> {
    return this.loansProvider.getTotalBorrowed(userAddress);
  }

  async getRepaymentsByUser(
    userAddress: string,
    limit?: number,
  ): Promise<RepaymentDTO[]> {
    return this.loansProvider.getRepaymentsByUser({ userAddress, limit });
  }

  async getLiquidationsByBorrower(
    borrowerAddress: string,
    limit?: number,
  ): Promise<LiquidationDTO[]> {
    return this.loansProvider.getLiquidationsByBorrower({
      borrowerAddress,
      limit,
    });
  }
}
