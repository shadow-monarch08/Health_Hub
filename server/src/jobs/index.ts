import logger from "../config/logger.config";

logger.info("🚀 Worker process starting...");

// crash visibility
process.on("uncaughtException", (err) => {
  logger.error("❌ Uncaught exception in worker", err);
});

process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled rejection in worker", err);
});

// THIS import registers the worker
import "./workers/sync.worker";
