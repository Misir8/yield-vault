import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApiKeyProtected } from "@libs/auth";
import { INDEXER } from "config";
import {
  INDEXER_PRIVATE_LOANS_URL,
  INDEXER_PRIVATE_LOANS_USER_URL,
  INDEXER_PRIVATE_LOANS_USER_ACTIVE_URL,
  INDEXER_PRIVATE_LOANS_USER_TOTAL_BORROWED_URL,
  INDEXER_PRIVATE_LOANS_LIQUIDATIONS_URL,
  INDEXER_PRIVATE_LOANS_USER_REPAYMENTS_URL,
} from "@libs/constants/routes";

import { LoansService } from "./loans.service";
import {
  GetLoansByUserDTO,
  UserAddressParamDTO,
  PaginationQueryDTO,
  LoanResponseDTO,
  LiquidationResponseDTO,
  RepaymentResponseDTO,
} from "./dto/loan.dto";

@ApiTags("Private Loans")
@Controller(INDEXER_PRIVATE_LOANS_URL)
@ApiKeyProtected(INDEXER.X_API_KEY)
export class PrivateLoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get(INDEXER_PRIVATE_LOANS_USER_URL)
  @ApiOperation({ summary: "Get loans by user address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of user loans",
    type: [LoanResponseDTO],
  })
  async getLoansByUser(
    @Param() params: UserAddressParamDTO,
    @Query() query: PaginationQueryDTO,
  ) {
    return await this.loansService.getLoansByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get(INDEXER_PRIVATE_LOANS_USER_ACTIVE_URL)
  @ApiOperation({ summary: "Get active loans by user address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of active user loans",
    type: [LoanResponseDTO],
  })
  async getActiveLoansByUser(@Param() params: UserAddressParamDTO) {
    return await this.loansService.getActiveLoansByUser(params.userAddress);
  }

  @Get(INDEXER_PRIVATE_LOANS_USER_TOTAL_BORROWED_URL)
  @ApiOperation({ summary: "Get total borrowed by user (Private)" })
  @ApiResponse({
    status: 200,
    description: "Total borrowed amount",
    schema: {
      type: "object",
      properties: {
        userAddress: { type: "string", example: "0x123..." },
        totalBorrowed: { type: "string", example: "5000000000000000000" },
      },
    },
  })
  async getTotalBorrowed(@Param() params: UserAddressParamDTO) {
    const total = await this.loansService.getTotalBorrowed(params.userAddress);
    return { userAddress: params.userAddress, totalBorrowed: total.toString() };
  }

  @Get(INDEXER_PRIVATE_LOANS_USER_REPAYMENTS_URL)
  @ApiOperation({ summary: "Get repayments by user address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of user repayments",
    type: [RepaymentResponseDTO],
  })
  async getRepaymentsByUser(
    @Param() params: UserAddressParamDTO,
    @Query() query: PaginationQueryDTO,
  ) {
    return await this.loansService.getRepaymentsByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get(INDEXER_PRIVATE_LOANS_LIQUIDATIONS_URL)
  @ApiOperation({ summary: "Get liquidations by borrower address (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of liquidations",
    type: [LiquidationResponseDTO],
  })
  async getLiquidationsByBorrower(
    @Param() params: UserAddressParamDTO,
    @Query() query: PaginationQueryDTO,
  ) {
    return await this.loansService.getLiquidationsByBorrower(
      params.userAddress,
      query.limit,
    );
  }
}
