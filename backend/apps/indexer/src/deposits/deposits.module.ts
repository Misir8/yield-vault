import { Module } from "@nestjs/common";

import { DepositsService } from "./deposits.service";
import { PrivateDepositsController } from "./private-deposits.controller";

@Module({
  controllers: [PrivateDepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
