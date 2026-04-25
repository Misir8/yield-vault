import { ApiProperty } from "@nestjs/swagger";
import {
  ApiPropertyString,
  ApiPropertyNumber,
  ApiPropertyEnum,
} from "@libs/api-decorators";
import { LoanStatus } from "../../common/enums";

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
export class GetLoansByUserDTO extends UserAddressParamDTO {
  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of loans to return",
    example: 100,
  })
  limit?: number = 100;
}
