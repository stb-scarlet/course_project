"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const errorHandler = (err, _req, res, _next) => {
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
    }
    // App errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    // Prisma unique constraint violation
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Resource already exists (unique constraint)' });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Resource not found' });
        }
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map