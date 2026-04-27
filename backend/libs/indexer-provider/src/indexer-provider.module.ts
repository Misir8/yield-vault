import { Module } from "@nestjs/common";

import { DepositsProviderModule } from "./deposits-provider";
import { LoansProviderModule } from "./loans-provider";
import { EventsProviderModule } from "./events-provider";

@Module({
  imports: [DepositsProviderModule, LoansProviderModule, EventsProviderModule],
  exports: [DepositsProviderModule, LoansProviderModule, EventsProviderModule],
})
export class IndexerProviderModule {}
