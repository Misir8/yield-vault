// libs/logger/src/queue-context.ts
import { RequestContext } from "./request-context";

type MsgAttr = { StringValue?: string };
type SqsMsg = {
  Body?: string;
  MessageAttributes?: Record<string, MsgAttr>;
};

/**
 * Restores ALS from SQS MessageAttributes.
 *
 * Source of truth:
 * - traceId: ONLY from MessageAttributes['x-trace-id'].
 * - userId: from MessageAttributes['x-user-id'] OR payload.userId / payload.payload.userId.
 * If no traceId — ALS is not created (cron/jobs path).
 */
export function enterSqsRequestContext(msg: SqsMsg): void {
  const attrs = msg.MessageAttributes ?? {};
  const traceId = attrs["x-trace-id"]?.StringValue;
  const userAttr = attrs["x-user-id"]?.StringValue;

  // No traceId → do not create ALS (remain n/a)
  if (!traceId) return;

  let bodyUserId: string | undefined;
  try {
    const body = msg.Body ? JSON.parse(msg.Body) : undefined;
    bodyUserId = body?.payload?.userId ?? body?.userId ?? undefined;
  } catch {
    /* ignore malformed body */
  }

  RequestContext.enter({
    traceId,
    userId: userAttr ?? bodyUserId ?? undefined,
  });
}
