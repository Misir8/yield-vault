import { INDEXER, METRICS } from "config";

import { SERVICES } from "@libs/constants/services.constants";

import { bootstrap } from "../../bootstrap";
import { IndexerModule } from "./indexer.module";

bootstrap(SERVICES.INDEXER, IndexerModule, INDEXER.PORT, "api/v1/indexer", {
  monitoring: {
    config: METRICS,
  },
});
