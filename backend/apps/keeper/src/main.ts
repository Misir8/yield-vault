import { KEEPER, METRICS } from "config";

import { SERVICES } from "@libs/constants/services.constants";

import { bootstrap } from "../../bootstrap";

import { KeeperModule } from "./keeper.module";

bootstrap(SERVICES.KEEPER, KeeperModule, KEEPER.PORT, "api/v1/keeper", {
  monitoring: {
    config: METRICS,
  },
});
