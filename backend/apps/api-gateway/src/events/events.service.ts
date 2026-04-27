import { Injectable } from "@nestjs/common";

import { EventDTO } from "@libs/indexer-types";
import { EventsProviderService } from "@libs/indexer-provider";

@Injectable()
export class EventsService {
  constructor(private readonly eventsProvider: EventsProviderService) {}

  async getRecentEvents(limit?: number): Promise<EventDTO[]> {
    return this.eventsProvider.getRecentEvents(limit);
  }

  async getEventsByType(
    eventType: string,
    limit?: number,
  ): Promise<EventDTO[]> {
    return this.eventsProvider.getEventsByType({ eventType, limit });
  }

  async getEventsByBlock(blockNumber: string): Promise<EventDTO[]> {
    return this.eventsProvider.getEventsByBlock({ blockNumber });
  }

  async getEventsByTransaction(transactionHash: string): Promise<EventDTO[]> {
    return this.eventsProvider.getEventsByTransaction({ transactionHash });
  }
}
