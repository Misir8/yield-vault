import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import {
  LoanResponseDTO,
  LiquidationResponseDTO,
  RepaymentResponseDTO,
  UserAddressParamDTO,
  BorrowerAddressParamDTO,
  PaginationQueryDTO,
} from "@libs/indexer-types";

import { LoansService } from "./loans.service";

@ApiTags("Loans")
@Controller("loans")
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get("user/:userAddress")
  @ApiOperation({ summary: "Get user loans" })
  @ApiResponse({ status: 200, type: [LoanResponseDTO] })
  async getUserLoans(
    @Param() { userAddress }: UserAddressParamDTO,
    @Query() { limit }: PaginationQueryDTO,
  ) {
    return this.loansService.getUserLoans(userAddress, limit);
  }

  @Get("user/:userAddress/active")
  @ApiOperation({ summary: "Get active user loans" })
  @ApiResponse({ status: 200, type: [LoanResponseDTO] })
  async getActiveUserLoans(@Param() { userAddress }: UserAddressParamDTO) {
    return this.loansService.getActiveUserLoans(userAddress);
  }

  @Get("user/:userAddress/total-borrowed")
  @ApiOperation({ summary: "Get total borrowed by user" })
  @ApiResponse({ status: 200, description: "Total borrowed amount" })
  async getTotalBorrowed(@Param() { userAddress }: UserAddressParamDTO) {
    return this.loansService.getTotalBorrowed(userAddress);
  }

  @Get("user/:userAddress/repayments")
  @ApiOperation({ summary: "Get repayments by user" })
  @ApiResponse({ status: 200, type: [RepaymentResponseDTO] })
  async getRepaymentsByUser(
    @Param() { userAddress }: UserAddressParamDTO,
    @Query() { limit }: PaginationQueryDTO,
  ) {
    return this.loansService.getRepaymentsByUser(userAddress, limit);
  }

  @Get("liquidations/:borrowerAddress")
  @ApiOperation({ summary: "Get liquidations by borrower" })
  @ApiResponse({ status: 200, type: [LiquidationResponseDTO] })
  async getLiquidationsByBorrower(
    @Param() { borrowerAddress }: BorrowerAddressParamDTO,
    @Query() { limit }: PaginationQueryDTO,
  ) {
    return this.loansService.getLiquidationsByBorrower(borrowerAddress, limit);
  }
}
