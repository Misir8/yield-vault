import { Controller, Get, Query, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApiKeyProtected } from "@libs/auth";
import { INDEXER } from "config";
import {
  INDEXER_PRIVATE_EVENTS_URL,
  INDEXER_PRIVATE_EVENTS_TYPE_URL,
  INDEXER_PRIVATE_EVENTS_BLOCK_URL,
  INDEXER_PRIVATE_EVENTS_TX_URL,
} from "@libs/constants/routes";

import { EventsService } from "./events.service";
import {
  GetEventsQueryDTO,
  GetEventsByBlockDTO,
  GetEventsByTransactionDTO,
  GetEventsByTypeDTO,
  EventResponseDTO,
} from "./dto/event.dto";

@ApiTags("Private Events")
@Controller(INDEXER_PRIVATE_EVENTS_URL)
@ApiKeyProtected(INDEXER.X_API_KEY)
export class PrivateEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "Get recent events (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of recent events",
    type: [EventResponseDTO],
  })
  async getRecentEvents(@Query() query: GetEventsQueryDTO) {
    return await this.eventsService.getRecentEvents(query.limit);
  }

  @Get(INDEXER_PRIVATE_EVENTS_TYPE_URL)
  @ApiOperation({ summary: "Get events by type (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of events by type",
    type: [EventResponseDTO],
  })
  async getEventsByType(
    @Param() params: GetEventsByTypeDTO,
    @Query() query: GetEventsQueryDTO,
  ) {
    return await this.eventsService.getEventsByType(
      params.eventType,
      query.limit,
    );
  }

  @Get(INDEXER_PRIVATE_EVENTS_BLOCK_URL)
  @ApiOperation({ summary: "Get events by block number (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of events in block",
    type: [EventResponseDTO],
  })
  async getEventsByBlock(@Param() params: GetEventsByBlockDTO) {
    return await this.eventsService.getEventsByBlock(
      BigInt(params.blockNumber),
    );
  }

  @Get(INDEXER_PRIVATE_EVENTS_TX_URL)
  @ApiOperation({ summary: "Get events by transaction hash (Private)" })
  @ApiResponse({
    status: 200,
    description: "List of events in transaction",
    type: [EventResponseDTO],
  })
  async getEventsByTransaction(@Param() params: GetEventsByTransactionDTO) {
    return await this.eventsService.getEventsByTransaction(
      params.transactionHash,
    );
  }
}
