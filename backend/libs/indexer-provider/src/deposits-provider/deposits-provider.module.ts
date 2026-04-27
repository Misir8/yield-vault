import { Module } from "@nestjs/common";

import { DepositsProviderService } from "./deposits-provider.service";

@Module({
  providers: [DepositsProviderService],
  exports: [DepositsProviderService],
})
export class DepositsProviderModule {}
