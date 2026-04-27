import { Module } from "@nestjs/common";

import { EventsProviderService } from "./events-provider.service";

@Module({
  providers: [EventsProviderService],
  exports: [EventsProviderService],
})
export class EventsProviderModule {}
