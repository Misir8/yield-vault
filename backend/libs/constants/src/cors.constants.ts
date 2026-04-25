/**
 * CORS configuration constants
 */
import { SERVER } from "config";

export const CORS = {
  origin: SERVER.CORS_ORIGINS || [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Trace-Id",
    "X-User-Id",
  ],
  exposedHeaders: ["X-Request-Id", "X-Trace-Id"],
  maxAge: 86400, // 24 hours
};
