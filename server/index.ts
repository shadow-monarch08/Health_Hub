import { env } from "./src/config/environment.config";
import app from "./src/app";
import logger from "./src/config/logger.config";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Crash handling
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
