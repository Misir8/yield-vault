/**
 * Configuration Type Definitions for DeFi Yield Vault
 */

declare module 'config' {
  export interface IConfig {
    get<T>(setting: string): T;
    has(setting: string): boolean;
  }

  const config: IConfig;
  export default config;
}

// Swagger Configuration
export interface SwaggerConfig {
  ENABLED: boolean;
  TITLE: string;
  DESCRIPTION: string;
  VERSION: string;
  PATH: string;
}

// Metrics Configuration
export interface MetricsConfig {
  ENABLED: boolean;
  EXPOSE_PORT: number;
  REQUESTS_PROCESSING_RATE: number;
}

// Sentry Configuration
export interface SentryConfig {
  DSN: string;
  ENABLED: boolean;
}

// Server Configuration
export interface ServerConfig {
  PORT: number;
  API_PREFIX: string;
  CORS_ENABLED: boolean;
  CORS_ORIGINS: string[];
}

// Blockchain Configuration
export interface BlockchainConfig {
  RPC_URL: string;
  WS_RPC_URL: string;
  CHAIN_ID: number;
  CONFIRMATIONS: number;
  GAS_LIMIT: number;
  GAS_PRICE: string;
  CONTRACTS: {
    VAULT: string;
    LENDING_POOL: string;
    STRATEGY_MANAGER: string;
    VAULT_CONTROLLER: string;
    ORACLE_MANAGER: string;
    COLLATERAL_REGISTRY: string;
    STABLE_TOKEN: string;
  };
}

// Database Configuration
export interface DefiDbConfig {
  HOST: string;
  PORT: number;
  USERNAME: string;
  PASSWORD: string;
  DB: string;
  SYNCHRONIZE: boolean;
  LOGGING: boolean;
  RUN_MIGRATION: boolean;
  SSLMODE: boolean;
}

// Indexer Database Configuration
export interface IndexerDbConfig {
  NAME: string;
  HOST: string;
  PORT: number;
  USERNAME: string;
  PASSWORD: string;
  DB: string;
  LOGGING: boolean;
  SSLMODE: boolean;
}

// Analytics Database Configuration
export interface AnalyticsDbConfig {
  NAME: string;
  HOST: string;
  PORT: number;
  USERNAME: string;
  PASSWORD: string;
  DB: string;
  LOGGING: boolean;
  SSLMODE: boolean;
}

// API Gateway Database Configuration
export interface ApiGatewayDbConfig {
  NAME: string;
  HOST: string;
  PORT: number;
  USERNAME: string;
  PASSWORD: string;
  DB: string;
  LOGGING: boolean;
  SSLMODE: boolean;
}

// Redis Configuration
export interface RedisConfig {
  HOST: string;
  PORT: number;
  PASSWORD: string;
  TLS_ENABLED: boolean;
  DB: number;
  KEY_PREFIX: string;
  TTL: number;
}

// API Gateway Configuration
export interface ApiGatewayConfig {
  PORT: number;
  URL: string;
  X_API_KEY: string;
}

// Keeper Configuration
export interface KeeperConfig {
  ENABLED: boolean;
  PORT: number;
  URL: string;
  X_API_KEY: string;
  INTERVALS: {
    REBALANCE: number;
    LIQUIDATION: number;
    HARVEST: number;
    INDEXER: number;
  };
  THRESHOLDS: {
    MIN_HEALTH_FACTOR: number;
    REBALANCE_DEVIATION: number;
    MIN_PROFIT_FOR_REBALANCE: number;
  };
  GAS_SETTINGS: {
    MAX_GAS_PRICE: string;
    PRIORITY_FEE: string;
  };
}

// Indexer Configuration
export interface IndexerConfig {
  ENABLED: boolean;
  PORT: number;
  URL: string;
  X_API_KEY: string;
  START_BLOCK: number;
  BATCH_SIZE: number;
  CONFIRMATIONS: number;
  INTERVAL: number;
}

// Analytics Configuration
export interface AnalyticsConfig {
  ENABLED: boolean;
  PORT: number;
  URL: string;
  X_API_KEY: string;
  UPDATE_INTERVAL: number;
  METRICS: {
    TVL: boolean;
    APY: boolean;
    UTILIZATION: boolean;
    USER_STATS: boolean;
  };
}

// Security Configuration
export interface SecurityConfig {
  RATE_LIMIT: {
    ENABLED: boolean;
    WINDOW_MS: number;
    MAX: number;
  };
  HELMET: {
    ENABLED: boolean;
  };
  JWT: {
    SECRET: string;
    EXPIRES_IN: string;
  };
}

// Logging Configuration
export interface LoggingConfig {
  LEVEL: 'error' | 'warn' | 'info' | 'debug';
  FORMAT: 'json' | 'simple';
  COLORIZE: boolean;
  TIMESTAMP: boolean;
}

// External Services Configuration
export interface ExternalServicesConfig {
  INFURA: {
    API_KEY: string;
  };
  ALCHEMY: {
    API_KEY: string;
  };
  ETHERSCAN: {
    API_KEY: string;
  };
}

// Root Configuration Interface
export interface Config {
  SWAGGER: SwaggerConfig;
  METRICS: MetricsConfig;
  SENTRY: SentryConfig;
  SERVER: ServerConfig;
  BLOCKCHAIN: BlockchainConfig;
  DEFI_DB: DefiDbConfig;
  INDEXER_DB: IndexerDbConfig;
  ANALYTICS_DB: AnalyticsDbConfig;
  API_GATEWAY_DB: ApiGatewayDbConfig;
  REDIS: RedisConfig;
  API_GATEWAY: ApiGatewayConfig;
  KEEPER: KeeperConfig;
  INDEXER: IndexerConfig;
  ANALYTICS: AnalyticsConfig;
  SECURITY: SecurityConfig;
  LOGGING: LoggingConfig;
  EXTERNAL_SERVICES: ExternalServicesConfig;
}

// Export individual configs for convenience
export const SWAGGER: SwaggerConfig;
export const METRICS: MetricsConfig;
export const SENTRY: SentryConfig;
export const SERVER: ServerConfig;
export const BLOCKCHAIN: BlockchainConfig;
export const DEFI_DB: DefiDbConfig;
export const INDEXER_DB: IndexerDbConfig;
export const ANALYTICS_DB: AnalyticsDbConfig;
export const API_GATEWAY_DB: ApiGatewayDbConfig;
export const REDIS: RedisConfig;
export const API_GATEWAY: ApiGatewayConfig;
export const KEEPER: KeeperConfig;
export const INDEXER: IndexerConfig;
export const ANALYTICS: AnalyticsConfig;
export const SECURITY: SecurityConfig;
export const LOGGING: LoggingConfig;
export const EXTERNAL_SERVICES: ExternalServicesConfig;
