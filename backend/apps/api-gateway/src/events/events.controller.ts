import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import {
  EventResponseDTO,
  GetEventsQueryDTO,
  GetEventsByBlockDTO,
  GetEventsByTransactionDTO,
  GetEventsByTypeDTO,
} from "@libs/indexer-types";

import { EventsService } from "./events.service";

@ApiTags("Events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "Get recent events" })
  @ApiResponse({ status: 200, type: [EventResponseDTO] })
  async getRecentEvents(@Query() { limit }: GetEventsQueryDTO) {
    return this.eventsService.getRecentEvents(limit);
  }

  @Get("type/:eventType")
  @ApiOperation({ summary: "Get events by type" })
  @ApiResponse({ status: 200, type: [EventResponseDTO] })
  async getEventsByType(@Param() { eventType, limit }: GetEventsByTypeDTO) {
    return this.eventsService.getEventsByType(eventType, limit);
  }

  @Get("block/:blockNumber")
  @ApiOperation({ summary: "Get events by block number" })
  @ApiResponse({ status: 200, type: [EventResponseDTO] })
  async getEventsByBlock(@Param() { blockNumber }: GetEventsByBlockDTO) {
    return this.eventsService.getEventsByBlock(blockNumber);
  }

  @Get("transaction/:transactionHash")
  @ApiOperation({ summary: "Get events by transaction hash" })
  @ApiResponse({ status: 200, type: [EventResponseDTO] })
  async getEventsByTransaction(
    @Param() { transactionHash }: GetEventsByTransactionDTO,
  ) {
    return this.eventsService.getEventsByTransaction(transactionHash);
  }
}
