import { Injectable } from "@nestjs/common";
import { AxiosInstance } from "axios";

import { INDEXER } from "config";

import { X_API_KEY } from "@libs/auth";
import { AxiosService } from "@libs/axios";
import {
  INDEXER_PRIVATE_LOANS_URL,
  INDEXER_PRIVATE_LOANS_USER_URL,
  INDEXER_PRIVATE_LOANS_USER_ACTIVE_URL,
  INDEXER_PRIVATE_LOANS_USER_TOTAL_BORROWED_URL,
  INDEXER_PRIVATE_LOANS_LIQUIDATIONS_URL,
  INDEXER_PRIVATE_LOANS_USER_REPAYMENTS_URL,
} from "@libs/constants/routes";
import { ApiErrorHandler } from "@libs/exceptions";
import {
  LoanDTO,
  LiquidationDTO,
  RepaymentDTO,
  TotalBorrowedDTO,
  GetLoansByUserInput,
  GetLiquidationsByBorrowerInput,
} from "@libs/indexer-types";

@Injectable()
export class LoansProviderService extends ApiErrorHandler {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    super();
    this.axiosInstance = new AxiosService().createInstance({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        [X_API_KEY]: INDEXER.X_API_KEY,
      },
    });
  }

  async getLoansByUser({
    userAddress,
    limit = 100,
  }: GetLoansByUserInput): Promise<LoanDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_LOANS_URL}/${INDEXER_PRIVATE_LOANS_USER_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<LoanDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getLoansByUser.name, err);
    }
  }

  async getActiveLoansByUser(userAddress: string): Promise<LoanDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_LOANS_URL}/${INDEXER_PRIVATE_LOANS_USER_ACTIVE_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<LoanDTO[]>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getActiveLoansByUser.name, err);
    }
  }

  async getTotalBorrowed(userAddress: string): Promise<TotalBorrowedDTO> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_LOANS_URL}/${INDEXER_PRIVATE_LOANS_USER_TOTAL_BORROWED_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<TotalBorrowedDTO>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getTotalBorrowed.name, err);
    }
  }

  async getRepaymentsByUser({
    userAddress,
    limit = 100,
  }: GetLoansByUserInput): Promise<RepaymentDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_LOANS_URL}/${INDEXER_PRIVATE_LOANS_USER_REPAYMENTS_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<RepaymentDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getRepaymentsByUser.name, err);
    }
  }

  async getLiquidationsByBorrower({
    borrowerAddress,
    limit = 100,
  }: GetLiquidationsByBorrowerInput): Promise<LiquidationDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_LOANS_URL}/${INDEXER_PRIVATE_LOANS_LIQUIDATIONS_URL.replace(":borrowerAddress", borrowerAddress)}`;
      const response = await this.axiosInstance.get<LiquidationDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getLiquidationsByBorrower.name, err);
    }
  }
}
