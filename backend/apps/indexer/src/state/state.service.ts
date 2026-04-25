import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaClient } from ".prisma/indexer-client";
import { INDEXER_DB } from "config";

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(
    @Inject(`${INDEXER_DB.NAME}PrismaClient`)
    private readonly prisma: PrismaClient,
  ) {}

  async getState() {
    try {
      return await this.prisma.indexerState.findUnique({
        where: { id: 1 },
      });
    } catch (error) {
      this.logger.error("Failed to get indexer state", error);
      return null;
    }
  }

  async updateState(lastBlockNumber: bigint, lastBlockHash: string) {
    try {
      return await this.prisma.indexerState.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          lastBlockNumber,
          lastBlockHash,
        },
        update: {
          lastBlockNumber,
          lastBlockHash,
        },
      });
    } catch (error) {
      this.logger.error("Failed to update indexer state", error);
      throw error;
    }
  }

  async getLastBlockNumber(): Promise<bigint | null> {
    const state = await this.getState();
    return state?.lastBlockNumber || null;
  }
}
