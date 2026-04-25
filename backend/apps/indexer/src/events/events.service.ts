import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaClient } from ".prisma/indexer-client";
import { INDEXER_DB } from "config";

import { CreateEventDTO } from "./dto/event.dto";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(`${INDEXER_DB.NAME}PrismaClient`)
    private readonly prisma: PrismaClient,
  ) {}

  async saveEvent(dto: CreateEventDTO) {
    try {
      return await this.prisma.event.create({
        data: {
          blockNumber: dto.blockNumber,
          blockHash: dto.blockHash,
          transactionHash: dto.transactionHash,
          logIndex: dto.logIndex,
          eventType: dto.eventType,
          contractAddress: dto.contractAddress,
          data: dto.data,
          timestamp: dto.timestamp,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save event: ${dto.transactionHash}`, error);
      throw error;
    }
  }

  async getEventsByBlock(blockNumber: bigint) {
    const events = await this.prisma.event.findMany({
      where: { blockNumber },
      orderBy: { logIndex: "asc" },
    });

    return events.map((event) => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
    }));
  }

  async getEventsByTransaction(transactionHash: string) {
    const events = await this.prisma.event.findMany({
      where: { transactionHash },
      orderBy: { logIndex: "asc" },
    });

    return events.map((event) => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
    }));
  }

  async getEventsByType(eventType: string, limit: number = 100) {
    const events = await this.prisma.event.findMany({
      where: { eventType },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return events.map((event) => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
    }));
  }

  async getRecentEvents(limit: number = 100) {
    const events = await this.prisma.event.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return events.map((event) => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
    }));
  }
}
