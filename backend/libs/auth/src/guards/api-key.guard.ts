import { timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

export const X_API_KEY = "x-api-key";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly validApiKey: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers[X_API_KEY] as string;

    if (!apiKey) {
      throw new UnauthorizedException(`${X_API_KEY} is not provided`);
    }

    let isValid: boolean;
    try {
      const apiKeyBuffer = Buffer.from(apiKey, "utf8");
      const validApiKeyBuffer = Buffer.from(this.validApiKey, "utf8");

      isValid = timingSafeEqual(apiKeyBuffer, validApiKeyBuffer);
    } catch (_error) {
      isValid = false;
    }

    if (!isValid) {
      throw new UnauthorizedException(`Invalid ${X_API_KEY}`);
    }

    return true;
  }
}
