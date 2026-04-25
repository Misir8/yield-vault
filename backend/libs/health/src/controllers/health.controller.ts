import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from "@nestjs/terminus";

import { SkipLogging } from "@libs/logger";

@Controller("health")
@ApiExcludeController()
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  @SkipLogging()
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
