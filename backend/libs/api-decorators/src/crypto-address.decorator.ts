// libs/api-decorators/src/crypto-address.decorator.ts
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MinLength } from "class-validator";

import {
  IsCryptoAddress,
  CryptoAddressValidationOptions,
} from "./validations/is-crypto-address.validator";

type ApiPropertyCryptoAddressParams = {
  /**
   * Makes the field optional
   */
  isOptional?: boolean;

  /**
   * Swagger description
   */
  description?: string;

  /**
   * Example address for Swagger
   */
  example?: string;

  /**
   * Blockchain/currency symbol (e.g., 'BTC', 'TRX', 'XRP')
   * If not provided, must specify blockchainProperty
   */
  blockchain?: string;

  /**
   * Property name that contains blockchain value
   * Use this for dynamic validation based on another field
   * @example 'symbol', 'blockchain', 'assetId'
   */
  blockchainProperty?: string;

  /**
   * Network type for validation
   * @default 'both'
   */
  networkType?: "prod" | "testnet" | "both";

  /**
   * Custom validation error message
   */
  validationMessage?: string;

  /**
   * Minimum length validation
   * @default 26
   */
  minLength?: number;
};

/**
 * Decorator for cryptocurrency address fields with Swagger documentation and validation
 *
 * @example
 * // Fixed blockchain (Bitcoin)
 * class WithdrawBtcDto {
 *   @ApiPropertyCryptoAddress({
 *     blockchain: 'BTC',
 *     description: 'Bitcoin withdrawal address',
 *     example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
 *   })
 *   destination: string;
 * }
 *
 * @example
 * // Dynamic blockchain based on another property
 * class WithdrawDto {
 *   @ApiPropertyString()
 *   blockchain: string;
 *
 *   @ApiPropertyCryptoAddress({
 *     blockchainProperty: 'blockchain',
 *     description: 'Withdrawal address (validated based on blockchain field)',
 *     example: 'TYourAddressHere...'
 *   })
 *   destination: string;
 * }
 *
 * @example
 * // Optional address
 * class EstimateDto {
 *   @ApiPropertyCryptoAddress({
 *     isOptional: true,
 *     blockchain: 'TRX',
 *     description: 'Optional TRC20 address for fee estimation'
 *   })
 *   destination?: string;
 * }
 */
export function ApiPropertyCryptoAddress({
  isOptional = false,
  description,
  example,
  blockchain,
  blockchainProperty,
  networkType = "both",
  validationMessage,
  minLength = 26,
}: ApiPropertyCryptoAddressParams = {}): <TFunction, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void {
  // Determine description based on blockchain
  const finalDescription =
    description ||
    (blockchain
      ? `${blockchain} cryptocurrency address`
      : blockchainProperty
        ? `Cryptocurrency address (validated based on ${blockchainProperty} field)`
        : "Cryptocurrency address");

  // Generate example based on blockchain if not provided
  const finalExample = example || getExampleAddress(blockchain);

  // Swagger property options
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    description: finalDescription,
    example: finalExample,
    minLength,
    pattern: "^[A-Za-z0-9]+$", // General pattern for crypto addresses
  };

  // Validation options for IsCryptoAddress
  const cryptoValidationOptions: CryptoAddressValidationOptions = {
    blockchain,
    blockchainProperty,
    networkType,
    message: validationMessage,
  };

  return applyDecorators(
    // Transform to trim whitespace
    Transform(({ value }) =>
      value == null ? undefined : String(value).trim(),
    ),

    // Optional or required
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),

    // Basic string validation
    IsString({ message: "Address must be a string" }),

    // Minimum length
    MinLength(minLength, {
      message: `Address must be at least ${minLength} characters long`,
      context: { minLength },
    }),

    // Custom crypto address validation
    IsCryptoAddress(cryptoValidationOptions),
  );
}

/**
 * Helper function to generate example addresses for different blockchains
 * Uses REAL valid addresses that pass validation
 */
function getExampleAddress(blockchain?: string): string | undefined {
  if (!blockchain) return undefined;

  const examples: Record<string, string> = {
    BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    BITCOIN: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",

    TRX: "TLPpXJ4yRJYQuPmTsr88zuGR5c7N8sTce6",
    TRON: "TLPpXJ4yRJYQuPmTsr88zuGR5c7N8sTce6",

    USDT_TRC20: "TLPpXJ4yRJYQuPmTsr88zuGR5c7N8sTce6",
    "USDT-TRC20": "TLPpXJ4yRJYQuPmTsr88zuGR5c7N8sTce6",

    XRP: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    RIPPLE: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",

    ETH: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
    ETHEREUM: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",

    USDT_ERC20: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
    "USDT-ERC20": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",

    LTC: "LhK2kQwiaAvhjWY799cZvMyYwnQAcxkarr",
    LITECOIN: "LhK2kQwiaAvhjWY799cZvMyYwnQAcxkarr",

    // Solana
    SOL: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtVd",
    SOLANA: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtVd",

    // Arbitrum
    ARB: "0xF8be0b49b86153f3d5f9B6362CEE8F1A0c2a2153",
    ARBITRUM: "0xF8be0b49b86153f3d5f9B6362CEE8F1A0c2a2153",
  };

  return (
    examples[blockchain.toUpperCase()] ||
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
  );
}
