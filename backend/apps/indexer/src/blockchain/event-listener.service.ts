import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ethers } from "ethers";
import { BLOCKCHAIN, INDEXER } from "config";
import * as path from "path";
import * as fs from "fs";

import { BlockchainService } from "./blockchain.service";
import { EventsService } from "../events/events.service";
import { DepositsService } from "../deposits/deposits.service";
import { LoansService } from "../loans/loans.service";
import { StateService } from "../state/state.service";
import { EventType } from "../common/enums";

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);
  private isIndexing = false;
  private contracts: Map<string, ethers.Contract> = new Map();

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly eventsService: EventsService,
    private readonly depositsService: DepositsService,
    private readonly loansService: LoansService,
    private readonly stateService: StateService,
  ) {}

  async onModuleInit() {
    await this.initializeContracts();
    await this.startIndexing();
  }

  private async initializeContracts() {
    const provider = this.blockchainService.getProvider();

    const vaultAddress = BLOCKCHAIN.CONTRACTS.VAULT;
    const lendingPoolAddress = BLOCKCHAIN.CONTRACTS.LENDING_POOL;

    if (!vaultAddress || !lendingPoolAddress) {
      this.logger.warn(
        "Contract addresses not configured. Skipping contract initialization.",
      );
      return;
    }

    try {
      // Load ABIs from artifacts
      const vaultAbi = await this.loadContractAbi("Vault");
      const lendingPoolAbi = await this.loadContractAbi("LendingPool");

      // Initialize contracts
      this.contracts.set(
        "Vault",
        new ethers.Contract(vaultAddress, vaultAbi, provider),
      );
      this.contracts.set(
        "LendingPool",
        new ethers.Contract(lendingPoolAddress, lendingPoolAbi, provider),
      );

      this.logger.log(`Initialized ${this.contracts.size} contracts`);
    } catch (error) {
      this.logger.error("Failed to initialize contracts", error);
    }
  }

  private async loadContractAbi(contractName: string): Promise<any[]> {
    try {
      // Try multiple possible paths
      const possiblePaths = [
        // From backend directory
        path.resolve(
          process.cwd(),
          "../artifacts/contracts",
          `${contractName}.sol`,
          `${contractName}.json`,
        ),
        // From project root
        path.resolve(
          process.cwd(),
          "artifacts/contracts",
          `${contractName}.sol`,
          `${contractName}.json`,
        ),
        // Relative to backend
        path.resolve(
          __dirname,
          "../../../../../artifacts/contracts",
          `${contractName}.sol`,
          `${contractName}.json`,
        ),
      ];

      let artifactPath: string | null = null;
      for (const testPath of possiblePaths) {
        this.logger.debug(`Checking path: ${testPath}`);
        if (fs.existsSync(testPath)) {
          artifactPath = testPath;
          break;
        }
      }

      if (!artifactPath) {
        this.logger.error(
          `Artifact file not found for ${contractName}. Tried paths:`,
          possiblePaths,
        );
        throw new Error(`Artifact file not found: ${contractName}`);
      }

      this.logger.log(`Loading ABI from: ${artifactPath}`);

      const artifactContent = fs.readFileSync(artifactPath, "utf-8");
      const artifact = JSON.parse(artifactContent);

      this.logger.log(
        `✅ Loaded ABI for ${contractName} with ${artifact.abi.length} entries`,
      );

      return artifact.abi;
    } catch (error) {
      this.logger.error(`Failed to load ABI for ${contractName}`, error);
      throw error;
    }
  }

  async startIndexing() {
    if (this.isIndexing) {
      this.logger.warn("Indexing already in progress");
      return;
    }

    this.isIndexing = true;
    this.logger.log("Starting blockchain indexing...");

    try {
      await this.indexHistoricalEvents();
      this.logger.log(
        "Historical indexing completed. Starting real-time monitoring...",
      );
    } catch (error) {
      this.logger.error("Error during indexing", error);
      this.isIndexing = false;
    }
  }

  private async indexHistoricalEvents() {
    const state = await this.stateService.getState();
    const currentBlock = await this.blockchainService.getCurrentBlock();

    let fromBlock = state?.lastBlockNumber
      ? Number(state.lastBlockNumber) + 1
      : INDEXER.START_BLOCK;
    const toBlock = currentBlock;

    this.logger.log(`Indexing from block ${fromBlock} to ${toBlock}`);

    // Skip if already up to date
    if (fromBlock > toBlock) {
      this.logger.log(`Already up to date. No blocks to index.`);
      return;
    }

    while (fromBlock <= toBlock) {
      const batchEnd = Math.min(fromBlock + INDEXER.BATCH_SIZE - 1, toBlock);

      await this.processBatch(fromBlock, batchEnd);

      fromBlock = batchEnd + 1;
    }
  }

  private async processBatch(fromBlock: number, toBlock: number) {
    this.logger.debug(`Processing batch: ${fromBlock} - ${toBlock}`);

    try {
      for (const [contractName, contract] of this.contracts.entries()) {
        await this.processContractEvents(
          contractName,
          contract,
          fromBlock,
          toBlock,
        );
      }

      const block = await this.blockchainService.getBlock(toBlock);
      await this.stateService.updateState(BigInt(toBlock), block.hash);

      this.logger.debug(`Batch processed: ${fromBlock} - ${toBlock}`);
    } catch (error) {
      this.logger.error(
        `Error processing batch ${fromBlock}-${toBlock}`,
        error,
      );
      throw error;
    }
  }

  private async processContractEvents(
    contractName: string,
    contract: ethers.Contract,
    fromBlock: number,
    toBlock: number,
  ) {
    const filter = {
      address: await contract.getAddress(),
      fromBlock,
      toBlock,
    };

    const logs = await this.blockchainService.getProvider().getLogs(filter);

    this.logger.debug(
      `Found ${logs.length} logs for ${contractName} in blocks ${fromBlock}-${toBlock}`,
    );

    for (const log of logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsedLog) {
          this.logger.debug(
            `Parsed event: ${parsedLog.name} from ${contractName}`,
          );
          await this.handleEvent(contractName, parsedLog, log);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse log: ${log.transactionHash}`, error);
      }
    }
  }

  private async handleEvent(
    contractName: string,
    parsedLog: ethers.LogDescription,
    log: ethers.Log,
  ) {
    const eventName = parsedLog.name;
    const block = await this.blockchainService.getBlock(log.blockNumber);

    this.logger.debug(
      `Event: ${contractName}.${eventName} at block ${log.blockNumber}`,
    );

    // Save raw event
    await this.eventsService.saveEvent({
      blockNumber: BigInt(log.blockNumber),
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      logIndex: log.index,
      eventType: eventName,
      contractAddress: log.address,
      data: this.parseEventArgs(parsedLog.args),
      timestamp: new Date(block.timestamp * 1000),
    });

    // Route to specific handlers
    switch (eventName) {
      case EventType.DEPOSITED:
        await this.depositsService.handleDeposit(parsedLog.args, log, block);
        break;
      case EventType.WITHDRAWN:
        await this.depositsService.handleWithdrawal(parsedLog.args, log, block);
        break;
      case EventType.BORROWED:
        await this.loansService.handleBorrow(parsedLog.args, log, block);
        break;
      case EventType.REPAID:
        await this.loansService.handleRepay(parsedLog.args, log, block);
        break;
      case EventType.LIQUIDATED:
        await this.loansService.handleLiquidation(parsedLog.args, log, block);
        break;
      default:
        this.logger.debug(`Unhandled event: ${eventName}`);
    }
  }

  private parseEventArgs(args: ethers.Result): Record<string, any> {
    const parsed: Record<string, any> = {};

    for (let i = 0; i < args.length; i++) {
      const key = args.names?.[i] || i.toString();
      const value = args[i];

      if (typeof value === "bigint") {
        parsed[key] = value.toString();
      } else if (value && typeof value === "object" && value._isBigNumber) {
        parsed[key] = value.toString();
      } else {
        parsed[key] = value;
      }
    }

    return parsed;
  }

  // Periodic sync check
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncCheck() {
    if (!this.isIndexing) {
      return;
    }

    try {
      const state = await this.stateService.getState();
      const currentBlock = await this.blockchainService.getCurrentBlock();

      const lastProcessedBlock = state ? Number(state.lastBlockNumber) : -1;

      this.logger.debug(
        `Sync check: last=${lastProcessedBlock}, current=${currentBlock}`,
      );

      if (lastProcessedBlock < currentBlock) {
        const fromBlock = lastProcessedBlock + 1;
        this.logger.log(`Syncing new blocks: ${fromBlock} to ${currentBlock}`);
        await this.processBatch(fromBlock, currentBlock);
      }
    } catch (error) {
      this.logger.error("Error during sync check", error);
    }
  }

  async stopIndexing() {
    this.isIndexing = false;
    this.logger.log("Indexing stopped");
  }
}
