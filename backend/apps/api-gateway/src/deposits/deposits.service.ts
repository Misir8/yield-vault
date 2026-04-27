import { Injectable } from "@nestjs/common";

import {
  DepositDTO,
  WithdrawalDTO,
  TotalDepositedDTO,
  TotalWithdrawnDTO,
} from "@libs/indexer-types";
import { DepositsProviderService } from "@libs/indexer-provider";

@Injectable()
export class DepositsService {
  constructor(private readonly depositsProvider: DepositsProviderService) {}

  async getUserDeposits(
    userAddress: string,
    limit?: number,
  ): Promise<DepositDTO[]> {
    return this.depositsProvider.getDepositsByUser({ userAddress, limit });
  }

  async getUserWithdrawals(
    userAddress: string,
    limit?: number,
  ): Promise<WithdrawalDTO[]> {
    return this.depositsProvider.getWithdrawalsByUser({ userAddress, limit });
  }

  async getTotalDeposited(userAddress: string): Promise<TotalDepositedDTO> {
    return this.depositsProvider.getTotalDeposited(userAddress);
  }

  async getTotalWithdrawn(userAddress: string): Promise<TotalWithdrawnDTO> {
    return this.depositsProvider.getTotalWithdrawn(userAddress);
  }
}
