import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import {
  DepositResponseDTO,
  WithdrawalResponseDTO,
  UserAddressParamDTO,
  PaginationQueryDTO,
} from "@libs/indexer-types";

import { DepositsService } from "./deposits.service";

@ApiTags("Deposits")
@Controller("deposits")
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get("user/:userAddress")
  @ApiOperation({ summary: "Get user deposits" })
  @ApiResponse({ status: 200, type: [DepositResponseDTO] })
  async getUserDeposits(
    @Param() { userAddress }: UserAddressParamDTO,
    @Query() { limit }: PaginationQueryDTO,
  ) {
    return this.depositsService.getUserDeposits(userAddress, limit);
  }

  @Get("user/:userAddress/withdrawals")
  @ApiOperation({ summary: "Get user withdrawals" })
  @ApiResponse({ status: 200, type: [WithdrawalResponseDTO] })
  async getUserWithdrawals(
    @Param() { userAddress }: UserAddressParamDTO,
    @Query() { limit }: PaginationQueryDTO,
  ) {
    return this.depositsService.getUserWithdrawals(userAddress, limit);
  }

  @Get("user/:userAddress/total-deposited")
  @ApiOperation({ summary: "Get total deposited by user" })
  @ApiResponse({ status: 200, description: "Total deposited amount" })
  async getTotalDeposited(@Param() { userAddress }: UserAddressParamDTO) {
    return this.depositsService.getTotalDeposited(userAddress);
  }

  @Get("user/:userAddress/total-withdrawn")
  @ApiOperation({ summary: "Get total withdrawn by user" })
  @ApiResponse({ status: 200, description: "Total withdrawn amount" })
  async getTotalWithdrawn(@Param() { userAddress }: UserAddressParamDTO) {
    return this.depositsService.getTotalWithdrawn(userAddress);
  }
}
