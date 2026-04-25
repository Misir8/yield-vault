import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { ANALYTICS_DB, SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { DatabaseModule } from "@libs/database";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

import { analyticsDatabaseConfig } from "./database.config";

/**
 * Analytics Module
 *
 * Calculates and provides analytics data:
 * - TVL (Total Value Locked)
 * - APY (Annual Percentage Yield)
 * - Utilization rates
 * - User statistics
 */
@Module({
  imports: [
    DatabaseModule.forRoot(ANALYTICS_DB.NAME, analyticsDatabaseConfig),
    ExceptionsModule.forRoot({ serverName: SERVICES.ANALYTICS }),
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: SECURITY?.RATE_LIMIT?.WINDOW_MS || 60000,
          limit: SECURITY?.RATE_LIMIT?.MAX || 100,
        },
      ],
    }),
  ],
})
export class AnalyticsModule {}
