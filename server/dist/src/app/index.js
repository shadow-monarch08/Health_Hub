"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const hpp_1 = __importDefault(require("hpp"));
const requestLogger_1 = __importDefault(require("./middleware/requestLogger"));
const app = (0, express_1.default)();
// Security Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, hpp_1.default)());
// General Middleware
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(requestLogger_1.default);
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const OAuth_routes_1 = __importDefault(require("./routes/OAuth.routes"));
const EHR_routes_1 = __importDefault(require("./routes/EHR.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/OAuth', OAuth_routes_1.default);
app.use('/api/v1/ehr', EHR_routes_1.default);
app.use('/api/v1/profiles', profile_routes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
});
exports.default = app;
