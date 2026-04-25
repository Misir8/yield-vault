import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ethers } from "ethers";
import { BLOCKCHAIN } from "config";

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private currentBlock: number = 0;

  async onModuleInit() {
    await this.initializeProvider();
  }

  private async initializeProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(BLOCKCHAIN.RPC_URL);

      // Test connection
      const network = await this.provider.getNetwork();
      this.currentBlock = await this.provider.getBlockNumber();

      this.logger.log(
        `Connected to blockchain: ${network.name} (chainId: ${network.chainId})`,
      );
      this.logger.log(`Current block: ${this.currentBlock}`);
    } catch (error) {
      this.logger.error("Failed to connect to blockchain", error);
      throw error;
    }
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getBlock(blockNumber: number) {
    return await this.provider.getBlock(blockNumber);
  }

  async getTransaction(txHash: string) {
    return await this.provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string) {
    return await this.provider.getTransactionReceipt(txHash);
  }
}
