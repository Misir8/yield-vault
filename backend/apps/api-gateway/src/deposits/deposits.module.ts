import { Module } from "@nestjs/common";

import { DepositsProviderModule } from "@libs/indexer-provider";

import { DepositsController } from "./deposits.controller";
import { DepositsService } from "./deposits.service";

@Module({
  imports: [DepositsProviderModule],
  controllers: [DepositsController],
  providers: [DepositsService],
})
export class DepositsModule {}
