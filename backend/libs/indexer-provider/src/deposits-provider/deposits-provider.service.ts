import { Injectable } from "@nestjs/common";
import { AxiosInstance } from "axios";

import { INDEXER } from "config";

import { X_API_KEY } from "@libs/auth";
import { AxiosService } from "@libs/axios";
import {
  INDEXER_PRIVATE_DEPOSITS_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_WITHDRAWALS_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_DEPOSITED_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_WITHDRAWN_URL,
} from "@libs/constants/routes";
import { ApiErrorHandler } from "@libs/exceptions";
import {
  DepositDTO,
  WithdrawalDTO,
  TotalDepositedDTO,
  TotalWithdrawnDTO,
  GetDepositsByUserInput,
  GetWithdrawalsByUserInput,
} from "@libs/indexer-types";

@Injectable()
export class DepositsProviderService extends ApiErrorHandler {
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

  async getDepositsByUser({
    userAddress,
    limit = 100,
  }: GetDepositsByUserInput): Promise<DepositDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_DEPOSITS_URL}/${INDEXER_PRIVATE_DEPOSITS_USER_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<DepositDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getDepositsByUser.name, err);
    }
  }

  async getWithdrawalsByUser({
    userAddress,
    limit = 100,
  }: GetWithdrawalsByUserInput): Promise<WithdrawalDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_DEPOSITS_URL}/${INDEXER_PRIVATE_DEPOSITS_USER_WITHDRAWALS_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<WithdrawalDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getWithdrawalsByUser.name, err);
    }
  }

  async getTotalDeposited(userAddress: string): Promise<TotalDepositedDTO> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_DEPOSITS_URL}/${INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_DEPOSITED_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<TotalDepositedDTO>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getTotalDeposited.name, err);
    }
  }

  async getTotalWithdrawn(userAddress: string): Promise<TotalWithdrawnDTO> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_DEPOSITS_URL}/${INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_WITHDRAWN_URL.replace(":userAddress", userAddress)}`;
      const response = await this.axiosInstance.get<TotalWithdrawnDTO>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getTotalWithdrawn.name, err);
    }
  }
}
