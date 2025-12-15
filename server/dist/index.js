"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("./src/config/environment");
const app_1 = __importDefault(require("./src/app"));
const logger_1 = __importDefault(require("./src/config/logger"));
const PORT = environment_1.env.PORT;
const server = app_1.default.listen(PORT, () => {
    logger_1.default.info(`🚀 Server running in ${environment_1.env.NODE_ENV} mode on port ${PORT}`);
});
// Crash handling
process.on('uncaughtException', (err) => {
    logger_1.default.error('Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
