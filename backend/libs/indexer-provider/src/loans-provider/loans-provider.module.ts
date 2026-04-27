import { Module } from "@nestjs/common";

import { LoansProviderService } from "./loans-provider.service";

@Module({
  providers: [LoansProviderService],
  exports: [LoansProviderService],
})
export class LoansProviderModule {}
