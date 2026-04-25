import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { LoansService } from "./loans.service";
import {
  GetLoansByUserDTO,
  LoanResponseDTO,
  LiquidationResponseDTO,
} from "./dto/loan.dto";

@ApiTags("Loans")
@Controller("loans")
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get("user/:userAddress")
  @ApiOperation({ summary: "Get loans by user address" })
  @ApiResponse({
    status: 200,
    description: "List of user loans",
    type: [LoanResponseDTO],
  })
  async getLoansByUser(
    @Param() params: GetLoansByUserDTO,
    @Query() query: GetLoansByUserDTO,
  ) {
    return await this.loansService.getLoansByUser(
      params.userAddress,
      query.limit,
    );
  }

  @Get("user/:userAddress/active")
  @ApiOperation({ summary: "Get active loans by user address" })
  @ApiResponse({
    status: 200,
    description: "List of active user loans",
    type: [LoanResponseDTO],
  })
  async getActiveLoansByUser(@Param() params: GetLoansByUserDTO) {
    return await this.loansService.getActiveLoansByUser(params.userAddress);
  }

  @Get("user/:userAddress/total-borrowed")
  @ApiOperation({ summary: "Get total borrowed by user" })
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
  async getTotalBorrowed(@Param() params: GetLoansByUserDTO) {
    const total = await this.loansService.getTotalBorrowed(params.userAddress);
    return { userAddress: params.userAddress, totalBorrowed: total.toString() };
  }

  @Get("liquidations/:borrowerAddress")
  @ApiOperation({ summary: "Get liquidations by borrower address" })
  @ApiResponse({
    status: 200,
    description: "List of liquidations",
    type: [LiquidationResponseDTO],
  })
  async getLiquidationsByBorrower(
    @Param() params: GetLoansByUserDTO,
    @Query() query: GetLoansByUserDTO,
  ) {
    return await this.loansService.getLiquidationsByBorrower(
      params.userAddress,
      query.limit,
    );
  }
}
