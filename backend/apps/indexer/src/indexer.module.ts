import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";

import { INDEXER_DB, SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { DatabaseModule } from "@libs/database";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

import { indexerDatabaseConfig } from "./database.config";

// Feature Modules
import { BlockchainModule } from "./blockchain";
import { StateModule } from "./state";
import { EventsModule } from "./events";
import { DepositsModule } from "./deposits";
import { LoansModule } from "./loans";

@Module({
  imports: [
    // Infrastructure
    DatabaseModule.forRoot(INDEXER_DB.NAME, indexerDatabaseConfig),
    ExceptionsModule.forRoot({ serverName: SERVICES.INDEXER }),
    HealthModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: SECURITY?.RATE_LIMIT?.WINDOW_MS || 60000,
          limit: SECURITY?.RATE_LIMIT?.MAX || 100,
        },
      ],
    }),
    // Feature modules
    StateModule,
    EventsModule,
    DepositsModule,
    LoansModule,
    BlockchainModule, // Last because it depends on others
  ],
  controllers: [],
  providers: [],
})
export class IndexerModule {}
