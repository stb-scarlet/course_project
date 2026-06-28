"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const passport_1 = __importDefault(require("passport"));
const passport_2 = require("./config/passport");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});
app.set('io', io); // Make io accessible in controllers
io.on('connection', (socket) => {
    // Join position discussion room
    socket.on('joinPosition', (positionId) => {
        socket.join(`position:${positionId}`);
    });
    socket.on('leavePosition', (positionId) => {
        socket.leave(`position:${positionId}`);
    });
});
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
app.use('/api/auth', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    message: { error: 'Too many auth attempts, please try again later' },
}));
app.use('/api', (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 min
    max: 200,
}));
// ─── Passport ─────────────────────────────────────────────────────────────────
(0, passport_2.configurePassport)();
app.use(passport_1.default.initialize());
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes_1.default);
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(error_middleware_1.errorHandler);
// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io enabled`);
    console.log(`🌍 Env: ${process.env.NODE_ENV}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map