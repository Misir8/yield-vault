import { Module } from "@nestjs/common";

import { EventsService } from "./events.service";
import { PrivateEventsController } from "./private-events.controller";

@Module({
  controllers: [PrivateEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
