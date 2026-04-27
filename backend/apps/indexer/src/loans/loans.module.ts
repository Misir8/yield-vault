import { Module } from "@nestjs/common";

import { LoansService } from "./loans.service";
import { PrivateLoansController } from "./private-loans.controller";

@Module({
  controllers: [PrivateLoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
