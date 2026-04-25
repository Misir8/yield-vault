import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { DepositsService } from "./deposits.service";
import {
  GetDepositsByUserDTO,
  DepositResponseDTO,
  WithdrawalResponseDTO,
} from "./dto/deposit.dto";

@ApiTags("Deposits")
@Controller("deposits")
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get("user/:userAddress")
  @ApiOperation({ summary: "Get deposits by user address" })
  @ApiResponse({
    status: 200,
    description: "List of user deposits",
    type: [DepositResponseDTO],
  })
  async getDepositsByUser(
    @Param() params: GetDepositsByUserDTO,
    @Query() query: GetDepositsByUserDTO,
  ) {
    return await this.depositsService.getDepositsByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get("user/:userAddress/withdrawals")
  @ApiOperation({ summary: "Get withdrawals by user address" })
  @ApiResponse({
    status: 200,
    description: "List of user withdrawals",
    type: [WithdrawalResponseDTO],
  })
  async getWithdrawalsByUser(
    @Param() params: GetDepositsByUserDTO,
    @Query() query: GetDepositsByUserDTO,
  ) {
    return await this.depositsService.getWithdrawalsByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get("user/:userAddress/total-deposited")
  @ApiOperation({ summary: "Get total deposited by user" })
  @ApiResponse({
    status: 200,
    description: "Total deposited amount",
    schema: {
      type: "object",
      properties: {
        userAddress: { type: "string", example: "0x123..." },
        totalDeposited: { type: "string", example: "1000000000000000000" },
      },
    },
  })
  async getTotalDeposited(@Param() params: GetDepositsByUserDTO) {
    const total = await this.depositsService.getTotalDeposited(
      params.userAddress,
    );
    return {
      userAddress: params.userAddress,
      totalDeposited: total.toString(),
    };
  }

  @Get("user/:userAddress/total-withdrawn")
  @ApiOperation({ summary: "Get total withdrawn by user" })
  @ApiResponse({
    status: 200,
    description: "Total withdrawn amount",
    schema: {
      type: "object",
      properties: {
        userAddress: { type: "string", example: "0x123..." },
        totalWithdrawn: { type: "string", example: "500000000000000000" },
      },
    },
  })
  async getTotalWithdrawn(@Param() params: GetDepositsByUserDTO) {
    const total = await this.depositsService.getTotalWithdrawn(
      params.userAddress,
    );
    return {
      userAddress: params.userAddress,
      totalWithdrawn: total.toString(),
    };
  }
}
