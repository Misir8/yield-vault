#!/usr/bin/env node

// Helper script to generate Prisma DATABASE_URL from config
const config = require('config');

const service = process.argv[2]; // indexer, analytics, api-gateway

let dbConfig;
switch (service) {
  case 'indexer':
    dbConfig = config.INDEXER_DB;
    break;
  case 'analytics':
    dbConfig = config.ANALYTICS_DB;
    break;
  case 'api-gateway':
    dbConfig = config.API_GATEWAY_DB;
    break;
  default:
    console.error('Usage: node prisma-url.js [indexer|analytics|api-gateway]');
    process.exit(1);
}

const sslMode = dbConfig.SSLMODE ? '&sslmode=require' : '';
const url = `postgresql://${dbConfig.USERNAME}:${dbConfig.PASSWORD}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}?schema=public${sslMode}`;

console.log(url);
