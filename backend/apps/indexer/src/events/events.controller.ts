import { Controller, Get, Query, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { EventsService } from "./events.service";
import {
  GetEventsQueryDTO,
  GetEventsByBlockDTO,
  GetEventsByTransactionDTO,
  GetEventsByTypeDTO,
  EventResponseDTO,
} from "./dto/event.dto";

@ApiTags("Events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "Get recent events" })
  @ApiResponse({
    status: 200,
    description: "List of recent events",
    type: [EventResponseDTO],
  })
  async getRecentEvents(@Query() query: GetEventsQueryDTO) {
    return await this.eventsService.getRecentEvents(query.limit);
  }

  @Get("type/:eventType")
  @ApiOperation({ summary: "Get events by type" })
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

  @Get("block/:blockNumber")
  @ApiOperation({ summary: "Get events by block number" })
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

  @Get("tx/:transactionHash")
  @ApiOperation({ summary: "Get events by transaction hash" })
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
