import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApiKeyProtected } from "@libs/auth";
import { INDEXER } from "config";
import {
  INDEXER_PRIVATE_DEPOSITS_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_WITHDRAWALS_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_DEPOSITED_URL,
  INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_WITHDRAWN_URL,
} from "@libs/constants/routes";

import { DepositsService } from "./deposits.service";
import {
  UserAddressParamDTO,
  PaginationQueryDTO,
  DepositResponseDTO,
  WithdrawalResponseDTO,
} from "./dto/deposit.dto";

@ApiTags("Private Deposits")
@Controller(INDEXER_PRIVATE_DEPOSITS_URL)
@ApiKeyProtected(INDEXER.X_API_KEY)
export class PrivateDepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get(INDEXER_PRIVATE_DEPOSITS_USER_URL)
  @ApiOperation({ summary: "Get deposits by user address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of user deposits",
    type: [DepositResponseDTO],
  })
  async getDepositsByUser(
    @Param() params: UserAddressParamDTO,
    @Query() query: PaginationQueryDTO,
  ) {
    return await this.depositsService.getDepositsByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get(INDEXER_PRIVATE_DEPOSITS_USER_WITHDRAWALS_URL)
  @ApiOperation({ summary: "Get withdrawals by user address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of user withdrawals",
    type: [WithdrawalResponseDTO],
  })
  async getWithdrawalsByUser(
    @Param() params: UserAddressParamDTO,
    @Query() query: PaginationQueryDTO,
  ) {
    return await this.depositsService.getWithdrawalsByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get(INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_DEPOSITED_URL)
  @ApiOperation({ summary: "Get total deposited by user (Private)" })
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
  async getTotalDeposited(@Param() params: UserAddressParamDTO) {
    const total = await this.depositsService.getTotalDeposited(
      params.userAddress,
    );
    return {
      userAddress: params.userAddress,
      totalDeposited: total.toString(),
    };
  }

  @Get(INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_WITHDRAWN_URL)
  @ApiOperation({ summary: "Get total withdrawn by user (Private)" })
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
  async getTotalWithdrawn(@Param() params: UserAddressParamDTO) {
    const total = await this.depositsService.getTotalWithdrawn(
      params.userAddress,
    );
    return {
      userAddress: params.userAddress,
      totalWithdrawn: total.toString(),
    };
  }
}
