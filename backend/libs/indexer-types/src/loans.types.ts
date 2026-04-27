import { ApiProperty } from "@nestjs/swagger";
import { ApiPropertyString, ApiPropertyNumber } from "@libs/api-decorators";
import { DateToString } from "./helpers";

// Enums
export enum LoanStatus {
  ACTIVE = "active",
  REPAID = "repaid",
  LIQUIDATED = "liquidated",
}

// Response DTOs
export class LoanResponseDTO {
  @ApiProperty({ description: "Loan ID" })
  id: string;

  @ApiProperty({ description: "User address" })
  user: string;

  @ApiProperty({ description: "Loan amount" })
  amount: string;

  @ApiProperty({ description: "Collateral amount" })
  collateral: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Repaid at", nullable: true })
  repaidAt: Date | null;

  @ApiProperty({ description: "Liquidated at", nullable: true })
  liquidatedAt: Date | null;

  @ApiProperty({ description: "Loan status", enum: LoanStatus })
  status: string;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at" })
  updatedAt: Date;
}

export class LiquidationResponseDTO {
  @ApiProperty({ description: "Liquidation ID" })
  id: string;

  @ApiProperty({ description: "Borrower address" })
  borrower: string;

  @ApiProperty({ description: "Liquidator address" })
  liquidator: string;

  @ApiProperty({ description: "Liquidation amount" })
  amount: string;

  @ApiProperty({ description: "Collateral seized" })
  collateralSeized: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class RepaymentResponseDTO {
  @ApiProperty({ description: "Repayment ID" })
  id: string;

  @ApiProperty({ description: "User address" })
  user: string;

  @ApiProperty({ description: "Repayment amount" })
  amount: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class GetLoansByUserDTO {
  @ApiPropertyString({
    description: "User address",
    example: "0x1234567890123456789012345678901234567890",
    minLength: 42,
    maxLength: 42,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    patternMessage: "Invalid Ethereum address",
  })
  userAddress: string;

  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of loans to return",
    example: 100,
  })
  limit?: number = 100;
}

export class BorrowerAddressParamDTO {
  @ApiPropertyString({
    description: "Borrower address",
    example: "0x1234567890123456789012345678901234567890",
    minLength: 42,
    maxLength: 42,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    patternMessage: "Invalid Ethereum address",
  })
  borrowerAddress: string;
}

// Provider types (for HTTP client) - derived from Response DTOs
export type LoanDTO = DateToString<LoanResponseDTO>;
export type LiquidationDTO = DateToString<LiquidationResponseDTO>;
export type RepaymentDTO = DateToString<RepaymentResponseDTO>;

export interface TotalBorrowedDTO {
  userAddress: string;
  totalBorrowed: string;
}

export interface GetLoansByUserInput {
  userAddress: string;
  limit?: number;
}

export interface GetLiquidationsByBorrowerInput {
  borrowerAddress: string;
  limit?: number;
}
