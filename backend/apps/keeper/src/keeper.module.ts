import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

/**
 * Keeper Module
 *
 * Background service for automated blockchain operations:
 * - Rebalancing strategies
 * - Liquidation monitoring
 * - Health factor checks
 * - Gas price optimization
 */
@Module({
  imports: [
    ExceptionsModule.forRoot({ serverName: SERVICES.KEEPER }),
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
export class KeeperModule {}
