import { applyDecorators } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, Validate } from "class-validator";

import { ERRORS } from "@libs/constants";

import { IsPushNotificationTokenConstraint } from "./validations/is-push-notification-token.validator";

export function ApiPropertyPushNotificationToken(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      type: String,
      description:
        "FCM or APNS token (APNS: 64 hex chars; FCM: 100+ alphanumeric)",
    }),
    IsString({ message: ERRORS.STRING_LENGTH_IS_TOO_SHORT }),
    Validate(IsPushNotificationTokenConstraint, {
      message: ERRORS.INVALID_NOTIFICATION_TOKEN,
    }),
  );
}
