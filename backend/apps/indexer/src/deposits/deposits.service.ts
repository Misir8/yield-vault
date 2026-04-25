import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaClient } from ".prisma/indexer-client";
import { INDEXER_DB } from "config";
import { ethers } from "ethers";

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    @Inject(`${INDEXER_DB.NAME}PrismaClient`)
    private readonly prisma: PrismaClient,
  ) {}

  async handleDeposit(
    args: ethers.Result,
    log: ethers.Log,
    block: ethers.Block,
  ) {
    try {
      const deposit = await this.prisma.deposit.create({
        data: {
          user: args.user.toLowerCase(),
          amount: args.amount.toString(),
          shares: args.globalIndex?.toString() || "0", // Using globalIndex as shares placeholder
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: new Date(block.timestamp * 1000),
        },
      });

      this.logger.log(`Deposit indexed: ${deposit.user} - ${deposit.amount}`);
      return deposit;
    } catch (error) {
      this.logger.error(
        `Failed to handle deposit: ${log.transactionHash}`,
        error,
      );
      throw error;
    }
  }

  async handleWithdrawal(
    args: ethers.Result,
    log: ethers.Log,
    block: ethers.Block,
  ) {
    try {
      const withdrawal = await this.prisma.withdrawal.create({
        data: {
          user: args.user.toLowerCase(),
          amount: args.amount.toString(),
          shares: args.globalIndex?.toString() || "0", // Using globalIndex as shares placeholder
          interest: args.interest?.toString() || "0",
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: new Date(block.timestamp * 1000),
        },
      });

      this.logger.log(
        `Withdrawal indexed: ${withdrawal.user} - ${withdrawal.amount}`,
      );
      return withdrawal;
    } catch (error) {
      this.logger.error(
        `Failed to handle withdrawal: ${log.transactionHash}`,
        error,
      );
      throw error;
    }
  }

  async getDepositsByUser(userAddress: string, limit: number = 100) {
    const deposits = await this.prisma.deposit.findMany({
      where: { user: userAddress.toLowerCase() },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return deposits.map((deposit) => ({
      ...deposit,
      blockNumber: deposit.blockNumber.toString(),
    }));
  }

  async getWithdrawalsByUser(userAddress: string, limit: number = 100) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { user: userAddress.toLowerCase() },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return withdrawals.map((withdrawal) => ({
      ...withdrawal,
      blockNumber: withdrawal.blockNumber.toString(),
    }));
  }

  async getTotalDeposited(userAddress: string): Promise<bigint> {
    const deposits = await this.prisma.deposit.findMany({
      where: { user: userAddress.toLowerCase() },
      select: { amount: true },
    });

    return deposits.reduce(
      (sum, deposit) => sum + BigInt(deposit.amount),
      BigInt(0),
    );
  }

  async getTotalWithdrawn(userAddress: string): Promise<bigint> {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { user: userAddress.toLowerCase() },
      select: { amount: true },
    });

    return withdrawals.reduce(
      (sum, withdrawal) => sum + BigInt(withdrawal.amount),
      BigInt(0),
    );
  }
}
