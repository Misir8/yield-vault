import { Module } from "@nestjs/common";

import { BlockchainService } from "./blockchain.service";
import { EventListenerService } from "./event-listener.service";
import { StateModule } from "../state/state.module";
import { EventsModule } from "../events";
import { DepositsModule } from "../deposits";
import { LoansModule } from "../loans";

@Module({
  imports: [StateModule, EventsModule, DepositsModule, LoansModule],
  providers: [BlockchainService, EventListenerService],
})
export class BlockchainModule {}
