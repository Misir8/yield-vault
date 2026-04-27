import { Module } from "@nestjs/common";

import { LoansProviderModule } from "@libs/indexer-provider";

import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";

@Module({
  imports: [LoansProviderModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
