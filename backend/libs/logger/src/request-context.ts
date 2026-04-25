// libs/logger/src/request-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Store of request-scoped metadata kept in AsyncLocalStorage.
 */
export type RequestContextStore = {
  /** End-to-end technical trace identifier. */
  traceId: string;
  /** Per-request id (echoed to clients, useful for support). */
  requestId?: string;
  /** Authenticated user id (if known). */
  userId?: string;
  /** Client IP (possibly from X-Forwarded-For). */
  ip?: string;
  /** Arbitrary additional metadata. */
  [k: string]: unknown;
};

const als = new AsyncLocalStorage<RequestContextStore>();

/**
 * Lightweight helper around AsyncLocalStorage used by logging and tracing.
 */
export const RequestContext = {
  /**
   * Run a function within a fresh ALS store and return its result.
   *
   * @template T
   * @param {Partial<RequestContextStore>} seed - Initial values for the store; missing ids are generated.
   * @param {() => T} fn - Function to execute within the ALS context.
   * @returns {T} The return value of the provided function.
   */
  run<T>(seed: Partial<RequestContextStore>, fn: () => T): T {
    const traceId = seed.traceId ?? seed.requestId ?? randomUUID();
    const store: RequestContextStore = {
      traceId,
      requestId: seed.requestId ?? traceId,
      ...seed,
    };
    return als.run(store, fn);
  },

  /**
   * Enter a fresh ALS store for the current async call chain and return it.
   * Useful when you need the context to persist across async/await and RxJS boundaries.
   *
   * @param {Partial<RequestContextStore>} seed - Initial values for the store; missing ids are generated.
   * @returns {RequestContextStore} The initialized store.
   */
  enter(seed: Partial<RequestContextStore>): RequestContextStore {
    const traceId = seed.traceId ?? seed.requestId ?? randomUUID();
    const store: RequestContextStore = {
      traceId,
      requestId: seed.requestId ?? traceId,
      ...seed,
    };
    als.enterWith(store);
    return store;
  },

  /**
   * Get the current ALS store (if any).
   *
   * @returns {RequestContextStore | undefined} The current store or undefined outside a request scope.
   */
  get(): RequestContextStore | undefined {
    return als.getStore();
  },

  /**
   * Patch the current ALS store with provided fields.
   *
   * @param {Partial<RequestContextStore>} patch - Fields to merge into the current store.
   * @returns {void}
   */
  set(patch: Partial<RequestContextStore>): void {
    const s = als.getStore();
    if (s) Object.assign(s, patch);
  },
};
