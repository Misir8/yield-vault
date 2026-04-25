// libs/logger/src/shared-base-logger.ts
/**
 * Shared base Winston logger (singleton per process).
 *
 * Simplified version without CloudWatch dependency.
 * Uses console and file transports only.
 */
import { hostname } from "node:os";
import { styleText } from "node:util";

import { LOGGING } from "config";
import { createLogger, format, transports, Logger } from "winston";

import { RequestContext } from "./request-context";

type TLogLevel = "verbose" | "debug" | "info" | "warn" | "error";
type Colorizer = (text: string) => string;

const color: Record<TLogLevel, Colorizer> = {
  debug: (text) => styleText(["magenta"], text),
  verbose: (text) => styleText(["blue"], text),
  info: (text) => styleText(["green"], text),
  warn: (text) => styleText(["yellow"], text),
  error: (text) => styleText(["red"], text),
};

const withRequestContext = format((info) => {
  const ctx = RequestContext.get();
  if (ctx) {
    info.traceId = info.traceId ?? ctx.traceId;
    info.requestId = info.requestId ?? ctx.requestId;
    info.userId = info.userId ?? ctx.userId ?? null;
    if (ctx.ip) info.ip = info.ip ?? ctx.ip;
  }
  return info;
});

function getServiceName(): string {
  const argv1 = process.argv[1];
  if (!argv1) {
    return "test.service";
  }

  if (argv1.endsWith("/node_modules/typeorm/cli.js")) {
    return "typeorm-cli";
  }
  if (argv1.includes("libs/console/src/main.ts")) {
    return "cli";
  }

  const match = /.*\/apps\/([a-z-]+)\//.exec(argv1);
  return match ? match[1] : "app";
}

function getConsoleLogFormat(): ReturnType<typeof format.printf> {
  return format.printf((info) => {
    const { level, message, timestamp, ctx, service, durationMs, traceId } =
      info as any;
    const lvl = (level as TLogLevel) || "info";
    const paint = color[lvl] ?? ((x: string) => x);

    const prefix =
      `${timestamp} ` +
      `[${service}] ` +
      `${paint(level)} ` +
      `[${ctx}] ` +
      `${paint(`[trace=${traceId ?? "n/a"}]:`)}`;

    let right: string;

    const renderBlocks = (body?: unknown, query?: unknown): string => {
      const blocks: string[] = [];
      if (body && typeof body === "object" && Object.keys(body as any).length) {
        blocks.push(`      body: ${JSON.stringify(body, null, 2)}`);
      }
      if (
        query &&
        typeof query === "object" &&
        Object.keys(query as any).length
      ) {
        blocks.push(`      query: ${JSON.stringify(query, null, 2)}`);
      }
      return blocks.length ? `\n${blocks.join("\n")}` : "";
    };

    if (typeof message === "object" && message !== null) {
      const { msg, ...rest } = message as any;

      switch (msg) {
        case "HTTP REQUEST": {
          const { method, url, userId: uid, body, query } = rest as any;
          right =
            `[${method}] :: REQUEST :: ${url} user(${uid ?? null})` +
            renderBlocks(body, query);
          break;
        }
        case "HTTP OK": {
          const { method, url, userId: uid, ms } = rest as any;
          right = `[${method}] :: OK :: ${url} user(${uid ?? null})${typeof ms === "number" ? ` ms=${ms}` : ""}`;
          break;
        }
        case "HTTP ERROR": {
          const { method, url, userId: uid, status, ms, details } = rest as any;
          const detailPart = details
            ? ` :: details (${JSON.stringify(details)})`
            : "";
          right = `[${method}] :: ${status} :: ${url} user(${uid ?? null})${detailPart}${
            typeof ms === "number" ? ` ms=${ms}` : ""
          }`;
          break;
        }
        default: {
          right = "";
          if (msg) right += ` ${String(msg)}`;
          if (durationMs !== undefined)
            right += ` +${((durationMs as number) / 1000).toFixed(3)}s`;
          if (Object.keys(rest).length)
            right += `\n${JSON.stringify(rest, null, 2)}`;
        }
      }
    } else {
      right = ` ${String(message)}`;
    }

    return `${prefix}${paint(right)}`;
  });
}

let baseLogger: Logger | null = null;

export function getOrCreateBaseLogger(): Logger {
  if (baseLogger) {
    return baseLogger;
  }

  const isCi = process.env.CI === "true";
  const isSilentExplicit = /^(1|true|yes)$/i.test(process.env.LOG_SILENT ?? "");
  const silent = isSilentExplicit || (process.env.LOG_SILENT == null && isCi);

  // Get log level from config
  const logLevel = (LOGGING?.LEVEL || "info").toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";

  const serviceName = getServiceName();
  const logStreamName = `${serviceName}-${process.env.NODE_ENV || "development"}-${hostname()}`;

  const logTransports: any[] = [
    new transports.Console({
      level: logLevel,
      format: getConsoleLogFormat(),
    }),
  ];

  if (isProduction && !silent) {
    logTransports.push(
      new transports.File({
        level: "debug",
        filename: `logs/${serviceName}.log`,
        format: format.json(),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
    );
  }

  baseLogger = createLogger({
    silent,
    format: format.combine(
      withRequestContext(),
      format.timestamp(),
      format.json(),
    ),
    defaultMeta: { service: serviceName, stream: logStreamName },
    transports: logTransports,
  });

  return baseLogger;
}
