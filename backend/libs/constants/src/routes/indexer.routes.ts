// Indexer Private Routes

// Private Deposits
export const INDEXER_PRIVATE_DEPOSITS_URL = "private/deposits";
export const INDEXER_PRIVATE_DEPOSITS_USER_URL = "user/:userAddress";
export const INDEXER_PRIVATE_DEPOSITS_USER_WITHDRAWALS_URL =
  "user/:userAddress/withdrawals";
export const INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_DEPOSITED_URL =
  "user/:userAddress/total-deposited";
export const INDEXER_PRIVATE_DEPOSITS_USER_TOTAL_WITHDRAWN_URL =
  "user/:userAddress/total-withdrawn";

// Private Loans
export const INDEXER_PRIVATE_LOANS_URL = "private/loans";
export const INDEXER_PRIVATE_LOANS_USER_URL = "user/:userAddress";
export const INDEXER_PRIVATE_LOANS_USER_ACTIVE_URL = "user/:userAddress/active";
export const INDEXER_PRIVATE_LOANS_USER_TOTAL_BORROWED_URL =
  "user/:userAddress/total-borrowed";
export const INDEXER_PRIVATE_LOANS_LIQUIDATIONS_URL =
  "liquidations/:borrowerAddress";
export const INDEXER_PRIVATE_LOANS_USER_REPAYMENTS_URL =
  "user/:userAddress/repayments";

// Private Events
export const INDEXER_PRIVATE_EVENTS_URL = "private/events";
export const INDEXER_PRIVATE_EVENTS_TYPE_URL = "type/:eventType";
export const INDEXER_PRIVATE_EVENTS_BLOCK_URL = "block/:blockNumber";
export const INDEXER_PRIVATE_EVENTS_TX_URL = "tx/:transactionHash";
