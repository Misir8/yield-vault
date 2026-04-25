import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

import {
  ApiPropertyString,
  ApiPropertyNumber,
  ApiPropertyEnum,
  ApiPropertyDate,
} from "@libs/api-decorators";
import { EventType } from "../../common/enums";

export class CreateEventDTO {
  @ApiProperty({ description: "Block number", example: "12345" })
  blockNumber: bigint;

  @ApiPropertyString({ description: "Block hash", example: "0x123..." })
  blockHash: string;

  @ApiPropertyString({ description: "Transaction hash", example: "0xabc..." })
  transactionHash: string;

  @ApiPropertyNumber({ description: "Log index in transaction", example: 0 })
  logIndex: number;

  @ApiPropertyEnum(EventType, { description: "Event type" })
  eventType: string;

  @ApiPropertyString({ description: "Contract address", example: "0xdef..." })
  contractAddress: string;

  @ApiProperty({
    description: "Event data",
    example: { user: "0x...", amount: "1000" },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyDate({ description: "Event timestamp" })
  timestamp: Date;
}

export class EventResponseDTO {
  @ApiProperty({ description: "Event ID" })
  id: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: string;

  @ApiProperty({ description: "Block hash" })
  blockHash: string;

  @ApiProperty({ description: "Transaction hash" })
  transactionHash: string;

  @ApiProperty({ description: "Log index" })
  logIndex: number;

  @ApiProperty({ description: "Event type", enum: EventType })
  eventType: string;

  @ApiProperty({ description: "Contract address" })
  contractAddress: string;

  @ApiProperty({ description: "Event data" })
  data: Record<string, any>;

  @ApiProperty({ description: "Event timestamp" })
  timestamp: Date;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class GetEventsQueryDTO {
  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of events to return",
    example: 100,
  })
  limit?: number = 100;

  @ApiPropertyEnum(EventType, {
    isOptional: true,
    description: "Filter by event type",
  })
  eventType?: string;

  @ApiPropertyString({
    isOptional: true,
    description: "Filter by contract address",
    example: "0x123...",
  })
  contractAddress?: string;
}

export class GetEventsByBlockDTO {
  @ApiPropertyString({
    description: "Block number",
    example: "12345",
    pattern: /^\d+$/,
  })
  blockNumber: string;
}

export class GetEventsByTransactionDTO {
  @ApiPropertyString({
    description: "Transaction hash",
    example: "0xabc...",
    pattern: /^0x[a-fA-F0-9]{64}$/,
    patternMessage: "Invalid transaction hash format",
  })
  transactionHash: string;
}

export class GetEventsByTypeDTO {
  @ApiPropertyEnum(EventType, { description: "Event type" })
  eventType: string;

  @ApiPropertyNumber({
    isOptional: true,
    min: 1,
    max: 1000,
    description: "Number of events to return",
    example: 100,
  })
  limit?: number = 100;
}
