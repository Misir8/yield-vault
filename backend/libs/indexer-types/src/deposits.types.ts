import { ApiProperty } from "@nestjs/swagger";
import { ApiPropertyString, ApiPropertyNumber } from "@libs/api-decorators";
import { DateToString } from "./helpers";

// Response DTOs
export class DepositResponseDTO {
  @ApiProperty({ description: "Deposit ID" })
  id: string;

  @ApiProperty({ description: "User address" })
  user: string;

  @ApiProperty({ description: "Deposit amount" })
  amount: string;

  @ApiProperty({ description: "Shares received" })
  shares: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class WithdrawalResponseDTO {
  @ApiProperty({ description: "Withdrawal ID" })
  id: string;

  @ApiProperty({ description: "User address" })
  user: string;

  @ApiProperty({ description: "Withdrawal amount" })
  amount: string;

  @ApiProperty({ description: "Shares burned" })
  shares: string;

  @ApiProperty({ description: "Interest earned" })
  interest: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class GetDepositsByUserDTO {
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
    description: "Number of deposits to return",
    example: 100,
  })
  limit?: number = 100;
}

// Provider types (for HTTP client) - derived from Response DTOs
export type DepositDTO = DateToString<DepositResponseDTO>;
export type WithdrawalDTO = DateToString<WithdrawalResponseDTO>;

export interface TotalDepositedDTO {
  userAddress: string;
  totalDeposited: string;
}

export interface TotalWithdrawnDTO {
  userAddress: string;
  totalWithdrawn: string;
}

export interface GetDepositsByUserInput {
  userAddress: string;
  limit?: number;
}

export interface GetWithdrawalsByUserInput {
  userAddress: string;
  limit?: number;
}
