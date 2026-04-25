// libs/api-decorators/src/validations/is-pem-public-key.validator.ts
import { createPublicKey } from "node:crypto";

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/**
 * Validate PEM-encoded RSA public key with minimum modulus size.
 */
@ValidatorConstraint({ name: "isPemPublicKey", async: false })
export class IsPemPublicKeyConstraint implements ValidatorConstraintInterface {
  /**
   * Validate PEM public key.
   *
   * @param {unknown} value
   * @returns {boolean}
   */
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;

    try {
      const publicKey = createPublicKey(value);

      if (publicKey.asymmetricKeyType !== "rsa") {
        return false;
      }

      return (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048;
    } catch {
      return false;
    }
  }

  /**
   * Default validation message.
   *
   * @returns {string}
   */
  defaultMessage(): string {
    return "Invalid RSA public key in PEM format";
  }
}
