// libs/axios/src/axios.service.ts
import * as http from "http";
import * as https from "https";

import { BeforeApplicationShutdown, Injectable } from "@nestjs/common";
import axios, {
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import axiosRetry from "axios-retry";

import { redactSensitiveData } from "@libs/helpers";
import { AppLogger } from "@libs/logger/app.logger";
import { RequestContext } from "@libs/logger/request-context";

import {
  DEFAULT_ALLOWED_HOSTS,
  DEFAULT_ALLOWED_PORTS,
  INTERNAL_SERVICE_HOSTS,
} from "./axios.const";

/**
 * Runtime configuration for AxiosService and created Axios instances.
 */
interface AxiosServiceOptions {
  /** Base URL for requests (passed to axios.create). */
  baseURL?: string;
  /** Number of retries for axios-retry (default: 3). */
  retries?: number;
  /** Request timeout in milliseconds (default: 5000). */
  timeout?: number;
  /** Default headers to apply at instance creation. */
  headers?: Record<string, string>;
  /** Max characters to log for request/response bodies (default: 4000). */
  maxLogBodyLength?: number;
  /**
   * Context propagation mode:
   * - 'always'        — always forward trace/user headers
   * - 'internal-only' — forward only to internal targets (default)
   * - 'never'         — never forward
   */
  contextPropagation?: "always" | "internal-only" | "never";
  /** Allowed internal host patterns when mode = 'internal-only'. */
  allowedHostPatterns?: RegExp[];
  /** Optional explicit port allowlist (exact match) used only for internal-looking hosts. */
  allowedInternalPorts?: string[];
  /** Optional explicit host allowlist (exact match, case-insensitive). */
  allowedHostnames?: string[];
}

/**
 * A safe, opinionated Axios wrapper:
 * - Adds request/response logging with truncation to avoid huge logs.
 * - Integrates with AsyncLocalStorage to propagate trace/user context **only** to internal targets.
 * - Prevents leaking `x-trace-id`, `x-request-id`, `x-user-id`, `x-forwarded-for` to external services.
 * - Configures axios-retry with sensible defaults.
 *
 * Recommended usage:
 * - For internal microservice-to-microservice calls, keep `contextPropagation: 'internal-only'` (default).
 * - For third-party APIs, pass `contextPropagation: 'never'`.
 */
@Injectable()
export class AxiosService implements BeforeApplicationShutdown {
  private readonly logger = new AppLogger(AxiosService.name);
  private static readonly agentLogger = new AppLogger(AxiosService.name);
  private readonly defaultConfig: AxiosServiceOptions;
  private static sharedHttpAgent: http.Agent;
  private static sharedHttpsAgent: https.Agent;

  private static createAgents(): {
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
  } {
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });

    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });

    httpAgent.on("error", (err) => {
      AxiosService.agentLogger.warn(
        `HTTP agent error, connections will be recreated automatically: ${err.message}`,
      );
    });

    httpsAgent.on("error", (err) => {
      AxiosService.agentLogger.warn(
        `HTTPS agent error, connections will be recreated automatically: ${err.message}`,
      );
    });

    return { httpAgent, httpsAgent };
  }

  private static getAgents(): {
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
  } {
    if (!AxiosService.sharedHttpAgent || !AxiosService.sharedHttpsAgent) {
      const agents = AxiosService.createAgents();
      AxiosService.sharedHttpAgent = agents.httpAgent;
      AxiosService.sharedHttpsAgent = agents.httpsAgent;
    }
    return {
      httpAgent: AxiosService.sharedHttpAgent,
      httpsAgent: AxiosService.sharedHttpsAgent,
    };
  }

  beforeApplicationShutdown(): void {
    AxiosService.destroyAgents();
  }

  static destroyAgents(): void {
    if (AxiosService.sharedHttpAgent) {
      AxiosService.sharedHttpAgent.removeAllListeners();
      AxiosService.sharedHttpAgent.destroy();
      AxiosService.sharedHttpAgent = null;
      AxiosService.agentLogger.log("HTTP agent destroyed");
    }
    if (AxiosService.sharedHttpsAgent) {
      AxiosService.sharedHttpsAgent.removeAllListeners();
      AxiosService.sharedHttpsAgent.destroy();
      AxiosService.sharedHttpsAgent = null;
      AxiosService.agentLogger.log("HTTPS agent destroyed");
    }
  }

  /**
   * Construct a new AxiosService with global defaults.
   *
   * @param {AxiosServiceOptions} [options={}] Global defaults for all created instances.
   */
  constructor(options: AxiosServiceOptions = {}) {
    this.defaultConfig = {
      retries: options.retries ?? 3,
      timeout: options.timeout ?? 5000,
      headers: options.headers ?? { "Content-Type": "application/json" },
      maxLogBodyLength: options.maxLogBodyLength ?? 4000,
      contextPropagation: options.contextPropagation ?? "internal-only",
      allowedHostPatterns: options.allowedHostPatterns ?? DEFAULT_ALLOWED_HOSTS,
      allowedInternalPorts:
        options.allowedInternalPorts ?? DEFAULT_ALLOWED_PORTS,
      allowedHostnames: options.allowedHostnames ?? INTERNAL_SERVICE_HOSTS,
    };
  }

  /**
   * Create a configured Axios instance with logging, retry, and safe context propagation.
   * Instance-level options override constructor defaults.
   *
   * @param {AxiosServiceOptions} [config] Per-instance overrides (baseURL, headers, retries, etc.).
   * @returns {AxiosInstance} Configured Axios instance.
   */
  public createInstance(config?: AxiosServiceOptions): AxiosInstance {
    const { httpAgent, httpsAgent } = AxiosService.getAgents();

    const axiosInstance = axios.create({
      baseURL: config?.baseURL || this.defaultConfig.baseURL,
      timeout: config?.timeout ?? this.defaultConfig.timeout,
      headers: { ...this.defaultConfig.headers, ...config?.headers },
      httpAgent,
      httpsAgent,
    });

    this.setupRetry(
      axiosInstance,
      config?.retries ?? this.defaultConfig.retries,
    );

    const maxForThisInstance =
      config?.maxLogBodyLength ?? this.defaultConfig.maxLogBodyLength ?? 4000;
    const propagationMode =
      config?.contextPropagation ??
      this.defaultConfig.contextPropagation ??
      "internal-only";
    const allowedPatterns =
      config?.allowedHostPatterns ??
      this.defaultConfig.allowedHostPatterns ??
      DEFAULT_ALLOWED_HOSTS;
    const allowedPorts = new Set(
      (
        config?.allowedInternalPorts ??
        this.defaultConfig.allowedInternalPorts ??
        DEFAULT_ALLOWED_PORTS
      ).map(String),
    );
    const allowedHostnames =
      config?.allowedHostnames ??
      this.defaultConfig.allowedHostnames ??
      INTERNAL_SERVICE_HOSTS;

    axiosInstance.interceptors.request.use(
      (cfg: InternalAxiosRequestConfig) => {
        const ctx = RequestContext.get();

        // Decide if we should propagate context for this target
        const shouldPropagate =
          propagationMode === "always"
            ? true
            : propagationMode === "never"
              ? false
              : this.isInternalTarget(
                  cfg,
                  allowedPatterns,
                  allowedPorts,
                  allowedHostnames,
                );

        // Ensure headers is AxiosHeaders
        const ensureAxiosHeaders = (h?: AxiosRequestHeaders): AxiosHeaders =>
          h instanceof AxiosHeaders ? h : new AxiosHeaders(h ?? {});
        cfg.headers = ensureAxiosHeaders(cfg.headers);

        // Strictly control context headers
        const h = cfg.headers as AxiosHeaders;
        if (shouldPropagate && ctx) {
          if (ctx.traceId) {
            h.set("x-trace-id", ctx.traceId);
            h.set("x-request-id", ctx.requestId ?? ctx.traceId);
          }
          if (ctx.userId) {
            h.set("x-user-id", ctx.userId);
          }
          if (ctx.ip && !h.has("x-forwarded-for")) {
            h.set("x-forwarded-for", ctx.ip);
          }
        } else {
          // Ensure we never leak internal context headers to external targets
          h.delete("x-trace-id");
          h.delete("x-request-id");
          h.delete("x-user-id");
          h.delete("x-forwarded-for");
        }

        const urlForLog = this.joinUrlForLog(cfg.baseURL, cfg.url);
        this.logger.debug(
          `Request: ${String(cfg.method).toUpperCase()} ${urlForLog}`,
        );
        this.logger.debug(
          `Request Data: ${this.stringifyLimited(redactSensitiveData(cfg.data), maxForThisInstance)}`,
        );

        return cfg;
      },
    );

    axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(
          `Response: ${response.status} ${response.statusText}`,
        );
        this.logger.debug(
          `Response Data: ${this.stringifyLimited(redactSensitiveData(response.data), maxForThisInstance)}`,
        );
        return response;
      },
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url;
        const method = error?.config?.method
          ? String(error.config.method).toUpperCase()
          : undefined;
        this.logger.error({
          msg: "HTTP CLIENT ERROR",
          method,
          url,
          status,
          details: error?.message ?? "Request failed",
        });
        return Promise.reject(error);
      },
    );

    return axiosInstance;
  }

  /**
   * Configure axios-retry on a given instance.
   *
   * @param {AxiosInstance} instance Axios instance to configure.
   * @param {number} retries Number of retries to allow.
   * @returns {void}
   */
  private setupRetry(instance: AxiosInstance, retries: number) {
    axiosRetry(instance as any, {
      retries,
      shouldResetTimeout: true,
      retryDelay: (retryCount) =>
        Math.min(axiosRetry.exponentialDelay(retryCount), 10_000),
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.code === "ECONNABORTED" &&
          error.config?.method?.toUpperCase() !== "POST"),
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.debug(
          `[Retry ${retryCount}] ${String(requestConfig.method).toUpperCase()} ${requestConfig.url} - ${
            error.code || error.message
          }`,
        );
      },
    });
  }

  /**
   * Join baseURL and url for log output without creating a double slash.
   *
   * @param {string|undefined} baseURL Base URL (may end with '/').
   * @param {string|undefined} url URL path (may start with '/').
   * @returns {string} Joined URL string for logs.
   */
  private joinUrlForLog(baseURL?: string, url?: string): string {
    const b = (baseURL ?? "").replace(/\/+$/, "");
    const p = (url ?? "").replace(/^\/+/, "");
    if (!b) return p || "";
    if (!p) return b;
    return `${b}/${p}`;
  }

  /**
   * JSON-stringify with safe truncation to avoid excessively large log entries.
   *
   * @param {unknown} value Value to stringify.
   * @param {number|undefined} [max] Optional limit override (defaults to instance/global limit).
   * @returns {string} JSON string (possibly truncated with suffix).
   */
  private stringifyLimited(value: unknown, max?: number): string {
    const limit = max ?? this.defaultConfig.maxLogBodyLength ?? 4000;
    let str: string;
    try {
      if (typeof value === "string") str = value;
      else if (value == null) str = "null";
      else str = JSON.stringify(value);
    } catch {
      str = "[unserializable]";
    }
    if (str.length <= limit) return str;
    return `${str.slice(0, limit)}… [truncated ${str.length - limit} chars]`;
  }

  /**
   * Decide whether a request target should be treated as "internal", enabling context propagation.
   * Rules:
   *  1) Explicit allowlist of hostnames wins.
   *  2) Hostname matches internal patterns (single-label, k8s suffixes, private IPs, localhost).
   *  3) Allowed port is considered only if hostname looks internal (single-label or private IP).
   *
   * @param {InternalAxiosRequestConfig} cfg Axios request config.
   * @param {RegExp[]} patterns Allowed internal host regex patterns.
   * @param {Set<string>} allowedPorts Allowed internal ports.
   * @param {string[]} allowedHostnames Explicit allowed hostnames (case-insensitive).
   * @returns {boolean} True if target is considered internal.
   */
  private isInternalTarget(
    cfg: InternalAxiosRequestConfig,
    patterns: RegExp[],
    allowedPorts: Set<string>,
    allowedHostnames: string[],
  ): boolean {
    const full = this.joinUrlForLog(cfg.baseURL, cfg.url);

    const isSingleLabel = (h: string) => /^[a-z0-9-]+$/i.test(h);
    const isPrivateIp = (h: string) =>
      /^192\.168\.(?:\d{1,3})\.(?:\d{1,3})$/.test(h) ||
      /^10\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})$/.test(h) ||
      /^172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3})\.(?:\d{1,3})$/.test(h);

    const explicitHostOk = (h: string) =>
      Array.isArray(allowedHostnames) &&
      allowedHostnames.some((x) => x.toLowerCase() === h.toLowerCase());

    const hostMatchesPatterns = (h: string) =>
      patterns.some((re) => re.test(h));

    const isInternalByRules = (h: string, port?: string) => {
      if (explicitHostOk(h)) return true;
      if (hostMatchesPatterns(h)) return true;
      return !!(
        port &&
        allowedPorts.has(port) &&
        (isSingleLabel(h) || isPrivateIp(h))
      );
    };

    const check = (raw: string): boolean => {
      try {
        const u = new URL(raw);
        return isInternalByRules(u.hostname, u.port);
      } catch {
        return false;
      }
    };

    if (check(full)) return true;
    return cfg.baseURL && check(cfg.baseURL);
  }
}
