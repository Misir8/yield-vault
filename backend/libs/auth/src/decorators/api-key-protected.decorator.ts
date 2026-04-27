import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { ApiKeyGuard, X_API_KEY } from "../guards/api-key.guard";

export function ApiKeyProtected(
  apiKey: string,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(new ApiKeyGuard(apiKey)),
    ApiHeader({
      name: X_API_KEY,
      description: "API Key for accessing protected routes",
      required: true,
    }),
    ApiUnauthorizedResponse({ description: "Unauthorized" }),
  );
}
