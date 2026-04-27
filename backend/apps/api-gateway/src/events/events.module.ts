import { Module } from "@nestjs/common";

import { EventsProviderModule } from "@libs/indexer-provider";

import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [EventsProviderModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
