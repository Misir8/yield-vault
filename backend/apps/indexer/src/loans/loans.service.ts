import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaClient } from ".prisma/indexer-client";
import { INDEXER_DB } from "config";
import { ethers } from "ethers";

import { LoanStatus } from "../common/enums";

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    @Inject(`${INDEXER_DB.NAME}PrismaClient`)
    private readonly prisma: PrismaClient,
  ) {}

  async handleBorrow(
    args: ethers.Result,
    log: ethers.Log,
    block: ethers.Block,
  ) {
    try {
      const loan = await this.prisma.loan.create({
        data: {
          user: args.user.toLowerCase(),
          amount: args.amount.toString(),
          collateral: args.collateralValue?.toString() || "0",
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: new Date(block.timestamp * 1000),
          status: LoanStatus.ACTIVE,
        },
      });

      this.logger.log(`Loan indexed: ${loan.user} - ${loan.amount}`);
      return loan;
    } catch (error) {
      this.logger.error(
        `Failed to handle borrow: ${log.transactionHash}`,
        error,
      );
      throw error;
    }
  }

  async handleRepay(args: ethers.Result, log: ethers.Log, block: ethers.Block) {
    try {
      // Save repayment record
      await this.prisma.repayment.create({
        data: {
          user: args.user.toLowerCase(),
          amount: args.amount.toString(),
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: new Date(block.timestamp * 1000),
        },
      });

      // Find the active loan for this user and update status
      const activeLoan = await this.prisma.loan.findFirst({
        where: {
          user: args.user.toLowerCase(),
          status: LoanStatus.ACTIVE,
        },
        orderBy: { timestamp: "desc" },
      });

      if (activeLoan) {
        await this.prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            status: LoanStatus.REPAID,
            repaidAt: new Date(block.timestamp * 1000),
          },
        });
        this.logger.log(
          `Loan repaid: ${activeLoan.user} - ${activeLoan.amount}`,
        );
      } else {
        this.logger.warn(`No active loan found for user: ${args.user}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle repay: ${log.transactionHash}`,
        error,
      );
      throw error;
    }
  }

  async handleLiquidation(
    args: ethers.Result,
    log: ethers.Log,
    block: ethers.Block,
  ) {
    try {
      // Save liquidation event
      const liquidation = await this.prisma.liquidation.create({
        data: {
          borrower: args.borrower.toLowerCase(),
          liquidator: args.liquidator.toLowerCase(),
          amount: args.amount.toString(),
          collateralSeized: args.collateralSeized.toString(),
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: new Date(block.timestamp * 1000),
        },
      });

      // Update loan status
      const activeLoan = await this.prisma.loan.findFirst({
        where: {
          user: args.borrower.toLowerCase(),
          status: LoanStatus.ACTIVE,
        },
        orderBy: { timestamp: "desc" },
      });

      if (activeLoan) {
        await this.prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            status: LoanStatus.LIQUIDATED,
            liquidatedAt: new Date(block.timestamp * 1000),
          },
        });
      }

      this.logger.log(
        `Liquidation indexed: ${liquidation.borrower} by ${liquidation.liquidator}`,
      );
      return liquidation;
    } catch (error) {
      this.logger.error(
        `Failed to handle liquidation: ${log.transactionHash}`,
        error,
      );
      throw error;
    }
  }

  async getRepaymentsByUser(userAddress: string, limit: number = 100) {
    const repayments = await this.prisma.repayment.findMany({
      where: { user: userAddress.toLowerCase() },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return repayments.map((r) => ({
      ...r,
      blockNumber: r.blockNumber.toString(),
    }));
  }

  async getLoansByUser(userAddress: string, limit: number = 100) {
    const loans = await this.prisma.loan.findMany({
      where: { user: userAddress.toLowerCase() },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return loans.map((loan) => ({
      ...loan,
      blockNumber: loan.blockNumber.toString(),
    }));
  }

  async getActiveLoansByUser(userAddress: string) {
    const loans = await this.prisma.loan.findMany({
      where: {
        user: userAddress.toLowerCase(),
        status: LoanStatus.ACTIVE,
      },
      orderBy: { timestamp: "desc" },
    });

    return loans.map((loan) => ({
      ...loan,
      blockNumber: loan.blockNumber.toString(),
    }));
  }

  async getLiquidationsByBorrower(
    borrowerAddress: string,
    limit: number = 100,
  ) {
    const liquidations = await this.prisma.liquidation.findMany({
      where: { borrower: borrowerAddress.toLowerCase() },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return liquidations.map((liquidation) => ({
      ...liquidation,
      blockNumber: liquidation.blockNumber.toString(),
    }));
  }

  async getTotalBorrowed(userAddress: string): Promise<bigint> {
    const loans = await this.prisma.loan.findMany({
      where: { user: userAddress.toLowerCase() },
      select: { amount: true },
    });

    return loans.reduce((sum, loan) => sum + BigInt(loan.amount), BigInt(0));
  }
}
