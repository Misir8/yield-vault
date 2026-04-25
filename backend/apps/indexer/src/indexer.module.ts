import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";

import { INDEXER_DB, SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { DatabaseModule } from "@libs/database";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

import { indexerDatabaseConfig } from "./database.config";

// Blockchain
import { BlockchainService } from "./blockchain/blockchain.service";
import { EventListenerService } from "./blockchain/event-listener.service";

// State
import { StateService } from "./state/state.service";

// Events
import { EventsService } from "./events/events.service";
import { EventsController } from "./events/events.controller";

// Deposits
import { DepositsService } from "./deposits/deposits.service";
import { DepositsController } from "./deposits/deposits.controller";

// Loans
import { LoansService } from "./loans/loans.service";
import { LoansController } from "./loans/loans.controller";

@Module({
  imports: [
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
  ],
  controllers: [EventsController, DepositsController, LoansController],
  providers: [
    BlockchainService,
    EventListenerService,
    StateService,
    EventsService,
    DepositsService,
    LoansService,
  ],
})
export class IndexerModule {}
