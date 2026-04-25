import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

/**
 * Validates notification token format based on platform:
 * - APNS (ios): 64 hexadecimal characters
 * - FCM (android): 100+ alphanumeric characters (allowed: a-zA-Z0-9_-:)
 */
@ValidatorConstraint({ name: "isPushNotificationToken", async: false })
export class IsPushNotificationTokenConstraint implements ValidatorConstraintInterface {
  private static readonly APNS_PATTERN = /^[a-fA-F0-9]{64}$/;
  private static readonly FCM_MIN_LENGTH = 100;
  private static readonly FCM_PATTERN = /^[A-Za-z0-9_\-:]+$/;

  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string") return false;

    const trimmed = value.trim();
    if (!trimmed) return false;

    const platform = (args.object as { platform?: string }).platform;
    const isIos = platform === "ios";

    if (isIos) {
      return IsPushNotificationTokenConstraint.APNS_PATTERN.test(trimmed);
    }

    return (
      trimmed.length >= IsPushNotificationTokenConstraint.FCM_MIN_LENGTH &&
      IsPushNotificationTokenConstraint.FCM_PATTERN.test(trimmed)
    );
  }
}
