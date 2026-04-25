import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import walletValidator from "multicoin-address-validator";

export interface CryptoAddressValidationOptions {
  /**
   * Static blockchain/currency symbol (e.g., 'BTC', 'TRX', 'XRP', 'USDT_TRC20', 'USDC').
   * If not provided, `blockchainProperty` must be set.
   */
  blockchain?: string;

  /**
   * Name of the DTO property that contains the blockchain / asset identifier.
   * Used for dynamic validation based on another field (e.g. 'blockchain', 'assetId').
   */
  blockchainProperty?: string;

  /**
   * Network type to use for validation.
   * Passed directly to multicoin-address-validator as `{ networkType }`.
   * Defaults to 'both'.
   */
  networkType?: "prod" | "testnet" | "both";

  /**
   * Custom error message for the validation constraint.
   * If provided, overrides the default message.
   */
  message?: string;
}

/**
 * Class-validator constraint that validates cryptocurrency addresses
 * using `multicoin-address-validator` with minimal PayPilot-specific
 * normalization and a small fallback for networks we must support.
 */
@ValidatorConstraint({ name: "isCryptoAddress", async: false })
export class IsCryptoAddressConstraint implements ValidatorConstraintInterface {
  /**
   * Core validation logic used by class-validator.
   *
   * @param {string} address - Raw address value from the DTO field.
   * @param {ValidationArguments} args - Class-validator arguments bundle.
   * @returns {boolean} `true` if the address is valid for the resolved blockchain, otherwise `false`.
   */
  validate(address: string, args: ValidationArguments): boolean {
    if (!address || typeof address !== "string") {
      return false;
    }

    const options = (args.constraints?.[0] ||
      {}) as CryptoAddressValidationOptions;
    const obj = args.object as Record<string, unknown>;

    // 1. Resolve blockchain from static option or DTO property
    let blockchain = options.blockchain;
    if (!blockchain && options.blockchainProperty) {
      const raw = obj[options.blockchainProperty];
      if (typeof raw === "string") {
        blockchain = raw;
      }
    }

    if (!blockchain) {
      return false;
    }

    const trimmedAddress = address.trim();
    const originalBlockchain = blockchain.trim();
    const symbol = this.normalizeBlockchain(originalBlockchain);
    const networkType = options.networkType ?? "both";

    // 2. Primary validation – mirrors existing `validateCryptoAddress` helper semantics
    try {
      const isValid = Boolean(
        walletValidator.validate(trimmedAddress, symbol.toLowerCase(), {
          networkType,
        }),
      );

      if (isValid) {
        return true;
      }
    } catch {
      // Ignore library errors and fall through to fallback
    }

    // 3. Fallback for networks where the library is too strict
    return this.fallbackValidate(trimmedAddress, originalBlockchain);
  }

  /**
   * Builds default error message for the constraint if validation fails.
   *
   * @param {ValidationArguments} args - Class-validator arguments bundle.
   * @returns {string} Error message to be returned by class-validator.
   */
  defaultMessage(args: ValidationArguments): string {
    const options = (args.constraints?.[0] ||
      {}) as CryptoAddressValidationOptions;
    const obj = args.object as Record<string, unknown>;

    let blockchain = options.blockchain;
    if (!blockchain && options.blockchainProperty) {
      const raw = obj[options.blockchainProperty];
      if (typeof raw === "string") {
        blockchain = raw;
      }
    }

    if (options.message) {
      return options.message;
    }

    return blockchain
      ? `Invalid ${blockchain} address format`
      : "Invalid cryptocurrency address format";
  }

  /**
   * Minimal normalization of asset IDs to currency symbols expected
   * by `multicoin-address-validator`.
   *
   * - USDT_TRC20 / USDT-TRC20 → TRX
   * - USDT_ERC20 / USDT-ERC20 → ETH
   * - USDC_TRC20 / USDC-TRC20 → TRX (future friendly)
   * - USDC_ERC20 / USDC-ERC20 → ETH
   * - Aliases: BITCOIN → BTC, RIPPLE → XRP, LITECOIN → LTC, SOLANA → SOL, ARBITRUM → ARB
   *
   * Everything else is returned as uppercased ticker as-is.
   *
   * @param {string} blockchain - Raw blockchain / asset identifier from DTO.
   * @returns {string} Canonical ticker symbol used for validation.
   */
  private normalizeBlockchain(blockchain: string): string {
    const normalized = blockchain.trim().toUpperCase();

    // USDT variants
    if (normalized.startsWith("USDT")) {
      if (normalized.includes("TRC")) {
        return "TRX";
      }
      if (normalized.includes("ERC")) {
        return "ETH";
      }
      return "USDT";
    }

    // USDC variants
    if (normalized.startsWith("USDC")) {
      if (normalized.includes("TRC")) {
        return "TRX";
      }
      if (normalized.includes("ERC")) {
        return "ETH";
      }
      return "USDC";
    }

    // Aliases → canonical tickers
    const aliasMap: Record<string, string> = {
      BITCOIN: "BTC",
      RIPPLE: "XRP",
      LITECOIN: "LTC",
      SOLANA: "SOL",
      ARBITRUM: "ARB",
    };

    return aliasMap[normalized] ?? normalized;
  }

  /**
   * Fallback validation used only when the main library call
   * returns `false` or throws. We keep this intentionally minimal
   * and focused on formats we must accept in PayPilot flows.
   *
   * @param {string} address - Trimmed address value.
   * @param {string} blockchain - Original blockchain / asset ID (not normalized).
   * @returns {boolean} `true` if address passes the fallback format check, otherwise `false`.
   */
  private fallbackValidate(address: string, blockchain: string): boolean {
    const upper = blockchain.trim().toUpperCase();

    // Tron / TRC20 (TRX + USDT_TRC20/USDT-TRC20 + future USDC_TRC20)
    if (
      upper === "TRX" ||
      upper === "TRON" ||
      upper === "USDT_TRC20" ||
      upper === "USDT-TRC20" ||
      upper === "USDC_TRC20" ||
      upper === "USDC-TRC20"
    ) {
      // T + base58, 34 characters
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    }

    // EVM networks (ETH, ARB, USDT_ERC20/USDT-ERC20, USDC/USDC_ERC20/USDC-ERC20)
    if (
      upper === "ETH" ||
      upper === "ETHEREUM" ||
      upper === "USDT_ERC20" ||
      upper === "USDT-ERC20" ||
      upper === "USDC" ||
      upper === "USDC_ERC20" ||
      upper === "USDC-ERC20" ||
      upper === "ARB" ||
      upper === "ARBITRUM"
    ) {
      // Standard EVM address: 0x + 40 hex characters
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // For everything else we trust the library result (which was false)
    return false;
  }
}

/**
 * Property decorator that wires `IsCryptoAddressConstraint` into class-validator
 * and integrates with NestJS/Swagger decorators.
 *
 * @param {CryptoAddressValidationOptions} [options] - Constraint configuration (blockchain, blockchainProperty, etc.).
 * @param {ValidationOptions} [validationOptions] - Standard class-validator options (groups, message override, etc.).
 * @returns {(object: object, propertyName: string) => void} Property decorator function.
 */
export function IsCryptoAddress(
  options?: CryptoAddressValidationOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options || {}],
      validator: IsCryptoAddressConstraint,
    });
  };
}
