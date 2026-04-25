import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { INDEXER_DB, SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { DatabaseModule } from "@libs/database";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

import { indexerDatabaseConfig } from "./database.config";

@Module({
  imports: [
    DatabaseModule.forRoot(INDEXER_DB.NAME, indexerDatabaseConfig),
    ExceptionsModule.forRoot({ serverName: SERVICES.INDEXER }),
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
export class IndexerModule {}
