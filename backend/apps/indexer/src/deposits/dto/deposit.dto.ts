import { ApiProperty } from "@nestjs/swagger";
import { ApiPropertyString, ApiPropertyNumber } from "@libs/api-decorators";

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

export class UserAddressParamDTO {
  @ApiPropertyString({
    description: "User address",
    example: "0x1234567890123456789012345678901234567890",
    minLength: 42,
    maxLength: 42,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    patternMessage: "Invalid Ethereum address",
  })
  userAddress: string;
}

export class PaginationQueryDTO {
  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of items to return",
    example: 100,
  })
  limit?: number = 100;
}

// Для обратной совместимости
export class GetDepositsByUserDTO extends UserAddressParamDTO {
  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of deposits to return",
    example: 100,
  })
  limit?: number = 100;
}
