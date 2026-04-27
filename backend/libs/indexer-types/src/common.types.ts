import { ApiPropertyString, ApiPropertyNumber } from "@libs/api-decorators";

// Common DTOs used across multiple modules

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
